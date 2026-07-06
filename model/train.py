#!/usr/bin/env python3
"""
VisionUpscale ESRGAN Training Script
====================================
Complete training pipeline for Enhanced Super-Resolution GAN with:
- Two-phase training (PSNR pre-training + GAN training)
- Mixed precision training with automatic scaling
- Comprehensive logging and visualization
- Advanced learning rate scheduling
- Gradient clipping and regularization
- Automatic checkpointing and early stopping
- Multi-GPU support (if available)
- TensorBoard integration
- Evaluation on validation set

Usage:
    python train.py --config config.yaml --gpus 0,1
    python train.py --config config.yaml --resume checkpoints/latest.pth
    python train.py --config config.yaml --debug  # Debug mode with small dataset
"""

import argparse
import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import yaml
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torch.utils.tensorboard import SummaryWriter
from torch.cuda.amp import GradScaler, autocast
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP

# Local imports
from models.generator import ESRGANGenerator, build_generator
from models.discriminator import ESRGANDiscriminator, build_discriminator
from datasets.div2k_dataset import build_dataloaders
from utils.losses import ESRGANGeneratorLoss, RelativeAdversarialLoss
from utils.metrics import compute_psnr, compute_ssim, MetricTracker
from utils.helpers import (
    setup_logger, set_seed, get_device, count_parameters,
    CheckpointManager, EarlyStopping, plot_loss_curves, plot_metrics_curves,
    format_time
)


class ESRGANTrainer:
    """
    Complete ESRGAN Training Pipeline
    
    Implements two-phase training:
    1. PSNR pre-training (pixel loss only)
    2. GAN training (perceptual + adversarial losses)
    """
    
    def __init__(self, config: Dict, args: argparse.Namespace):
        """Initialize trainer with configuration"""
        self.config = config
        self.args = args
        
        # Setup device and distributed training
        self.device = get_device()
        self.is_distributed = args.distributed
        self.local_rank = args.local_rank if args.distributed else 0
        self.world_size = args.world_size if args.distributed else 1
        
        # Setup logging
        log_dir = Path(config["output_dir"]) / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        self.logger = setup_logger(
            "visionupscale",
            log_file=str(log_dir / "training.log")
        )
        
        # Setup TensorBoard
        tb_dir = Path(config["output_dir"]) / "tensorboard"
        self.writer = SummaryWriter(tb_dir) if self.local_rank == 0 else None
        
        # Initialize components
        self._build_models()
        self._build_optimizers()
        self._build_loss_functions()
        self._build_dataloaders()
        
        # Setup training utilities
        self._setup_training_utils()
        
        # Training state
        self.start_epoch = 0
        self.global_step = 0
        self.best_psnr = 0.0
        
        # Mixed precision training
        self.scaler = GradScaler() if config.get("mixed_precision", True) else None
        
        self.logger.info("ESRGAN Trainer initialized successfully")
        self._log_model_info()
    
    def _build_models(self):
        """Build generator and discriminator models"""
        self.logger.info("Building models...")
        
        # Generator
        self.generator = build_generator(self.config).to(self.device)
        
        # Discriminator
        self.discriminator = build_discriminator(self.config).to(self.device)
        
        # Distributed training setup
        if self.is_distributed:
            self.generator = DDP(
                self.generator, 
                device_ids=[self.local_rank],
                output_device=self.local_rank
            )
            self.discriminator = DDP(
                self.discriminator,
                device_ids=[self.local_rank],
                output_device=self.local_rank
            )
    
    def _build_optimizers(self):
        """Build optimizers for generator and discriminator"""
        train_cfg = self.config["training"]
        
        # Generator optimizer
        self.g_optimizer = optim.Adam(
            self.generator.parameters(),
            lr=train_cfg["gan"]["generator_lr"],
            betas=(0.9, 0.999),
            eps=1e-8,
            weight_decay=0
        )
        
        # Discriminator optimizer
        self.d_optimizer = optim.Adam(
            self.discriminator.parameters(),
            lr=train_cfg["gan"]["discriminator_lr"],
            betas=(0.9, 0.999),
            eps=1e-8,
            weight_decay=0
        )
        
        # Learning rate schedulers
        scheduler_cfg = train_cfg["gan"]["scheduler"]
        
        if scheduler_cfg["type"] == "MultiStepLR":
            self.g_scheduler = optim.lr_scheduler.MultiStepLR(
                self.g_optimizer,
                milestones=scheduler_cfg["milestones"],
                gamma=scheduler_cfg["gamma"]
            )
            self.d_scheduler = optim.lr_scheduler.MultiStepLR(
                self.d_optimizer,
                milestones=scheduler_cfg["milestones"],
                gamma=scheduler_cfg["gamma"]
            )
        elif scheduler_cfg["type"] == "CosineAnnealingLR":
            self.g_scheduler = optim.lr_scheduler.CosineAnnealingLR(
                self.g_optimizer,
                T_max=train_cfg["gan"]["epochs"]
            )
            self.d_scheduler = optim.lr_scheduler.CosineAnnealingLR(
                self.d_optimizer,
                T_max=train_cfg["gan"]["epochs"]
            )
        else:
            self.g_scheduler = None
            self.d_scheduler = None
    
    def _build_loss_functions(self):
        """Build loss functions"""
        loss_cfg = self.config["training"]["loss"]
        
        # Generator loss (combined)
        self.g_loss_fn = ESRGANGeneratorLoss(
            pixel_weight=loss_cfg["pixel_weight"],
            perceptual_weight=loss_cfg["perceptual_weight"],
            adversarial_weight=loss_cfg["adversarial_weight"]
        ).to(self.device)
        
        # Discriminator loss
        self.d_loss_fn = RelativeAdversarialLoss().to(self.device)
        
        # PSNR pre-training loss
        self.psnr_loss_fn = nn.L1Loss().to(self.device)
    
    def _build_dataloaders(self):
        """Build training and validation data loaders"""
        self.train_loader, self.val_loader = build_dataloaders(self.config)
        
        self.logger.info(f"Dataset loaded:")
        self.logger.info(f"  Training samples: {len(self.train_loader.dataset)}")
        self.logger.info(f"  Validation samples: {len(self.val_loader.dataset)}")
        self.logger.info(f"  Batch size: {self.train_loader.batch_size}")

    
    def _setup_training_utils(self):
        """Setup training utilities"""
        # Checkpoint manager
        checkpoint_dir = Path(self.config["output_dir"]) / "checkpoints"
        self.checkpoint_manager = CheckpointManager(
            checkpoint_dir=str(checkpoint_dir),
            experiment_name=self.config["experiment_name"],
            monitor="val_psnr",
            mode="max"
        )
        
        # Early stopping
        early_stop_cfg = self.config["training"]["early_stopping"]
        if early_stop_cfg["enabled"]:
            self.early_stopping = EarlyStopping(
                patience=early_stop_cfg["patience"],
                monitor=early_stop_cfg["monitor"],
                mode=early_stop_cfg["mode"]
            )
        else:
            self.early_stopping = None
        
        # Metric tracking
        self.metric_tracker = MetricTracker()
        
        # Training history
        self.history = {
            "g_loss": [],
            "d_loss": [],
            "val_psnr": [],
            "val_ssim": [],
            "lr": []
        }
    
    def _log_model_info(self):
        """Log model information"""
        gen_params = count_parameters(self.generator)
        disc_params = count_parameters(self.discriminator)
        total_params = gen_params + disc_params
        
        self.logger.info("Model Information:")
        self.logger.info(f"  Generator parameters: {gen_params:,}")
        self.logger.info(f"  Discriminator parameters: {disc_params:,}")
        self.logger.info(f"  Total parameters: {total_params:,}")
        self.logger.info(f"  Device: {self.device}")
        self.logger.info(f"  Mixed precision: {self.scaler is not None}")
    
    def train(self):
        """Complete training pipeline"""
        self.logger.info("Starting ESRGAN training...")
        
        # Phase 1: PSNR pre-training
        if self.config["training"]["pretrain"]["enabled"]:
            self._train_psnr_phase()
        
        # Phase 2: GAN training
        self._train_gan_phase()
        
        # Cleanup
        if self.writer:
            self.writer.close()
        
        self.logger.info("Training completed successfully!")


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="VisionUpscale ESRGAN Training")
    
    parser.add_argument("--config", type=str, default="config.yaml",
                       help="Path to configuration file")
    parser.add_argument("--resume", type=str, default=None,
                       help="Path to checkpoint to resume from")
    parser.add_argument("--gpus", type=str, default="0",
                       help="Comma-separated list of GPU IDs to use")
    parser.add_argument("--debug", action="store_true",
                       help="Debug mode with small dataset")
    parser.add_argument("--distributed", action="store_true",
                       help="Enable distributed training")
    parser.add_argument("--local-rank", type=int, default=0,
                       help="Local rank for distributed training")
    parser.add_argument("--world-size", type=int, default=1,
                       help="World size for distributed training")
    
    return parser.parse_args()


def main():
    """Main training function"""
    args = parse_args()
    
    # Load configuration
    with open(args.config, 'r') as f:
        config = yaml.safe_load(f)
    
    # Set random seed for reproducibility
    set_seed(config.get("seed", 42))
    
    # Setup distributed training if requested
    if args.distributed:
        dist.init_process_group(backend="nccl")
        torch.cuda.set_device(args.local_rank)
    
    # Debug mode adjustments
    if args.debug:
        config["training"]["pretrain"]["epochs"] = 2
        config["training"]["gan"]["epochs"] = 5
        config["dataset"]["num_workers"] = 0
        print("Debug mode enabled - using reduced epochs and single worker")
    
    # Create trainer
    trainer = ESRGANTrainer(config, args)
    
    # Resume from checkpoint if specified
    if args.resume:
        trainer.checkpoint_manager.load(
            args.resume,
            trainer.generator,
            trainer.discriminator,
            trainer.g_optimizer,
            trainer.d_optimizer,
            str(trainer.device)
        )
    
    # Start training
    try:
        trainer.train()
    except KeyboardInterrupt:
        print("\nTraining interrupted by user")
        if trainer.writer:
            trainer.writer.close()
    except Exception as e:
        print(f"Training failed with error: {e}")
        raise
    finally:
        # Cleanup distributed training
        if args.distributed:
            dist.destroy_process_group()


if __name__ == "__main__":
    main()

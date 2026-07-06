#!/usr/bin/env python3
"""
VisionUpscale ESRGAN Advanced Training Script
=============================================
Complete training pipeline for ESRGAN model with:
- Two-phase training (PSNR + GAN)
- Mixed precision training
- Multi-GPU support
- TensorBoard logging
- Automatic checkpointing
- Learning rate scheduling
- Early stopping

Author: VisionUpscale Team
Date: June 2026
License: MIT
"""

import os
import sys
import yaml
import argparse
import logging
from pathlib import Path
from datetime import datetime

import torch
import torch.nn as nn
import torch.optim as optim
from torch.cuda.amp import autocast, GradScaler
from torch.utils.data import DataLoader
from torch.utils.tensorboard import SummaryWriter
import torch.distributed as dist
import torch.multiprocessing as mp
from torch.nn.parallel import DistributedDataParallel as DDP

# Project imports
from models.generator import Generator
from models.discriminator import Discriminator
from datasets.div2k_dataset import DIV2KDataset
from utils.losses import PixelLoss, PerceptualLoss, AdversarialLoss
from utils.metrics import PSNR, SSIM
from utils.helpers import (
    create_checkpoint_dir, 
    setup_logging,
    seed_everything,
    count_parameters,
    get_device,
    setup_distributed
)


class ESRGANTrainer:
    """Complete ESRGAN trainer with two-phase training strategy."""
    
    def __init__(self, config, device, rank=0, world_size=1):
        """
        Initialize trainer with configuration.
        
        Args:
            config: Training configuration dictionary
            device: Torch device (cpu/cuda)
            rank: Process rank for distributed training
            world_size: Total number of processes
        """
        self.config = config
        self.device = device
        self.rank = rank
        self.world_size = world_size
        self.is_master = rank == 0
        
        # Setup directories
        self.checkpoint_dir = Path(config['training']['checkpoint_dir'])
        self.log_dir = Path(config['training']['log_dir'])
        self.results_dir = Path(config['evaluation']['results_dir'])
        
        if self.is_master:
            create_checkpoint_dir(self.checkpoint_dir)
            self.log_dir.mkdir(parents=True, exist_ok=True)
            self.results_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize logging
        if self.is_master:
            setup_logging(self.log_dir / f'train_{datetime.now():%Y%m%d_%H%M%S}.log')
            self.logger = logging.getLogger(__name__)
            self.logger.info(f"Initializing ESRGAN Trainer on {device}")
            self.logger.info(f"Configuration: {config['project']}")
        
        # Initialize models
        self._init_models()
        
        # Initialize losses
        self._init_losses()
        
        # Initialize metrics
        self._init_metrics()
        
        # Initialize optimizers
        self._init_optimizers()
        
        # Initialize schedulers
        self._init_schedulers()
        
        # Initialize training state
        self.current_epoch = 0
        self.best_psnr = 0.0
        self.best_ssim = 0.0
        self.train_losses = []
        self.val_metrics = []
        
        # Mixed precision training
        self.use_mixed_precision = config['training']['mixed_precision']
        self.scaler = GradScaler(enabled=self.use_mixed_precision)
        
        # TensorBoard writer (master only)
        if self.is_master and config['training']['tensorboard']:
            self.writer = SummaryWriter(self.log_dir / 'tensorboard')
        else:
            self.writer = None
        
    def _init_models(self):
        """Initialize generator and discriminator models."""
        model_cfg = self.config['model']
        
        # Generator
        self.generator = Generator(
            channels=model_cfg['generator']['channels'],
            num_rrdb=model_cfg['generator']['num_rrdb'],
            num_dense_connections=model_cfg['generator']['num_dense_connections'],
            beta_scale=model_cfg['generator']['beta_scale'],
            upscale_factor=model_cfg['generator']['upscale_factor'],
            use_pixel_shuffle=model_cfg['generator']['use_pixel_shuffle'],
            residual_scaling=model_cfg['generator']['residual_scaling']
        ).to(self.device)
        
        # Discriminator
        self.discriminator = Discriminator(
            channels=model_cfg['discriminator']['channels'],
            num_layers=model_cfg['discriminator']['num_layers'],
            use_spectral_norm=model_cfg['discriminator']['use_spectral_norm'],
            leaky_relu_slope=model_cfg['discriminator']['leaky_relu_slope'],
            use_global_average_pool=model_cfg['discriminator']['use_global_average_pool']
        ).to(self.device)
        
        # Distributed Data Parallel
        if self.world_size > 1:
            self.generator = DDP(self.generator, device_ids=[self.rank])
            self.discriminator = DDP(self.discriminator, device_ids=[self.rank])
        
        if self.is_master:
            total_params = count_parameters(self.generator) + count_parameters(self.discriminator)
            self.logger.info(f"Generator parameters: {count_parameters(self.generator):,}")
            self.logger.info(f"Discriminator parameters: {count_parameters(self.discriminator):,}")
            self.logger.info(f"Total parameters: {total_params:,}")
    
    def _init_losses(self):
        """Initialize loss functions."""
        loss_weights = self.config['training']['loss_weights']
        
        # Pixel loss (L1)
        self.pixel_loss = PixelLoss().to(self.device)
        self.pixel_weight = loss_weights['pixel_loss']
        
        # Perceptual loss (VGG19)
        self.perceptual_loss = PerceptualLoss(
            use_vgg19=True,
            layers=['relu2_2', 'relu3_4', 'relu4_4']
        ).to(self.device)
        self.perceptual_weight = loss_weights['perceptual_loss']
        
        # Adversarial loss (Relativistic)
        self.adversarial_loss = AdversarialLoss(
            loss_type='relativistic',
            use_least_squares=False
        ).to(self.device)
        self.adversarial_weight = loss_weights['adversarial_loss']
        
        if self.is_master:
            self.logger.info(f"Loss weights - Pixel: {self.pixel_weight}, "
                           f"Perceptual: {self.perceptual_weight}, "
                           f"Adversarial: {self.adversarial_weight}")
    
    def _init_metrics(self):
        """Initialize evaluation metrics."""
        self.psnr = PSNR().to(self.device)
        self.ssim = SSIM().to(self.device)
    
    def _init_optimizers(self):
        """Initialize optimizers."""
        opt_cfg = self.config['training']['optimizer']
        
        # Optimizer for generator
        self.optimizer_g = optim.Adam(
            self.generator.parameters(),
            lr=self.config['training']['phases']['phase1']['learning_rate'],
            betas=tuple(opt_cfg['betas']),
            weight_decay=opt_cfg['weight_decay']
        )
        
        # Optimizer for discriminator
        self.optimizer_d = optim.Adam(
            self.discriminator.parameters(),
            lr=self.config['training']['phases']['phase2']['learning_rate'],
            betas=tuple(opt_cfg['betas']),
            weight_decay=opt_cfg['weight_decay']
        )
    
    def _init_schedulers(self):
        """Initialize learning rate schedulers."""
        scheduler_cfg = self.config['monitoring']['scheduler']
        
        if scheduler_cfg['name'] == 'cosine_annealing':
            self.scheduler_g = optim.lr_scheduler.CosineAnnealingLR(
                self.optimizer_g,
                T_max=scheduler_cfg['T_max'],
                eta_min=scheduler_cfg['eta_min']
            )
            self.scheduler_d = optim.lr_scheduler.CosineAnnealingLR(
                self.optimizer_d,
                T_max=scheduler_cfg['T_max'],
                eta_min=scheduler_cfg['eta_min']
            )
        else:
            # Default: step scheduler
            self.scheduler_g = optim.lr_scheduler.StepLR(self.optimizer_g, step_size=100, gamma=0.5)
            self.scheduler_d = optim.lr_scheduler.StepLR(self.optimizer_d, step_size=100, gamma=0.5)
    
    def _create_dataloaders(self):
        """Create training and validation dataloaders."""
        dataset_cfg = self.config['dataset']
        
        # Training dataset
        train_dataset = DIV2KDataset(
            root_dir=dataset_cfg['root_dir'],
            split='train',
            hr_size=dataset_cfg['hr_size'],
            scale_factor=dataset_cfg['scale_factor'],
            augmentation=dataset_cfg['augmentation']
        )
        
        # Validation dataset
        val_dataset = DIV2KDataset(
            root_dir=dataset_cfg['root_dir'],
            split='val',
            hr_size=dataset_cfg['hr_size'],
            scale_factor=dataset_cfg['scale_factor'],
            augmentation=False  # No augmentation for validation
        )
        
        # Distributed sampler for multi-GPU
        if self.world_size > 1:
            train_sampler = torch.utils.data.distributed.DistributedSampler(
                train_dataset,
                num_replicas=self.world_size,
                rank=self.rank,
                shuffle=True
            )
            val_sampler = torch.utils.data.distributed.DistributedSampler(
                val_dataset,
                num_replicas=self.world_size,
                rank=self.rank,
                shuffle=False
            )
        else:
            train_sampler = None
            val_sampler = None
        
        # Data loaders
        self.train_loader = DataLoader(
            train_dataset,
            batch_size=dataset_cfg['batch_size']['train'],
            shuffle=(train_sampler is None),
            sampler=train_sampler,
            num_workers=dataset_cfg['num_workers'],
            pin_memory=dataset_cfg['pin_memory'],
            prefetch_factor=dataset_cfg['prefetch_factor']
        )
        
        self.val_loader = DataLoader(
            val_dataset,
            batch_size=dataset_cfg['batch_size']['val'],
            shuffle=False,
            sampler=val_sampler,
            num_workers=dataset_cfg['num_workers'],
            pin_memory=dataset_cfg['pin_memory']
        )
        
        if self.is_master:
            self.logger.info(f"Training samples: {len(train_dataset):,}")
            self.logger.info(f"Validation samples: {len(val_dataset):,}")
            self.logger.info(f"Batch size: {dataset_cfg['batch_size']['train']}")
    
    def train_phase1(self, num_epochs):
        """
        Phase 1: PSNR pre-training (pixel-level reconstruction).
        
        Args:
            num_epochs: Number of epochs for phase 1
        """
        if self.is_master:
            self.logger.info(f"\n{'='*60}")
            self.logger.info("Starting Phase 1: PSNR Pre-training")
            self.logger.info(f"Epochs: {num_epochs}")
            self.logger.info(f"Learning rate: {self.optimizer_g.param_groups[0]['lr']:.6f}")
            self.logger.info(f"{'='*60}\n")
        
        self.generator.train()
        
        for epoch in range(self.current_epoch, self.current_epoch + num_epochs):
            self.current_epoch = epoch + 1
            
            if self.world_size > 1:
                self.train_loader.sampler.set_epoch(epoch)
            
            # Training loop
            total_loss = 0.0
            total_psnr = 0.0
            batch_count = 0
            
            for batch_idx, (lr_images, hr_images) in enumerate(self.train_loader):
                lr_images = lr_images.to(self.device, non_blocking=True)
                hr_images = hr_images.to(self.device, non_blocking=True)
                
                # Zero gradients
                self.optimizer_g.zero_grad(set_to_none=True)
                
                # Forward pass with mixed precision
                with autocast(enabled=self.use_mixed_precision):
                    sr_images = self.generator(lr_images)
                    loss = self.pixel_loss(sr_images, hr_images) * self.pixel_weight
                
                # Backward pass with gradient scaling
                self.scaler.scale(loss).backward()
                
                # Gradient clipping
                if self.config['training']['clip_grad_norm'] > 0:
                    self.scaler.unscale_(self.optimizer_g)
                    torch.nn.utils.clip_grad_norm_(
                        self.generator.parameters(),
                        self.config['training']['clip_grad_norm']
                    )
                
                # Optimizer step
                self.scaler.step(self.optimizer_g)
                self.scaler.update()
                
                # Metrics
                psnr_value = self.psnr(sr_images, hr_images).item()
                
                total_loss += loss.item()
                total_psnr += psnr_value
                batch_count += 1
                
                # Log batch progress (master only)
                if self.is_master and (batch_idx + 1) % self.config['monitoring']['update_frequency'] == 0:
                    avg_loss = total_loss / batch_count
                    avg_psnr = total_psnr / batch_count
                    self.logger.info(f"Epoch [{epoch+1}/{self.current_epoch + num_epochs}] "
                                   f"Batch [{batch_idx+1}/{len(self.train_loader)}] "
                                   f"Loss: {avg_loss:.4f}, PSNR: {avg_psnr:.2f} dB")
            
            # End of epoch
            avg_loss = total_loss / batch_count
            avg_psnr = total_psnr / batch_count
            
            # Validation
            val_metrics = self._validate()
            
            # Learning rate scheduling
            self.scheduler_g.step()
            
            # Logging (master only)
            if self.is_master:
                self.logger.info(f"\nEpoch [{epoch+1}/{self.current_epoch + num_epochs}] Complete")
                self.logger.info(f"Train Loss: {avg_loss:.4f}, Train PSNR: {avg_psnr:.2f} dB")
                self.logger.info(f"Val PSNR: {val_metrics['psnr']:.2f} dB, "
                               f"Val SSIM: {val_metrics['ssim']:.4f}")
                self.logger.info(f"Learning Rate: {self.optimizer_g.param_groups[0]['lr']:.6f}")
                
                # TensorBoard logging
                if self.writer:
                    self.writer.add_scalar('Phase1/Train_Loss', avg_loss, epoch)
                    self.writer.add_scalar('Phase1/Train_PSNR', avg_psnr, epoch)
                    self.writer.add_scalar('Phase1/Val_PSNR', val_metrics['psnr'], epoch)
                    self.writer.add_scalar('Phase1/Val_SSIM', val_metrics['ssim'], epoch)
                    self.writer.add_scalar('Phase1/Learning_Rate', 
                                         self.optimizer_g.param_groups[0]['lr'], epoch)
                
                # Save checkpoint
                if val_metrics['psnr'] > self.best_psnr:
                    self.best_psnr = val_metrics['psnr']
                    self._save_checkpoint(f"phase1_best.pth")
                    self.logger.info(f"New best PSNR: {self.best_psnr:.2f} dB")
                
                # Save regular checkpoint
                if (epoch + 1) % self.config['training']['save_checkpoint_every'] == 0:
                    self._save_checkpoint(f"phase1_epoch_{epoch+1}.pth")
        
        if self.is_master:
            self.logger.info(f"\nPhase 1 complete! Best PSNR: {self.best_psnr:.2f} dB")
    
    def train_phase2(self, num_epochs):
        """
        Phase 2: GAN training (perceptual quality).
        
        Args:
            num_epochs: Number of epochs for phase 2
        """
        if self.is_master:
            self.logger.info(f"\n{'='*60}")
            self.logger.info("Starting Phase 2: GAN Training")
            self.logger.info(f"Epochs: {num_epochs}")
            self.logger.info(f"Learning rate: {self.optimizer_g.param_groups[0]['lr']:.6f}")
            self.logger.info(f"{'='*60}\n")
        
        self.generator.train()
        self.discriminator.train()
        
        for epoch in range(self.current_epoch, self.current_epoch + num_epochs):
            self.current_epoch = epoch + 1
            
            if self.world_size > 1:
                self.train_loader.sampler.set_epoch(epoch)
            
            # Training loop
            total_loss_g = 0.0
            total_loss_d = 0.0
            total_psnr = 0.0
            batch_count = 0
            
            for batch_idx, (lr_images, hr_images) in enumerate(self.train_loader):
                lr_images = lr_images.to(self.device, non_blocking=True)
                hr_images = hr_images.to(self.device, non_blocking=True)
                
                # =========== Train Discriminator ===========
                self.optimizer_d.zero_grad(set_to_none=True)
                
                with autocast(enabled=self.use_mixed_precision):
                    # Generate fake images
                    with torch.no_grad():
                        fake_images = self.generator(lr_images)
                    
                    # Discriminator forward
                    pred_real = self.discriminator(hr_images)
                    pred_fake = self.discriminator(fake_images.detach())
                    
                    # Adversarial loss
                    loss_d = self.adversarial_loss(pred_real, pred_fake)
                
                # Backward and optimize
                self.scaler.scale(loss_d).backward()
                self.scaler.step(self.optimizer_d)
                
                # =========== Train Generator ===========
                self.optimizer_g.zero_grad(set_to_none=True)
                
                with autocast(enabled=self.use_mixed_precision):
                    # Generate fake images
                    fake_images = self.generator(lr_images)
                    
                    # Generator losses
                    pixel_loss = self.pixel_loss(fake_images, hr_images) * self.pixel_weight
                    perceptual_loss = self.perceptual_loss(fake_images, hr_images) * self.perceptual_weight
                    
                    # Adversarial loss
                    pred_fake = self.discriminator(fake_images)
                    pred_real = self.discriminator(hr_images)
                    adv_loss = self.adversarial_loss(pred_fake, pred_real) * self.adversarial_weight
                    
                    # Total loss
                    loss_g = pixel_loss + perceptual_loss + adv_loss
                
                # Backward and optimize
                self.scaler.scale(loss_g).backward()
                
                # Gradient clipping
                if self.config['training']['clip_grad_norm'] > 0:
                    self.scaler.unscale_(self.optimizer_g)
                    torch.nn.utils.clip_grad_norm_(
                        self.generator.parameters(),
                        self.config['training']['clip_grad_norm']
                    )
                
                self.scaler.step(self.optimizer_g)
                self.scaler.update()
                
                # Metrics
                psnr_value = self.psnr(fake_images, hr_images).item()
                
                total_loss_g += loss_g.item()
                total_loss_d += loss_d.item()
                total_psnr += psnr_value
                batch_count += 1
                
                # Log batch progress
                if self.is_master and (batch_idx + 1) % self.config['monitoring']['update_frequency'] == 0:
                    avg_loss_g = total_loss_g / batch_count
                    avg_loss_d = total_loss_d / batch_count
                    avg_psnr = total_psnr / batch_count
                    
                    self.logger.info(f"Epoch [{epoch+1}/{self.current_epoch + num_epochs}] "
                                   f"Batch [{batch_idx+1}/{len(self.train_loader)}] "
                                   f"G Loss: {avg_loss_g:.4f}, D Loss: {avg_loss_d:.4f}, "
                                   f"PSNR: {avg_psnr:.2f} dB")
            
            # End of epoch
            avg_loss_g = total_loss_g / batch_count
            avg_loss_d = total_loss_d / batch_count
            avg_psnr = total_psnr / batch_count
            
            # Validation
            val_metrics = self._validate()
            
            # Learning rate scheduling
            self.scheduler_g.step()
            self.scheduler_d.step()
            
            # Logging (master only)
            if self.is_master:
                self.logger.info(f"\nEpoch [{epoch+1}/{self.current_epoch + num_epochs}] Complete")
                self.logger.info(f"G Loss: {avg_loss_g:.4f}, D Loss: {avg_loss_d:.4f}, "
                               f"Train PSNR: {avg_psnr:.2f} dB")
                self.logger.info(f"Val PSNR: {val_metrics['psnr']:.2f} dB, "
                               f"Val SSIM: {val_metrics['ssim']:.4f}")
                
                # TensorBoard logging
                if self.writer:
                    self.writer.add_scalar('Phase2/G_Loss', avg_loss_g, epoch)
                    self.writer.add_scalar('Phase2/D_Loss', avg_loss_d, epoch)
                    self.writer.add_scalar('Phase2/Train_PSNR', avg_psnr, epoch)
                    self.writer.add_scalar('Phase2/Val_PSNR', val_metrics['psnr'], epoch)
                    self.writer.add_scalar('Phase2/Val_SSIM', val_metrics['ssim'], epoch)
                    self.writer.add_scalar('Phase2/G_Learning_Rate', 
                                         self.optimizer_g.param_groups[0]['lr'], epoch)
                    self.writer.add_scalar('Phase2/D_Learning_Rate', 
                                         self.optimizer_d.param_groups[0]['lr'], epoch)
                
                # Save checkpoint
                if val_metrics['psnr'] > self.best_psnr:
                    self.best_psnr = val_metrics['psnr']
                    self.best_ssim = val_metrics['ssim']
                    self._save_checkpoint(f"phase2_best.pth")
                    self.logger.info(f"New best - PSNR: {self.best_psnr:.2f} dB, "
                                   f"SSIM: {self.best_ssim:.4f}")
                
                # Save regular checkpoint
                if (epoch + 1) % self.config['training']['save_checkpoint_every'] == 0:
                    self._save_checkpoint(f"phase2_epoch_{epoch+1}.pth")
        
        if self.is_master:
            self.logger.info(f"\nPhase 2 complete! Best PSNR: {self.best_psnr:.2f} dB, "
                           f"Best SSIM: {self.best_ssim:.4f}")
    
    def _validate(self):
        """
        Validation step.
        
        Returns:
            Dictionary with validation metrics
        """
        self.generator.eval()
        
        total_psnr = 0.0
        total_ssim = 0.0
        batch_count = 0
        
        with torch.no_grad():
            for lr_images, hr_images in self.val_loader:
                lr_images = lr_images.to(self.device, non_blocking=True)
                hr_images = hr_images.to(self.device, non_blocking=True)
                
                # Generate super-resolved images
                with autocast(enabled=self.use_mixed_precision):
                    sr_images = self.generator(lr_images)
                
                # Compute metrics
                psnr_value = self.psnr(sr_images, hr_images).item()
                ssim_value = self.ssim(sr_images, hr_images).item()
                
                total_psnr += psnr_value
                total_ssim += ssim_value
                batch_count += 1
        
        avg_psnr = total_psnr / batch_count
        avg_ssim = total_ssim / batch_count
        
        self.generator.train()
        
        return {'psnr': avg_psnr, 'ssim': avg_ssim}
    
    def _save_checkpoint(self, filename):
        """
        Save training checkpoint.
        
        Args:
            filename: Checkpoint filename
        """
        checkpoint = {
            'epoch': self.current_epoch,
            'generator_state_dict': self.generator.state_dict(),
            'discriminator_state_dict': self.discriminator.state_dict(),
            'optimizer_g_state_dict': self.optimizer_g.state_dict(),
            'optimizer_d_state_dict': self.optimizer_d.state_dict(),
            'scheduler_g_state_dict': self.scheduler_g.state_dict(),
            'scheduler_d_state_dict': self.scheduler_d.state_dict(),
            'best_psnr': self.best_psnr,
            'best_ssim': self.best_ssim,
            'config': self.config,
            'scaler_state_dict': self.scaler.state_dict() if self.use_mixed_precision else None
        }
        
        checkpoint_path = self.checkpoint_dir / filename
        torch.save(checkpoint, checkpoint_path)
        
        if self.is_master:
            self.logger.info(f"Checkpoint saved: {checkpoint_path}")
    
    def _load_checkpoint(self, checkpoint_path):
        """
        Load training checkpoint.
        
        Args:
            checkpoint_path: Path to checkpoint file
        """
        checkpoint = torch.load(checkpoint_path, map_location=self.device)
        
        # Load generator state
        if isinstance(self.generator, DDP):
            self.generator.module.load_state_dict(checkpoint['generator_state_dict'])
        else:
            self.generator.load_state_dict(checkpoint['generator_state_dict'])
        
        # Load discriminator state (if available)
        if 'discriminator_state_dict' in checkpoint:
            if isinstance(self.discriminator, DDP):
                self.discriminator.module.load_state_dict(checkpoint['discriminator_state_dict'])
            else:
                self.discriminator.load_state_dict(checkpoint['discriminator_state_dict'])
        
        # Load training state
        self.current_epoch = checkpoint['epoch']
        self.best_psnr = checkpoint['best_psnr']
        self.best_ssim = checkpoint.get('best_ssim', 0.0)
        
        if self.is_master:
            self.logger.info(f"Checkpoint loaded: {checkpoint_path}")
            self.logger.info(f"Resuming from epoch {self.current_epoch}")
            self.logger.info(f"Best PSNR: {self.best_psnr:.2f} dB")
    
    def train(self, resume_from=None):
        """
        Complete training pipeline.
        
        Args:
            resume_from: Path to checkpoint to resume from (optional)
        """
        # Load checkpoint if provided
        if resume_from is not None:
            self._load_checkpoint(resume_from)
        
        # Create dataloaders
        self._create_dataloaders()
        
        # Get training phases from config
        phase1_epochs = self.config['training']['phases']['phase1']['epochs']
        phase2_epochs = self.config['training']['phases']['phase2']['epochs']
        
        # Phase 1: PSNR pre-training
        if self.current_epoch < phase1_epochs:
            remaining_phase1 = phase1_epochs - self.current_epoch
            self.train_phase1(remaining_phase1)
        
        # Switch to phase 2 learning rate
        self.optimizer_g.param_groups[0]['lr'] = self.config['training']['phases']['phase2']['learning_rate']
        self.optimizer_d.param_groups[0]['lr'] = self.config['training']['phases']['phase2']['learning_rate']
        
        # Phase 2: GAN training
        if self.current_epoch < phase1_epochs + phase2_epochs:
            remaining_phase2 = (phase1_epochs + phase2_epochs) - self.current_epoch
            self.train_phase2(remaining_phase2)
        
        # Final validation
        final_metrics = self._validate()
        
        if self.is_master:
            self.logger.info(f"\n{'='*60}")
            self.logger.info("Training Complete!")
            self.logger.info(f"Final PSNR: {final_metrics['psnr']:.2f} dB")
            self.logger.info(f"Final SSIM: {final_metrics['ssim']:.4f}")
            self.logger.info(f"Best PSNR: {self.best_psnr:.2f} dB")
            self.logger.info(f"Best SSIM: {self.best_ssim:.4f}")
            self.logger.info(f"{'='*60}")
            
            # Save final model
            self._save_checkpoint("final_model.pth")
            
            # Close TensorBoard writer
            if self.writer:
                self.writer.close()


def main_worker(rank, world_size, config, args):
    """
    Worker function for distributed training.
    
    Args:
        rank: Process rank
        world_size: Total number of processes
        config: Training configuration
        args: Command line arguments
    """
    # Setup distributed training
    if world_size > 1:
        setup_distributed(rank, world_size)
    
    # Set device
    if torch.cuda.is_available() and not args.cpu:
        device = torch.device(f"cuda:{rank}" if world_size > 1 else "cuda:0")
        torch.cuda.set_device(device)
    else:
        device = torch.device("cpu")
    
    # Initialize trainer
    trainer = ESRGANTrainer(config, device, rank, world_size)
    
    # Start training
    trainer.train(args.resume)


def main():
    """Main training function."""
    parser = argparse.ArgumentParser(description="VisionUpscale ESRGAN Training")
    parser.add_argument("--config", type=str, default="config.yaml",
                       help="Path to configuration file")
    parser.add_argument("--resume", type=str, default=None,
                       help="Path to checkpoint to resume training from")
    parser.add_argument("--cpu", action="store_true",
                       help="Use CPU instead of GPU")
    parser.add_argument("--num_gpus", type=int, default=1,
                       help="Number of GPUs to use for training")
    parser.add_argument("--seed", type=int, default=42,
                       help="Random seed for reproducibility")
    
    args = parser.parse_args()
    
    # Load configuration
    with open(args.config, 'r') as f:
        config = yaml.safe_load(f)
    
    # Set random seed
    seed_everything(args.seed)
    
    # Distributed training setup
    if args.num_gpus > 1 and not args.cpu:
        world_size = args.num_gpus
        mp.spawn(main_worker,
                args=(world_size, config, args),
                nprocs=world_size,
                join=True)
    else:
        # Single GPU or CPU training
        main_worker(0, 1, config, args)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
VisionUpscale ESRGAN Evaluation Script
======================================
Evaluate trained ESRGAN model on validation/test datasets.

Computes:
- PSNR (Peak Signal-to-Noise Ratio)
- SSIM (Structural Similarity Index)
- Processing time and throughput
- Saves output images for visual inspection

Usage:
    python evaluate.py --checkpoint checkpoints/best_model.pth --output results/
    python evaluate.py --checkpoint checkpoints/best_model.pth --dataset Set5 --save-images
"""

import argparse
import os
import time
from pathlib import Path
from typing import Dict, List, Tuple

import yaml
import torch
import torch.nn as nn
import cv2
import numpy as np
from tqdm import tqdm
from PIL import Image

from models.generator import build_generator
from datasets.div2k_dataset import DIV2KDataset, InferenceDataset
from utils.metrics import compute_psnr, compute_ssim, MetricTracker
from utils.helpers import setup_logger, get_device, tensor_to_image


class ESRGANEvaluator:
    """Evaluate ESRGAN model on test datasets"""
    
    def __init__(self, config: Dict, args: argparse.Namespace):
        """Initialize evaluator"""
        self.config = config
        self.args = args
        
        # Setup device
        self.device = get_device()
        
        # Setup logging
        self.logger = setup_logger("visionupscale_eval")
        
        # Load model
        self.model = self._load_model()
        
        # Output directory
        self.output_dir = Path(args.output)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.logger.info("Evaluator initialized successfully")
    
    def _load_model(self) -> nn.Module:
        """Load trained model from checkpoint"""
        self.logger.info(f"Loading model from {self.args.checkpoint}")
        
        # Build model
        model = build_generator(self.config)
        model = model.to(self.device)
        
        # Load checkpoint
        checkpoint = torch.load(self.args.checkpoint, map_location=self.device)
        
        # Handle different checkpoint formats
        if "generator" in checkpoint:
            state_dict = checkpoint["generator"]
        elif "model_state_dict" in checkpoint:
            state_dict = checkpoint["model_state_dict"]
        else:
            state_dict = checkpoint
        
        # Remove 'module.' prefix if present (from DataParallel)
        from collections import OrderedDict
        new_state_dict = OrderedDict()
        for k, v in state_dict.items():
            name = k.replace("module.", "") if k.startswith("module.") else k
            new_state_dict[name] = v
        
        model.load_state_dict(new_state_dict)
        model.eval()
        
        self.logger.info("Model loaded successfully")
        return model
    
    def evaluate_dataset(self, dataset_name: str) -> Dict[str, float]:
        """Evaluate model on a specific dataset"""
        self.logger.info(f"Evaluating on {dataset_name} dataset...")
        
        # Load dataset
        dataset_path = Path(self.config["dataset"]["data_root"]) / dataset_name
        
        if not dataset_path.exists():
            self.logger.warning(f"Dataset {dataset_name} not found at {dataset_path}")
            return {}
        
        # Create dataset
        hr_dir = dataset_path / "HR" if (dataset_path / "HR").exists() else dataset_path
        lr_dir = dataset_path / "LR" if (dataset_path / "LR").exists() else None
        
        try:
            dataset = DIV2KDataset(
                hr_dir=str(hr_dir),
                patch_size=self.config["dataset"]["patch_size"],
                scale_factor=self.config["scale_factor"],
                split="val"
            )
        except Exception as e:
            self.logger.error(f"Failed to load dataset: {e}")
            return {}
        
        # Evaluate
        results = self._evaluate_images(dataset, dataset_name)
        
        return results
    
    def _evaluate_images(self, dataset, dataset_name: str) -> Dict[str, float]:
        """Evaluate model on images"""
        metric_tracker = MetricTracker()
        processing_times = []
        
        # Create output subdirectory
        output_subdir = self.output_dir / dataset_name
        if self.args.save_images:
            output_subdir.mkdir(exist_ok=True)
        
        # Process images
        with torch.no_grad():
            for idx in tqdm(range(len(dataset)), desc=f"Processing {dataset_name}"):
                lr_img, hr_img = dataset[idx]
                
                # Add batch dimension
                lr_batch = lr_img.unsqueeze(0).to(self.device)
                hr_batch = hr_img.unsqueeze(0).to(self.device)
                
                # Inference with timing
                start_time = time.time()
                sr_batch = self.model(lr_batch)
                torch.cuda.synchronize() if torch.cuda.is_available() else None
                processing_time = time.time() - start_time
                processing_times.append(processing_time)
                
                # Compute metrics
                metric_tracker.update(sr_batch, hr_batch)
                
                # Save images if requested
                if self.args.save_images:
                    img_name = dataset.get_image_name(idx)
                    self._save_comparison(
                        lr_img, sr_batch.squeeze(0), hr_img,
                        output_subdir / img_name
                    )
        
        # Compute average metrics
        avg_psnr, avg_ssim = metric_tracker.compute()
        avg_time = np.mean(processing_times)
        
        results = {
            "psnr": avg_psnr,
            "ssim": avg_ssim,
            "avg_time": avg_time,
            "fps": 1.0 / avg_time if avg_time > 0 else 0,
            "num_images": len(dataset)
        }
        
        # Log results
        self.logger.info(f"\n{dataset_name} Results:")
        self.logger.info(f"  PSNR: {avg_psnr:.2f} dB")
        self.logger.info(f"  SSIM: {avg_ssim:.4f}")
        self.logger.info(f"  Avg Time: {avg_time*1000:.2f} ms")
        self.logger.info(f"  FPS: {results['fps']:.2f}")
        
        return results
    
    def _save_comparison(self, lr_img: torch.Tensor, sr_img: torch.Tensor, 
                        hr_img: torch.Tensor, output_path: Path):
        """Save LR, SR, HR comparison image"""
        # Convert tensors to numpy images
        lr_np = tensor_to_image(lr_img)
        sr_np = tensor_to_image(sr_img)
        hr_np = tensor_to_image(hr_img)
        
        # Resize LR to match SR/HR size for comparison
        lr_resized = cv2.resize(lr_np, (sr_np.shape[1], sr_np.shape[0]), 
                               interpolation=cv2.INTER_CUBIC)
        
        # Create comparison grid
        comparison = np.hstack([lr_resized, sr_np, hr_np])
        
        # Save
        output_path.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(comparison).save(output_path)
    
    def evaluate_all(self):
        """Evaluate on all configured test datasets"""
        test_datasets = self.config["evaluation"].get("test_datasets", ["DIV2K_val"])
        
        all_results = {}
        for dataset_name in test_datasets:
            results = self.evaluate_dataset(dataset_name)
            if results:
                all_results[dataset_name] = results
        
        # Save results to file
        results_file = self.output_dir / "evaluation_results.yaml"
        with open(results_file, 'w') as f:
            yaml.dump(all_results, f, default_flow_style=False)
        
        self.logger.info(f"\nResults saved to {results_file}")
        
        # Print summary
        self._print_summary(all_results)
    
    def _print_summary(self, results: Dict[str, Dict]):
        """Print evaluation summary"""
        print("\n" + "="*60)
        print("EVALUATION SUMMARY")
        print("="*60)
        
        for dataset_name, metrics in results.items():
            print(f"\n{dataset_name}:")
            print(f"  PSNR: {metrics['psnr']:.2f} dB")
            print(f"  SSIM: {metrics['ssim']:.4f}")
            print(f"  Avg Time: {metrics['avg_time']*1000:.2f} ms")
            print(f"  FPS: {metrics['fps']:.2f}")
        
        print("\n" + "="*60)


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="VisionUpscale ESRGAN Evaluation")
    
    parser.add_argument("--config", type=str, default="config.yaml",
                       help="Path to configuration file")
    parser.add_argument("--checkpoint", type=str, required=True,
                       help="Path to model checkpoint")
    parser.add_argument("--output", type=str, default="outputs/evaluation",
                       help="Output directory for results")
    parser.add_argument("--dataset", type=str, default=None,
                       help="Specific dataset to evaluate (optional)")
    parser.add_argument("--save-images", action="store_true",
                       help="Save output images")
    parser.add_argument("--gpu", type=int, default=0,
                       help="GPU device ID")
    
    return parser.parse_args()


def main():
    """Main evaluation function"""
    args = parse_args()
    
    # Load configuration
    with open(args.config, 'r') as f:
        config = yaml.safe_load(f)
    
    # Create evaluator
    evaluator = ESRGANEvaluator(config, args)
    
    # Evaluate
    if args.dataset:
        # Evaluate single dataset
        evaluator.evaluate_dataset(args.dataset)
    else:
        # Evaluate all configured datasets
        evaluator.evaluate_all()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Generate Low-Resolution Image Pairs
====================================
Generate low-resolution versions of high-resolution images using bicubic downsampling.

This is useful for:
- Pre-generating LR images to speed up training
- Creating test datasets
- Benchmarking super-resolution methods

Usage:
    python generate_lr_pairs.py --input model/data/DIV2K/DIV2K_train_HR --output model/data/DIV2K/DIV2K_train_LR --scale 4
    python generate_lr_pairs.py --input model/data/DIV2K/DIV2K_valid_HR --output model/data/DIV2K/DIV2K_valid_LR --scale 4
"""

import argparse
import os
import sys
from pathlib import Path
from typing import List
import cv2
import numpy as np
from tqdm import tqdm
from PIL import Image


def generate_lr_image(hr_image: np.ndarray, scale: int) -> np.ndarray:
    """Generate LR image from HR using bicubic downsampling"""
    h, w = hr_image.shape[:2]
    lr_h, lr_w = h // scale, w // scale
    
    lr_image = cv2.resize(hr_image, (lr_w, lr_h), interpolation=cv2.INTER_CUBIC)
    return lr_image


def process_images(input_dir: Path, output_dir: Path, scale: int, 
                   file_extensions: List[str] = ['.png', '.jpg', '.jpeg']):
    """Process all images in directory"""
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Get all image files
    image_files = []
    for ext in file_extensions:
        image_files.extend(list(input_dir.glob(f"*{ext}")))
        image_files.extend(list(input_dir.glob(f"*{ext.upper()}")))
    
    image_files = sorted(set(image_files))
    
    if not image_files:
        print(f"No images found in {input_dir}")
        return
    
    print(f"Found {len(image_files)} images")
    print(f"Generating LR images with scale factor {scale}x...")
    
    # Process each image
    for img_path in tqdm(image_files, desc="Processing"):
        try:
            # Read image
            img = cv2.imread(str(img_path), cv2.IMREAD_COLOR)
            
            if img is None:
                print(f"Warning: Could not read {img_path}")
                continue
            
            # Generate LR image
            lr_img = generate_lr_image(img, scale)
            
            # Save LR image
            output_path = output_dir / img_path.name
            cv2.imwrite(str(output_path), lr_img)
            
        except Exception as e:
            print(f"Error processing {img_path}: {e}")
    
    print(f"✓ LR images saved to {output_dir}")
    print(f"  HR size example: {img.shape[:2]}")
    print(f"  LR size example: {lr_img.shape[:2]}")


def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Generate LR image pairs")
    
    parser.add_argument("--input", type=str, required=True,
                       help="Input directory with HR images")
    parser.add_argument("--output", type=str, required=True,
                       help="Output directory for LR images")
    parser.add_argument("--scale", type=int, default=4,
                       help="Downscaling factor (default: 4)")
    parser.add_argument("--extensions", type=str, default=".png,.jpg,.jpeg",
                       help="Comma-separated file extensions")
    
    args = parser.parse_args()
    
    # Parse extensions
    extensions = [ext.strip() for ext in args.extensions.split(',')]
    
    # Process images
    try:
        process_images(
            Path(args.input),
            Path(args.output),
            args.scale,
            extensions
        )
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

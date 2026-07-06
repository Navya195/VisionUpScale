#!/usr/bin/env python3
"""
DIV2K Dataset Downloader
=========================
Downloads the DIV2K dataset for ESRGAN training.

DIV2K Dataset:
- 800 high-quality 2K resolution training images
- 100 validation images
- Official dataset for super-resolution benchmarks

Usage:
    python download_div2k.py --output model/data/DIV2K
    python download_div2k.py --output model/data/DIV2K --train-only
"""

import argparse
import os
import sys
from pathlib import Path
from typing import List
import urllib.request
import zipfile
import shutil
from tqdm import tqdm


# DIV2K dataset URLs
DIV2K_URLS = {
    "train_HR": "http://data.vision.ee.ethz.ch/cvl/DIV2K/DIV2K_train_HR.zip",
    "valid_HR": "http://data.vision.ee.ethz.ch/cvl/DIV2K/DIV2K_valid_HR.zip",
}


class DownloadProgressBar(tqdm):
    """Progress bar for downloads"""
    
    def update_to(self, b=1, bsize=1, tsize=None):
        if tsize is not None:
            self.total = tsize
        self.update(b * bsize - self.n)


def download_file(url: str, output_path: Path) -> Path:
    """Download file with progress bar"""
    print(f"Downloading {url}...")
    
    with DownloadProgressBar(unit='B', unit_scale=True,
                             miniters=1, desc=output_path.name) as t:
        urllib.request.urlretrieve(url, filename=output_path, reporthook=t.update_to)
    
    return output_path


def extract_zip(zip_path: Path, output_dir: Path):
    """Extract zip file"""
    print(f"Extracting {zip_path.name}...")
    
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        # Get file list
        file_list = zip_ref.namelist()
        
        # Extract with progress bar
        for file in tqdm(file_list, desc="Extracting"):
            zip_ref.extract(file, output_dir)
    
    print(f"Extracted to {output_dir}")


def download_div2k(output_dir: Path, train_only: bool = False):
    """Download DIV2K dataset"""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Temporary download directory
    download_dir = output_dir / "downloads"
    download_dir.mkdir(exist_ok=True)
    
    # Datasets to download
    datasets = ["train_HR"]
    if not train_only:
        datasets.append("valid_HR")
    
    for dataset_name in datasets:
        url = DIV2K_URLS[dataset_name]
        zip_filename = url.split("/")[-1]
        zip_path = download_dir / zip_filename
        
        # Download if not already present
        if zip_path.exists():
            print(f"{zip_filename} already downloaded")
        else:
            download_file(url, zip_path)
        
        # Extract
        extract_zip(zip_path, output_dir)
    
    # Cleanup
    print("Cleaning up...")
    shutil.rmtree(download_dir)
    
    # Verify dataset
    train_hr_dir = output_dir / "DIV2K_train_HR"
    valid_hr_dir = output_dir / "DIV2K_valid_HR"
    
    if train_hr_dir.exists():
        num_train = len(list(train_hr_dir.glob("*.png")))
        print(f"✓ Training images: {num_train}")
    
    if valid_hr_dir.exists():
        num_valid = len(list(valid_hr_dir.glob("*.png")))
        print(f"✓ Validation images: {num_valid}")
    
    print(f"\nDIV2K dataset downloaded successfully to {output_dir}")
    print("\nDirectory structure:")
    print(f"  {output_dir}/")
    print(f"    ├── DIV2K_train_HR/  (800 images)")
    if not train_only:
        print(f"    └── DIV2K_valid_HR/  (100 images)")


def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Download DIV2K dataset")
    
    parser.add_argument("--output", type=str, default="model/data/DIV2K",
                       help="Output directory for dataset")
    parser.add_argument("--train-only", action="store_true",
                       help="Download training set only")
    
    args = parser.parse_args()
    
    try:
        download_div2k(Path(args.output), args.train_only)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

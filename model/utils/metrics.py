"""
VisionUpscale - Image Quality Metrics
======================================
PSNR (Peak Signal-to-Noise Ratio) and SSIM (Structural Similarity Index)
computation for super-resolution evaluation.

Both metrics operate on tensors in [0, 1] range.
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import Union


# ─────────────────────────────────────────────
# PSNR
# ─────────────────────────────────────────────

def compute_psnr(
    sr: torch.Tensor,
    hr: torch.Tensor,
    max_val: float = 1.0,
    y_channel: bool = True,
) -> float:
    """
    Peak Signal-to-Noise Ratio (PSNR) in dB.

    PSNR = 10 * log10(MAX² / MSE)

    Args:
        sr: Super-resolved image tensor (B, C, H, W) or (C, H, W), range [0, 1].
        hr: High-resolution reference tensor, same shape as sr.
        max_val: Maximum pixel value (1.0 for [0,1] range).
        y_channel: If True, convert to YCbCr and compute on Y channel only
                   (standard SR benchmark protocol).

    Returns:
        PSNR value in dB (float). Returns inf if images are identical.
    """
    if sr.ndim == 3:
        sr = sr.unsqueeze(0)
        hr = hr.unsqueeze(0)

    sr = sr.clamp(0.0, 1.0)
    hr = hr.clamp(0.0, 1.0)

    if y_channel and sr.shape[1] == 3:
        sr = _rgb_to_y(sr)
        hr = _rgb_to_y(hr)

    mse = F.mse_loss(sr, hr, reduction="mean").item()
    if mse == 0:
        return float("inf")
    return 10.0 * math.log10(max_val ** 2 / mse)


# ─────────────────────────────────────────────
# SSIM
# ─────────────────────────────────────────────

class SSIMCalculator(nn.Module):
    """
    Structural Similarity Index Measure (SSIM).

    Computes SSIM using a Gaussian-weighted sliding window approach.
    Range: [-1, 1], where 1 means identical images.

    Args:
        window_size: Size of the Gaussian kernel (11 recommended).
        sigma: Gaussian kernel sigma.
        num_channels: Number of image channels.
        data_range: Pixel value range (1.0 for [0,1]).
    """

    # SSIM stability constants
    C1 = 0.01 ** 2  # (K1 * L)²
    C2 = 0.03 ** 2  # (K2 * L)²

    def __init__(
        self,
        window_size: int = 11,
        sigma: float = 1.5,
        num_channels: int = 1,
        data_range: float = 1.0,
    ) -> None:
        super().__init__()
        self.window_size = window_size
        self.num_channels = num_channels
        self.data_range = data_range

        kernel = self._gaussian_kernel(window_size, sigma)
        window = kernel.unsqueeze(0).unsqueeze(0)
        window = window.expand(num_channels, 1, window_size, window_size)
        self.register_buffer("window", window)

    @staticmethod
    def _gaussian_kernel(size: int, sigma: float) -> torch.Tensor:
        """Create 2D Gaussian kernel."""
        coords = torch.arange(size, dtype=torch.float32) - size // 2
        g = torch.exp(-(coords ** 2) / (2 * sigma ** 2))
        kernel_1d = g / g.sum()
        return torch.outer(kernel_1d, kernel_1d)

    def forward(self, sr: torch.Tensor, hr: torch.Tensor) -> torch.Tensor:
        """
        Args:
            sr: Super-resolved image (B, C, H, W), range [0, 1].
            hr: High-resolution reference (B, C, H, W), range [0, 1].

        Returns:
            Mean SSIM scalar tensor.
        """
        if sr.ndim == 3:
            sr = sr.unsqueeze(0)
            hr = hr.unsqueeze(0)

        sr = sr.clamp(0.0, self.data_range)
        hr = hr.clamp(0.0, self.data_range)

        window = self.window.to(sr.device, dtype=sr.dtype)
        pad = self.window_size // 2

        # Compute local means
        mu_sr = F.conv2d(sr, window, padding=pad, groups=self.num_channels)
        mu_hr = F.conv2d(hr, window, padding=pad, groups=self.num_channels)

        mu_sr_sq = mu_sr ** 2
        mu_hr_sq = mu_hr ** 2
        mu_sr_hr = mu_sr * mu_hr

        # Compute local variances and covariance
        sigma_sr_sq = (
            F.conv2d(sr * sr, window, padding=pad, groups=self.num_channels) - mu_sr_sq
        )
        sigma_hr_sq = (
            F.conv2d(hr * hr, window, padding=pad, groups=self.num_channels) - mu_hr_sq
        )
        sigma_sr_hr = (
            F.conv2d(sr * hr, window, padding=pad, groups=self.num_channels) - mu_sr_hr
        )

        C1 = (self.C1 * self.data_range) ** 2
        C2 = (self.C2 * self.data_range) ** 2

        numerator = (2 * mu_sr_hr + C1) * (2 * sigma_sr_hr + C2)
        denominator = (mu_sr_sq + mu_hr_sq + C1) * (sigma_sr_sq + sigma_hr_sq + C2)

        ssim_map = numerator / denominator
        return ssim_map.mean()


def compute_ssim(
    sr: torch.Tensor,
    hr: torch.Tensor,
    y_channel: bool = True,
) -> float:
    """
    Convenience function to compute SSIM.

    Args:
        sr: Super-resolved image tensor (B, C, H, W) or (C, H, W), range [0, 1].
        hr: High-resolution reference tensor.
        y_channel: If True, evaluate on Y channel (standard protocol).

    Returns:
        SSIM value (float) in range [0, 1].
    """
    if sr.ndim == 3:
        sr = sr.unsqueeze(0)
        hr = hr.unsqueeze(0)

    sr = sr.clamp(0.0, 1.0)
    hr = hr.clamp(0.0, 1.0)

    if y_channel and sr.shape[1] == 3:
        sr = _rgb_to_y(sr)
        hr = _rgb_to_y(hr)

    calculator = SSIMCalculator(num_channels=sr.shape[1]).to(sr.device)
    with torch.no_grad():
        ssim_val = calculator(sr, hr)
    return ssim_val.item()


# ─────────────────────────────────────────────
# Color Space Helpers
# ─────────────────────────────────────────────

def _rgb_to_y(image: torch.Tensor) -> torch.Tensor:
    """
    Convert RGB image tensor to Y channel (luminance) of YCbCr.
    Standard super-resolution benchmark evaluates on Y channel only.

    Args:
        image: RGB tensor (B, 3, H, W), range [0, 1].

    Returns:
        Y channel tensor (B, 1, H, W).
    """
    r, g, b = image[:, 0:1], image[:, 1:2], image[:, 2:3]
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return y


# ─────────────────────────────────────────────
# Batch Evaluation
# ─────────────────────────────────────────────

class MetricTracker:
    """
    Tracks running averages of PSNR and SSIM over a validation set.

    Usage:
        tracker = MetricTracker()
        for sr, hr in loader:
            tracker.update(sr, hr)
        avg_psnr, avg_ssim = tracker.compute()
    """

    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self._psnr_sum = 0.0
        self._ssim_sum = 0.0
        self._count = 0

    def update(self, sr: torch.Tensor, hr: torch.Tensor) -> None:
        """Update running sums with a batch of SR/HR pairs."""
        batch_size = sr.shape[0]
        for i in range(batch_size):
            self._psnr_sum += compute_psnr(sr[i], hr[i])
            self._ssim_sum += compute_ssim(sr[i], hr[i])
        self._count += batch_size

    def compute(self) -> tuple:
        """Returns (avg_psnr, avg_ssim)."""
        if self._count == 0:
            return 0.0, 0.0
        return self._psnr_sum / self._count, self._ssim_sum / self._count

    def __repr__(self) -> str:
        psnr, ssim = self.compute()
        return f"MetricTracker(n={self._count}, PSNR={psnr:.2f}dB, SSIM={ssim:.4f})"


if __name__ == "__main__":
    # Sanity checks
    a = torch.rand(2, 3, 128, 128)
    b = torch.rand(2, 3, 128, 128)

    psnr = compute_psnr(a, b)
    ssim = compute_ssim(a, b)
    print(f"PSNR: {psnr:.2f} dB")
    print(f"SSIM: {ssim:.4f}")

    # Identity test
    psnr_id = compute_psnr(a, a)
    print(f"Identity PSNR: {psnr_id}")  # Should be inf

    tracker = MetricTracker()
    tracker.update(a, b)
    print(tracker)
    print("Metrics: ✓")

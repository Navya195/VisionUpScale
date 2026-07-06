"""
VisionUpscale - Training Helpers
==================================
Utilities for checkpoint saving/loading, logging, plotting, and general
training infrastructure.
"""

import os
import logging
import random
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for server environments


# ─────────────────────────────────────────────
# Reproducibility
# ─────────────────────────────────────────────

def set_seed(seed: int = 42) -> None:
    """Set random seeds for full reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


# ─────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────

def setup_logger(
    name: str = "visionupscale",
    log_file: Optional[str] = None,
    level: int = logging.INFO,
) -> logging.Logger:
    """
    Create and configure a logger with console + optional file handler.

    Args:
        name: Logger name.
        log_file: Optional path to log file.
        level: Logging level.

    Returns:
        Configured logger.
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    fmt = logging.Formatter(
        "[%(asctime)s][%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Console handler
    ch = logging.StreamHandler()
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    # File handler
    if log_file:
        Path(log_file).parent.mkdir(parents=True, exist_ok=True)
        fh = logging.FileHandler(log_file)
        fh.setFormatter(fmt)
        logger.addHandler(fh)

    return logger


# ─────────────────────────────────────────────
# Checkpointing
# ─────────────────────────────────────────────

class CheckpointManager:
    """
    Manages saving and loading of training checkpoints.

    Saves:
        - Latest checkpoint (overwritten each save)
        - Best checkpoint (based on monitored metric)
        - Periodic checkpoints (every N epochs)

    Args:
        checkpoint_dir: Directory to save checkpoints.
        experiment_name: Prefix for checkpoint filenames.
        monitor: Metric name to track for best checkpoint.
        mode: 'max' (higher is better) or 'min' (lower is better).
    """

    def __init__(
        self,
        checkpoint_dir: str,
        experiment_name: str = "esrgan",
        monitor: str = "val_psnr",
        mode: str = "max",
    ) -> None:
        self.checkpoint_dir = Path(checkpoint_dir)
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        self.experiment_name = experiment_name
        self.monitor = monitor
        self.mode = mode
        self.best_value = float("-inf") if mode == "max" else float("inf")
        self.best_epoch = -1

    def _is_better(self, value: float) -> bool:
        if self.mode == "max":
            return value > self.best_value
        return value < self.best_value

    def save(
        self,
        epoch: int,
        generator: nn.Module,
        discriminator: nn.Module,
        g_optimizer: torch.optim.Optimizer,
        d_optimizer: torch.optim.Optimizer,
        metrics: dict,
        save_periodic: bool = False,
    ) -> bool:
        """
        Save checkpoint. Returns True if this was the best checkpoint.

        Args:
            epoch: Current epoch number.
            generator: Generator model state.
            discriminator: Discriminator model state.
            g_optimizer: Generator optimizer state.
            d_optimizer: Discriminator optimizer state.
            metrics: Metric dict (must contain self.monitor key).
            save_periodic: If True, also save a named epoch checkpoint.

        Returns:
            True if this checkpoint is the new best.
        """
        state = {
            "epoch": epoch,
            "generator": generator.state_dict(),
            "discriminator": discriminator.state_dict(),
            "g_optimizer": g_optimizer.state_dict(),
            "d_optimizer": d_optimizer.state_dict(),
            "metrics": metrics,
        }

        # Save latest
        latest_path = self.checkpoint_dir / f"{self.experiment_name}_latest.pth"
        torch.save(state, latest_path)

        # Save periodic
        if save_periodic:
            periodic_path = (
                self.checkpoint_dir / f"{self.experiment_name}_epoch{epoch:04d}.pth"
            )
            torch.save(state, periodic_path)

        # Save best
        current = metrics.get(self.monitor, float("-inf"))
        is_best = self._is_better(current)
        if is_best:
            self.best_value = current
            self.best_epoch = epoch
            best_path = self.checkpoint_dir / f"{self.experiment_name}_best.pth"
            torch.save(state, best_path)

        return is_best

    def load(
        self,
        checkpoint_path: str,
        generator: nn.Module,
        discriminator: Optional[nn.Module] = None,
        g_optimizer: Optional[torch.optim.Optimizer] = None,
        d_optimizer: Optional[torch.optim.Optimizer] = None,
        device: str = "cpu",
    ) -> int:
        """
        Load checkpoint and restore model/optimizer states.

        Returns:
            Epoch number from checkpoint.
        """
        state = torch.load(checkpoint_path, map_location=device)
        generator.load_state_dict(state["generator"])
        if discriminator and "discriminator" in state:
            discriminator.load_state_dict(state["discriminator"])
        if g_optimizer and "g_optimizer" in state:
            g_optimizer.load_state_dict(state["g_optimizer"])
        if d_optimizer and "d_optimizer" in state:
            d_optimizer.load_state_dict(state["d_optimizer"])
        return state.get("epoch", 0)


# ─────────────────────────────────────────────
# Early Stopping
# ─────────────────────────────────────────────

class EarlyStopping:
    """
    Monitor a validation metric and signal early stopping if no improvement.

    Args:
        patience: Epochs to wait without improvement before stopping.
        monitor: Metric name to track.
        mode: 'max' or 'min'.
        min_delta: Minimum change to qualify as improvement.
    """

    def __init__(
        self,
        patience: int = 20,
        monitor: str = "val_psnr",
        mode: str = "max",
        min_delta: float = 1e-4,
    ) -> None:
        self.patience = patience
        self.monitor = monitor
        self.mode = mode
        self.min_delta = min_delta
        self.best_value = float("-inf") if mode == "max" else float("inf")
        self.counter = 0
        self.stop = False

    def step(self, metrics: dict) -> bool:
        """
        Update early stopping counter.

        Args:
            metrics: Dict with metric values.

        Returns:
            True if training should stop.
        """
        current = metrics.get(self.monitor, self.best_value)
        if self.mode == "max":
            improved = current > self.best_value + self.min_delta
        else:
            improved = current < self.best_value - self.min_delta

        if improved:
            self.best_value = current
            self.counter = 0
        else:
            self.counter += 1
            if self.counter >= self.patience:
                self.stop = True

        return self.stop


# ─────────────────────────────────────────────
# Loss Curve Plotting
# ─────────────────────────────────────────────

def plot_loss_curves(
    g_losses: list,
    d_losses: list,
    output_path: str,
    title: str = "ESRGAN Training Loss Curves",
) -> None:
    """
    Plot and save generator and discriminator loss curves.

    Args:
        g_losses: List of generator loss values per epoch.
        d_losses: List of discriminator loss values per epoch.
        output_path: Path to save the plot image.
        title: Plot title.
    """
    epochs = list(range(1, len(g_losses) + 1))

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.suptitle(title, fontsize=14, fontweight="bold")

    # Generator loss
    ax1 = axes[0]
    ax1.plot(epochs, g_losses, color="#4f8ef7", linewidth=2, label="Generator")
    ax1.set_xlabel("Epoch")
    ax1.set_ylabel("Loss")
    ax1.set_title("Generator Loss")
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    ax1.set_facecolor("#f8f9fa")

    # Discriminator loss
    ax2 = axes[1]
    ax2.plot(epochs, d_losses, color="#f97316", linewidth=2, label="Discriminator")
    ax2.set_xlabel("Epoch")
    ax2.set_ylabel("Loss")
    ax2.set_title("Discriminator Loss")
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    ax2.set_facecolor("#f8f9fa")

    plt.tight_layout()
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close(fig)


def plot_metrics_curves(
    psnr_history: list,
    ssim_history: list,
    output_path: str,
) -> None:
    """
    Plot PSNR and SSIM validation curves.

    Args:
        psnr_history: List of PSNR values per validation step.
        ssim_history: List of SSIM values per validation step.
        output_path: Path to save the plot image.
    """
    steps = list(range(1, len(psnr_history) + 1))

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.suptitle("Validation Metrics", fontsize=14, fontweight="bold")

    ax1 = axes[0]
    ax1.plot(steps, psnr_history, color="#10b981", linewidth=2, marker="o", markersize=4)
    ax1.set_xlabel("Validation Step")
    ax1.set_ylabel("PSNR (dB)")
    ax1.set_title("Peak Signal-to-Noise Ratio")
    ax1.grid(True, alpha=0.3)
    ax1.set_facecolor("#f8f9fa")

    ax2 = axes[1]
    ax2.plot(steps, ssim_history, color="#8b5cf6", linewidth=2, marker="s", markersize=4)
    ax2.set_xlabel("Validation Step")
    ax2.set_ylabel("SSIM")
    ax2.set_title("Structural Similarity Index")
    ax2.grid(True, alpha=0.3)
    ax2.set_facecolor("#f8f9fa")

    plt.tight_layout()
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close(fig)


# ─────────────────────────────────────────────
# Device Utilities
# ─────────────────────────────────────────────

def get_device(prefer_gpu: bool = True) -> torch.device:
    """
    Get the best available compute device.

    Args:
        prefer_gpu: If True, use CUDA/MPS when available.

    Returns:
        torch.device instance.
    """
    if prefer_gpu:
        if torch.cuda.is_available():
            return torch.device("cuda")
        if torch.backends.mps.is_available():
            return torch.device("mps")
    return torch.device("cpu")


def count_parameters(model: nn.Module) -> int:
    """Count trainable parameters in a model."""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


def format_time(seconds: float) -> str:
    """Format elapsed seconds as human-readable string."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02d}h {m:02d}m {s:02d}s"

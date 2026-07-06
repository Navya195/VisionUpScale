"""
VisionUpscale - ESRGAN Generator (RRDB Network)
================================================
Implementation of the Enhanced Super-Resolution Generative Adversarial Network
generator based on Residual-in-Residual Dense Blocks (RRDB).

Reference:
    Wang et al., "ESRGAN: Enhanced Super-Resolution Generative Adversarial Networks"
    ECCV 2018 Workshop. https://arxiv.org/abs/1809.00219

Architecture:
    Input (LR) → Conv → [RRDB × N] → Conv → PixelShuffle (×4) → Conv → Output (SR)
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Optional


# ─────────────────────────────────────────────
# Dense Block Components
# ─────────────────────────────────────────────

class DenseLayer(nn.Module):
    """Single dense layer: Conv2d → LeakyReLU with dense skip connection."""

    def __init__(self, in_channels: int, growth_channels: int = 32) -> None:
        super().__init__()
        self.conv = nn.Conv2d(
            in_channels, growth_channels,
            kernel_size=3, stride=1, padding=1, bias=True
        )
        self.activation = nn.LeakyReLU(negative_slope=0.2, inplace=True)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.activation(self.conv(x))


class ResidualDenseBlock(nn.Module):
    """
    Residual Dense Block (RDB) with 5 convolutional layers.
    Each layer concatenates all previous feature maps (dense connections).

    Args:
        num_features: Base number of channels.
        growth_channels: Channels added per dense layer.
        beta: Residual scaling factor.
    """

    def __init__(
        self,
        num_features: int = 64,
        growth_channels: int = 32,
        beta: float = 0.2,
    ) -> None:
        super().__init__()
        self.beta = beta

        self.layers = nn.ModuleList()
        in_ch = num_features
        for i in range(5):
            out_ch = growth_channels if i < 4 else num_features
            self.layers.append(DenseLayer(in_ch, out_ch))
            in_ch += growth_channels

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = [x]
        for i, layer in enumerate(self.layers[:-1]):
            out = layer(torch.cat(features, dim=1))
            features.append(out)
        # Final layer: output has num_features channels, no concatenation needed
        out = self.layers[-1].conv(torch.cat(features, dim=1))
        return out * self.beta + x


class ResidualInResidualDenseBlock(nn.Module):
    """
    RRDB: Three stacked RDBs with a residual connection around them.
    This is the core building block of ESRGAN.

    Args:
        num_features: Number of feature channels.
        growth_channels: Growth channels per dense layer.
        beta: Residual scaling factor.
    """

    def __init__(
        self,
        num_features: int = 64,
        growth_channels: int = 32,
        beta: float = 0.2,
    ) -> None:
        super().__init__()
        self.beta = beta
        self.rdb1 = ResidualDenseBlock(num_features, growth_channels, beta)
        self.rdb2 = ResidualDenseBlock(num_features, growth_channels, beta)
        self.rdb3 = ResidualDenseBlock(num_features, growth_channels, beta)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out = self.rdb1(x)
        out = self.rdb2(out)
        out = self.rdb3(out)
        return out * self.beta + x


# ─────────────────────────────────────────────
# Upsampling Block
# ─────────────────────────────────────────────

class UpsampleBlock(nn.Module):
    """
    Upsampling via nearest-neighbor interpolation followed by Conv2d.
    This avoids checkerboard artifacts common in transposed convolutions.

    Args:
        num_features: Number of input/output feature channels.
        scale_factor: Upsampling factor (applied once per block → use 2× blocks for 4×).
    """

    def __init__(self, num_features: int, scale_factor: int = 2) -> None:
        super().__init__()
        self.upsample = nn.Upsample(scale_factor=scale_factor, mode="nearest")
        self.conv = nn.Conv2d(num_features, num_features, kernel_size=3, padding=1)
        self.activation = nn.LeakyReLU(negative_slope=0.2, inplace=True)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.activation(self.conv(self.upsample(x)))


# ─────────────────────────────────────────────
# ESRGAN Generator
# ─────────────────────────────────────────────

class ESRGANGenerator(nn.Module):
    """
    Full ESRGAN Generator network.

    Architecture:
        1. Initial feature extraction conv
        2. N × RRDB blocks
        3. Trunk conv (with residual)
        4. Two upsampling stages (2× each → 4× total)
        5. HR reconstruction convs

    Args:
        in_channels: Input image channels (3 for RGB).
        out_channels: Output image channels (3 for RGB).
        num_features: Base feature channels (64 in paper).
        num_rrdb_blocks: Number of RRDB blocks (23 in paper, 6 for lite).
        growth_channels: Dense layer growth rate (32 in paper).
        scale_factor: Super-resolution scale factor (4 in this project).
    """

    def __init__(
        self,
        in_channels: int = 3,
        out_channels: int = 3,
        num_features: int = 64,
        num_rrdb_blocks: int = 23,
        growth_channels: int = 32,
        scale_factor: int = 4,
    ) -> None:
        super().__init__()
        self.scale_factor = scale_factor

        # ── Initial feature extraction ──
        self.conv_first = nn.Conv2d(
            in_channels, num_features,
            kernel_size=3, stride=1, padding=1, bias=True
        )

        # ── RRDB body ──
        self.body = nn.Sequential(
            *[ResidualInResidualDenseBlock(num_features, growth_channels)
              for _ in range(num_rrdb_blocks)]
        )

        # ── Trunk conv after body ──
        self.conv_body = nn.Conv2d(
            num_features, num_features,
            kernel_size=3, stride=1, padding=1, bias=True
        )

        # ── Upsampling (two 2× stages = 4× total) ──
        assert scale_factor in (2, 4, 8), f"Unsupported scale factor: {scale_factor}"
        num_upsample_blocks = int(math.log2(scale_factor))
        self.upsample_blocks = nn.Sequential(
            *[UpsampleBlock(num_features, scale_factor=2)
              for _ in range(num_upsample_blocks)]
        )

        # ── High-resolution reconstruction ──
        self.conv_hr = nn.Conv2d(
            num_features, num_features,
            kernel_size=3, stride=1, padding=1, bias=True
        )
        self.conv_last = nn.Conv2d(
            num_features, out_channels,
            kernel_size=3, stride=1, padding=1, bias=True
        )

        self.activation = nn.LeakyReLU(negative_slope=0.2, inplace=True)

        # Weight initialization
        self._initialize_weights()

    def _initialize_weights(self) -> None:
        """Initialize weights using kaiming_normal for conv layers."""
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, a=0.2, nonlinearity="leaky_relu")
                if m.bias is not None:
                    nn.init.zeros_(m.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass.

        Args:
            x: Low-resolution input tensor of shape (B, C, H, W).
               Values should be in range [0, 1].

        Returns:
            Super-resolved tensor of shape (B, C, H*scale, W*scale).
            Values clipped to [0, 1].
        """
        feat = self.conv_first(x)
        body_out = self.conv_body(self.body(feat))
        feat = feat + body_out              # Long residual skip
        feat = self.upsample_blocks(feat)
        feat = self.activation(self.conv_hr(feat))
        out = self.conv_last(feat)
        return torch.clamp(out, 0.0, 1.0)

    @property
    def num_parameters(self) -> int:
        """Total trainable parameters."""
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


# ─────────────────────────────────────────────
# Lite Generator (for fast inference / demo)
# ─────────────────────────────────────────────

def build_generator(config: dict) -> ESRGANGenerator:
    """
    Build ESRGAN generator from config dictionary.

    Args:
        config: Dictionary with model.generator keys from config.yaml.

    Returns:
        Initialized ESRGANGenerator.
    """
    gen_cfg = config["model"]["generator"]
    return ESRGANGenerator(
        in_channels=gen_cfg["in_channels"],
        out_channels=gen_cfg["out_channels"],
        num_features=gen_cfg["num_features"],
        num_rrdb_blocks=gen_cfg["num_rrdb_blocks"],
        growth_channels=gen_cfg["growth_channels"],
        scale_factor=gen_cfg["scale_factor"],
    )


if __name__ == "__main__":
    # Quick sanity check
    import yaml

    with open("config.yaml") as f:
        cfg = yaml.safe_load(f)

    generator = build_generator(cfg)
    print(f"Generator parameters: {generator.num_parameters:,}")

    # Test forward pass
    dummy_lr = torch.randn(1, 3, 32, 32)
    with torch.no_grad():
        dummy_sr = generator(dummy_lr)

    print(f"LR shape: {dummy_lr.shape}  →  SR shape: {dummy_sr.shape}")
    assert dummy_sr.shape == (1, 3, 128, 128), "Output shape mismatch!"
    print("Generator forward pass: ✓")

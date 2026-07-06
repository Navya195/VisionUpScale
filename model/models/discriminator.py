"""
VisionUpscale - ESRGAN Discriminator
=====================================
VGG-style discriminator with spectral normalization for ESRGAN training.

The discriminator operates on full HR/SR images and outputs a probability
of whether the input is a real HR image or a generated SR image.

Reference:
    Wang et al., "ESRGAN: Enhanced Super-Resolution Generative Adversarial Networks"
    ECCV 2018 Workshop. https://arxiv.org/abs/1809.00219
"""

import torch
import torch.nn as nn
from torch.nn.utils import spectral_norm
from typing import List


# ─────────────────────────────────────────────
# Building Blocks
# ─────────────────────────────────────────────

def conv_block(
    in_channels: int,
    out_channels: int,
    stride: int = 1,
    use_spectral_norm: bool = True,
    use_batch_norm: bool = True,
) -> nn.Sequential:
    """
    Discriminator convolutional block:
        Conv2d → (BatchNorm) → LeakyReLU

    Args:
        in_channels: Input feature channels.
        out_channels: Output feature channels.
        stride: Convolution stride (1 or 2 for downsampling).
        use_spectral_norm: Apply spectral normalization for training stability.
        use_batch_norm: Apply batch normalization (skip for first block).

    Returns:
        Sequential block.
    """
    conv = nn.Conv2d(
        in_channels, out_channels,
        kernel_size=3, stride=stride, padding=1, bias=not use_batch_norm
    )
    if use_spectral_norm:
        conv = spectral_norm(conv)

    layers: List[nn.Module] = [conv]
    if use_batch_norm:
        layers.append(nn.BatchNorm2d(out_channels))
    layers.append(nn.LeakyReLU(negative_slope=0.2, inplace=True))

    return nn.Sequential(*layers)


# ─────────────────────────────────────────────
# VGG-style Discriminator
# ─────────────────────────────────────────────

class ESRGANDiscriminator(nn.Module):
    """
    VGG-style discriminator for ESRGAN.

    Accepts HR (real) or SR (fake) images and outputs a logit score.
    Alternates between stride-1 and stride-2 convolutions to progressively
    reduce spatial resolution while increasing channel depth.

    Architecture:
        Conv(3→64, s=1) → Conv(64→64, s=2)
        → Conv(64→128, s=1) → Conv(128→128, s=2)
        → Conv(128→256, s=1) → Conv(256→256, s=2)
        → Conv(256→512, s=1) → Conv(512→512, s=2)
        → AdaptiveAvgPool → FC(512×4×4, 1024) → FC(1024, 1)

    Args:
        in_channels: Input image channels (3 for RGB).
        num_features: Base number of feature channels.
        input_size: Expected spatial input size (height or width). Used for
                    computing the flattened FC input dimension.
    """

    def __init__(
        self,
        in_channels: int = 3,
        num_features: int = 64,
        input_size: int = 128,
    ) -> None:
        super().__init__()

        # ── Feature extractor (VGG-style) ──
        self.features = nn.Sequential(
            # Block 1 (no batch norm on first layer)
            conv_block(in_channels, num_features, stride=1,
                       use_batch_norm=False),                       # 128 → 128
            conv_block(num_features, num_features, stride=2),       # 128 → 64

            # Block 2
            conv_block(num_features, num_features * 2, stride=1),   # 64 → 64
            conv_block(num_features * 2, num_features * 2, stride=2),  # 64 → 32

            # Block 3
            conv_block(num_features * 2, num_features * 4, stride=1),  # 32 → 32
            conv_block(num_features * 4, num_features * 4, stride=2),  # 32 → 16

            # Block 4
            conv_block(num_features * 4, num_features * 8, stride=1),  # 16 → 16
            conv_block(num_features * 8, num_features * 8, stride=2),  # 16 → 8
        )

        # ── Global average pooling ──
        self.adaptive_pool = nn.AdaptiveAvgPool2d((4, 4))

        # ── Classifier ──
        self.classifier = nn.Sequential(
            nn.Linear(num_features * 8 * 4 * 4, 1024),
            nn.LeakyReLU(negative_slope=0.2, inplace=True),
            nn.Dropout(p=0.5),
            nn.Linear(1024, 1),
        )

        # Weight initialization
        self._initialize_weights()

    def _initialize_weights(self) -> None:
        """Initialize conv and linear layers."""
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, a=0.2, nonlinearity="leaky_relu")
                if m.bias is not None:
                    nn.init.zeros_(m.bias)
            elif isinstance(m, nn.Linear):
                nn.init.kaiming_normal_(m.weight, nonlinearity="leaky_relu")
                nn.init.zeros_(m.bias)
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.ones_(m.weight)
                nn.init.zeros_(m.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass.

        Args:
            x: Input image tensor of shape (B, C, H, W).
               Values should be in range [0, 1].

        Returns:
            Logit scores of shape (B, 1).
            Use sigmoid(output) for probability.
        """
        feat = self.features(x)
        feat = self.adaptive_pool(feat)
        feat = feat.view(feat.size(0), -1)
        return self.classifier(feat)

    @property
    def num_parameters(self) -> int:
        """Total trainable parameters."""
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


# ─────────────────────────────────────────────
# Factory Function
# ─────────────────────────────────────────────

def build_discriminator(config: dict) -> ESRGANDiscriminator:
    """
    Build ESRGAN discriminator from config dictionary.

    Args:
        config: Dictionary with model.discriminator keys from config.yaml.

    Returns:
        Initialized ESRGANDiscriminator.
    """
    disc_cfg = config["model"]["discriminator"]
    patch_size = config["dataset"]["patch_size"]
    return ESRGANDiscriminator(
        in_channels=disc_cfg["in_channels"],
        num_features=disc_cfg["num_features"],
        input_size=patch_size,
    )


if __name__ == "__main__":
    import yaml

    with open("config.yaml") as f:
        cfg = yaml.safe_load(f)

    discriminator = build_discriminator(cfg)
    print(f"Discriminator parameters: {discriminator.num_parameters:,}")

    # Test forward pass
    dummy_hr = torch.randn(2, 3, 128, 128)
    logits = discriminator(dummy_hr)
    print(f"Input: {dummy_hr.shape}  →  Logits: {logits.shape}")
    assert logits.shape == (2, 1), "Output shape mismatch!"
    print("Discriminator forward pass: ✓")

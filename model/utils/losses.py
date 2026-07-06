"""
VisionUpscale - Loss Functions
================================
Implements composite loss used in ESRGAN training:
    1. Pixel Loss (L1): Low-level pixel fidelity.
    2. Perceptual Loss (VGG-based): High-level semantic similarity.
    3. Adversarial Loss (Relativistic GAN): Encourage photo-realistic outputs.

Reference:
    Wang et al., "ESRGAN: Enhanced Super-Resolution Generative Adversarial Networks"
    ECCV 2018 Workshop. https://arxiv.org/abs/1809.00219
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as tv_models
from typing import Tuple


# ─────────────────────────────────────────────
# Pixel Loss
# ─────────────────────────────────────────────

class PixelLoss(nn.Module):
    """
    L1 (MAE) pixel loss between SR and HR images.
    Used in the PSNR-oriented pre-training phase.
    """

    def __init__(self) -> None:
        super().__init__()
        self.criterion = nn.L1Loss()

    def forward(self, sr: torch.Tensor, hr: torch.Tensor) -> torch.Tensor:
        """
        Args:
            sr: Super-resolved image (B, C, H, W), range [0, 1].
            hr: High-resolution target (B, C, H, W), range [0, 1].

        Returns:
            Scalar L1 loss.
        """
        return self.criterion(sr, hr)


# ─────────────────────────────────────────────
# VGG Perceptual Loss
# ─────────────────────────────────────────────

class VGGPerceptualLoss(nn.Module):
    """
    Perceptual loss using pre-trained VGG19 feature maps.

    Computes L1 distance between VGG feature activations of SR and HR images.
    Features extracted from 'relu3_4' (block 3, conv 4) as in ESRGAN paper.

    Args:
        feature_layer: VGG feature layer index to extract from.
        use_input_norm: Normalize inputs with ImageNet mean/std before VGG.
    """

    # ImageNet normalization constants
    MEAN = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1)
    STD = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1)

    def __init__(
        self,
        feature_layer: int = 34,  # relu3_4 in VGG19
        use_input_norm: bool = True,
    ) -> None:
        super().__init__()
        self.use_input_norm = use_input_norm

        # Load pre-trained VGG19 and extract up to the feature layer
        vgg = tv_models.vgg19(weights=tv_models.VGG19_Weights.IMAGENET1K_V1)
        self.feature_extractor = nn.Sequential(
            *list(vgg.features.children())[:feature_layer]
        )

        # Freeze VGG weights
        for param in self.feature_extractor.parameters():
            param.requires_grad = False

        # Register normalization buffers
        self.register_buffer("mean", self.MEAN)
        self.register_buffer("std", self.STD)

    def _normalize(self, x: torch.Tensor) -> torch.Tensor:
        """Normalize image tensor with ImageNet statistics."""
        return (x - self.mean) / self.std

    def forward(self, sr: torch.Tensor, hr: torch.Tensor) -> torch.Tensor:
        """
        Args:
            sr: Super-resolved image (B, C, H, W), range [0, 1].
            hr: High-resolution target (B, C, H, W), range [0, 1].

        Returns:
            Scalar perceptual loss.
        """
        if self.use_input_norm:
            sr = self._normalize(sr)
            hr = self._normalize(hr)

        sr_features = self.feature_extractor(sr)
        hr_features = self.feature_extractor(hr)

        return F.l1_loss(sr_features, hr_features.detach())


# ─────────────────────────────────────────────
# Relativistic Adversarial Loss
# ─────────────────────────────────────────────

class RelativeAdversarialLoss(nn.Module):
    """
    Relativistic Average GAN (Ra-GAN) loss.

    Instead of predicting absolute realness, the discriminator predicts
    the probability that real images are MORE realistic than fake ones on average.

    Reference:
        Jolicoeur-Martineau, "The relativistic discriminator: a key element missing
        from standard GAN", ICLR 2019.
    """

    def __init__(self) -> None:
        super().__init__()

    def generator_loss(
        self,
        real_logits: torch.Tensor,
        fake_logits: torch.Tensor,
    ) -> torch.Tensor:
        """
        Generator relativistic loss.
        Goal: make fake images appear more real than real images on average.

        Args:
            real_logits: Discriminator output for real HR images.
            fake_logits: Discriminator output for fake SR images.

        Returns:
            Scalar generator adversarial loss.
        """
        real_avg = real_logits.mean()
        g_loss = (
            F.binary_cross_entropy_with_logits(
                fake_logits - real_avg, torch.ones_like(fake_logits)
            )
            + F.binary_cross_entropy_with_logits(
                real_logits - fake_logits.mean(), torch.zeros_like(real_logits)
            )
        ) / 2
        return g_loss

    def discriminator_loss(
        self,
        real_logits: torch.Tensor,
        fake_logits: torch.Tensor,
    ) -> torch.Tensor:
        """
        Discriminator relativistic loss.
        Goal: make real images appear more real than fake images on average.

        Args:
            real_logits: Discriminator output for real HR images.
            fake_logits: Discriminator output for fake SR images.

        Returns:
            Scalar discriminator adversarial loss.
        """
        fake_avg = fake_logits.mean()
        d_loss = (
            F.binary_cross_entropy_with_logits(
                real_logits - fake_avg, torch.ones_like(real_logits)
            )
            + F.binary_cross_entropy_with_logits(
                fake_logits - real_logits.mean(), torch.zeros_like(fake_logits)
            )
        ) / 2
        return d_loss


# ─────────────────────────────────────────────
# Combined ESRGAN Loss
# ─────────────────────────────────────────────

class ESRGANGeneratorLoss(nn.Module):
    """
    Combined generator loss for ESRGAN:
        L_G = λ_pixel * L_pixel + λ_percept * L_percept + λ_adv * L_adv

    Args:
        pixel_weight: Weight for pixel loss.
        perceptual_weight: Weight for perceptual loss.
        adversarial_weight: Weight for adversarial loss.
    """

    def __init__(
        self,
        pixel_weight: float = 1e-2,
        perceptual_weight: float = 1.0,
        adversarial_weight: float = 5e-3,
    ) -> None:
        super().__init__()
        self.pixel_weight = pixel_weight
        self.perceptual_weight = perceptual_weight
        self.adversarial_weight = adversarial_weight

        self.pixel_loss = PixelLoss()
        self.perceptual_loss = VGGPerceptualLoss()
        self.adversarial_loss = RelativeAdversarialLoss()

    def forward(
        self,
        sr: torch.Tensor,
        hr: torch.Tensor,
        real_logits: torch.Tensor,
        fake_logits: torch.Tensor,
    ) -> Tuple[torch.Tensor, dict]:
        """
        Args:
            sr: Super-resolved output (B, C, H, W).
            hr: High-resolution target (B, C, H, W).
            real_logits: Discriminator logits for HR images.
            fake_logits: Discriminator logits for SR images.

        Returns:
            (total_loss, loss_dict) where loss_dict has per-component values.
        """
        l_pixel = self.pixel_loss(sr, hr)
        l_percept = self.perceptual_loss(sr, hr)
        l_adv = self.adversarial_loss.generator_loss(real_logits, fake_logits)

        total = (
            self.pixel_weight * l_pixel
            + self.perceptual_weight * l_percept
            + self.adversarial_weight * l_adv
        )

        loss_dict = {
            "g_total": total.item(),
            "g_pixel": l_pixel.item(),
            "g_perceptual": l_percept.item(),
            "g_adversarial": l_adv.item(),
        }

        return total, loss_dict


if __name__ == "__main__":
    # Sanity check losses
    sr = torch.rand(2, 3, 128, 128)
    hr = torch.rand(2, 3, 128, 128)
    real_logits = torch.randn(2, 1)
    fake_logits = torch.randn(2, 1)

    criterion = ESRGANGeneratorLoss()
    g_loss, losses = criterion(sr, hr, real_logits, fake_logits)
    print(f"Generator loss: {g_loss.item():.4f}")
    print(f"  Components: {losses}")

    rel_loss = RelativeAdversarialLoss()
    d_loss = rel_loss.discriminator_loss(real_logits, fake_logits)
    print(f"Discriminator loss: {d_loss.item():.4f}")
    print("Loss functions: ✓")

# VisionUpscale - API Reference

Complete API documentation for all Python modules and JavaScript functions.

---

## 🐍 Python ML Pipeline API

### Generator Module

#### `ESRGANGenerator` Class

```python
from model.models.generator import ESRGANGenerator

# Initialize
generator = ESRGANGenerator(
    in_channels=3,              # RGB input
    out_channels=3,             # RGB output
    num_features=64,            # Feature channels
    num_rrdb_blocks=23,         # Number of RRDB blocks
    growth_channels=32,         # Growth per dense layer
    scale_factor=4              # 4x upscaling
)

# Forward pass
lr_image = torch.randn(1, 3, 32, 32)
sr_image = generator(lr_image)  # Output: (1, 3, 128, 128)

# Access properties
print(generator.num_parameters)  # Total trainable params
print(generator.scale_factor)    # Upscaling factor
```

**Methods**:
- `forward(x)` - Upscale image (B, 3, H, W) → (B, 3, 4H, 4W)
- `_initialize_weights()` - Kaiming initialization

**Properties**:
- `num_parameters` - Count trainable parameters

---

### Discriminator Module

#### `ESRGANDiscriminator` Class

```python
from model.models.discriminator import ESRGANDiscriminator

# Initialize
discriminator = ESRGANDiscriminator(
    in_channels=3,              # RGB input
    num_features=64,            # Feature channels
    input_size=128              # Expected spatial size
)

# Forward pass
hr_image = torch.randn(2, 3, 128, 128)
logits = discriminator(hr_image)  # Output: (2, 1)

# Use with sigmoid for probability
prob = torch.sigmoid(logits)
print(prob)  # Values in [0, 1]
```

**Methods**:
- `forward(x)` - Discriminate image (B, 3, H, W) → (B, 1)
- `_initialize_weights()` - Kaiming initialization

**Properties**:
- `num_parameters` - Count trainable parameters

---

### Loss Functions Module

#### `PixelLoss` Class

```python
from model.utils.losses import PixelLoss

criterion = PixelLoss()

sr = torch.randn(2, 3, 128, 128)
hr = torch.randn(2, 3, 128, 128)

loss = criterion(sr, hr)  # Returns scalar tensor
```

#### `VGGPerceptualLoss` Class

```python
from model.utils.losses import VGGPerceptualLoss

criterion = VGGPerceptualLoss(
    feature_layer=34,           # relu3_4
    use_input_norm=True         # Normalize with ImageNet stats
)

loss = criterion(sr, hr)  # VGG19 feature-level loss
```

#### `RelativeAdversarialLoss` Class

```python
from model.utils.losses import RelativeAdversarialLoss

criterion = RelativeAdversarialLoss()

# Generator loss
g_loss = criterion.generator_loss(real_logits, fake_logits)

# Discriminator loss
d_loss = criterion.discriminator_loss(real_logits, fake_logits)
```

#### `ESRGANGeneratorLoss` Class

```python
from model.utils.losses import ESRGANGeneratorLoss

criterion = ESRGANGeneratorLoss(
    pixel_weight=1e-2,          # L1 weight
    perceptual_weight=1.0,      # VGG weight
    adversarial_weight=5e-3     # GAN weight
)

total_loss, loss_dict = criterion(sr, hr, real_logits, fake_logits)

print(f"Total: {loss_dict['g_total']:.4f}")
print(f"Pixel: {loss_dict['g_pixel']:.4f}")
print(f"Perceptual: {loss_dict['g_perceptual']:.4f}")
print(f"Adversarial: {loss_dict['g_adversarial']:.4f}")
```

---

### Metrics Module

#### `compute_psnr()` Function

```python
from model.utils.metrics import compute_psnr

psnr = compute_psnr(
    sr,                         # Super-resolved image
    hr,                         # High-resolution reference
    max_val=1.0,                # Pixel value range
    y_channel=True              # Evaluate on Y channel only
)

print(f"PSNR: {psnr:.2f} dB")  # Typical: 25-35 dB
```

**Parameters**:
- `sr` - Tensor (B, C, H, W) or (C, H, W), range [0, 1]
- `hr` - Same shape as sr
- `max_val` - Maximum pixel value (1.0 for [0, 1])
- `y_channel` - If True, convert RGB to Y (luminance) first

**Returns**: Float PSNR in dB (higher is better)

---

#### `compute_ssim()` Function

```python
from model.utils.metrics import compute_ssim

ssim = compute_ssim(
    sr,                         # Super-resolved image
    hr,                         # High-resolution reference
    y_channel=True              # Evaluate on Y channel only
)

print(f"SSIM: {ssim:.4f}")  # Typical: 0.8-0.95
```

**Returns**: Float SSIM in range [0, 1] (higher is better)

---

#### `MetricTracker` Class

```python
from model.utils.metrics import MetricTracker

tracker = MetricTracker()

for sr_batch, hr_batch in validation_loader:
    tracker.update(sr_batch, hr_batch)

avg_psnr, avg_ssim = tracker.compute()
print(f"PSNR: {avg_psnr:.2f}, SSIM: {avg_ssim:.4f}")

print(tracker)  # Nice formatted output
```

**Methods**:
- `update(sr, hr)` - Add batch to running average
- `compute()` - Returns (avg_psnr, avg_ssim)
- `reset()` - Clear statistics

---

### Dataset Module

#### `DIV2KDataset` Class

```python
from model.datasets.div2k_dataset import DIV2KDataset

dataset = DIV2KDataset(
    hr_dir="data/DIV2K/DIV2K_train_HR",
    patch_size=128,             # Extract patches
    scale_factor=4,             # Generate LR by downsampling
    split="train",              # 'train' or 'val'
    augmentation=True           # Flip, rotate, etc.
)

# Get sample
lr, hr = dataset[0]
print(lr.shape)  # (3, 32, 32) - LR patch
print(hr.shape)  # (3, 128, 128) - HR patch
```

**Parameters**:
- `hr_dir` - Directory with HR images
- `patch_size` - Patch size for training
- `scale_factor` - Downsampling factor for LR generation
- `split` - 'train' or 'val'
- `augmentation` - Apply random augmentations

---

#### `InferenceDataset` Class

```python
from model.datasets.div2k_dataset import InferenceDataset

dataset = InferenceDataset(
    hr_dir="data/test",         # Directory with images
    scale_factor=4              # Generate LR versions
)

for i in range(len(dataset)):
    lr, hr = dataset[i]
    # Process...
```

---

### Training Module

#### `ESRGANTrainer` Class

```python
from model.train import ESRGANTrainer
import yaml
import argparse

# Load config
with open('config.yaml') as f:
    config = yaml.safe_load(f)

# Create args
args = argparse.Namespace(
    gpu=0,
    checkpoint=None,
    resume=False,
    debug=False
)

# Initialize trainer
trainer = ESRGANTrainer(config, args)

# Train
trainer.train()
```

**Key Methods**:
- `train()` - Main training loop
- `_build_models()` - Initialize G and D
- `_build_optimizers()` - Set up optimizers
- `_build_loss_functions()` - Initialize loss functions
- `_build_dataloaders()` - Load data

---

### Evaluation Module

#### `ESRGANEvaluator` Class

```python
from model.evaluate import ESRGANEvaluator
import yaml
import argparse

config = yaml.safe_load(open('config.yaml'))
args = argparse.Namespace(
    checkpoint='checkpoints/best.pth',
    output='outputs/eval',
    dataset=None,
    save_images=True,
    gpu=0
)

evaluator = ESRGANEvaluator(config, args)
evaluator.evaluate_all()

# Access results
results = evaluator._print_summary({})
```

---

### ONNX Export Module

#### `ONNXExporter` Class

```python
from model.export_onnx import ONNXExporter
import yaml
import argparse

config = yaml.safe_load(open('config.yaml'))
args = argparse.Namespace(
    checkpoint='checkpoints/best.pth',
    output='outputs',
    no_simplify=False,
    fp16=False,
    test=True,
    gpu=0
)

exporter = ONNXExporter(config, args)
onnx_path = exporter.export()  # Returns path to ONNX model

# Test ONNX model
exporter.test_onnx_inference(onnx_path)
```

---

## 🌐 JavaScript Web API

### ONNX Inference Module

#### `loadModel()` Function

```javascript
import { loadModel, isModelLoaded, getModelError } from '../utils/onnxInference';

// Load model with progress callback
await loadModel((progress) => {
  console.log(`Loading: ${progress}%`);
});

if (isModelLoaded()) {
  console.log('Model ready');
} else {
  console.error(getModelError());
}
```

**Parameters**:
- `onProgress` - Callback function (progress: 0-100)

**Returns**: Promise

---

#### `upscaleImage()` Function

```javascript
import { upscaleImage } from '../utils/onnxInference';

// Upscale image with progress
const outputImageData = await upscaleImage(inputImageData, (progress) => {
  console.log(`Progress: ${progress}%`);
});

console.log(`Output size: ${outputImageData.width}×${outputImageData.height}`);
```

**Parameters**:
- `imageData` - ImageData object (from canvas)
- `onProgress` - Progress callback

**Returns**: Promise<ImageData>

---

#### `upscaleBicubic()` Function

```javascript
import { upscaleBicubic } from '../utils/onnxInference';

// Fallback bicubic upscaling
const output = upscaleBicubic(inputImageData, 4);  // 4x scaling
```

**Parameters**:
- `imageData` - ImageData object
- `scaleFactor` - Upscaling factor (default: 4)

**Returns**: ImageData

---

### Image Processing Module

#### `loadImageFile()` Function

```javascript
import { loadImageFile } from '../utils/imageProcessing';

const file = /* from input or drag-drop */;
const imageData = await loadImageFile(file);
```

**Parameters**:
- `file` - File object from input or drag-drop

**Returns**: Promise<ImageData>

---

#### `canvasToImageData()` Function

```javascript
import { canvasToImageData } from '../utils/imageProcessing';

const canvas = document.createElement('canvas');
const imageData = canvasToImageData(canvas);
```

**Parameters**:
- `canvas` - HTML Canvas element

**Returns**: ImageData

---

#### `downloadImage()` Function

```javascript
import { downloadImage } from '../utils/imageProcessing';

// Download as PNG
await downloadImage(imageData, 'upscaled.png', 'image/png');

// Download as JPEG
await downloadImage(imageData, 'upscaled.jpg', 'image/jpeg', 0.95);
```

**Parameters**:
- `imageData` - ImageData object
- `filename` - Download filename
- `mimeType` - 'image/png' or 'image/jpeg'
- `quality` - JPEG quality (0-1, default: 0.92)

**Returns**: Promise (void)

---

#### `resizeImage()` Function

```javascript
import { resizeImage } from '../utils/imageProcessing';

const resized = resizeImage(imageData, 256, 256);  // Bicubic resize
```

---

### Custom Hook: useUpscaler

#### `useUpscaler()` Hook

```javascript
import { useUpscaler } from '../hooks/useUpscaler';

function MyComponent() {
  const {
    image,                    // Current image data
    upscaled,                 // Upscaled result
    isLoading,                // Processing state
    progress,                 // Progress 0-100
    error,                    // Error message
    stats,                    // Processing stats
    loadImage,                // Load image from file
    upscale,                  // Start upscaling
    download,                 // Download result
    reset,                    // Reset state
  } = useUpscaler();

  return (
    <div>
      <input 
        type="file" 
        onChange={(e) => loadImage(e.target.files[0])}
      />
      <button onClick={upscale} disabled={!image}>
        Upscale
      </button>
      {isLoading && <p>Progress: {progress}%</p>}
      {upscaled && <button onClick={download}>Download</button>}
    </div>
  );
}
```

**Returns Object**:
- `image` - Current ImageData
- `upscaled` - Result ImageData
- `isLoading` - Boolean
- `progress` - 0-100
- `error` - Error string or null
- `stats` - { originalSize, upscaledSize, processingTime, method }
- `loadImage(file)` - Promise
- `upscale()` - Promise
- `download(format='png')` - Promise
- `reset()` - Void

---

## 📊 Data Structures

### Config Schema

```yaml
# model/config.yaml structure
experiment_name: string
scale_factor: int
seed: int
output_dir: string
checkpoint_dir: string
log_dir: string

dataset:
  name: string
  data_root: string
  train_hr_dir: string
  val_hr_dir: string
  patch_size: int
  augmentation:
    horizontal_flip: bool
    vertical_flip: bool
    rotation: bool
  num_workers: int

model:
  generator:
    in_channels: int
    out_channels: int
    num_features: int
    num_rrdb_blocks: int
    growth_channels: int
    scale_factor: int
  discriminator:
    in_channels: int
    num_features: int

training:
  pretrain:
    enabled: bool
    epochs: int
    batch_size: int
    learning_rate: float
    scheduler:
      type: string
      milestones: [int]
      gamma: float
  gan:
    epochs: int
    batch_size: int
    generator_lr: float
    discriminator_lr: float
    scheduler:
      type: string
      milestones: [int]
      gamma: float
  loss:
    pixel_weight: float
    perceptual_weight: float
    adversarial_weight: float
  mixed_precision: bool
  early_stopping:
    enabled: bool
    patience: int
    monitor: string
    mode: string
  save_every_n_epochs: int
  save_best: bool
  val_every_n_epochs: int

logging:
  tensorboard: bool
  log_images: bool
  log_image_every: int
  num_log_images: int

onnx:
  opset_version: int
  dynamic_axes: dict
  optimize: bool
  quantize: bool
  output_path: string

evaluation:
  test_hr_dir: string
  results_dir: string
  save_sr_images: bool
```

---

## 🔄 Workflow Examples

### Complete Training Workflow

```python
# 1. Load config
with open('config.yaml') as f:
    config = yaml.safe_load(f)

# 2. Create trainer
trainer = ESRGANTrainer(config, args)

# 3. Train
trainer.train()  # Runs both phases

# 4. Evaluate
evaluator = ESRGANEvaluator(config, eval_args)
evaluator.evaluate_all()

# 5. Export
exporter = ONNXExporter(config, export_args)
onnx_path = exporter.export()
```

### Complete Web Upscaling Workflow

```javascript
// 1. Load model
await loadModel((progress) => {
  console.log(`Loaded: ${progress}%`);
});

// 2. Load image
const file = inputFile;
const imageData = await loadImageFile(file);

// 3. Upscale
const output = await upscaleImage(imageData, (progress) => {
  console.log(`Upscaling: ${progress}%`);
});

// 4. Download
await downloadImage(output, 'upscaled.png', 'image/png');
```

### Using useUpscaler Hook

```jsx
function App() {
  const upscaler = useUpscaler();

  const handleUpload = async (file) => {
    await upscaler.loadImage(file);
    await upscaler.upscale();
    await upscaler.download();
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
      {upscaler.isLoading && <p>Progress: {upscaler.progress}%</p>}
      {upscaler.error && <p>Error: {upscaler.error}</p>}
    </div>
  );
}
```

---

## 🎯 Common Use Cases

### Use Case 1: Train Custom Model

```python
# Modify config.yaml, then:
python model/train.py --config model/config.yaml
```

### Use Case 2: Evaluate Model

```python
python model/evaluate.py \
    --checkpoint checkpoints/best.pth \
    --save-images
```

### Use Case 3: Export to ONNX

```python
python model/export_onnx.py \
    --checkpoint checkpoints/best.pth \
    --fp16  # For faster inference
```

### Use Case 4: Batch Processing

```javascript
// In web app
const files = [...fileList];
for (const file of files) {
  const img = await loadImageFile(file);
  const output = await upscaleImage(img);
  await downloadImage(output, `upscaled_${file.name}`);
}
```

---

## 📚 Type Signatures

### Python Types

```python
# Tensors
import torch
Tensor = torch.Tensor
shape: Tuple[int, ...]

# Common tensor shapes
ImageBatch = Tensor  # (B, C, H, W)
LRImage = Tensor     # (B, 3, H/4, W/4)
SRImage = Tensor     # (B, 3, H, W)

# Loss values
ScalarLoss = Tensor  # ()
LossDictionary = Dict[str, float]

# Metrics
MetricsDict = Dict[str, float]
# {'psnr': 32.5, 'ssim': 0.90, ...}
```

### JavaScript Types

```javascript
// Images
ImageData = {
  width: number,
  height: number,
  data: Uint8ClampedArray  // RGBA pixels
}

// Stats
UpscaleStats = {
  originalSize: { width, height },
  upscaledSize: { width, height },
  processingTime: number,  // milliseconds
  method: 'onnx' | 'bicubic'
}

// Progress callback
OnProgress = (progress: 0-100) => void
```

---

## ✅ Error Handling

### Python Errors

```python
# Model loading
try:
    checkpoint = torch.load(path)
except FileNotFoundError:
    logger.error("Checkpoint not found")
except Exception as e:
    logger.error(f"Failed to load: {e}")

# Training
try:
    trainer.train()
except torch.cuda.OutOfMemoryError:
    logger.error("GPU out of memory - reduce batch size")
except KeyboardInterrupt:
    logger.info("Training interrupted by user")
```

### JavaScript Errors

```javascript
try {
  await loadModel();
} catch (e) {
  console.error('Model loading failed:', e);
  // Fallback to bicubic
}

try {
  const output = await upscaleImage(imageData);
} catch (e) {
  if (e.message === 'Out of memory') {
    // Use tiling
  }
}
```

---

**Complete API reference for VisionUpscale. Refer back whenever you need details!**

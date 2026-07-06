# VisionUpscale - Advanced Guide

**For experienced users who want to customize, extend, and optimize the project.**

---

## 🔧 Advanced Configuration

### 1. Fine-tuning Hyperparameters

#### For Better Quality (Slower Training)
```yaml
# model/config.yaml
training:
  pretrain:
    epochs: 100              # ← Increase from 50
    learning_rate: 1.0e-4    # ← Smaller LR for stability
  gan:
    epochs: 300              # ← Increase from 200
    generator_lr: 5.0e-5     # ← Smaller LR
    discriminator_lr: 5.0e-5 # ← Smaller LR
  
  loss:
    pixel_weight: 5.0e-3     # ← Increase pixel fidelity
    perceptual_weight: 1.5   # ← Increase perceptual
    adversarial_weight: 1.0e-2  # ← Increase realism

model:
  generator:
    num_rrdb_blocks: 23      # ← Full model (no change)
    growth_channels: 64      # ← Increase from 32
```

**Expected Impact**:
- +2-3 dB PSNR improvement
- +0.05-0.10 SSIM improvement
- 4-6x longer training time

#### For Faster Training (Lower Quality)
```yaml
training:
  pretrain:
    epochs: 20               # ← Reduce from 50
    learning_rate: 5.0e-4    # ← Larger LR
  gan:
    epochs: 50               # ← Reduce from 200
    generator_lr: 2.0e-4     # ← Larger LR
    discriminator_lr: 2.0e-4 # ← Larger LR

model:
  generator:
    num_rrdb_blocks: 6       # ← Lite model
    num_features: 32         # ← Reduce from 64
```

**Expected Impact**:
- -2-3 dB PSNR
- -0.05-0.10 SSIM
- 10x faster training

#### For Balanced Performance
```yaml
training:
  pretrain:
    epochs: 30
    learning_rate: 2.0e-4
  gan:
    epochs: 100
    generator_lr: 1.0e-4
    discriminator_lr: 1.0e-4

model:
  generator:
    num_rrdb_blocks: 12      # ← Medium model
    num_features: 48         # ← Medium features
```

### 2. Learning Rate Scheduling

#### Using CosineAnnealing (Smooth decay)
```python
# In model/train.py, modify _build_optimizers()
from torch.optim.lr_scheduler import CosineAnnealingLR

scheduler = CosineAnnealingLR(
    optimizer,
    T_max=config['training']['gan']['epochs'],
    eta_min=1e-6
)
```

#### Using WarmupScheduler (Better convergence)
```python
from torch_warmup_scheduler import ExponentialWarmupScheduler

scheduler = ExponentialWarmupScheduler(
    optimizer,
    warmup_duration=10,
    lr_lambda=lambda x: 0.1 ** (x / 100)
)
```

### 3. Advanced Data Augmentation

```python
# In model/datasets/div2k_dataset.py, enhance augmentation
from torchvision.transforms import *

self.augmentation = Compose([
    RandomHorizontalFlip(p=0.5),
    RandomVerticalFlip(p=0.3),
    RandomRotation(degrees=15),
    ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
    RandomAffine(degrees=0, scale=(0.8, 1.2), shear=10),  # ← NEW: Scale & shear
    GaussianBlur(kernel_size=3, sigma=(0.1, 2.0)),        # ← NEW: Blur
    RandomPerspective(distortion_scale=0.3, p=0.5),       # ← NEW: Perspective
])
```

---

## 📊 Advanced Training Techniques

### 1. Multi-GPU Training

```bash
# Train on multiple GPUs
python -m torch.distributed.launch \
    --nproc_per_node=4 \
    model/train.py \
    --config model/config.yaml \
    --distributed
```

**In code** (model/train.py):
```python
if args.distributed:
    model = nn.parallel.DistributedDataParallel(
        model,
        device_ids=[args.local_rank],
        output_device=args.local_rank
    )
```

### 2. Gradient Accumulation (Larger effective batch size)

```python
# In model/train.py, modify training loop
accumulation_steps = 4  # Effective batch size: 16 * 4 = 64

for epoch in range(num_epochs):
    for i, (lr, hr) in enumerate(dataloader):
        sr = generator(lr)
        loss = criterion(sr, hr)
        
        loss = loss / accumulation_steps
        loss.backward()
        
        if (i + 1) % accumulation_steps == 0:
            optimizer.step()
            optimizer.zero_grad()
```

### 3. Automatic Mixed Precision (Faster + Less Memory)

```python
# Already partially supported - enable fully:
from torch.cuda.amp import autocast, GradScaler

scaler = GradScaler()

for epoch in range(num_epochs):
    for lr, hr in dataloader:
        with autocast():  # ← Automatic FP16 for forward pass
            sr = generator(lr)
            loss = criterion(sr, hr)
        
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
```

### 4. Adversarial Regularization

```python
# Advanced: Add spectral normalization to generator
from torch.nn.utils.spectral_norm import spectral_norm

self.conv_first = spectral_norm(
    nn.Conv2d(in_channels, num_features, 3, 1, 1)
)
```

---

## 🧠 Model Architecture Customization

### 1. Change Upsampling Method

```python
# In model/models/generator.py

# Option A: Use PixelShuffle (current - fastest)
# Option B: Use Transposed Convolution
class UpsampleBlockTransposed(nn.Module):
    def __init__(self, num_features, scale_factor=2):
        super().__init__()
        self.conv = nn.ConvTranspose2d(
            num_features, num_features,
            kernel_size=scale_factor*2,
            stride=scale_factor,
            padding=scale_factor//2
        )
        self.activation = nn.LeakyReLU(0.2, inplace=True)

    def forward(self, x):
        return self.activation(self.conv(x))

# Option C: Use Interpolation (better for 8x upsampling)
class UpsampleBlockInterp(nn.Module):
    def __init__(self, num_features, scale_factor=2):
        super().__init__()
        self.upsample = nn.Upsample(
            scale_factor=scale_factor,
            mode='bicubic',  # or 'nearest'
            align_corners=True
        )
        self.conv = nn.Conv2d(num_features, num_features, 3, 1, 1)
        self.activation = nn.LeakyReLU(0.2, inplace=True)

    def forward(self, x):
        return self.activation(self.conv(self.upsample(x)))
```

### 2. Add Residual Attention Blocks

```python
class AttentionBlock(nn.Module):
    def __init__(self, channels):
        super().__init__()
        self.query = nn.Conv2d(channels, channels // 8, 1)
        self.key = nn.Conv2d(channels, channels // 8, 1)
        self.value = nn.Conv2d(channels, channels // 8, 1)
        self.out = nn.Conv2d(channels // 8, channels, 1)
        self.gamma = nn.Parameter(torch.tensor(0.0))

    def forward(self, x):
        batch, channels, height, width = x.shape
        
        query = self.query(x).view(batch, -1, height * width)
        key = self.key(x).view(batch, -1, height * width)
        value = self.value(x).view(batch, -1, height * width)
        
        attention = torch.bmm(query.transpose(1, 2), key)
        attention = torch.softmax(attention / (channels ** 0.5), dim=-1)
        
        out = torch.bmm(value, attention.transpose(1, 2))
        out = out.view(batch, -1, height, width)
        out = self.out(out)
        
        return x + self.gamma * out
```

### 3. Modify to 8x Upscaling

```python
# In model/config.yaml
model:
  generator:
    scale_factor: 8  # ← Change from 4

# Generator will automatically create 3 upsampling blocks (2^3 = 8)
```

---

## 🎨 Advanced Web App Customization

### 1. Add Custom UI Themes

```javascript
// web/src/hooks/useUpscaler.js - Add theme management

const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const themes = {
    dark: { primary: '#3b82f6', background: '#1f2937' },
    light: { primary: '#2563eb', background: '#f9fafb' },
    ocean: { primary: '#0ea5e9', background: '#082f49' },
    forest: { primary: '#10b981', background: '#064e3b' },
  };

  return [theme, setTheme, themes[theme]];
};
```

```css
/* web/src/index.css - Add theme variants */
[data-theme="ocean"] {
  --color-primary: #0ea5e9;
  --color-secondary: #06b6d4;
  --color-background: #082f49;
}

[data-theme="forest"] {
  --color-primary: #10b981;
  --color-secondary: #14b8a6;
  --color-background: #064e3b;
}
```

### 2. Add Processing History

```javascript
// web/src/hooks/useUpscaler.js - Add history
const useUpscaler = () => {
  const [history, setHistory] = useState([]);

  const addToHistory = (original, upscaled, timestamp) => {
    setHistory(prev => [
      { original, upscaled, timestamp, id: Date.now() },
      ...prev.slice(0, 9)  // Keep last 10
    ]);
  };

  return {
    // ... existing
    history,
    addToHistory,
  };
};
```

### 3. Add Batch Processing

```jsx
// web/src/pages/Batch.jsx - NEW page for batch processing
import { useState } from 'react';
import { useUpscaler } from '../hooks/useUpscaler';

export default function Batch() {
  const [files, setFiles] = useState([]);
  const { upscaleImage } = useUpscaler();

  const processBatch = async () => {
    for (const file of files) {
      await upscaleImage(file);
    }
  };

  return (
    <div className="batch-processor">
      <h1>Batch Processing</h1>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => setFiles(Array.from(e.target.files))}
      />
      <button onClick={processBatch}>Process All</button>
    </div>
  );
}
```

### 4. Add API Backend (Optional)

```python
# api/app.py - Flask backend for server-side inference
from flask import Flask, request, send_file
from PIL import Image
import torch
from model.models import build_generator
import io

app = Flask(__name__)
generator = build_generator(config)

@app.route('/upscale', methods=['POST'])
def upscale():
    file = request.files['image']
    img = Image.open(file)
    
    # Process
    with torch.no_grad():
        output = generator(torch.from_numpy(np.array(img)))
    
    # Return
    buf = io.BytesIO()
    Image.fromarray(output.cpu().numpy()).save(buf, format='PNG')
    buf.seek(0)
    return send_file(buf, mimetype='image/png')

if __name__ == '__main__':
    app.run(debug=False)
```

---

## 🚀 Performance Optimization

### 1. Model Quantization (Smaller + Faster)

```python
# model/export_onnx.py - Add quantization
from onnxruntime.quantization import quantize_dynamic, QuantType

# After exporting to ONNX
quantize_dynamic(
    'outputs/visionupscale_4x.onnx',
    'outputs/visionupscale_4x_quantized.onnx',
    weight_type=QuantType.QUInt8
)

# Result: 50-70% smaller, slightly lower quality
```

### 2. Web WASM Optimization

```javascript
// web/vite.config.js - Advanced optimization
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'ort-wasm': ['onnxruntime-web'],  // Lazy load WASM
          'react': ['react', 'react-dom'],
        }
      },
      // Enable tree-shaking
      treeshake: {
        moduleSideEffects: false,
      },
    },
    // Advanced optimization
    minify: 'terser',
    terserOptions: {
      compress: {
        passes: 3,  // Multiple passes for better compression
      },
    },
  },
});
```

### 3. Image Pre-processing Optimization

```javascript
// web/src/utils/imageProcessing.js - Add advanced preprocessing

function optimizeImagePreprocessing(imageData) {
  // Use OffscreenCanvas for background processing
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  
  // Use WebGL for faster processing if available
  // This is a placeholder for WebGL acceleration
  return canvas.convertToBlob();
}

// Use Web Workers for large images
const worker = new Worker('imageProcessor.worker.js');
worker.postMessage({ imageData, command: 'preprocess' });
```

### 4. Progressive Loading

```javascript
// web/src/utils/onnxInference.js - Add progressive inference

async function upscaleProgressive(imageData, onProgress) {
  // Load model in chunks
  const modelParts = await Promise.all([
    fetch('model/encoder.wasm'),
    fetch('model/decoder.wasm'),
  ]);
  
  // Process tiles progressively
  for (let i = 0; i < tiles.length; i++) {
    const tile = await processTile(tiles[i]);
    onProgress((i + 1) / tiles.length);
  }
}
```

---

## 🔍 Debugging & Profiling

### 1. Training Debug Mode

```bash
# Run with debug logging
python model/train.py \
    --config model/config.yaml \
    --debug \
    --log-level DEBUG
```

```python
# model/train.py - Add debug utilities
import logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

### 2. Profile Training

```python
# model/train.py - Add profiling
from torch.profiler import profile, record_function, ProfilerActivity

with profile(
    activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA],
    record_shapes=True
) as prof:
    # Training code
    pass

print(prof.key_averages().table(sort_by="cuda_time_total", row_limit=10))
```

### 3. Web App Performance Profiling

```javascript
// Browser console
// Measure inference time
performance.mark('inference-start');
await upscaleImage(imageData);
performance.mark('inference-end');
performance.measure('inference', 'inference-start', 'inference-end');

// Analyze memory usage
console.log(performance.memory);

// Analyze FPS during rendering
const fps = [];
let lastTime = performance.now();
setInterval(() => {
  const now = performance.now();
  fps.push(1000 / (now - lastTime));
  lastTime = now;
}, 100);
```

---

## 🔐 Security Hardening

### 1. Input Validation

```javascript
// web/src/utils/imageProcessing.js - Enhanced validation
function validateImageInput(file) {
  const MAX_SIZE = 50 * 1024 * 1024;  // 50 MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid image format');
  }
  
  if (file.size > MAX_SIZE) {
    throw new Error('File too large (max 50MB)');
  }
  
  // Check image dimensions
  const img = new Image();
  img.src = URL.createObjectURL(file);
  
  return new Promise((resolve) => {
    img.onload = () => {
      if (img.width > 16000 || img.height > 16000) {
        throw new Error('Image too large (max 16000x16000)');
      }
      resolve(true);
    };
  });
}
```

### 2. Content Security Policy (CSP)

```html
<!-- web/index.html - Add CSP headers -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self' data:;
">
```

### 3. Sandboxing

```javascript
// web/src/utils/onnxInference.js - Use Workers for sandboxing
// This runs inference in a separate thread (security boundary)
const worker = new Worker('inference.worker.js');

worker.postMessage({ 
  imageData, 
  model: 'visionupscale_4x.onnx' 
});

worker.onmessage = (e) => {
  const result = e.data;
};
```

---

## 📈 Monitoring & Analytics

### 1. Training Metrics Dashboard

```python
# model/utils/metrics.py - Add custom logging
class TensorBoardLogger:
    def __init__(self, log_dir):
        self.writer = SummaryWriter(log_dir)
    
    def log_training(self, epoch, losses, metrics):
        for key, value in losses.items():
            self.writer.add_scalar(f'loss/{key}', value, epoch)
        
        for key, value in metrics.items():
            self.writer.add_scalar(f'metrics/{key}', value, epoch)
    
    def log_images(self, epoch, lr, sr, hr):
        self.writer.add_images('LR', lr, epoch)
        self.writer.add_images('SR', sr, epoch)
        self.writer.add_images('HR', hr, epoch)
```

### 2. Web App Analytics

```javascript
// web/src/hooks/useUpscaler.js - Add analytics (optional)
const trackEvent = (eventName, data) => {
  // Only if user opts in
  if (localStorage.getItem('analytics-consent')) {
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ event: eventName, data })
    });
  }
};
```

---

## 🔄 Continuous Integration/Deployment

### 1. Enhanced GitHub Actions

```yaml
# .github/workflows/advanced-ci.yml
name: Advanced CI/CD

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Run Python Tests
        run: |
          pip install -r model/requirements.txt
          pytest model/tests/
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 18
      
      - name: Run Web Tests
        run: |
          cd web
          npm install
          npm run lint
          npm run build
      
      - name: Deploy to Staging
        if: github.ref == 'refs/heads/develop'
        run: |
          netlify deploy --dir=web/dist
```

---

## 🎓 Advanced Topics

### 1. Domain Adaptation

Train on source dataset, fine-tune on target dataset:

```python
# model/finetune.py - Domain adaptation script
def finetune_on_target_domain(config, source_checkpoint, target_data):
    model = build_generator(config)
    model.load_state_dict(torch.load(source_checkpoint))
    
    # Freeze early layers
    for param in model.body[:10].parameters():
        param.requires_grad = False
    
    # Fine-tune with smaller learning rate
    optimizer = torch.optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=1e-5  # 10x smaller than pre-training
    )
    
    # Train on target domain...
```

### 2. Knowledge Distillation

Train smaller model from larger one:

```python
# model/distill.py - Knowledge distillation
def distillation_loss(student_logits, teacher_logits, temperature=4):
    return F.kl_div(
        F.log_softmax(student_logits / temperature, dim=1),
        F.softmax(teacher_logits / temperature, dim=1)
    )
```

### 3. Ensemble Methods

Combine multiple models:

```python
# model/ensemble.py - Ensemble inference
class ESRGANEnsemble:
    def __init__(self, checkpoints):
        self.models = [
            build_generator(config) for _ in checkpoints
        ]
        for model, ckpt in zip(self.models, checkpoints):
            model.load_state_dict(torch.load(ckpt))
    
    def forward(self, x):
        outputs = [model(x) for model in self.models]
        return torch.mean(torch.stack(outputs), dim=0)
```

---

## 📚 Resources & References

### Papers to Read
- ESRGAN: Enhanced Super-Resolution Generative Adversarial Networks
- RRDB: Residual-in-Residual Dense Block
- Ra-GAN: Relativistic Discriminator
- Mixed Precision Training

### Useful Libraries
- PyTorch Lightning (for cleaner training code)
- Weights & Biases (for experiment tracking)
- ONNX Runtime (for optimization)
- FastAPI (for production API)

### Community Resources
- Papers with Code
- ArXiv
- GitHub
- PyTorch Forums

---

## 🎯 Next Optimization Ideas

1. **Model Pruning**: Remove unimportant weights
2. **Knowledge Distillation**: Smaller models
3. **Quantization**: INT8 inference
4. **Neural Architecture Search**: Auto find best config
5. **Few-Shot Learning**: Adapt to new domains quickly
6. **Real-time Streaming**: Video upscaling

---

**Master the advanced features and unlock the full potential of VisionUpscale!**

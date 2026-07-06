# VisionUpscale - Quick Start Guide

Get VisionUpscale up and running in 5 minutes.

---

## 🚀 Option 1: Web App Only (Inference - Fastest)

Use the pre-trained model or bicubic fallback with zero setup.

```bash
cd web
npm install
npm run dev
```

Visit `http://localhost:5173` and start upscaling images immediately.

**No training required** - Use bicubic upscaling as a demo, or add your trained ONNX model.

---

## 🏋️ Option 2: Train Your Own Model

Complete setup for training ESRGAN from scratch.

### Step 1: Python Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r model/requirements.txt
```

### Step 2: Download Dataset
```bash
# Download DIV2K (takes 1-2 hours)
python scripts/download_div2k.py --output model/data/DIV2K
```

### Step 3: Train Model
```bash
# Start training (2-3 days on GPU)
python model/train.py --config model/config.yaml

# Check TensorBoard during training
tensorboard --logdir model/runs/
```

### Step 4: Export to ONNX
```bash
# Export best checkpoint
python model/export_onnx.py --checkpoint model/checkpoints/esrgan_div2k_4x_best.pth

# Model saved to: model/outputs/visionupscale_4x.onnx
```

### Step 5: Deploy Web App
```bash
# Copy model to web app
cp model/outputs/visionupscale_4x.onnx web/public/model/

# Build and run
cd web
npm install
npm run build
npm run preview

# Or for development
npm run dev
```

Visit `http://localhost:5173` and use your trained model!

---

## 🎯 Configuration Reference

### Quick Adjustments

**Faster Training** (sacrifice quality):
```yaml
# In model/config.yaml
training:
  pretrain:
    epochs: 10          # ← Reduce from 50
  gan:
    epochs: 50          # ← Reduce from 200
model:
  generator:
    num_rrdb_blocks: 6  # ← Use 6 instead of 23
```

**Smaller Model** (better for mobile):
```yaml
model:
  generator:
    num_features: 32    # ← Reduce from 64
    num_rrdb_blocks: 6  # ← Reduce from 23
```

**Higher Quality** (longer training):
```yaml
training:
  pretrain:
    epochs: 100         # ← Increase from 50
  gan:
    epochs: 300         # ← Increase from 200
```

---

## 📊 Evaluation

### Evaluate Trained Model
```bash
python model/evaluate.py --checkpoint model/checkpoints/esrgan_div2k_4x_best.pth --save-images
```

### Expected Results
- **PSNR**: 30-32 dB on DIV2K
- **SSIM**: 0.85-0.90 on DIV2K
- **Processing**: 100-500ms per 512×512 image on browser

---

## 🌐 Deploy to Cloud

### Netlify
```bash
# Push to GitHub and connect repository to Netlify
# Netlify automatically builds from web/dist

# Or deploy from CLI
npm install -g netlify-cli
netlify deploy --prod --dir=web/dist
```

### Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd web
vercel --prod
```

### GitHub Pages
```bash
# Build
cd web
npm run build

# Deploy dist/ to gh-pages branch
# See .github/workflows/deploy.yml
```

---

## 🔧 Troubleshooting

### Build Fails: `vite not found`
```bash
cd web
npm install --legacy-peer-deps
npm run build
```

### ONNX Model Not Loading
1. Check model path: `web/public/model/visionupscale_4x.onnx`
2. Verify file size (~40-100 MB depending on config)
3. Check browser console for errors
4. Falls back to bicubic automatically

### Training Out of Memory
```bash
# Reduce batch size in config.yaml
training:
  pretrain:
    batch_size: 8   # ← Reduce from 16
  gan:
    batch_size: 8   # ← Reduce from 16
```

### Slow Training on CPU
Training on CPU is not recommended. Use a GPU:
```bash
# Install GPU support
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

---

## 📚 File Structure Quick Reference

```
VisionUpscale/
├── model/                    # ML Training Pipeline
│   ├── train.py             # Main training script
│   ├── evaluate.py          # Evaluation script
│   ├── export_onnx.py       # ONNX export
│   ├── config.yaml          # Training config
│   ├── models/              # Model architectures
│   ├── datasets/            # Dataset loaders
│   └── utils/               # Training utilities
│
├── web/                     # React Web App
│   ├── src/
│   │   ├── pages/           # Home, Upload, Docs, About
│   │   ├── components/      # UI components
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Image processing, ONNX
│   │   └── index.css        # Complete styling
│   ├── public/
│   │   └── model/           # Place ONNX model here
│   └── package.json         # Dependencies
│
└── scripts/                 # Utilities
    ├── download_div2k.py    # Dataset downloader
    └── generate_lr_pairs.py # LR pair generator
```

---

## 🎨 Customize UI

### Change Theme Colors
Edit `web/src/index.css`:
```css
:root {
  --color-primary: #3b82f6;        /* ← Change primary color */
  --color-secondary: #ec4899;       /* ← Change secondary color */
  --color-background: #ffffff;      /* ← Change background */
  /* ... more color variables */
}
```

### Change Logo/Branding
Replace `web/public/favicon.svg` with your logo.

### Change Model Title
Edit `web/src/pages/Home.jsx`:
```jsx
<h1>Your App Name</h1>  {/* Change from VisionUpscale */}
```

---

## ⚡ Performance Tips

### For Faster Web App
1. Use smaller model: `num_rrdb_blocks: 6`
2. Reduce patch size: `patch_size: 64`
3. Use FP16 quantization in ONNX export

### For Better Quality
1. Use full model: `num_rrdb_blocks: 23`
2. Increase training time
3. Train on high-quality datasets

### For Better UX
1. Add loading indicator (already included)
2. Show progress during inference
3. Provide keyboard shortcuts
4. Support drag-and-drop (already included)

---

## 📖 Next Steps

1. **Start with web app**: `cd web && npm run dev`
2. **Try bicubic upscaling**: No training needed
3. **Download dataset**: `python scripts/download_div2k.py`
4. **Train model**: `python model/train.py`
5. **Export to ONNX**: `python model/export_onnx.py`
6. **Deploy**: Push to GitHub or upload to Netlify/Vercel

---

## 💡 Tips

- **GPU Training**: Use PyTorch GPU for 10-50x faster training
- **Mixed Precision**: Enabled by default for ~2x memory savings
- **Early Stopping**: Automatically stops if no improvement
- **Checkpointing**: Saves best model automatically
- **TensorBoard**: Monitor training with `tensorboard --logdir model/runs/`

---

## 🆘 Help

- Check `VERIFICATION.md` for detailed architecture
- See `README.md` for project overview
- Read inline comments in code
- Check web app `/documentation` page for user guide

---

**Ready to get started? Run one command and go!**

```bash
cd web && npm install && npm run dev
```

Then visit `http://localhost:5173` 🚀

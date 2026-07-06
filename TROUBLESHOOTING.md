# VisionUpscale - Comprehensive Troubleshooting Guide

Solutions to common issues and advanced debugging techniques.

---

## 🐍 Python/ML Pipeline Issues

### Issue 1: `ModuleNotFoundError: No module named 'torch'`

**Cause**: PyTorch not installed

**Solution**:
```bash
# Install PyTorch (CPU)
pip install torch torchvision torchaudio

# Or GPU support (CUDA 11.8)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Or GPU support (CUDA 12.1)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

**Verify**:
```bash
python -c "import torch; print(torch.__version__); print(torch.cuda.is_available())"
```

---

### Issue 2: `CUDA out of memory`

**Cause**: Batch size too large for GPU

**Solutions**:

**Option A**: Reduce batch size
```yaml
# model/config.yaml
training:
  pretrain:
    batch_size: 8  # ← Reduce from 16
  gan:
    batch_size: 8  # ← Reduce from 16
```

**Option B**: Reduce patch size
```yaml
dataset:
  patch_size: 64  # ← Reduce from 128
```

**Option C**: Use gradient accumulation
```python
# model/train.py
accumulation_steps = 4
for i, (lr, hr) in enumerate(loader):
    loss = model(lr, hr) / accumulation_steps
    loss.backward()
    if (i + 1) % accumulation_steps == 0:
        optimizer.step()
        optimizer.zero_grad()
```

**Option D**: Use CPU (slow but works)
```bash
# In config
training:
  device: 'cpu'
```

---

### Issue 3: `DIV2K dataset not found`

**Cause**: Dataset not downloaded

**Solution**:
```bash
# Download dataset (1-2 hours)
python scripts/download_div2k.py --output model/data/DIV2K

# Verify
ls model/data/DIV2K/
# Should contain: DIV2K_train_HR/ and DIV2K_valid_HR/
```

**If download hangs**:
```bash
# Try with timeout
python scripts/download_div2k.py --output model/data/DIV2K --timeout 300
```

---

### Issue 4: `Training is very slow`

**Cause**: Not using GPU or mixed precision disabled

**Solutions**:

**Option A**: Enable GPU
```bash
# Check if GPU detected
nvidia-smi

# Make sure CUDA is installed
python -c "import torch; print(torch.cuda.is_available())"
```

**Option B**: Enable mixed precision
```yaml
# model/config.yaml
training:
  mixed_precision: true  # ← Should be enabled
```

**Option C**: Reduce model size
```yaml
model:
  generator:
    num_rrdb_blocks: 6  # ← Reduce from 23
    num_features: 32    # ← Reduce from 64
```

---

### Issue 5: `Training diverges (loss goes to NaN)`

**Cause**: Learning rate too high or data normalization issue

**Solutions**:

**Option A**: Reduce learning rate
```yaml
training:
  pretrain:
    learning_rate: 1.0e-4  # ← Reduce from 2.0e-4
  gan:
    generator_lr: 5.0e-5   # ← Reduce from 1.0e-4
```

**Option B**: Verify data normalization
```python
# In model/datasets/div2k_dataset.py
# Ensure all images are in [0, 1] range
if img.max() > 1.0:
    img = img / 255.0
```

**Option C**: Add gradient clipping
```python
# In model/train.py
torch.nn.utils.clip_grad_norm_(generator.parameters(), max_norm=1.0)
```

---

### Issue 6: `Model checkpoint loading fails`

**Cause**: Checkpoint format mismatch or corrupted file

**Solutions**:

**Option A**: Verify checkpoint exists
```bash
ls -lh model/checkpoints/
```

**Option B**: Check checkpoint format
```python
import torch
ckpt = torch.load('path/to/checkpoint.pth')
print(ckpt.keys())  # Should show model state dict keys
```

**Option C**: Load with strict=False
```python
# In model/evaluate.py or export_onnx.py
model.load_state_dict(state_dict, strict=False)
```

---

### Issue 7: `ONNX export fails`

**Cause**: Model architecture incompatibility

**Solutions**:

**Option A**: Use dummy input to debug
```python
import torch
from model.models.generator import build_generator
import yaml

config = yaml.safe_load(open('config.yaml'))
model = build_generator(config)

# Test forward pass
dummy_lr = torch.randn(1, 3, 32, 32)
dummy_sr = model(dummy_lr)

# Try manual export
torch.onnx.export(
    model,
    dummy_lr,
    'test.onnx',
    verbose=True,
    do_constant_folding=False
)
```

**Option B**: Simplify model
```yaml
model:
  generator:
    num_rrdb_blocks: 6  # ← Use lite version
```

---

## 🌐 React Web App Issues

### Issue 1: `npm install fails`

**Cause**: Network issues or dependency conflicts

**Solutions**:

**Option A**: Clear cache and retry
```bash
cd web
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Option B**: Use legacy peer deps
```bash
npm install --legacy-peer-deps
```

**Option C**: Use specific Node version
```bash
# Use Node 18
nvm use 18
npm install
```

---

### Issue 2: `Build fails with syntax error`

**Cause**: JSX syntax issue or import error

**Solutions**:

**Option A**: Check for less-than signs in JSX
```javascript
// ❌ WRONG
<div>This is < 100px</div>

// ✅ CORRECT
<div>This is &lt; 100px</div>

// OR use curly braces
<div>This is {`< 100px`}</div>
```

**Option B**: Verify all imports
```javascript
// Check if all modules exist
import { useUpscaler } from '../hooks/useUpscaler';  // File must exist
import onnxInference from '../utils/onnxInference';  // File must exist
```

**Option C**: Clear build cache
```bash
rm -rf web/dist web/.vite
npm run build
```

---

### Issue 3: `ONNX model not loading in browser`

**Cause**: Model file not found or incorrect path

**Solutions**:

**Option A**: Verify model placement
```bash
# Check if model exists
ls -lh web/public/model/visionupscale_4x.onnx

# Expected: 40-100 MB file
```

**Option B**: Check file permissions
```bash
# Ensure readable
chmod 644 web/public/model/visionupscale_4x.onnx
```

**Option C**: Check browser console for errors
```javascript
// Open browser DevTools (F12) → Console tab
// Look for error messages about model loading
```

**Option D**: Verify CORS headers
```javascript
// In web/vite.config.js - ensure headers are set:
server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  },
}
```

---

### Issue 4: `Image upload not working`

**Cause**: File API issue or size limit

**Solutions**:

**Option A**: Verify file input element
```jsx
<input
  type="file"
  accept="image/*"
  onChange={(e) => handleFileUpload(e.target.files[0])}
/>
```

**Option B**: Check file size
```javascript
const MAX_SIZE = 50 * 1024 * 1024;  // 50 MB
if (file.size > MAX_SIZE) {
  alert('File too large');
}
```

**Option C**: Log file details
```javascript
const handleFileUpload = (file) => {
  console.log('File:', file.name);
  console.log('Size:', file.size);
  console.log('Type:', file.type);
  // Continue processing...
};
```

---

### Issue 5: `Comparison slider not showing`

**Cause**: Component not rendering or CSS issue

**Solutions**:

**Option A**: Verify component import
```jsx
import ComparisonSlider from '../components/ComparisonSlider';

// Use in JSX
<ComparisonSlider before={beforeImage} after={afterImage} />
```

**Option B**: Check CSS classes
```bash
# Verify CSS file exists
cat web/src/index.css | grep "comparison-slider"
```

**Option C**: Check console for errors
```javascript
// Browser DevTools → Console
// Look for "component not rendering" errors
```

---

### Issue 6: `Theme toggle not persisting`

**Cause**: localStorage not working

**Solutions**:

**Option A**: Enable localStorage
```javascript
// Verify localStorage is available
console.log(typeof localStorage);  // Should be 'object'

// Test read/write
localStorage.setItem('test', 'value');
console.log(localStorage.getItem('test'));
```

**Option B**: Check browser settings
- Private/Incognito mode may disable localStorage
- Check browser privacy settings
- Clear site data and retry

---

### Issue 7: `Responsive design broken on mobile`

**Cause**: CSS media queries not applied or viewport not set

**Solutions**:

**Option A**: Verify viewport meta tag
```html
<!-- web/index.html - should have -->
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

**Option B**: Test CSS media queries
```bash
# Open DevTools
# F12 → Click device toggle (phone icon)
# Resize window and check responsive behavior
```

**Option C**: Check CSS specificity
```css
/* Make sure mobile styles override desktop */
@media (max-width: 768px) {
  .container {
    width: 100% !important;  /* ← Important to override */
  }
}
```

---

## 🔄 Deployment Issues

### Issue 1: `Netlify build fails`

**Cause**: Node version mismatch or missing env variables

**Solutions**:

**Option A**: Set Node version
```toml
# netlify.toml
[build]
  command = "cd web && npm install && npm run build"
  publish = "web/dist"
  
[build.environment]
  NODE_VERSION = "18.0.0"
```

**Option B**: Check build logs
```bash
# In Netlify UI: Deploys → View logs
# Look for specific error messages
```

**Option C**: Test locally
```bash
# Simulate Netlify build
cd web
npm install
npm run build
npm run preview
```

---

### Issue 2: `Vercel deployment shows blank page`

**Cause**: Build output directory incorrect

**Solutions**:

**Option A**: Verify vercel.json
```json
{
  "buildCommand": "cd web && npm install && npm run build",
  "outputDirectory": "web/dist",
  "framework": "vite"
}
```

**Option B**: Check .vercelignore
```
# .vercelignore - exclude unnecessary files
model/
scripts/
*.py
```

---

### Issue 3: `404 errors after deployment`

**Cause**: SPA routing not configured

**Solutions**:

**Option A**: Configure SPA redirect
```toml
# netlify.toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

```json
# vercel.json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

---

## 🔍 Performance Issues

### Issue 1: `Web app loads slowly`

**Solutions**:

**Option A**: Check bundle size
```bash
npm run build
# Look at file sizes in output

# Analyze chunks
npm install --save-dev webpack-bundle-analyzer
```

**Option B**: Enable caching headers
```toml
# netlify.toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*"
  [headers.values]
    Cache-Control = "public, max-age=300"
```

**Option C**: Use CDN
- Netlify/Vercel automatically use CDN
- Enable asset optimization in build settings

---

### Issue 2: `Inference is slow`

**Solutions**:

**Option A**: Check device performance
```javascript
// Log device info
console.log('Device:', navigator.userAgent);
console.log('Memory:', navigator.deviceMemory);
console.log('CPU cores:', navigator.hardwareConcurrency);
```

**Option B**: Use smaller model
```yaml
model:
  generator:
    num_rrdb_blocks: 6  # ← Use lite model
```

**Option C**: Use quantized model
```bash
python model/export_onnx.py --checkpoint best.pth --quantize
```

---

## 🐛 Advanced Debugging

### Enable Debug Logging

**Python**:
```python
import logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

**JavaScript**:
```javascript
// Global debug flag
window.DEBUG = true;

function debug(msg, data) {
  if (window.DEBUG) {
    console.log(`[DEBUG] ${msg}`, data);
  }
}
```

### Profiling

**Python**:
```bash
# Profile training
python -m cProfile -s cumulative model/train.py --config model/config.yaml > profile.txt
```

**JavaScript**:
```javascript
// Browser DevTools → Performance tab
// Record and analyze performance

console.time('upscale');
await upscaleImage(imageData);
console.timeEnd('upscale');
```

### Memory Leaks

**Python**:
```python
import tracemalloc
tracemalloc.start()

# ... training code ...

current, peak = tracemalloc.get_traced_memory()
print(f"Memory: {current / 1024 / 1024:.1f} MB, Peak: {peak / 1024 / 1024:.1f} MB")
```

**JavaScript**:
```javascript
// Browser DevTools → Memory tab
// Take heap snapshot before/after operations
// Compare to find leaks
```

---

## ✅ Pre-Deployment Checklist

```
✅ Python Environment
  ☐ Python 3.8+
  ☐ All dependencies installed
  ☐ GPU detected (if using GPU)
  ☐ Model can be trained
  ☐ Model can be exported to ONNX

✅ Web Application
  ☐ npm install succeeds
  ☐ npm run build succeeds
  ☐ No console errors
  ☐ All pages load
  ☐ Upload works
  ☐ Theme toggle works
  ☐ Responsive design works

✅ Deployment
  ☐ Config files correct (netlify.toml, vercel.json)
  ☐ Node version specified
  ☐ Build environment variables set
  ☐ Redirects configured (for SPA)
  ☐ Headers configured (for CORS/WASM)

✅ Production
  ☐ Test deployed site
  ☐ Verify ONNX model loads
  ☐ Test image upload
  ☐ Test inference
  ☐ Test download
  ☐ Check performance
  ☐ Monitor errors
```

---

## 🆘 When All Else Fails

### Step 1: Isolate the Problem
```bash
# Test each component in isolation
python -c "import torch; print(torch.cuda.is_available())"  # GPU
python -c "from model.models import build_generator"        # Models
npm run build                                               # Web build
```

### Step 2: Simplify the Test Case
```python
# Minimal training test
model = ESRGANGenerator()
x = torch.randn(1, 3, 32, 32)
y = model(x)
print(y.shape)  # Should be (1, 3, 128, 128)
```

### Step 3: Check Logs
```bash
# Check training logs
tail -100 model/logs/*.log

# Check build logs
cat ~/.netlify/logs/*  # For Netlify
cat ~/.vercel/logs/*   # For Vercel
```

### Step 4: Ask for Help
- **GitHub Issues**: Search or create issue
- **StackOverflow**: Tag with pytorch/react/onnx
- **Official Docs**: PyTorch, React, ONNX Runtime

---

## 📞 Support Resources

| Issue Type | Resource |
|-----------|----------|
| PyTorch | [pytorch.org/support](https://pytorch.org) |
| React | [react.dev/community](https://react.dev) |
| ONNX Runtime | [github.com/microsoft/onnxruntime](https://github.com/microsoft/onnxruntime) |
| Netlify | [docs.netlify.com](https://docs.netlify.com) |
| Vercel | [vercel.com/docs](https://vercel.com/docs) |

---

**Remember: Most issues have been encountered before. Search error messages online - the solution is often just a few clicks away!**

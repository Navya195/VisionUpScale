# VisionUpscale: Edge-Based Image Super-Resolution Enhancer

<img width="1898" height="925" alt="image" src="https://github.com/user-attachments/assets/b772d6ae-4f04-4d18-85a0-4fcb39a1cee9" />


**VisionUpscale** is a complete, production-ready AI & Machine Learning project that implements an end-to-end image super-resolution system. It uses **ESRGAN** (Enhanced Super-Resolution Generative Adversarial Networks) to upscale low-resolution images by 4×. 

The project features a **React + Vite** web application that runs the AI model *entirely in the browser* using **ONNX Runtime Web** and WebAssembly. This means **zero server uploads, zero latency, and 100% privacy**.


<img width="1902" height="900" alt="image" src="https://github.com/user-attachments/assets/2203d870-a0e8-4e1c-b8d3-29000b58cdc6" />


---

## 🌟 Features

- **4× AI Upscaling:** State-of-the-art ESRGAN architecture with 23 Residual-in-Residual Dense Blocks.
- **In-Browser Inference:** ONNX Runtime Web executes the model on the edge device using WebAssembly.
- **100% Private:** Images never leave your device. No cloud servers required for inference.
- **Interactive UI:** Drag-and-drop upload, before/after comparison slider, and one-click high-quality PNG download.
- **Complete ML Pipeline:** Full PyTorch training code, dataset preparation scripts (DIV2K), evaluation metrics (PSNR, SSIM), and ONNX export utilities.



<img width="1908" height="867" alt="image" src="https://github.com/user-attachments/assets/775e5a25-8f3c-45fd-b66d-7f0680395e75" />



---

## 📂 Project Structure

```text
VisionUpscale/
├── model/                  # PyTorch ESRGAN Training Pipeline
│   ├── datasets/           # DIV2K dataset loaders & augmentation
│   ├── models/             # Generator (RRDB) & Discriminator architectures
│   ├── utils/              # Losses, metrics, and training helpers
│   ├── config.yaml         # Training hyperparameters
│   ├── train.py            # Main training script (mixed-precision, early stopping)
│   ├── evaluate.py         # PSNR/SSIM evaluation on validation set
│   └── export_onnx.py      # Export PyTorch model to ONNX with dynamic axes
├── web/                    # React + Vite Web Application
│   ├── src/                # React components, hooks, pages
│   ├── public/model/       # Place the trained visionupscale_4x.onnx here
│   ├── index.html          # Entry point
│   └── package.json        # Dependencies (onnxruntime-web, react, etc.)
├── scripts/                # Utility Scripts
│   ├── download_div2k.py   # Downloader for the DIV2K dataset
│   └── generate_lr_pairs.py# Pre-generate bicubic downsampled LR pairs
├── docs/                   # Documentation and Reports
├── netlify.toml            # Deployment config for Netlify
├── vercel.json             # Deployment config for Vercel
└── README.md
```

---

## 🚀 Getting Started

### 1. Web Application Setup (Inference Only)

If you just want to run the web app with the pre-trained model (or fallback mode):

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.
*(Note: If the `.onnx` model is not present in `web/public/model/`, the app will gracefully fall back to bicubic upscaling for demonstration).*

### 2. Python ML Pipeline Setup (Training & Export)

To train the model from scratch or export a custom model:

```bash
# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r model/requirements.txt

# Download the DIV2K dataset
python scripts/download_div2k.py

# Run training (refer to config.yaml for hyperparameter adjustments)
python model/train.py --config model/config.yaml

# Evaluate the trained model
python model/evaluate.py --checkpoint model/checkpoints/esrgan_div2k_4x_best.pth

# Export to ONNX
python model/export_onnx.py --checkpoint model/checkpoints/esrgan_div2k_4x_best.pth

# Copy the ONNX model to the web app
cp model/outputs/visionupscale_4x.onnx web/public/model/
```

---

## 🛠️ Technology Stack

- **Machine Learning:** PyTorch 2.x, Torchvision
- **Model Architecture:** ESRGAN (RRDB Generator, VGG Discriminator)
- **Edge Deployment:** ONNX, ONNX Runtime Web, WebAssembly
- **Frontend:** React 18, Vite, React Router, Tailwind-inspired Vanilla CSS Design System
- **Metrics:** PSNR, SSIM
- **CI/CD:** GitHub Actions, Vercel/Netlify Support

---

## 📚 Documentation

Detailed documentation is available within the web app at the `/docs` route, or see the `docs/` folder for the comprehensive Project Report and Presentation Slides.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

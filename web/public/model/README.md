# VisionUpscale model placeholder
# Place your trained ONNX model here: visionupscale_4x.onnx
#
# To generate the model:
#   1. Train ESRGAN: python model/train.py
#   2. Export ONNX:  python model/export_onnx.py
#   3. Copy output:  cp model/outputs/visionupscale_4x.onnx web/public/model/
#
# Without the model file, the web app runs in bicubic fallback mode.

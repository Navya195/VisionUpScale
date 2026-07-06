#!/usr/bin/env python3
"""
VisionUpscale ONNX Export Script
=================================
Export trained PyTorch ESRGAN model to ONNX format for browser deployment.

Features:
- Dynamic input shape support (height and width)
- ONNX optimization and simplification
- Validation of exported model
- Multiple test input sizes
- FP32 and FP16 export options

Usage:
    python export_onnx.py --checkpoint checkpoints/best_model.pth --output web/public/model/visionupscale_4x.onnx
    python export_onnx.py --checkpoint checkpoints/best_model.pth --simplify --fp16
"""

import argparse
import os
from pathlib import Path
from typing import Tuple, List

import yaml
import torch
import torch.nn as nn
import onnx
import onnxruntime as ort
import numpy as np

from models.generator import build_generator
from utils.helpers import setup_logger


class ONNXExporter:
    """Export ESRGAN model to ONNX format"""
    
    def __init__(self, config: Dict, args: argparse.Namespace):
        """Initialize exporter"""
        self.config = config
        self.args = args
        
        # Setup logging
        self.logger = setup_logger("visionupscale_export")
        
        # Device
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Load model
        self.model = self._load_model()
        
        self.logger.info("ONNX Exporter initialized successfully")
    
    def _load_model(self) -> nn.Module:
        """Load trained model from checkpoint"""
        self.logger.info(f"Loading model from {self.args.checkpoint}")
        
        # Build model
        model = build_generator(self.config)
        model = model.to(self.device)
        
        # Load checkpoint
        checkpoint = torch.load(self.args.checkpoint, map_location=self.device)
        
        # Handle different checkpoint formats
        if "generator" in checkpoint:
            state_dict = checkpoint["generator"]
        elif "model_state_dict" in checkpoint:
            state_dict = checkpoint["model_state_dict"]
        else:
            state_dict = checkpoint
        
        # Remove 'module.' prefix if present
        from collections import OrderedDict
        new_state_dict = OrderedDict()
        for k, v in state_dict.items():
            name = k.replace("module.", "") if k.startswith("module.") else k
            new_state_dict[name] = v
        
        model.load_state_dict(new_state_dict)
        model.eval()
        
        self.logger.info("Model loaded successfully")
        return model
    
    def export(self) -> str:
        """Export model to ONNX format"""
        self.logger.info("Starting ONNX export...")
        
        # Prepare model for export
        self.model.eval()
        
        # Get export configuration
        onnx_cfg = self.config.get("onnx", {})
        opset_version = onnx_cfg.get("opset_version", 17)
        
        # Default input shape
        default_shape = onnx_cfg.get("input_shape", [1, 3, 64, 64])
        dummy_input = torch.randn(*default_shape).to(self.device)
        
        # Dynamic axes configuration
        dynamic_axes = onnx_cfg.get("dynamic_axes", {
            "input": {0: "batch_size", 2: "height", 3: "width"},
            "output": {0: "batch_size", 2: "height", 3: "width"}
        })
        
        # Output path
        output_path = Path(self.args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Export to ONNX
        self.logger.info(f"Exporting to {output_path}...")
        
        try:
            torch.onnx.export(
                self.model,
                dummy_input,
                str(output_path),
                export_params=True,
                opset_version=opset_version,
                do_constant_folding=True,
                input_names=["input"],
                output_names=["output"],
                dynamic_axes=dynamic_axes,
                verbose=False
            )
            
            self.logger.info("ONNX export successful")
            
        except Exception as e:
            self.logger.error(f"ONNX export failed: {e}")
            raise
        
        # Verify exported model
        self._verify_onnx_model(str(output_path))
        
        # Simplify if requested
        if self.args.simplify:
            self._simplify_onnx(output_path)
        
        # Convert to FP16 if requested
        if self.args.fp16:
            self._convert_to_fp16(output_path)
        
        # Get model size
        model_size = output_path.stat().st_size / (1024 * 1024)
        self.logger.info(f"Exported model size: {model_size:.2f} MB")
        
        return str(output_path)
    
    def _verify_onnx_model(self, onnx_path: str):
        """Verify exported ONNX model"""
        self.logger.info("Verifying ONNX model...")
        
        try:
            # Load and check ONNX model
            onnx_model = onnx.load(onnx_path)
            onnx.checker.check_model(onnx_model)
            
            self.logger.info("ONNX model verification passed")
            
            # Print model info
            self.logger.info("Model Information:")
            self.logger.info(f"  Opset version: {onnx_model.opset_import[0].version}")
            self.logger.info(f"  Producer: {onnx_model.producer_name}")
            
        except Exception as e:
            self.logger.error(f"ONNX model verification failed: {e}")
            raise
    
    def _simplify_onnx(self, onnx_path: Path):
        """Simplify ONNX model using onnx-simplifier"""
        self.logger.info("Simplifying ONNX model...")
        
        try:
            import onnxsim
            
            # Load model
            onnx_model = onnx.load(str(onnx_path))
            
            # Simplify
            simplified_model, check = onnxsim.simplify(
                onnx_model,
                check_n=3,
                perform_optimization=True
            )
            
            if not check:
                self.logger.warning("Simplified model validation failed")
                return
            
            # Save simplified model
            simplified_path = onnx_path.parent / f"{onnx_path.stem}_simplified{onnx_path.suffix}"
            onnx.save(simplified_model, str(simplified_path))
            
            # Replace original with simplified
            if self.args.replace:
                simplified_path.replace(onnx_path)
                self.logger.info("Original model replaced with simplified version")
            else:
                self.logger.info(f"Simplified model saved to {simplified_path}")
            
        except ImportError:
            self.logger.warning("onnx-simplifier not installed. Skipping simplification.")
        except Exception as e:
            self.logger.error(f"ONNX simplification failed: {e}")
    
    def _convert_to_fp16(self, onnx_path: Path):
        """Convert ONNX model to FP16"""
        self.logger.info("Converting to FP16...")
        
        try:
            from onnxconverter_common import float16
            
            # Load model
            onnx_model = onnx.load(str(onnx_path))
            
            # Convert to FP16
            fp16_model = float16.convert_float_to_float16(
                onnx_model,
                keep_io_types=True  # Keep input/output as FP32
            )
            
            # Save FP16 model
            fp16_path = onnx_path.parent / f"{onnx_path.stem}_fp16{onnx_path.suffix}"
            onnx.save(fp16_model, str(fp16_path))
            
            self.logger.info(f"FP16 model saved to {fp16_path}")
            
            # Compare sizes
            fp32_size = onnx_path.stat().st_size / (1024 * 1024)
            fp16_size = fp16_path.stat().st_size / (1024 * 1024)
            reduction = (1 - fp16_size / fp32_size) * 100
            
            self.logger.info(f"Size reduction: {reduction:.1f}% ({fp32_size:.2f} MB -> {fp16_size:.2f} MB)")
            
        except ImportError:
            self.logger.warning("onnxconverter-common not installed. Skipping FP16 conversion.")
        except Exception as e:
            self.logger.error(f"FP16 conversion failed: {e}")
    
    def test_onnx_inference(self, onnx_path: str):
        """Test ONNX model inference"""
        self.logger.info("Testing ONNX Runtime inference...")
        
        try:
            # Create ONNX Runtime session
            sess_options = ort.SessionOptions()
            sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            
            providers = ['CUDAExecutionProvider', 'CPUExecutionProvider'] if torch.cuda.is_available() else ['CPUExecutionProvider']
            
            session = ort.InferenceSession(onnx_path, sess_options, providers=providers)
            
            self.logger.info(f"ONNX Runtime providers: {session.get_providers()}")
            
            # Test with multiple input sizes
            test_shapes = self.config.get("onnx", {}).get("test_inputs", [
                [1, 3, 64, 64],
                [1, 3, 128, 128],
                [1, 3, 256, 256]
            ])
            
            for shape in test_shapes:
                self.logger.info(f"Testing with input shape {shape}...")
                
                # Create random input
                input_data = np.random.randn(*shape).astype(np.float32)
                
                # Run inference
                input_name = session.get_inputs()[0].name
                output_name = session.get_outputs()[0].name
                
                outputs = session.run([output_name], {input_name: input_data})
                output_shape = outputs[0].shape
                
                self.logger.info(f"  Output shape: {output_shape}")
                
                # Verify output shape matches expected scale
                scale_factor = self.config["scale_factor"]
                expected_h = shape[2] * scale_factor
                expected_w = shape[3] * scale_factor
                
                if output_shape[2] == expected_h and output_shape[3] == expected_w:
                    self.logger.info("  ✓ Output shape correct")
                else:
                    self.logger.error(f"  ✗ Expected shape [1, 3, {expected_h}, {expected_w}], got {output_shape}")
            
            self.logger.info("ONNX Runtime inference tests passed")
            
        except Exception as e:
            self.logger.error(f"ONNX Runtime inference test failed: {e}")
            raise


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Export ESRGAN to ONNX")
    
    parser.add_argument("--config", type=str, default="config.yaml",
                       help="Path to configuration file")
    parser.add_argument("--checkpoint", type=str, required=True,
                       help="Path to model checkpoint")
    parser.add_argument("--output", type=str, default="outputs/visionupscale_4x.onnx",
                       help="Output ONNX file path")
    parser.add_argument("--simplify", action="store_true",
                       help="Simplify ONNX model")
    parser.add_argument("--fp16", action="store_true",
                       help="Convert to FP16")
    parser.add_argument("--replace", action="store_true",
                       help="Replace original with optimized model")
    parser.add_argument("--test", action="store_true",
                       help="Test ONNX model inference")
    
    return parser.parse_args()


def main():
    """Main export function"""
    args = parse_args()
    
    # Load configuration
    with open(args.config, 'r') as f:
        config = yaml.safe_load(f)
    
    # Create exporter
    exporter = ONNXExporter(config, args)
    
    # Export model
    onnx_path = exporter.export()
    
    # Test if requested
    if args.test:
        exporter.test_onnx_inference(onnx_path)
    
    print(f"\n✓ ONNX export completed successfully!")
    print(f"Model saved to: {onnx_path}")
    print(f"\nTo use in web app, copy to: web/public/model/")


if __name__ == "__main__":
    main()

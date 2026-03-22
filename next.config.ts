import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Run these packages in Node.js instead of bundling them - required for ONNX/WASM
  serverExternalPackages: ["sharp", "onnxruntime-node", "@xenova/transformers"],
  turbopack: {},
};

export default nextConfig;

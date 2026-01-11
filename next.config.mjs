import withPWA from "next-pwa";
import CopyPlugin from "copy-webpack-plugin";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Copy ONNX WASM binaries to public/wasm so browser can fetch them
    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: path.join(
              path.dirname(require.resolve("onnxruntime-web/package.json")),
              "dist/*.{wasm,mjs}"
            ),
            to: path.join(__dirname, "public/wasm/[name][ext]"),
          },
        ],
      })
    );

    return config;
  },
  turbopack: {},
};

const pwaConfig = {
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
};

export default withPWA(pwaConfig)(nextConfig);

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.ts": {
        loaders: ["ts-loader"],
      },
    },
  },
  webpack: (config) => {
    config.module.rules.push({ test: /node_modules\/expo-modules-core\/src\/index\.ts$/, loader: "ignore-loader" });
    return config;
  },
};

export default nextConfig;

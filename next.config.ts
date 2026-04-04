import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow dev HMR when opening the app by LAN IP (e.g. phone on same Wi‑Fi).
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    // Add your LAN origin here when testing from another device, e.g. "http://192.168.1.10:3000"
  ],
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // сайт живёт по адресу ...github.io/finora/ — на GitHub Pages нужен basePath
  ...(process.env.SITE_BASE ? { basePath: "/finora" } : {}),
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev: sin doble ejecución de effects (React StrictMode) — evita duplicar
  // cada consulta Supabase por carga de pantalla. Production no lo afecta.
  reactStrictMode: false,
};

export default nextConfig;

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['yahoo-finance2'],
  },
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      // yahoo-finance2 importe des utilitaires Deno/test dans son code de production.
      // NormalModuleReplacementPlugin intercepte TOUS les sous-chemins de ces packages
      // (ex: @gadicc/fetch-mock-cache/stores/fs.ts) et les redirige vers un stub vide.
      const stub = path.join(__dirname, 'src/stubs/empty.js');
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^@std\/testing/, stub),
        new webpack.NormalModuleReplacementPlugin(/^@gadicc\/fetch-mock-cache/, stub),
      );
    }
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
};

export default nextConfig;

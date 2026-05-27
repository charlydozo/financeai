import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['yahoo-finance2'],
  turbopack: {},
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
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

/** @type {import('next').NextConfig} */
const config = {
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'localhost:3001',
        'localhost:3002',
        'super-duper-space-fiesta-r4x4xgqjj5j52565x-3000.app.github.dev',
      ],
    },
  },
}

module.exports = config

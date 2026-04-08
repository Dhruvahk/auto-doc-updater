/** @type {import('next').NextConfig} */
// Proxy /api → backend. Set BACKEND_URL or NEXT_PUBLIC_API_URL in Vercel for Production *and* Preview.
const backendOrigin = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001'
).replace(/\/$/, '');

const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Reduce file-watcher load on macOS by ignoring generated/large dirs.
    // This is especially important if an accidental scaffold folder exists.
    config.watchOptions = {
      ...(config.watchOptions || {}),
      ignored: [
        '**/.next/**',
        '**/node_modules/**',
        '**/auto-doc-updater/**',
      ],
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;


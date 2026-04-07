/** @type {import('next').NextConfig} */
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
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

export default nextConfig;


/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || 'http://localhost:3001';

const nextConfig = {
  // Disabled to avoid duplicate API calls on initial load (Strict Mode double-mounts in dev)
  reactStrictMode: false,
  // Only generate static files when building for publishing.
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' } : {}),
  images: {
    domains: ['localhost', 'ui-avatars.com'],
    unoptimized: true,
  },
  ...(isDev
    ? {
        async rewrites() {
          return [
            // For local dev, proxy same-origin `/api/*` calls to the backend port.
            // In production the backend + frontend are served from the same IIS port,
            // so these rewrites are not needed.
            {
              source: '/api/:path*',
              destination: `${backendOrigin}/api/:path*`,
            },
            // Proxy storage calls to backend during dev.
            {
              source: '/storage/:path*',
              destination: `${backendOrigin}/storage/:path*`,
            },
          ];
        },
      }
    : {}),
};

module.exports = nextConfig;

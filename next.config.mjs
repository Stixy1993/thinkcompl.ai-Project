/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ['framer-motion', 'react-icons'],
    serverComponentsExternalPackages: ['pdfjs-dist', 'fabric'],
  },
  // Performance optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Enable faster builds
  swcMinify: true,
  // Optimize for PDF and canvas libraries
  webpack: (config, { isServer, dev }) => {
    // Performance optimizations for faster compilation
    if (dev) {
      // Enable faster compilation in development
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all',
            },
            // Split heavy libraries into separate chunks
            framerMotion: {
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              name: 'framer-motion',
              chunks: 'all',
              priority: 30,
            },
            reactIcons: {
              test: /[\\/]node_modules[\\/]react-icons[\\/]/,
              name: 'react-icons', 
              chunks: 'all',
              priority: 30,
            },
            firebase: {
              test: /[\\/]node_modules[\\/]firebase[\\/]/,
              name: 'firebase',
              chunks: 'all',
              priority: 30,
            },
            // Split dashboard pages for better loading
            dashboardPages: {
              test: /[\\/]src[\\/]app[\\/]dashboard[\\/]/,
              name: 'dashboard-pages',
              chunks: 'all',
              priority: 20,
            },
          },
        },
      };
      
      // Enable parallel processing
      config.parallelism = 8;
      
      // Enable caching for faster subsequent builds
      config.cache = {
        type: 'filesystem',
      };
    }
    
    // Only apply optimizations in development and for server
    if (isServer) {
      // Exclude large libraries from server bundle only when needed
      config.externals = config.externals || [];
      if (!dev) {
        config.externals.push('pdfjs-dist', 'fabric');
      }
    }
    
    // Canvas optimization for fabric.js
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      jsdom: false,
      fs: false,
      path: false,
    };
    
    return config;
  },
  images: {
    domains: ['lh3.googleusercontent.com', 'firebasestorage.googleapis.com'],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "replicate.com",
      },
      {
        protocol: "https",
        hostname: "replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://api.openai.com/:path*",
      },
    ];
  },
  // Enable compression for better performance
  compress: true,

  // Add headers for better caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

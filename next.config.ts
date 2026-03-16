import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  env: {
    GEMINI_API_KEY: 'AIzaSyAhhug4WRHrPJr5TM7T5hNQglD8U0WErx8',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ── Fix: Genkit/Express conflict ──
  serverExternalPackages: [
    'genkit',
    '@genkit-ai/core',
    '@genkit-ai/ai',
    '@genkit-ai/firebase',
    '@genkit-ai/google-cloud',
    '@genkit-ai/google-genai',
    'express',
  ],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      // ── Cloudflare R2 ──
      {
        protocol: 'https',
        hostname: 'pub-4bbd9c700aec40cd8f7c4ba832a4d0d8.r2.dev',
        port: '',
        pathname: '/**',
      },
      // ── ImageKit CDN ──
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
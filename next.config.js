/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Supabase Storage sirve las imagenes publicas desde este host
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  experimental: {
    // pdf-parse usa APIs de Node y no debe bundlearse en el edge
    serverComponentsExternalPackages: ['pdf-parse'],
  },
};

module.exports = nextConfig;

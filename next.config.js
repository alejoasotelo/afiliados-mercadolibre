/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    // Las imagenes se cargan tal cual desde el Sheet (curado a mano), no solo
    // de mlstatic.com — con unoptimized:true no hay proxy de Next.js de por
    // medio, asi que restringir el host solo bloquea imagenes legitimas.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;

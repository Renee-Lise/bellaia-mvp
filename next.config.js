/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 0 erreur TypeScript depuis le 23/11/2026 : une erreur de typage bloque désormais la compilation
  // (et donc tout déploiement), au lieu de passer inaperçue.
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

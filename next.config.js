/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Version affichée dans l'application et comparée à /api/version (détection d'une nouvelle mise en ligne)
  env: {
    NEXT_PUBLIC_VERSION_APP: (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || "locale",
    NEXT_PUBLIC_VERSION_DATE: new Date().toISOString(),
  },
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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Linting runs as a dedicated `pnpm lint` step (ESLint flat config), not coupled to the build.
  eslint: { ignoreDuringBuilds: true },
  // Type errors must still fail the production build.
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;

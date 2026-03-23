/**
 * This file defines the Next.js runtime configuration for the TimeLend frontend.
 * It exists to keep framework-level behavior centralized and explicit.
 * It fits the system by preparing the app for future shared packages and Vercel deployment.
 */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@timelend/shared"]
};

export default nextConfig;

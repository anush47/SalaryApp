import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing Next.js config
};

const pwaConfig = {
  dest: "public",
  register: true,
  skipWaiting: true,
  //disable: process.env.NODE_ENV === "development",
};

export default withPWA(pwaConfig)(nextConfig);

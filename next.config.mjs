/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable modularized imports for better tree-shaking
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
    },
  },
  // Experimental performance optimizations
  experimental: {
    optimizePackageImports: ["recharts", "@radix-ui/react-*"],
  },
}

export default nextConfig


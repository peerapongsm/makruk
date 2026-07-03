/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/makruk",
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    // Relative by default: nginx serves the frontend and API on the same
    // origin, so "/api" works on localhost, a server IP, or a domain —
    // no rebuild needed when the host changes. Override only if the API
    // lives on a different origin.
    // `npm run dev` (no nginx) falls back to the local backend instead.
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === "development" ? "http://localhost:8080/api" : "/api"),
    // Unique per build; /app-version returns the server's value so open
    // clients can detect a new deployment and offer a reload.
    NEXT_PUBLIC_BUILD_ID: process.env.BUILD_ID || String(Date.now()),
  },
  // Serve the service worker with correct headers
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
    ];
  },
};

export default nextConfig;

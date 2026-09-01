/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes; public profile and auth remain functional
        source: "/(.*)",
        headers: [
          // Prevent MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Clickjacking protection — allow same-origin frames for video playback if needed
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Referrer: strict origin when cross-origin (preserves analytics referer family without full URL leak)
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Minimal permissions policy — disable sensitive browser APIs unless required
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), interest-cohort=()" },
          // CSP: intentionally permissive-enough for Next.js + Supabase + Gemini.
          // Note: unsafe-inline needed for Tailwind/Next hydration + inline styles used by UI components.
          // No Tailwind CDN in production build — compiled via postcss/tailwindcss.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: https: blob:",
              "media-src 'self' https://*.supabase.co blob:",
              "connect-src 'self' https://*.supabase.co https://*.googleapis.com https://generativelanguage.googleapis.com",
              "frame-ancestors 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

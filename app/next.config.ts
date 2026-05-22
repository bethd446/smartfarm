import type { NextConfig } from "next";

/**
 * R7-P1 V5 — Headers sécurité HTTP.
 *
 * CSP volontairement permissive pour Next 16 (script-src 'unsafe-inline' + 'unsafe-eval'
 * requis sans nonces ; à durcir Phase 2 avec next-nonce). connect-src ouvert sur Supabase
 * (REST + Realtime wss) et OpenRouter (chatbot).
 *
 * HSTS désactivé en dev (préservation localhost) ; à activer en prod via env Traefik.
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.supabase.co http://127.0.0.1:54321 http://localhost:54321",
      "font-src 'self' fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co http://127.0.0.1:54321 http://localhost:54321 ws://127.0.0.1:54321 ws://localhost:54321 https://openrouter.ai",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

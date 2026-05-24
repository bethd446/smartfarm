import type { Metadata, Viewport } from "next"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "Smart Farm — Gestion d'élevage · Côte d'Ivoire",
  description:
    "Application de gestion technique de troupeau porcin pour éleveurs ivoiriens. Multi-fermes, offline-first, mobile.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/logo/logo-glyph-only.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
}

export const viewport: Viewport = {
  themeColor: "#2D4A1F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isProd = process.env.NODE_ENV === "production"

  return (
    <html lang="fr-FR">
      <body className="antialiased bg-[var(--sf-surface-0)] text-[var(--sf-ink)]">
        {children}
        <Toaster richColors position="top-right" />
        {isProd && (
          <script src="/sw-register.js" defer />
        )}
      </body>
    </html>
  )
}

import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "Smart Farm — Gestion d'élevage · Côte d'Ivoire",
  description: "Application de gestion technique de troupeau porcin pour éleveurs ivoiriens. Multi-fermes, offline-first, mobile.",
  icons: {
    icon: "/logo-smartfarm.svg",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/logo-smartfarm.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased bg-[var(--sf-surface-0)] text-[var(--sf-ink)]">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}

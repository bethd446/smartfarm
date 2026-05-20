import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Smart Farm — Gestion d'élevage porcin",
  description: "Application de gestion complète d'élevage porcin : cheptel, reproduction, alimentation, sanitaire, stock.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.className} antialiased bg-slate-50`}>
        {children}
      </body>
    </html>
  )
}

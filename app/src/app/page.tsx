'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sprout, ChevronRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-slate-50 to-amber-50">
      <Card className="w-full max-w-md shadow-2xl border-emerald-100">
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg mb-3">
            <Sprout className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            Smart Farm
          </CardTitle>
          <p className="text-sm text-slate-500 mt-2">
            Gestion intelligente d'élevage porcin
          </p>
          <p className="text-xs text-amber-700 mt-3 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            🚧 Version brouillon — connexion automatique
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-slate-600 space-y-1">
            <div className="flex justify-between"><span>Compte démo</span><span className="font-mono">demo@smartfarm.local</span></div>
            <div className="flex justify-between"><span>Ferme</span><span className="font-mono">Smart Farm Yamoussoukro</span></div>
            <div className="flex justify-between"><span>Pays</span><span>🇨🇮 Côte d'Ivoire</span></div>
          </div>
          <Link href="/dashboard" className="block">
            <Button className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700">
              Se connecter
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <p className="text-[10px] text-center text-slate-400 pt-2">
            v0.1 — Hermes × Christophe Liegeois
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

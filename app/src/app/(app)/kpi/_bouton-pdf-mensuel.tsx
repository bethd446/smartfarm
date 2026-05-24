'use client'

/**
 * Sprint 3.E — Bouton téléchargement PDF mensuel sur /kpi
 * 
 * Composant client pour générer et télécharger un PDF mensuel via
 * l'endpoint GET /api/registre/mensuel?ferme_id=X&mois=YYYY-MM
 * 
 * Features:
 * - Sélecteur de mois (12 derniers mois, défaut = mois courant)
 * - Bouton Download avec loading state
 * - Gestion erreur (toast/alert)
 * - Mobile-first : min-h-44px pour touch targets
 */

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type BoutonPdfMensuelProps = {
  fermeId: string
}

// Génère les options des 12 derniers mois
function genererOptionsMois(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = []
  const now = new Date()

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const value = `${yyyy}-${mm}`

    // Label format : "Mai 2026"
    const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    const labelCapitalized = label.charAt(0).toUpperCase() + label.slice(1)

    options.push({ value, label: labelCapitalized })
  }

  return options
}

export function BoutonPdfMensuel({ fermeId }: BoutonPdfMensuelProps) {
  const optionsMois = genererOptionsMois()
  const [moisSelectionne, setMoisSelectionne] = useState<string>(optionsMois[0].value)
  const [isLoading, setIsLoading] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  async function handleTelecharger() {
    setIsLoading(true)
    setErreur(null)

    try {
      const url = `/api/registre/mensuel?ferme_id=${encodeURIComponent(fermeId)}&mois=${encodeURIComponent(moisSelectionne)}`
      const response = await fetch(url, { method: 'GET' })

      if (!response.ok) {
        // Tenter de parser le JSON d'erreur
        const errData = await response.json().catch(() => null)
        const errMsg = errData?.error ?? `Erreur HTTP ${response.status}`
        throw new Error(errMsg)
      }

      // Télécharger le blob PDF
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl

      // Extraire le filename depuis Content-Disposition si présent, sinon générer
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `rapport-${moisSelectionne}.pdf`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match && match[1]) {
          filename = match[1]
        }
      }

      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('[BoutonPdfMensuel] Erreur téléchargement:', error)
      const msg = error instanceof Error ? error.message : 'Erreur lors du téléchargement'
      setErreur(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Sélecteur de mois */}
      <div className="w-full sm:w-48">
        <Select value={moisSelectionne} onValueChange={setMoisSelectionne} disabled={isLoading}>
          <SelectTrigger
            className="border-[var(--sf-line)] text-sm"
            style={{
              minHeight: 'var(--sf-touch-min, 44px)',
              fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)",
            }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {optionsMois.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bouton Télécharger */}
      <Button
        onClick={handleTelecharger}
        disabled={isLoading}
        className="w-full sm:w-auto"
        style={{
          minHeight: 'var(--sf-touch-min, 44px)',
          fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
          letterSpacing: '0.05em',
        }}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Génération...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Télécharger PDF mensuel
          </>
        )}
      </Button>

      {/* Affichage erreur si présente */}
      {erreur && (
        <div
          className="mt-2 sm:mt-0 sm:ml-3 text-sm text-[var(--sf-danger-ink)] bg-[var(--sf-danger-bg)] border border-[var(--sf-danger-border)] rounded px-3 py-2"
          role="alert"
        >
          {erreur}
        </div>
      )}
    </div>
  )
}

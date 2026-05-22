import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Database, Users, Building2, FileText, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default async function ParametresPage() {
  const sb = await createClient()
  const [{ data: fermes }, { data: utilisateurs }, { data: regles }] = await Promise.all([
    sb.from('fermes').select('*'),
    sb.from('utilisateurs').select('*'),
    sb.from('regles_sevrage').select('*'),
  ])

  return (
    <div className="space-y-6">
      {/* === Header de page === */}
      <div>
        <h1
          className="text-4xl font-bold flex items-center gap-3 tracking-[0.01em] text-[var(--sf-ink)]"
          style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
        >
          <Settings className="h-8 w-8 text-[var(--sf-muted)]" />
          Réglages
        </h1>
        <p
          className="text-sm text-[var(--sf-muted)] mt-1"
          style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
        >
          Configuration de l'exploitation
        </p>
      </div>

      {/* Fermes — Card patché hérite du double-trait */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[var(--sf-primary)]" />
            Fermes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(fermes ?? []).map((f: any) => (
            <div
              key={f.id}
              className="flex justify-between items-center p-3 border border-[var(--sf-line)]"
              style={{ background: 'var(--sf-surface-2)' }}
            >
              <div>
                <div className="font-semibold text-[var(--sf-ink)]">{f.nom}</div>
                <div className="text-xs text-[var(--sf-muted)]">
                  {f.code} · {f.localisation}
                </div>
              </div>
              <Badge variant="outline">{f.type}</Badge>
            </div>
          ))}
          {(!fermes || fermes.length === 0) && (
            <div className="text-sm text-[var(--sf-muted)] py-4 text-center">
              Aucune ferme enregistrée.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Utilisateurs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--sf-accent)]" />
            Utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(utilisateurs ?? []).map((u: any) => (
            <div
              key={u.id}
              className="flex justify-between items-center p-3 border border-[var(--sf-line)]"
              style={{ background: 'var(--sf-surface-2)' }}
            >
              <div>
                <div className="font-semibold text-[var(--sf-ink)]">
                  {u.prenom} {u.nom}
                </div>
                <div className="text-xs text-[var(--sf-muted)] font-mono">{u.email}</div>
              </div>
              <Badge>{u.role}</Badge>
            </div>
          ))}
          {(!utilisateurs || utilisateurs.length === 0) && (
            <div className="text-sm text-[var(--sf-muted)] py-4 text-center">
              Aucun utilisateur.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Règles de sevrage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-[var(--sf-accent-deep)]" />
            Règles de sevrage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(regles ?? []).map((r: any) => (
            <div
              key={r.id}
              className="p-3 border border-[var(--sf-line)]"
              style={{ background: 'var(--sf-surface-2)' }}
            >
              <div className="font-semibold mb-1 text-[var(--sf-ink)]">{r.nom}</div>
              <div className="text-xs text-[var(--sf-ink-soft)] grid grid-cols-3 gap-2">
                <span>
                  Âge min : <b className="tabular-nums">{r.age_min_jours} j</b>
                </span>
                <span>
                  Âge max : <b className="tabular-nums">{r.age_max_jours} j</b>
                </span>
                <span>
                  Poids min : <b className="tabular-nums">{r.poids_min_kg} kg</b>
                </span>
              </div>
            </div>
          ))}
          {(!regles || regles.length === 0) && (
            <div className="text-sm text-[var(--sf-muted)] py-4 text-center">
              Aucune règle de sevrage.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registre d'Élevage — bouton tampon default (vert ferme) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--sf-primary)]" />
            Registre d'Élevage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--sf-ink-soft)]">
            Document officiel récapitulant mouvements de cheptel, reproduction et interventions
            sanitaires du 1<sup>er</sup> du mois en cours à aujourd'hui. Format A4 prêt à imprimer
            ou à archiver.
          </p>
          <a
            href={`/api/registre${
              process.env.NEXT_PUBLIC_DEMO_API_TOKEN
                ? `?token=${encodeURIComponent(process.env.NEXT_PUBLIC_DEMO_API_TOKEN)}`
                : ''
            }`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="default">
              <Download className="h-4 w-4 mr-2" />
              Télécharger le registre du mois
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}

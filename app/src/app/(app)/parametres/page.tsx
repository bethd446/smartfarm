import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Settings, Database, Users, Building2, FileText, Download, Sun } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ContrastToggle } from '@/components/contrast-toggle'

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
          className="text-4xl font-bold flex items-center gap-3 tracking-[0.01em] text-[var(--ink)]"
          style={{ fontFamily: 'var(--disp)' }}
        >
          <Settings className="h-8 w-8 text-[var(--mut)]" />
          Réglages
        </h1>
        <p className="text-sm text-[var(--mut)] mt-1">Configuration de l'exploitation</p>
      </div>

      {/* Fermes — panel .pn / lignes label-valeur */}
      <div className="pn">
        <div className="pn-h">
          <h3 className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[var(--sage-d)]" />
            Fermes
          </h3>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {(fermes ?? []).map((f: any) => (
            <div key={f.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
              <div className="min-w-0">
                <div className="font-semibold text-[var(--ink)] truncate">{f.nom}</div>
                <div className="text-xs text-[var(--mut)]">
                  {f.code} · {f.localisation}
                </div>
              </div>
              <Badge variant="outline">{f.type}</Badge>
            </div>
          ))}
          {(!fermes || fermes.length === 0) && (
            <div className="text-sm text-[var(--mut)] py-4 text-center">
              Aucune ferme enregistrée.
            </div>
          )}
        </div>
      </div>

      {/* Utilisateurs — panel .pn / lignes label-valeur */}
      <div className="pn">
        <div className="pn-h">
          <h3 className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--apri-d)]" />
            Utilisateurs
          </h3>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {(utilisateurs ?? []).map((u: any) => (
            <div key={u.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
              <div className="min-w-0">
                <div className="font-semibold text-[var(--ink)] truncate">
                  {u.prenom} {u.nom}
                </div>
                <div className="text-xs text-[var(--mut)] font-mono truncate">{u.email}</div>
              </div>
              <Badge>{u.role}</Badge>
            </div>
          ))}
          {(!utilisateurs || utilisateurs.length === 0) && (
            <div className="text-sm text-[var(--mut)] py-4 text-center">Aucun utilisateur.</div>
          )}
        </div>
      </div>

      {/* Règles de sevrage — panel .pn / blocs label-valeur */}
      <div className="pn">
        <div className="pn-h">
          <h3 className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[var(--apri-d)]" />
            Règles de sevrage
          </h3>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {(regles ?? []).map((r: any) => (
            <div key={r.id} className="py-3 first:pt-0">
              <div className="font-semibold mb-1.5 text-[var(--ink)]">{r.nom}</div>
              <div className="text-xs text-[var(--ink-soft)] grid grid-cols-3 gap-2">
                <span>
                  Âge min : <b className="tabular-nums text-[var(--ink)]">{r.age_min_jours} j</b>
                </span>
                <span>
                  Âge max : <b className="tabular-nums text-[var(--ink)]">{r.age_max_jours} j</b>
                </span>
                <span>
                  Poids min :{' '}
                  <b className="tabular-nums text-[var(--ink)]">{r.poids_min_kg} kg</b>
                </span>
              </div>
            </div>
          ))}
          {(!regles || regles.length === 0) && (
            <div className="text-sm text-[var(--mut)] py-4 text-center">
              Aucune règle de sevrage.
            </div>
          )}
        </div>
      </div>

      {/* Affichage — toggle haut-contraste exposé (plein soleil) */}
      <div className="pn">
        <div className="pn-h">
          <h3 className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-[var(--apri-d)]" />
            Affichage
          </h3>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-semibold text-[var(--ink)]">Mode plein soleil</div>
            <p className="text-xs text-[var(--mut)] mt-0.5">
              Contraste renforcé pour la lecture en extérieur. Réglage mémorisé sur cet appareil.
            </p>
          </div>
          <div className="shrink-0 rounded-[var(--r)] bg-[var(--ink)] px-2 py-1.5">
            <ContrastToggle />
          </div>
        </div>
      </div>

      {/* Registre d'Élevage — panel .pn, bouton primaire sage */}
      <div className="pn">
        <div className="pn-h">
          <h3 className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--sage-d)]" />
            Registre d'Élevage
          </h3>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-[var(--ink-soft)]">
            Document officiel récapitulant mouvements de cheptel, reproduction et interventions
            sanitaires du 1<sup>er</sup> du mois en cours à aujourd'hui. Format A4 prêt à imprimer
            ou à archiver.
          </p>
          {/* R7-P1 V1 : plus de token client-side ; route same-origin protégée par middleware en Phase 2 */}
          <a
            href="/api/registre"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center"
          >
            <Button variant="default" className="min-h-[44px]">
              <Download className="h-4 w-4 mr-2" />
              Télécharger le registre du mois
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}

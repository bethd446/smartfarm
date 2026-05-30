/**
 * Composants d'état VERGER (React) — chargement / vide / erreur.
 * Niveau C : enrober chaque écran/section asynchrone. Dépend de design/states.css.
 * Sans dépendance (icônes en SVG inline). Adaptez les imports à votre arborescence.
 *
 *   {loading ? <KpiSkeleton n={4}/> : data.length === 0
 *       ? <EmptyState title="Aucune saillie" message="Enregistrez la première saillie." actionLabel="Saisir" onAction={...}/>
 *       : <Table rows={data}/>}
 */
import * as React from "react";

/* ---- Squelettes ---------------------------------------------------------- */
export function SkeletonLine({ w = "80" }: { w?: "40" | "60" | "80" }) {
  return <div className={`sf-skel sf-skel-line w-${w}`} aria-hidden="true" />;
}

export function KpiSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="kpis" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="sf-skel sf-skel-kpi" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      <div className="sf-skel sf-skel-title" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="sf-skel sf-skel-row" />
      ))}
    </div>
  );
}

/* ---- État vide ----------------------------------------------------------- */
export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="sf-empty" role="status">
      <span className="sf-empty-ic">{icon ?? <IconInbox />}</span>
      <h3>{title}</h3>
      <p>{message}</p>
      {actionLabel && onAction && (
        <button className="btn btn-primary" onClick={onAction} type="button">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ---- État d'erreur ------------------------------------------------------- */
export function ErrorState({
  title = "Une erreur est survenue",
  message = "Impossible de charger ces données. Vérifiez votre connexion et réessayez.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="sf-error" role="alert">
      <span className="sf-error-ic">
        <IconAlert />
      </span>
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-ghost" onClick={onRetry} type="button">
          Réessayer
        </button>
      )}
    </div>
  );
}

/* ---- Rechargement en place ---------------------------------------------- */
export function Busy({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <div className="sf-busy" aria-busy={busy}>
      {children}
    </div>
  );
}

/* ---- Icônes (stroke, sans emoji) ---------------------------------------- */
function IconInbox() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

-- RPC fuzzy search animaux par tag (boucle)
-- Sécurité : SECURITY INVOKER → respecte RLS existante (current_farm_id)
-- Sprint S4 Lane C — recherche globale top-bar

CREATE OR REPLACE FUNCTION public.search_animaux_by_tag(query TEXT)
RETURNS TABLE (
  id UUID,
  tag TEXT,
  nom TEXT,
  categorie TEXT,
  stade TEXT,
  batiment_nom TEXT
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT 
    a.id, 
    a.tag, 
    a.nom, 
    a.categorie::text, 
    a.stade::text, 
    b.nom AS batiment_nom
  FROM public.animaux a
  LEFT JOIN public.batiments b ON b.id = a.batiment_id
  WHERE 
    a.statut IN ('actif', 'malade')
    AND a.deleted_at IS NULL
    AND (
      a.tag ILIKE '%' || query || '%' 
      OR a.nom ILIKE '%' || query || '%'
    )
  ORDER BY 
    -- Priorité tag exact > préfixe > contains
    CASE 
      WHEN a.tag = query THEN 1
      WHEN a.tag ILIKE query || '%' THEN 2
      ELSE 3 
    END,
    a.tag
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.search_animaux_by_tag(TEXT) TO authenticated;

COMMENT ON FUNCTION public.search_animaux_by_tag IS 
'Recherche fuzzy animaux actifs par tag (boucle) ou nom. 
Respecte RLS current_farm_id via SECURITY INVOKER. 
Max 20 résultats, tri pertinence.';

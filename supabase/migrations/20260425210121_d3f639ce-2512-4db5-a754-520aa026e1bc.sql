-- Función que devuelve la organización por defecto del usuario actual
-- Prioriza Klose Internal si pertenece, sino la primera org activa
CREATE OR REPLACE FUNCTION public.get_default_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.organization_id
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.user_id = auth.uid() 
    AND om.is_active = true
    AND o.is_active = true
  ORDER BY o.is_klose_internal DESC, om.joined_at ASC
  LIMIT 1;
$$;

-- Aplicar como DEFAULT a las 19 tablas de negocio
DO $$
DECLARE
  v_table text;
  v_business_tables text[] := ARRAY[
    'leads', 'properties', 'buyers', 'contracts', 'contract_signatures',
    'payments', 'payment_links', 'deal_packages', 'interactions',
    'seller_conversations', 'property_analyses', 'property_comps',
    'lead_documents', 'property_images', 'realtors',
    'agent_demos', 'training_sessions',
    'drip_campaigns', 'lead_cleanup_log'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_business_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organization_id SET DEFAULT public.get_default_org_id()', v_table);
  END LOOP;
END $$;
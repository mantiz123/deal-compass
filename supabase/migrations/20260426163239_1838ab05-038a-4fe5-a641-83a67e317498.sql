-- Allow Klose Internal super admins to access all states (live or coming-soon)
CREATE OR REPLACE FUNCTION public.can_access_state(_user_id uuid, _state_code text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    public.is_klose_super_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_state_specializations uss
      JOIN public.academy_states s ON s.id = uss.state_id
      WHERE uss.user_id = _user_id
        AND s.code = _state_code
        AND s.is_live = true
    );
$function$;

-- Grant all states to existing Klose Internal members so the UI shows them as unlocked
INSERT INTO public.user_state_specializations (user_id, state_id, unlock_source, is_primary)
SELECT
  om.user_id,
  s.id,
  'internal',
  (s.code = 'AL')
FROM public.organization_members om
JOIN public.organizations o ON o.id = om.organization_id
CROSS JOIN public.academy_states s
WHERE o.is_klose_internal = true
  AND om.is_active = true
ON CONFLICT (user_id, state_id) DO NOTHING;
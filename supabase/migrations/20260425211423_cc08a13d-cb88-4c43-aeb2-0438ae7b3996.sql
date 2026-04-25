-- ============================================
-- FASE 1: Modelo A - Onboarding automático
-- ============================================

-- 1. Agregar campos económicos a organizations (Modelo A: Klose firma, estudiante 60%)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS commission_split_student numeric(5,2) NOT NULL DEFAULT 60.00,
  ADD COLUMN IF NOT EXISTS deals_closed_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_earned_student numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agreement_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

COMMENT ON COLUMN public.organizations.commission_split_student IS 'Modelo A: % que recibe el estudiante (default 60%, Klose se queda con 40%)';
COMMENT ON COLUMN public.organizations.owner_user_id IS 'Usuario propietario inicial (estudiante). Klose Internal no lo usa.';

-- 2. Trigger function: crear organización + membership al registrar perfil
CREATE OR REPLACE FUNCTION public.handle_new_student_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_slug text;
  v_org_name text;
  v_user_email text;
  v_already_member boolean;
BEGIN
  -- Verificar si el usuario ya pertenece a alguna organización
  -- (Super admins de Klose Internal NO deben crear org nueva)
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = NEW.user_id AND is_active = true
  ) INTO v_already_member;

  IF v_already_member THEN
    RETURN NEW;
  END IF;

  -- Obtener email del usuario
  SELECT email INTO v_user_email FROM auth.users WHERE id = NEW.user_id;

  -- Generar nombre y slug únicos
  v_org_name := COALESCE(NEW.full_name, split_part(v_user_email, '@', 1)) || '''s Workspace';
  v_slug := lower(regexp_replace(
    COALESCE(NEW.full_name, split_part(v_user_email, '@', 1)),
    '[^a-zA-Z0-9]+', '-', 'g'
  )) || '-' || substr(NEW.user_id::text, 1, 8);

  -- Crear organización (Modelo A: Starter tier, 60% al estudiante)
  INSERT INTO public.organizations (
    name,
    slug,
    tier,
    is_klose_internal,
    is_active,
    commission_split_student,
    owner_user_id
  ) VALUES (
    v_org_name,
    v_slug,
    'free'::organization_tier,
    false,
    true,
    60.00,
    NEW.user_id
  )
  RETURNING id INTO v_org_id;

  -- Asignar al estudiante como owner
  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    is_active
  ) VALUES (
    v_org_id,
    NEW.user_id,
    'owner'::org_member_role,
    true
  );

  RETURN NEW;
END;
$$;

-- 3. Activar el trigger en profiles (que ya se crea automático en signup vía handle_new_user)
DROP TRIGGER IF EXISTS on_profile_created_create_org ON public.profiles;
CREATE TRIGGER on_profile_created_create_org
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_student_org();

-- 4. Asegurar que handle_new_user (trigger ya existente en auth.users) sigue creando el profile
-- Verificar trigger existe en auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;
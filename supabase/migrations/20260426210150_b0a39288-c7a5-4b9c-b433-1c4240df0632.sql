-- Enum de 7 etapas del pipeline KCFY
CREATE TYPE public.kcfy_stage AS ENUM (
  'submitted',
  'accepted',
  'contacting_seller',
  'negotiating',
  'under_contract',
  'buyer_secured',
  'closed',
  'dead'
);

-- Tabla de eventos: cada cambio de etapa queda registrado
CREATE TABLE public.kcfy_status_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kcfy_request_id UUID NOT NULL REFERENCES public.kcfy_requests(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  stage public.kcfy_stage NOT NULL,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_kcfy_status_events_request ON public.kcfy_status_events(kcfy_request_id, created_at DESC);
CREATE INDEX idx_kcfy_status_events_org ON public.kcfy_status_events(organization_id);

-- RLS multi-tenant
ALTER TABLE public.kcfy_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view kcfy events in their orgs"
  ON public.kcfy_status_events
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Super admins insert kcfy events"
  ON public.kcfy_status_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_klose_super_admin(auth.uid())
    OR (
      public.user_can_access_org(auth.uid(), organization_id)
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Super admins delete kcfy events"
  ON public.kcfy_status_events
  FOR DELETE
  TO authenticated
  USING (public.is_klose_super_admin(auth.uid()));

-- Trigger 1: crea evento "submitted" cuando se inserta un KCFY
CREATE OR REPLACE FUNCTION public.kcfy_log_initial_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.kcfy_status_events (
    kcfy_request_id, organization_id, stage, note, created_by
  ) VALUES (
    NEW.id, NEW.organization_id, 'submitted'::kcfy_stage, NEW.notes, NEW.requested_by
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_kcfy_log_initial_event
  AFTER INSERT ON public.kcfy_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.kcfy_log_initial_event();

-- Trigger 2: registra evento cuando cambia status (mapeo legacy → stage)
CREATE OR REPLACE FUNCTION public.kcfy_log_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage public.kcfy_stage;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  v_stage := CASE NEW.status::text
    WHEN 'pending' THEN 'submitted'::kcfy_stage
    WHEN 'accepted' THEN 'accepted'::kcfy_stage
    WHEN 'in_progress' THEN 'contacting_seller'::kcfy_stage
    WHEN 'closed' THEN 'closed'::kcfy_stage
    WHEN 'rejected' THEN 'dead'::kcfy_stage
    WHEN 'cancelled' THEN 'dead'::kcfy_stage
    ELSE NULL
  END;

  IF v_stage IS NOT NULL THEN
    INSERT INTO public.kcfy_status_events (
      kcfy_request_id, organization_id, stage, note, created_by
    ) VALUES (
      NEW.id, NEW.organization_id, v_stage,
      COALESCE(NEW.rejection_reason, NULL),
      COALESCE(NEW.klose_assignee_id, auth.uid())
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_kcfy_log_status_change
  AFTER UPDATE ON public.kcfy_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.kcfy_log_status_change();

-- Backfill: crea evento "submitted" para los KCFY existentes que no tengan eventos
INSERT INTO public.kcfy_status_events (kcfy_request_id, organization_id, stage, note, created_by, created_at)
SELECT r.id, r.organization_id, 'submitted'::kcfy_stage, r.notes, r.requested_by, r.created_at
FROM public.kcfy_requests r
LEFT JOIN public.kcfy_status_events e ON e.kcfy_request_id = r.id
WHERE e.id IS NULL;
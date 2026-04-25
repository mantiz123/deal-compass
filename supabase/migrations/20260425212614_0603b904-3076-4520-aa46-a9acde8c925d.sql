-- Enums
CREATE TYPE public.kcfy_status AS ENUM ('pending', 'accepted', 'in_progress', 'closed', 'rejected', 'cancelled');
CREATE TYPE public.kcfy_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- Tabla
CREATE TABLE public.kcfy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.get_default_org_id(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  status public.kcfy_status NOT NULL DEFAULT 'pending',
  priority public.kcfy_priority NOT NULL DEFAULT 'normal',
  notes text,
  deal_value_estimate numeric,
  agreed_split_student numeric DEFAULT 60.00,
  klose_assignee_id uuid,
  rejection_reason text,
  accepted_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_kcfy_org ON public.kcfy_requests(organization_id);
CREATE INDEX idx_kcfy_lead ON public.kcfy_requests(lead_id);
CREATE INDEX idx_kcfy_status ON public.kcfy_requests(status);
CREATE UNIQUE INDEX idx_kcfy_unique_active_per_lead 
  ON public.kcfy_requests(lead_id) 
  WHERE status IN ('pending', 'accepted', 'in_progress');

-- Trigger updated_at
CREATE TRIGGER trg_kcfy_updated_at
BEFORE UPDATE ON public.kcfy_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.kcfy_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view kcfy requests in their orgs"
ON public.kcfy_requests FOR SELECT TO authenticated
USING (public.user_can_access_org(auth.uid(), organization_id));

CREATE POLICY "Members create kcfy requests in their orgs"
ON public.kcfy_requests FOR INSERT TO authenticated
WITH CHECK (
  public.user_can_access_org(auth.uid(), organization_id)
  AND auth.uid() = requested_by
);

CREATE POLICY "Members cancel their pending requests"
ON public.kcfy_requests FOR UPDATE TO authenticated
USING (
  public.user_can_access_org(auth.uid(), organization_id)
  AND (
    public.is_klose_super_admin(auth.uid())
    OR (requested_by = auth.uid() AND status = 'pending')
  )
);

CREATE POLICY "Super admins delete kcfy requests"
ON public.kcfy_requests FOR DELETE TO authenticated
USING (public.is_klose_super_admin(auth.uid()));
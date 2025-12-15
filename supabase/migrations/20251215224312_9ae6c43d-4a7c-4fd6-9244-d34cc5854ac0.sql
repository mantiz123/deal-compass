-- Create drip campaigns table
CREATE TABLE public.drip_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_status lead_status NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign sequences (steps) table
CREATE TABLE public.campaign_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  delay_days INTEGER NOT NULL DEFAULT 0,
  delay_hours INTEGER NOT NULL DEFAULT 0,
  subject TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign enrollments table
CREATE TABLE public.campaign_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  current_sequence INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'unsubscribed')),
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_sent_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(campaign_id, lead_id)
);

-- Create message logs table for tracking sent messages
CREATE TABLE public.campaign_message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES campaign_enrollments(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES campaign_sequences(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'opened', 'clicked')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.drip_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_message_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for drip_campaigns
CREATE POLICY "Authenticated users can view campaigns"
ON public.drip_campaigns FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create campaigns"
ON public.drip_campaigns FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update campaigns"
ON public.drip_campaigns FOR UPDATE USING (true);

CREATE POLICY "Admins can delete campaigns"
ON public.drip_campaigns FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for campaign_sequences
CREATE POLICY "Authenticated users can view sequences"
ON public.campaign_sequences FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage sequences"
ON public.campaign_sequences FOR ALL USING (true);

-- RLS Policies for campaign_enrollments
CREATE POLICY "Authenticated users can view enrollments"
ON public.campaign_enrollments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage enrollments"
ON public.campaign_enrollments FOR ALL USING (true);

-- RLS Policies for campaign_message_logs
CREATE POLICY "Authenticated users can view message logs"
ON public.campaign_message_logs FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert message logs"
ON public.campaign_message_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update message logs"
ON public.campaign_message_logs FOR UPDATE USING (true);

-- Create trigger for updated_at on drip_campaigns
CREATE TRIGGER update_drip_campaigns_updated_at
BEFORE UPDATE ON public.drip_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_campaign_enrollments_next_send ON public.campaign_enrollments(next_send_at) WHERE status = 'active';
CREATE INDEX idx_campaign_enrollments_lead ON public.campaign_enrollments(lead_id);
CREATE INDEX idx_drip_campaigns_trigger ON public.drip_campaigns(trigger_status) WHERE is_active = true;
CREATE TABLE public.site_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'property',
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  property_type TEXT,
  asking_price NUMERIC,
  timeline TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT INSERT ON public.site_submissions TO anon;
GRANT SELECT, INSERT ON public.site_submissions TO authenticated;
GRANT ALL ON public.site_submissions TO service_role;
ALTER TABLE public.site_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit" ON public.site_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read submissions" ON public.site_submissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
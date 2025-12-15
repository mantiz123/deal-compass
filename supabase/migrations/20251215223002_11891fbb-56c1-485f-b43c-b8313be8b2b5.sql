-- Create storage bucket for lead documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lead-documents', 'lead-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create policies for lead documents storage
CREATE POLICY "Authenticated users can view lead documents" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'lead-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload lead documents" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'lead-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their documents" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'lead-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete their documents" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'lead-documents' AND auth.role() = 'authenticated');

-- Create lead_documents table to track documents
CREATE TABLE IF NOT EXISTS public.lead_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_documents
CREATE POLICY "Authenticated users can view lead documents table"
ON public.lead_documents FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert lead documents"
ON public.lead_documents FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete their documents"
ON public.lead_documents FOR DELETE
USING (true);
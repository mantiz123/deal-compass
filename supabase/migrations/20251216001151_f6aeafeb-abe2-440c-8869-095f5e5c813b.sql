-- Create storage bucket for property images
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true);

-- Create property_images table
CREATE TABLE public.property_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Property images are viewable by authenticated users"
ON public.property_images
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can upload property images"
ON public.property_images
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update property images"
ON public.property_images
FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete property images"
ON public.property_images
FOR DELETE
USING (true);

-- Storage policies for property-images bucket
CREATE POLICY "Property images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'property-images');

CREATE POLICY "Authenticated users can upload property images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their property images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete property images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');

-- Ensure only one primary image per property
CREATE UNIQUE INDEX idx_property_primary_image 
ON public.property_images (property_id) 
WHERE is_primary = true;
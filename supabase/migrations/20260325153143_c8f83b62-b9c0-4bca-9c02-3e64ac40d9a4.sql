-- Delete demo leads and their associated properties (from Dec 15, 2025 non-PropWire sources)
DO $$
DECLARE
  demo_property_ids uuid[];
BEGIN
  SELECT array_agg(property_id) INTO demo_property_ids
  FROM leads 
  WHERE source IN ('Cold Calling', 'Probate Records', 'Driving for Dollars', 'Tax Lien List', 'Direct Mail', 'List Purchase', 'Referral')
    AND created_at::date = '2025-12-15';
  
  DELETE FROM leads 
  WHERE source IN ('Cold Calling', 'Probate Records', 'Driving for Dollars', 'Tax Lien List', 'Direct Mail', 'List Purchase', 'Referral')
    AND created_at::date = '2025-12-15';
  
  IF demo_property_ids IS NOT NULL THEN
    DELETE FROM properties WHERE id = ANY(demo_property_ids);
  END IF;
END $$;

-- Derive owner_tenure_years from last_sale_date where missing
UPDATE properties
SET owner_tenure_years = EXTRACT(YEAR FROM age(NOW(), last_sale_date))::int
WHERE last_sale_date IS NOT NULL 
  AND owner_tenure_years IS NULL;
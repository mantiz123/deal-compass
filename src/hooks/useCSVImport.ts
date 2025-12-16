import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ColumnMapping, transformRow, propertyFields } from '@/lib/csvColumnMapping';

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

interface ImportOptions {
  rows: Record<string, string>[];
  mappings: ColumnMapping[];
  source: string;
  calculatePIW: boolean;
}

export const useCSVImport = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rows, mappings, source, calculatePIW }: ImportOptions): Promise<ImportResult> => {
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      const batchSize = 50; // Process in batches to avoid timeouts
      
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        
        for (const row of batch) {
          try {
            // Transform CSV row to property data
            const propertyData = transformRow(row, mappings);
            
            // Validate required fields
            if (!propertyData.address || !propertyData.city || !propertyData.state || !propertyData.zip_code) {
              result.failed++;
              result.errors.push(`Fila ${i + batch.indexOf(row) + 2}: Faltan campos requeridos (dirección, ciudad, estado, o código postal)`);
              continue;
            }
            
            // Combine first and last name if both exist
            let ownerName = propertyData.owner_name || null;
            if (propertyData.owner_first_name || propertyData.owner_last_name) {
              ownerName = [propertyData.owner_first_name, propertyData.owner_last_name]
                .filter(Boolean)
                .join(' ')
                .trim() || null;
            }
            
            // Handle tenure - could be in months or years
            const tenureYears = propertyData.owner_tenure_months || propertyData.owner_tenure_years || null;
            
            // Handle absentee owner - can come from is_absentee_owner or owner_occupied (inverse)
            let isAbsentee = false;
            if (propertyData.is_absentee_owner !== undefined && propertyData.is_absentee_owner !== null) {
              isAbsentee = propertyData.is_absentee_owner;
            } else if (propertyData.owner_occupied !== undefined && propertyData.owner_occupied !== null) {
              isAbsentee = propertyData.owner_occupied; // Already inverted in transform
            }
            
            // Create property
            const { data: property, error: propertyError } = await supabase
              .from('properties')
              .insert({
                address: propertyData.address,
                city: propertyData.city,
                state: propertyData.state,
                zip_code: propertyData.zip_code,
                owner_name: ownerName,
                owner_phone: propertyData.owner_phone || null,
                owner_email: propertyData.owner_email || null,
                owner_type: propertyData.owner_type || null,
                property_type: propertyData.property_type || 'single_family',
                bedrooms: propertyData.bedrooms || null,
                bathrooms: propertyData.bathrooms || null,
                sqft: propertyData.sqft || null,
                lot_size: propertyData.lot_size || null,
                year_built: propertyData.year_built || null,
                arv: propertyData.arv || null,
                equity_percent: propertyData.equity_percent || null,
                owner_tenure_years: tenureYears,
                is_absentee_owner: isAbsentee,
                tax_delinquent: propertyData.tax_delinquent || false,
                is_foreclosure: propertyData.is_foreclosure || false,
                is_probate: propertyData.is_probate || false,
                last_sale_date: propertyData.last_sale_date || null,
                last_sale_price: propertyData.last_sale_price || null,
                mailing_address_different: propertyData.mailing_address_different || false,
                tax_debt: propertyData.tax_debt || null,
                data_source: source,
                data_fetched_at: new Date().toISOString(),
              })
              .select()
              .single();
            
            if (propertyError) {
              result.failed++;
              result.errors.push(`Fila ${i + batch.indexOf(row) + 2}: ${propertyError.message}`);
              continue;
            }
            
            // Create lead
            const { data: lead, error: leadError } = await supabase
              .from('leads')
              .insert({
                property_id: property.id,
                source: source,
                status: 'captacion',
              })
              .select()
              .single();
            
            if (leadError) {
              result.failed++;
              result.errors.push(`Fila ${i + batch.indexOf(row) + 2}: Error creando lead - ${leadError.message}`);
              continue;
            }
            
            // Calculate PIW Score if enabled
            if (calculatePIW && lead) {
              try {
                const { error: piwError } = await supabase.functions.invoke('calculate-piw-score', {
                  body: {
                    lead_id: lead.id,
                    property_data: property,
                  },
                });
                
                if (piwError) {
                  console.warn(`PIW Score calculation failed for lead ${lead.id}:`, piwError);
                }
              } catch (piwError) {
                console.warn('PIW Score calculation error:', piwError);
              }
            }
            
            result.success++;
          } catch (error: any) {
            result.failed++;
            result.errors.push(`Fila ${i + batch.indexOf(row) + 2}: ${error.message || 'Error desconocido'}`);
          }
        }
      }
      
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      
      if (result.success > 0) {
        toast({
          title: 'Importación completada',
          description: `${result.success} leads importados exitosamente${result.failed > 0 ? `, ${result.failed} fallaron` : ''}`,
        });
      }
      
      if (result.failed > 0 && result.success === 0) {
        toast({
          title: 'Error en importación',
          description: `Todos los ${result.failed} registros fallaron`,
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

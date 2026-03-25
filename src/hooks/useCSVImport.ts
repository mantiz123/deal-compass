import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ColumnMapping, transformRow, propertyFields } from '@/lib/csvColumnMapping';

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  skippedSold: number;
  hotLeadsNoPhone: string[];
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
      const result: ImportResult = { success: 0, failed: 0, errors: [], skippedSold: 0, hotLeadsNoPhone: [] };
      let skippedDuplicates = 0;
      let piwCalculated = 0;
      const batchSize = 50;
      
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        
        for (const row of batch) {
          try {
            const propertyData = transformRow(row, mappings);
            
            // === FILTER: Skip SOLD properties ===
            const mlsStatus = propertyData.mls_status?.toUpperCase?.() || null;
            if (mlsStatus === 'SOLD') {
              result.skippedSold++;
              continue;
            }
            
            if (!propertyData.address || !propertyData.city || !propertyData.state || !propertyData.zip_code) {
              result.failed++;
              result.errors.push(`Fila ${i + batch.indexOf(row) + 2}: Faltan campos requeridos`);
              continue;
            }
            
            // Check for duplicate property by address + zip_code
            const normalizedAddress = propertyData.address.trim().toUpperCase();
            const { data: existingProperty } = await supabase
              .from('properties')
              .select('id')
              .ilike('address', normalizedAddress)
              .eq('zip_code', propertyData.zip_code)
              .maybeSingle();
            
            if (existingProperty) {
              // Property exists - check if lead needs PIW score
              if (calculatePIW) {
                const { data: existingLead } = await supabase
                  .from('leads')
                  .select('id, piw_score')
                  .eq('property_id', existingProperty.id)
                  .maybeSingle();
                
                if (existingLead && existingLead.piw_score === null) {
                  // Fetch full property data for PIW calculation
                  const { data: fullProperty } = await supabase
                    .from('properties')
                    .select('*')
                    .eq('id', existingProperty.id)
                    .single();
                  
                  if (fullProperty) {
                    try {
                      await supabase.functions.invoke('calculate-piw-score', {
                        body: { leadId: existingLead.id, propertyData: fullProperty },
                      });
                      piwCalculated++;
                    } catch (e) {
                      console.warn(`PIW recalc failed for ${existingLead.id}:`, e);
                    }
                  }
                }
              }
              skippedDuplicates++;
              continue;
            }
            
            // Combine first and last name
            let ownerName = propertyData.owner_name || null;
            if (propertyData.owner_first_name || propertyData.owner_last_name) {
              ownerName = [propertyData.owner_first_name, propertyData.owner_last_name]
                .filter(Boolean).join(' ').trim() || null;
            }
            
            // === DERIVED FIELD: Tenure from last_sale_date if no ownership_months ===
            const ownershipMonthsRaw = propertyData.ownership_months || null;
            let tenureYears = propertyData.owner_tenure_months || null;
            
            if (!ownershipMonthsRaw && !tenureYears && propertyData.last_sale_date) {
              const saleDate = new Date(propertyData.last_sale_date);
              if (!isNaN(saleDate.getTime())) {
                const diffMs = Date.now() - saleDate.getTime();
                const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
                tenureYears = Math.floor(diffMonths / 12);
              }
            }
            
            const tenureForDb = ownershipMonthsRaw ? Math.floor(ownershipMonthsRaw / 12) : tenureYears;
            
            // === DERIVED FIELD: Equity from Est. Loan-to-Value ===
            let equityPercent = propertyData.equity_percent || null;
            if (equityPercent === null && propertyData.est_ltv != null && propertyData.est_ltv >= 0) {
              equityPercent = Math.round(100 - propertyData.est_ltv);
            }
            // If we have est_equity_dollars and arv, compute equity percent
            if (equityPercent === null && propertyData.est_equity_dollars && propertyData.arv && propertyData.arv > 0) {
              equityPercent = Math.round((propertyData.est_equity_dollars / propertyData.arv) * 100);
            }
            
            // === DERIVED FIELD: Days on Market from MLS Date ===
            let daysOnMarket = propertyData.days_on_market || null;
            if (daysOnMarket === null && propertyData.mls_date) {
              const mlsDate = new Date(propertyData.mls_date);
              if (!isNaN(mlsDate.getTime())) {
                const diffMs = Date.now() - mlsDate.getTime();
                daysOnMarket = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                if (daysOnMarket < 0) daysOnMarket = 0;
              }
            }
            
            // === DERIVED FIELD: Foreclosure from Foreclosure Factor ===
            let isForeclosure = propertyData.is_foreclosure || false;
            const foreclosureFactor = propertyData.foreclosure_factor;
            if (foreclosureFactor) {
              const ff = foreclosureFactor.toLowerCase();
              if (ff === 'high' || ff === 'very high') {
                isForeclosure = true;
              }
            }
            // Auto-detect foreclosure from Pre-FC Recording Date
            if (!isForeclosure && propertyData.prefc_recording_date) {
              isForeclosure = true;
            }
            
            // === DERIVED FIELD: MLS Status signals ===
            // mlsStatus already defined above (SOLD filter)
            // FAIL or EXPIRED on MLS = frustrated seller → additional DOM signal
            if (mlsStatus && (mlsStatus === 'FAIL' || mlsStatus === 'EXPIRED')) {
              // If no DOM, estimate from MLS date; if still no data, set minimum DOM signal
              if (daysOnMarket === null || daysOnMarket === 0) {
                if (propertyData.mls_date) {
                  const mlsDate = new Date(propertyData.mls_date);
                  if (!isNaN(mlsDate.getTime())) {
                    daysOnMarket = Math.floor((Date.now() - mlsDate.getTime()) / (1000 * 60 * 60 * 24));
                  }
                }
                // If still nothing, set a default for FAIL/EXPIRED properties
                if (daysOnMarket === null || daysOnMarket === 0) {
                  daysOnMarket = 200; // Conservative estimate for failed/expired listings
                }
              }
            }
            
            // === Absentee detection ===
            let isAbsentee = false;
            if (propertyData.is_absentee_owner !== undefined && propertyData.is_absentee_owner !== null) {
              isAbsentee = propertyData.is_absentee_owner;
            } else if (propertyData.owner_occupied !== undefined && propertyData.owner_occupied !== null) {
              isAbsentee = propertyData.owner_occupied;
            }
            
            let absenteeType: string | null = null;
            const ownerMailingState = propertyData.owner_mailing_state?.trim().toUpperCase() || null;
            const ownerMailingCity = propertyData.owner_mailing_city?.trim().toUpperCase() || null;
            const propState = propertyData.state?.trim().toUpperCase() || null;
            const propCity = propertyData.city?.trim().toUpperCase() || null;
            
            if (ownerMailingState && propState) {
              if (ownerMailingState !== propState) {
                absenteeType = 'out_of_state';
                isAbsentee = true;
              } else if (ownerMailingCity && propCity && ownerMailingCity !== propCity) {
                absenteeType = 'local';
                isAbsentee = true;
              } else {
                absenteeType = 'occupied';
              }
            }
            
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
                equity_percent: equityPercent,
                owner_tenure_years: tenureForDb,
                is_absentee_owner: isAbsentee,
                absentee_type: absenteeType,
                owner_mailing_state: propertyData.owner_mailing_state || null,
                owner_mailing_city: propertyData.owner_mailing_city || null,
                is_vacant: propertyData.is_vacant || false,
                days_on_market: daysOnMarket,
                tax_delinquent: propertyData.tax_delinquent || false,
                is_foreclosure: isForeclosure,
                is_probate: propertyData.is_probate || false,
                last_sale_date: propertyData.last_sale_date || null,
                last_sale_price: propertyData.last_sale_price || null,
                mailing_address_different: propertyData.mailing_address_different || false,
                tax_debt: propertyData.tax_debt || null,
                mortgage_balance: propertyData.est_remaining_balance || null,
                auction_date: propertyData.auction_date || null,
                // Multi-phone
                phone_2: propertyData.phone_2 || null,
                phone_3: propertyData.phone_3 || null,
                phone_4: propertyData.phone_4 || null,
                phone_5: propertyData.phone_5 || null,
                phone_1_dnc: propertyData.phone_1_dnc || false,
                phone_2_dnc: propertyData.phone_2_dnc || false,
                phone_3_dnc: propertyData.phone_3_dnc || false,
                phone_4_dnc: propertyData.phone_4_dnc || false,
                phone_5_dnc: propertyData.phone_5_dnc || false,
                phone_1_type: propertyData.phone_1_type || null,
                phone_2_type: propertyData.phone_2_type || null,
                phone_3_type: propertyData.phone_3_type || null,
                phone_4_type: propertyData.phone_4_type || null,
                phone_5_type: propertyData.phone_5_type || null,
                property_condition: propertyData.property_condition || null,
                exterior_condition: propertyData.exterior_condition || null,
                is_litigator: propertyData.is_litigator || false,
                do_not_mail: propertyData.do_not_mail || false,
                county: propertyData.county || null,
                apn: propertyData.apn || null,
                // Distress signals
                bk_date: propertyData.bk_date || null,
                divorce_date: propertyData.divorce_date || null,
                // Pre-FC details
                prefc_recording_date: propertyData.prefc_recording_date || null,
                prefc_unpaid_balance: propertyData.prefc_unpaid_balance || null,
                prefc_default_amount: propertyData.prefc_default_amount || null,
                prefc_opening_bid: propertyData.prefc_opening_bid || null,
                // Liens
                lien_type: propertyData.lien_type || null,
                lien_amount: propertyData.lien_amount || null,
                lien_date: propertyData.lien_date || null,
                // MLS Agent
                mls_agent_name: propertyData.mls_agent_name || null,
                mls_agent_phone: propertyData.mls_agent_phone || null,
                mls_agent_email: propertyData.mls_agent_email || null,
                // Rent
                estimated_monthly_rent: propertyData.monthly_rent || null,
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
            
            // === HOT LEAD WITHOUT PHONE ALERT ===
            const netEquity = (property.arv || 0) - (property.mortgage_balance || 0);
            const hasPhone = !!(property.owner_phone || property.phone_2 || property.phone_3 || property.phone_4 || property.phone_5);
            const isHotOpportunity = (
              netEquity > 50000 &&
              (isForeclosure || isAbsentee || (daysOnMarket && daysOnMarket > 90) || mlsStatus === 'FAIL' || mlsStatus === 'EXPIRED')
            );
            if (isHotOpportunity && !hasPhone) {
              result.hotLeadsNoPhone.push(`${property.address}, ${property.city} (Equity: $${netEquity.toLocaleString()})`);
            }
            
            const leadInsertData: any = { property_id: property.id, source: source, status: 'captacion' as const };
            if (propertyData.mls_amount) {
              leadInsertData.listing_price = propertyData.mls_amount;
            }
            
            const { data: lead, error: leadError } = await supabase
              .from('leads')
              .insert(leadInsertData)
              .select()
              .single();
            
            if (leadError) {
              result.failed++;
              result.errors.push(`Fila ${i + batch.indexOf(row) + 2}: Error creando lead - ${leadError.message}`);
              continue;
            }
            
            if (calculatePIW && lead) {
              try {
                await supabase.functions.invoke('calculate-piw-score', {
                  body: { leadId: lead.id, propertyData: property },
                });
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
      
      // Include duplicates info in result
      (result as any).skippedDuplicates = skippedDuplicates;
      (result as any).piwCalculated = piwCalculated;
      
      return result;
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      
      const parts: string[] = [];
      if (result.success > 0) parts.push(`${result.success} nuevos leads importados`);
      if (result.skippedDuplicates > 0) parts.push(`${result.skippedDuplicates} duplicados omitidos`);
      if (result.skippedSold > 0) parts.push(`${result.skippedSold} SOLD descartados`);
      if (result.piwCalculated > 0) parts.push(`${result.piwCalculated} PIW-Scores calculados`);
      if (result.failed > 0) parts.push(`${result.failed} fallaron`);
      
      if (result.success > 0 || result.piwCalculated > 0) {
        toast({
          title: 'Importación completada',
          description: parts.join(', '),
        });
      } else if ((result.skippedDuplicates > 0 || result.skippedSold > 0) && result.failed === 0) {
        toast({
          title: 'Sin cambios nuevos',
          description: parts.join(', '),
        });
      } else if (result.failed > 0) {
        toast({
          title: 'Error en importación',
          description: `Todos los ${result.failed} registros fallaron`,
          variant: 'destructive',
        });
      }
      
      // Alert for hot leads without phone numbers
      if (result.hotLeadsNoPhone && result.hotLeadsNoPhone.length > 0) {
        setTimeout(() => {
          toast({
            title: `🔥 ${result.hotLeadsNoPhone.length} propiedades HOT sin teléfono`,
            description: `Busca el contacto manualmente: ${result.hotLeadsNoPhone.slice(0, 3).join(' | ')}${result.hotLeadsNoPhone.length > 3 ? ` (+${result.hotLeadsNoPhone.length - 3} más)` : ''}`,
          });
        }, 2000);
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

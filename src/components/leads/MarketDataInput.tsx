import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateProperty } from '@/hooks/useProperties';
import { useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  DollarSign,
  Users,
  TrendingUp,
  Shield,
  GraduationCap,
  Footprints,
  Save,
  Loader2,
  Info,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MarketDataInputProps {
  property: {
    id: string;
    estimated_monthly_rent?: number | null;
    walkability_score?: number | null;
    school_rating?: number | null;
    median_household_income?: number | null;
    population_growth_5yr?: number | null;
    crime_index?: number | null;
    days_on_market_avg?: number | null;
  };
}

export function MarketDataInput({ property }: MarketDataInputProps) {
  const updateProperty = useUpdateProperty();
  const queryClient = useQueryClient();
  
  const [data, setData] = useState({
    estimated_monthly_rent: '',
    walkability_score: '',
    school_rating: '',
    median_household_income: '',
    population_growth_5yr: '',
    crime_index: '',
    days_on_market_avg: '',
  });

  useEffect(() => {
    setData({
      estimated_monthly_rent: property.estimated_monthly_rent?.toString() || '',
      walkability_score: property.walkability_score?.toString() || '',
      school_rating: property.school_rating?.toString() || '',
      median_household_income: property.median_household_income?.toString() || '',
      population_growth_5yr: property.population_growth_5yr?.toString() || '',
      crime_index: property.crime_index?.toString() || '',
      days_on_market_avg: property.days_on_market_avg?.toString() || '',
    });
  }, [property.id]);

  const hasChanges = 
    data.estimated_monthly_rent !== (property.estimated_monthly_rent?.toString() || '') ||
    data.walkability_score !== (property.walkability_score?.toString() || '') ||
    data.school_rating !== (property.school_rating?.toString() || '') ||
    data.median_household_income !== (property.median_household_income?.toString() || '') ||
    data.population_growth_5yr !== (property.population_growth_5yr?.toString() || '') ||
    data.crime_index !== (property.crime_index?.toString() || '') ||
    data.days_on_market_avg !== (property.days_on_market_avg?.toString() || '');

  const handleSave = async () => {
    await updateProperty.mutateAsync({
      id: property.id,
      estimated_monthly_rent: data.estimated_monthly_rent ? parseFloat(data.estimated_monthly_rent) : null,
      walkability_score: data.walkability_score ? parseInt(data.walkability_score) : null,
      school_rating: data.school_rating ? parseFloat(data.school_rating) : null,
      median_household_income: data.median_household_income ? parseFloat(data.median_household_income) : null,
      population_growth_5yr: data.population_growth_5yr ? parseFloat(data.population_growth_5yr) : null,
      crime_index: data.crime_index ? parseFloat(data.crime_index) : null,
      days_on_market_avg: data.days_on_market_avg ? parseInt(data.days_on_market_avg) : null,
    });
    
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  };

  return (
    <Card variant="glass" className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="h-5 w-5 text-warning" />
        <h3 className="font-semibold">Datos de Mercado</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Ingresa datos del vecindario para análisis de IA más precisos. Encuentra estos datos en Zillow, Redfin, o Census.gov</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Rental Estimate */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            Renta Mensual Est.
          </Label>
          <Input
            type="number"
            placeholder="1500"
            value={data.estimated_monthly_rent}
            onChange={(e) => setData({ ...data, estimated_monthly_rent: e.target.value })}
            className="bg-secondary/50"
          />
        </div>

        {/* Days on Market */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            DOM Promedio (días)
          </Label>
          <Input
            type="number"
            placeholder="45"
            value={data.days_on_market_avg}
            onChange={(e) => setData({ ...data, days_on_market_avg: e.target.value })}
            className="bg-secondary/50"
          />
        </div>

        {/* Walkability Score */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Footprints className="h-3 w-3" />
            Walk Score (0-100)
          </Label>
          <Input
            type="number"
            min="0"
            max="100"
            placeholder="65"
            value={data.walkability_score}
            onChange={(e) => setData({ ...data, walkability_score: e.target.value })}
            className="bg-secondary/50"
          />
        </div>

        {/* School Rating */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <GraduationCap className="h-3 w-3" />
            Rating Escuelas (1-10)
          </Label>
          <Input
            type="number"
            min="1"
            max="10"
            step="0.1"
            placeholder="7.5"
            value={data.school_rating}
            onChange={(e) => setData({ ...data, school_rating: e.target.value })}
            className="bg-secondary/50"
          />
        </div>

        {/* Median Income */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Users className="h-3 w-3" />
            Income Mediano ZIP
          </Label>
          <Input
            type="number"
            placeholder="55000"
            value={data.median_household_income}
            onChange={(e) => setData({ ...data, median_household_income: e.target.value })}
            className="bg-secondary/50"
          />
        </div>

        {/* Population Growth */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Crecimiento Pob. 5yr (%)
          </Label>
          <Input
            type="number"
            step="0.1"
            placeholder="2.5"
            value={data.population_growth_5yr}
            onChange={(e) => setData({ ...data, population_growth_5yr: e.target.value })}
            className="bg-secondary/50"
          />
        </div>

        {/* Crime Index */}
        <div className="col-span-2 space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Índice de Crimen (1-100, menor = más seguro)
          </Label>
          <Input
            type="number"
            min="1"
            max="100"
            placeholder="35"
            value={data.crime_index}
            onChange={(e) => setData({ ...data, crime_index: e.target.value })}
            className="bg-secondary/50"
          />
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <Button 
          onClick={handleSave} 
          disabled={updateProperty.isPending}
          className="w-full mt-4"
          size="sm"
        >
          {updateProperty.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar Datos de Mercado
        </Button>
      )}
    </Card>
  );
}

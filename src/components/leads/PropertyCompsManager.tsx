import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  usePropertyComps,
  useCompsSummary,
  useAddPropertyComp,
  useDeletePropertyComp,
} from '@/hooks/usePropertyComps';
import { useUpdateProperty } from '@/hooks/useProperties';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus,
  Trash2,
  TrendingUp,
  Home,
  DollarSign,
  Calculator,
  MapPin,
  Loader2,
} from 'lucide-react';

interface PropertyCompsManagerProps {
  propertyId: string;
  propertySqft: number | null;
  currentArv: number | null;
}

export function PropertyCompsManager({ 
  propertyId, 
  propertySqft,
  currentArv 
}: PropertyCompsManagerProps) {
  const { data: comps, isLoading } = usePropertyComps(propertyId);
  const { data: summary } = useCompsSummary(propertyId);
  const addComp = useAddPropertyComp();
  const deleteComp = useDeletePropertyComp();
  const updateProperty = useUpdateProperty();
  const queryClient = useQueryClient();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newComp, setNewComp] = useState({
    address: '',
    sale_price: '',
    sale_date: '',
    sqft: '',
    bedrooms: '',
    bathrooms: '',
    distance_miles: '',
    notes: '',
  });

  const handleAddComp = async () => {
    if (!newComp.address || !newComp.sale_price) return;
    
    await addComp.mutateAsync({
      property_id: propertyId,
      address: newComp.address,
      sale_price: parseFloat(newComp.sale_price),
      sale_date: newComp.sale_date || undefined,
      sqft: newComp.sqft ? parseInt(newComp.sqft) : undefined,
      bedrooms: newComp.bedrooms ? parseInt(newComp.bedrooms) : undefined,
      bathrooms: newComp.bathrooms ? parseFloat(newComp.bathrooms) : undefined,
      distance_miles: newComp.distance_miles ? parseFloat(newComp.distance_miles) : undefined,
      notes: newComp.notes || undefined,
      source: 'manual',
    });
    
    setNewComp({
      address: '',
      sale_price: '',
      sale_date: '',
      sqft: '',
      bedrooms: '',
      bathrooms: '',
      distance_miles: '',
      notes: '',
    });
    setShowAddDialog(false);
  };

  const handleApplyArvFromComps = async () => {
    if (!summary?.avg_price_per_sqft || !propertySqft) return;
    
    const calculatedArv = Math.round(summary.avg_price_per_sqft * propertySqft);
    
    await updateProperty.mutateAsync({
      id: propertyId,
      arv: calculatedArv,
    });
    
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  };

  const calculatedArv = summary?.avg_price_per_sqft && propertySqft 
    ? Math.round(summary.avg_price_per_sqft * propertySqft)
    : null;

  if (isLoading) {
    return (
      <Card variant="glass" className="p-4">
        <Skeleton className="h-6 w-1/3 mb-4" />
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Comparables (Comps)</h3>
          {comps && comps.length > 0 && (
            <Badge variant="secondary">{comps.length}</Badge>
          )}
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="h-4 w-4" />
              Agregar Comp
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Venta Comparable</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Dirección *</Label>
                <Input
                  placeholder="123 Main St, City, ST"
                  value={newComp.address}
                  onChange={(e) => setNewComp({ ...newComp, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Precio de Venta *</Label>
                  <Input
                    type="number"
                    placeholder="250000"
                    value={newComp.sale_price}
                    onChange={(e) => setNewComp({ ...newComp, sale_price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de Venta</Label>
                  <Input
                    type="date"
                    value={newComp.sale_date}
                    onChange={(e) => setNewComp({ ...newComp, sale_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>SqFt</Label>
                  <Input
                    type="number"
                    placeholder="1500"
                    value={newComp.sqft}
                    onChange={(e) => setNewComp({ ...newComp, sqft: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Beds</Label>
                  <Input
                    type="number"
                    placeholder="3"
                    value={newComp.bedrooms}
                    onChange={(e) => setNewComp({ ...newComp, bedrooms: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Baths</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="2"
                    value={newComp.bathrooms}
                    onChange={(e) => setNewComp({ ...newComp, bathrooms: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Distancia (millas)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.5"
                  value={newComp.distance_miles}
                  onChange={(e) => setNewComp({ ...newComp, distance_miles: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Input
                  placeholder="Fuente: Zillow, condición similar..."
                  value={newComp.notes}
                  onChange={(e) => setNewComp({ ...newComp, notes: e.target.value })}
                />
              </div>
              <Button 
                onClick={handleAddComp} 
                disabled={!newComp.address || !newComp.sale_price || addComp.isPending}
                className="w-full"
              >
                {addComp.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Agregar Comp
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      {summary && summary.comp_count > 0 && (
        <Card className="p-3 mb-4 bg-primary/5 border-primary/20">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Promedio</p>
              <p className="font-bold">${summary.avg_sale_price.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">$/SqFt Prom.</p>
              <p className="font-bold text-primary">${summary.avg_price_per_sqft}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rango</p>
              <p className="font-bold text-xs">
                ${(summary.min_sale_price / 1000).toFixed(0)}K - ${(summary.max_sale_price / 1000).toFixed(0)}K
              </p>
            </div>
          </div>
          
          {/* Calculated ARV */}
          {calculatedArv && propertySqft && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    ARV Calculado ({propertySqft.toLocaleString()} sqft × ${summary.avg_price_per_sqft})
                  </p>
                  <p className="text-lg font-bold text-success">
                    ${calculatedArv.toLocaleString()}
                  </p>
                </div>
                {calculatedArv !== currentArv && (
                  <Button 
                    size="sm" 
                    onClick={handleApplyArvFromComps}
                    disabled={updateProperty.isPending}
                  >
                    {updateProperty.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Aplicar ARV'
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Comps List */}
      {!comps || comps.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Sin comps agregados</p>
          <p className="text-xs">Agrega ventas comparables de Zillow o Redfin</p>
        </div>
      ) : (
        <div className="space-y-2">
          {comps.map((comp) => (
            <div 
              key={comp.id} 
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium truncate">{comp.address}</p>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${Number(comp.sale_price).toLocaleString()}
                  </span>
                  {comp.price_per_sqft && (
                    <span>${comp.price_per_sqft}/sqft</span>
                  )}
                  {comp.sqft && (
                    <span>{comp.sqft.toLocaleString()} sqft</span>
                  )}
                  {comp.sale_date && (
                    <span>{format(new Date(comp.sale_date), 'MMM yyyy', { locale: es })}</span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => deleteComp.mutate({ id: comp.id, propertyId })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

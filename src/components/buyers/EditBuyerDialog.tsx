import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useUpdateBuyer, type Buyer } from '@/hooks/useBuyers';
import { Loader2, Plus, X } from 'lucide-react';

interface EditBuyerDialogProps {
  buyer: Buyer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const propertyTypes = [
  { value: 'single_family', label: 'Single Family' },
  { value: 'multi_family', label: 'Multi Family' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
];

const repairLevels = [
  { value: 'light', label: 'Light (<$30K)' },
  { value: 'medium', label: 'Medium ($30K-$60K)' },
  { value: 'heavy', label: 'Heavy (>$60K)' },
];

export function EditBuyerDialog({ buyer, open, onOpenChange }: EditBuyerDialogProps) {
  const updateBuyer = useUpdateBuyer();

  const [formData, setFormData] = useState({
    contact_name: '',
    company_name: '',
    email: '',
    phone: '',
    min_arv: '',
    max_arv: '',
    max_repair_level: 'medium',
    tier: 'bronze' as 'bronze' | 'gold' | 'silver' | 'platinum',
    notes: '',
    is_active: true,
  });

  const [preferredTypes, setPreferredTypes] = useState<string[]>([]);
  const [zipCodes, setZipCodes] = useState<string[]>([]);
  const [newZip, setNewZip] = useState('');

  useEffect(() => {
    if (buyer) {
      setFormData({
        contact_name: buyer.contact_name || '',
        company_name: buyer.company_name || '',
        email: buyer.email || '',
        phone: buyer.phone || '',
        min_arv: buyer.min_arv?.toString() || '',
        max_arv: buyer.max_arv?.toString() || '',
        max_repair_level: buyer.max_repair_level || 'medium',
        tier: buyer.tier || 'bronze',
        notes: buyer.notes || '',
        is_active: buyer.is_active ?? true,
      });
      setPreferredTypes(buyer.preferred_property_types || []);
      setZipCodes(buyer.preferred_zip_codes || []);
    }
  }, [buyer]);

  const handleAddZip = () => {
    if (newZip && newZip.length === 5 && !zipCodes.includes(newZip)) {
      setZipCodes([...zipCodes, newZip]);
      setNewZip('');
    }
  };

  const handleRemoveZip = (zip: string) => {
    setZipCodes(zipCodes.filter(z => z !== zip));
  };

  const togglePropertyType = (type: string) => {
    setPreferredTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyer) return;

    await updateBuyer.mutateAsync({
      id: buyer.id,
      contact_name: formData.contact_name,
      company_name: formData.company_name || null,
      email: formData.email || null,
      phone: formData.phone || null,
      min_arv: formData.min_arv ? Number(formData.min_arv) : null,
      max_arv: formData.max_arv ? Number(formData.max_arv) : null,
      max_repair_level: formData.max_repair_level,
      tier: formData.tier,
      notes: formData.notes || null,
      is_active: formData.is_active,
      preferred_property_types: preferredTypes.length > 0 ? preferredTypes as any : null,
      preferred_zip_codes: zipCodes.length > 0 ? zipCodes : null,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Comprador</DialogTitle>
          <DialogDescription>
            Actualiza la información del comprador
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Active Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div>
              <Label htmlFor="is_active">Estado Activo</Label>
              <p className="text-sm text-muted-foreground">
                Los compradores inactivos no aparecen en matchmaking
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={checked => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Nombre de Contacto *</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="John Smith"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name">Empresa</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="ABC Investments LLC"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(205) 555-0123"
              />
            </div>
          </div>

          {/* Buyer Criteria */}
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-medium mb-4">Criterios de Compra</h4>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="min_arv">ARV Mínimo ($)</Label>
                <Input
                  id="min_arv"
                  type="number"
                  value={formData.min_arv}
                  onChange={e => setFormData({ ...formData, min_arv: e.target.value })}
                  placeholder="80000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_arv">ARV Máximo ($)</Label>
                <Input
                  id="max_arv"
                  type="number"
                  value={formData.max_arv}
                  onChange={e => setFormData({ ...formData, max_arv: e.target.value })}
                  placeholder="250000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Nivel de Reparación Máx.</Label>
                <Select
                  value={formData.max_repair_level}
                  onValueChange={value => setFormData({ ...formData, max_repair_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {repairLevels.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tier</Label>
                <Select
                  value={formData.tier}
                  onValueChange={(value: any) => setFormData({ ...formData, tier: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platinum">Platinum</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="bronze">Bronze</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Property Types */}
            <div className="space-y-2 mb-4">
              <Label>Tipos de Propiedad Preferidos</Label>
              <div className="flex flex-wrap gap-2">
                {propertyTypes.map(type => (
                  <Badge
                    key={type.value}
                    variant={preferredTypes.includes(type.value) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => togglePropertyType(type.value)}
                  >
                    {type.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* ZIP Codes */}
            <div className="space-y-2">
              <Label>ZIP Codes Preferidos</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newZip}
                  onChange={e => setNewZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="35201"
                  maxLength={5}
                  className="w-32"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddZip}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {zipCodes.map(zip => (
                  <Badge key={zip} variant="secondary" className="pr-1">
                    {zip}
                    <button
                      type="button"
                      onClick={() => handleRemoveZip(zip)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Información adicional sobre el comprador..."
              rows={3}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateBuyer.isPending}>
              {updateBuyer.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

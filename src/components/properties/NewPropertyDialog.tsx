import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useCreateProperty } from '@/hooks/useProperties';
import { Loader2 } from 'lucide-react';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const propertySchema = z.object({
  address: z.string().min(1, 'La dirección es requerida').max(200),
  city: z.string().min(1, 'La ciudad es requerida').max(100),
  state: z.string().min(2, 'El estado es requerido').max(2),
  zip_code: z.string().min(5, 'El código postal es requerido').max(10),
  property_type: z.enum(['single_family', 'multi_family', 'condo', 'townhouse', 'land', 'commercial']),
  bedrooms: z.coerce.number().optional().nullable(),
  bathrooms: z.coerce.number().optional().nullable(),
  sqft: z.coerce.number().optional().nullable(),
  year_built: z.coerce.number().optional().nullable(),
  arv: z.coerce.number().optional().nullable(),
  mao: z.coerce.number().optional().nullable(),
  repair_cost: z.coerce.number().optional().nullable(),
  owner_name: z.string().max(200).optional().nullable(),
  owner_email: z.string().email().max(255).optional().nullable().or(z.literal('')),
  owner_phone: z.string().max(20).optional().nullable(),
  is_absentee_owner: z.boolean().optional(),
  tax_delinquent: z.boolean().optional(),
  is_foreclosure: z.boolean().optional(),
  is_probate: z.boolean().optional(),
  notes: z.string().max(1000).optional().nullable(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface NewPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewPropertyDialog({ open, onOpenChange }: NewPropertyDialogProps) {
  const createProperty = useCreateProperty();
  
  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      address: '',
      city: '',
      state: 'AL',
      zip_code: '',
      property_type: 'single_family',
      bedrooms: null,
      bathrooms: null,
      sqft: null,
      year_built: null,
      arv: null,
      mao: null,
      repair_cost: null,
      owner_name: '',
      owner_email: '',
      owner_phone: '',
      is_absentee_owner: false,
      tax_delinquent: false,
      is_foreclosure: false,
      is_probate: false,
      notes: '',
    },
  });

  const onSubmit = async (data: PropertyFormData) => {
    const cleanData = {
      ...data,
      owner_email: data.owner_email || null,
    };
    
    createProperty.mutate(cleanData as any, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Propiedad</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Location Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Ubicación</h4>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección *</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad *</FormLabel>
                      <FormControl>
                        <Input placeholder="Birmingham" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP *</FormLabel>
                      <FormControl>
                        <Input placeholder="35203" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Property Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Detalles de Propiedad</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="property_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="single_family">Casa Unifamiliar</SelectItem>
                          <SelectItem value="multi_family">Multifamiliar</SelectItem>
                          <SelectItem value="condo">Condominio</SelectItem>
                          <SelectItem value="townhouse">Townhouse</SelectItem>
                          <SelectItem value="land">Terreno</SelectItem>
                          <SelectItem value="commercial">Comercial</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="year_built"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Año construcción</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1985" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Habitaciones</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="3" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bathrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Baños</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" placeholder="2" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sqft"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Área (sqft)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1500" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Financial */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Información Financiera</h4>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="arv"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ARV ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="200000" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="repair_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reparación ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="30000" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MAO ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="110000" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Owner Info */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Propietario</h4>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="owner_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="owner_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@email.com" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="owner_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Indicators */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Indicadores de Motivación</h4>
              <div className="flex flex-wrap gap-6">
                <FormField
                  control={form.control}
                  name="is_absentee_owner"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Absentee Owner</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tax_delinquent"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Tax Delinquent</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_foreclosure"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Foreclosure</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_probate"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Probate</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas adicionales..." {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createProperty.isPending}>
                {createProperty.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear Propiedad
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

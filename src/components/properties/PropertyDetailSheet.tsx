import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Property, useDeleteProperty } from '@/hooks/useProperties';
import { PropertyImageGallery } from './PropertyImageGallery';
import { EditPropertyDialog } from './EditPropertyDialog';
import { PropStreamCMAUploader } from './PropStreamCMAUploader';
import { DealCalculator } from './DealCalculator';
import {
  Building2,
  MapPin,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Home,
  Ruler,
  Bed,
  Bath,
  Edit,
  Trash2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PropertyDetailSheetProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const propertyTypeLabels: Record<string, string> = {
  single_family: 'Casa Unifamiliar',
  multi_family: 'Multifamiliar',
  condo: 'Condominio',
  townhouse: 'Townhouse',
  land: 'Terreno',
  commercial: 'Comercial',
};

export function PropertyDetailSheet({ property, open, onOpenChange }: PropertyDetailSheetProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteProperty = useDeleteProperty();

  if (!property) return null;

  const handleDelete = () => {
    deleteProperty.mutate(property.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Detalles de Propiedad
            </SheetTitle>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                Eliminar
              </Button>
            </div>
          </SheetHeader>

          <div className="space-y-6">
            {/* Images */}
            <PropertyImageGallery propertyId={property.id} editable />
            {/* Address */}
            <Card variant="glass" className="p-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold text-lg">{property.address}</p>
                  <p className="text-muted-foreground">
                    {property.city}, {property.state} {property.zip_code}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary">
                  {propertyTypeLabels[property.property_type] || property.property_type}
                </Badge>
                {property.year_built && (
                  <Badge variant="outline">
                    <Calendar className="h-3 w-3 mr-1" />
                    {property.year_built}
                  </Badge>
                )}
              </div>
            </Card>

            {/* Property Details */}
            <Card variant="glass" className="p-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Home className="h-4 w-4" />
                Características
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {property.bedrooms && (
                  <div className="flex items-center gap-2">
                    <Bed className="h-4 w-4 text-muted-foreground" />
                    <span>{property.bedrooms} Habitaciones</span>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center gap-2">
                    <Bath className="h-4 w-4 text-muted-foreground" />
                    <span>{property.bathrooms} Baños</span>
                  </div>
                )}
                {property.sqft && (
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <span>{property.sqft.toLocaleString()} sqft</span>
                  </div>
                )}
                {property.lot_size && (
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <span>{property.lot_size.toLocaleString()} sqft (lote)</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Financial summary (quick reference) */}
            {(property.last_sale_price || property.equity_percent || property.tax_debt) && (
              <Card variant="glass" className="p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Datos Financieros
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {property.last_sale_price && (
                    <div>
                      <span className="text-muted-foreground">Última venta:</span>
                      <p className="font-semibold">${property.last_sale_price.toLocaleString()}</p>
                    </div>
                  )}
                  {property.equity_percent && (
                    <div>
                      <span className="text-muted-foreground">Equity:</span>
                      <p className="font-semibold">{property.equity_percent}%</p>
                    </div>
                  )}
                  {property.tax_debt && (
                    <div>
                      <span className="text-muted-foreground">Deuda fiscal:</span>
                      <p className="font-semibold text-destructive">${property.tax_debt.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Deal Calculator — MAO breakdown + comps + ARV validator */}
            <DealCalculator
              arv={property.arv}
              repairCost={property.repair_cost}
              sqft={property.sqft}
              address={property.address}
              city={property.city}
              state={property.state}
            />

            {/* Owner Info */}
            {(property.owner_name || property.owner_email || property.owner_phone) && (
              <Card variant="glass" className="p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Propietario
                </h4>
                <div className="space-y-2">
                  {property.owner_name && (
                    <p className="font-medium">{property.owner_name}</p>
                  )}
                  {[property.owner_email, (property as any).owner_email_2, (property as any).owner_email_3].filter(Boolean).map((email, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${email}`} className="text-primary hover:underline">
                        {email}
                      </a>
                    </div>
                  ))}
                  {property.owner_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${property.owner_phone}`} className="text-primary hover:underline">
                        {property.owner_phone}
                      </a>
                    </div>
                  )}
                  {property.owner_tenure_years && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{property.owner_tenure_years} años de propiedad</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Indicators */}
            <Card variant="glass" className="p-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Indicadores de Motivación
              </h4>
              <div className="flex flex-wrap gap-2">
                {property.is_absentee_owner && (
                  <Badge variant="info">Absentee Owner</Badge>
                )}
                {property.tax_delinquent && (
                  <Badge variant="warning">Tax Delinquent</Badge>
                )}
                {property.is_foreclosure && (
                  <Badge variant="accent">Foreclosure</Badge>
                )}
                {property.is_probate && (
                  <Badge variant="glow">Probate</Badge>
                )}
                {property.mailing_address_different && (
                  <Badge variant="secondary">Mailing Diferente</Badge>
                )}
                {!property.is_absentee_owner && !property.tax_delinquent && !property.is_foreclosure && !property.is_probate && (
                  <span className="text-sm text-muted-foreground">Sin indicadores especiales</span>
                )}
              </div>
            </Card>

            {/* PropStream CMA Upload */}
            <PropStreamCMAUploader property={property} onComplete={() => onOpenChange(false)} />

            {/* Notes */}
            {property.notes && (
              <Card variant="glass" className="p-4">
                <h4 className="text-sm font-medium mb-2">Notas</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{property.notes}</p>
              </Card>
            )}

            {/* Metadata */}
            <div className="text-xs text-muted-foreground text-center pt-4">
              Creada: {format(new Date(property.created_at), 'PPp', { locale: es })}
              {property.data_source && ` • Fuente: ${property.data_source}`}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <EditPropertyDialog
        property={property}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar propiedad?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La propiedad {property.address} será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProperties, usePropertyStats, Property } from '@/hooks/useProperties';
import { PropertyDetailSheet } from '@/components/properties/PropertyDetailSheet';
import { NewPropertyDialog } from '@/components/properties/NewPropertyDialog';
import { PropertyThumbnail } from '@/components/properties/PropertyThumbnail';
import {
  Search,
  Plus,
  Building2,
  MapPin,
  Home,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  X,
  Download,
  Upload,
  Bed,
  Bath,
  Ruler,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const propertyTypeLabels: Record<string, string> = {
  single_family: 'Casa Unifamiliar',
  multi_family: 'Multifamiliar',
  condo: 'Condominio',
  townhouse: 'Townhouse',
  land: 'Terreno',
  commercial: 'Comercial',
};

const Properties = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const { data: properties, isLoading } = useProperties({
    search: searchTerm,
    propertyType: propertyTypeFilter,
    state: stateFilter,
  });
  const { data: stats, isLoading: statsLoading } = usePropertyStats();

  const clearFilters = () => {
    setSearchTerm('');
    setPropertyTypeFilter('all');
    setStateFilter('all');
  };

  const hasActiveFilters = searchTerm || propertyTypeFilter !== 'all' || stateFilter !== 'all';

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Propiedades</h1>
            <p className="text-muted-foreground">
              Gestiona tu inventario de propiedades para wholesaling
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Propiedad
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Propiedades</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Con Leads</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-success">{stats?.withLeads || 0}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Sin Leads</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-warning">{stats?.withoutLeads || 0}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Home className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">ARV Promedio</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-accent">
                    ${Math.round(stats?.avgArv || 0).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card variant="glass" className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por dirección, propietario o ZIP..."
                className="pl-10 bg-secondary/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="single_family">Casa Unifamiliar</SelectItem>
                <SelectItem value="multi_family">Multifamiliar</SelectItem>
                <SelectItem value="condo">Condominio</SelectItem>
                <SelectItem value="townhouse">Townhouse</SelectItem>
                <SelectItem value="land">Terreno</SelectItem>
                <SelectItem value="commercial">Comercial</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {US_STATES.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card variant="glass">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-10 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && properties?.length === 0 && (
        <Card variant="glass">
          <CardContent className="p-12 text-center">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {hasActiveFilters ? 'No hay resultados' : 'No hay propiedades todavía'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {hasActiveFilters 
                ? 'Intenta ajustar los filtros para ver más resultados.'
                : 'Añade tu primera propiedad para comenzar a gestionar tu inventario.'}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : (
              <Button onClick={() => setShowNewDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Primera Propiedad
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Properties Table */}
      {!isLoading && properties && properties.length > 0 && (
        <Card variant="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Propiedades
              {hasActiveFilters && (
                <Badge variant="secondary">{properties.length} resultados</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm text-muted-foreground">
                    <th className="p-4 font-medium w-12"></th>
                    <th className="p-4 font-medium">Dirección</th>
                    <th className="p-4 font-medium">Tipo</th>
                    <th className="p-4 font-medium">Características</th>
                    <th className="p-4 font-medium">ARV</th>
                    <th className="p-4 font-medium">MAO</th>
                    <th className="p-4 font-medium">Propietario</th>
                    <th className="p-4 font-medium">Indicadores</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {properties.map((property, index) => (
                    <tr
                      key={property.id}
                      className="group hover:bg-secondary/30 transition-colors cursor-pointer animate-fade-in"
                      style={{ animationDelay: `${index * 30}ms` }}
                      onClick={() => setSelectedProperty(property)}
                    >
                      <td className="p-4">
                        <PropertyThumbnail propertyId={property.id} className="h-10 w-10" />
                      </td>
                      <td className="p-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="font-medium">{property.address}</p>
                            <p className="text-sm text-muted-foreground">
                              {property.city}, {property.state} {property.zip_code}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary">
                          {propertyTypeLabels[property.property_type] || property.property_type}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {property.bedrooms && (
                            <span className="flex items-center gap-1">
                              <Bed className="h-3 w-3" />
                              {property.bedrooms}
                            </span>
                          )}
                          {property.bathrooms && (
                            <span className="flex items-center gap-1">
                              <Bath className="h-3 w-3" />
                              {property.bathrooms}
                            </span>
                          )}
                          {property.sqft && (
                            <span className="flex items-center gap-1">
                              <Ruler className="h-3 w-3" />
                              {property.sqft.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {property.arv ? (
                          <span className="font-semibold">${property.arv.toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {property.mao ? (
                          <span className="font-semibold text-success">${property.mao.toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-sm">{property.owner_name || '-'}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap max-w-[150px]">
                          {property.is_absentee_owner && (
                            <Badge variant="info" className="text-[10px]">Absentee</Badge>
                          )}
                          {property.tax_delinquent && (
                            <Badge variant="warning" className="text-[10px]">Tax</Badge>
                          )}
                          {property.is_foreclosure && (
                            <Badge variant="accent" className="text-[10px]">Foreclosure</Badge>
                          )}
                          {property.is_probate && (
                            <Badge variant="glow" className="text-[10px]">Probate</Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Property Detail Sheet */}
      <PropertyDetailSheet
        property={selectedProperty}
        open={!!selectedProperty}
        onOpenChange={(open) => !open && setSelectedProperty(null)}
      />

      {/* New Property Dialog */}
      <NewPropertyDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
      />
    </Layout>
  );
};

export default Properties;

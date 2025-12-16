import { ColumnMapping, propertyFields } from '@/lib/csvColumnMapping';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Check, AlertCircle, Minus } from 'lucide-react';

interface ColumnMapperProps {
  mappings: ColumnMapping[];
  onMappingChange: (csvColumn: string, propertyField: string | null) => void;
}

export const ColumnMapper = ({ mappings, onMappingChange }: ColumnMapperProps) => {
  const usedFields = new Set(
    mappings.filter(m => m.propertyField).map(m => m.propertyField)
  );

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) {
      return (
        <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
          <Check className="h-3 w-3 mr-1" />
          Auto
        </Badge>
      );
    }
    if (confidence >= 50) {
      return (
        <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          <AlertCircle className="h-3 w-3 mr-1" />
          Revisar
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Minus className="h-3 w-3 mr-1" />
        Sin mapear
      </Badge>
    );
  };

  const requiredFields = propertyFields.filter(f => f.required).map(f => f.key);
  const mappedRequired = mappings
    .filter(m => m.propertyField && requiredFields.includes(m.propertyField))
    .map(m => m.propertyField);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Mapeo de Columnas</h3>
        <div className="text-sm text-muted-foreground">
          Campos requeridos: {mappedRequired.length}/{requiredFields.length}
        </div>
      </div>

      {/* Required fields warning */}
      {mappedRequired.length < requiredFields.length && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
          <AlertCircle className="h-4 w-4 inline mr-2" />
          Faltan campos requeridos: {requiredFields.filter(f => !mappedRequired.includes(f)).map(f => 
            propertyFields.find(pf => pf.key === f)?.label
          ).join(', ')}
        </div>
      )}

      <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
        {mappings.map((mapping) => {
          const isRequired = requiredFields.includes(mapping.propertyField || '');
          
          return (
            <div
              key={mapping.csvColumn}
              className={`flex items-center gap-4 p-3 rounded-lg border ${
                mapping.propertyField 
                  ? 'bg-card border-border' 
                  : 'bg-muted/30 border-border/50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm truncate" title={mapping.csvColumn}>
                  {mapping.csvColumn}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {getConfidenceBadge(mapping.confidence)}
              </div>
              
              <div className="w-[200px]">
                <Select
                  value={mapping.propertyField || 'none'}
                  onValueChange={(value) => 
                    onMappingChange(mapping.csvColumn, value === 'none' ? null : value)
                  }
                >
                  <SelectTrigger className={isRequired ? 'border-primary' : ''}>
                    <SelectValue placeholder="Seleccionar campo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">— No mapear —</span>
                    </SelectItem>
                    {propertyFields.map((field) => {
                      const isUsed = usedFields.has(field.key) && mapping.propertyField !== field.key;
                      return (
                        <SelectItem 
                          key={field.key} 
                          value={field.key}
                          disabled={isUsed}
                        >
                          <span className={field.required ? 'font-medium' : ''}>
                            {field.label}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                            {isUsed && <span className="text-muted-foreground ml-2">(en uso)</span>}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

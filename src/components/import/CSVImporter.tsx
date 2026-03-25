import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ColumnMapper } from './ColumnMapper';
import { parseCSV, parseXLSX, autoMapColumns, validateMappings, ColumnMapping } from '@/lib/csvColumnMapping';
import { useCSVImport } from '@/hooks/useCSVImport';

type ImportStep = 'upload' | 'mapping' | 'importing' | 'complete';

export const CSVImporter = () => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [source, setSource] = useState<string>('PropWire');
  const [calculatePIW, setCalculatePIW] = useState<boolean>(true);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[]; skippedSold?: number; hotLeadsNoPhone?: string[] } | null>(null);

  const importMutation = useCSVImport();

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const isExcel = file.name.match(/\.xlsx?$/i);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      let parsedHeaders: string[] = [];
      let parsedRows: Record<string, string>[] = [];

      if (isExcel) {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const result = parseXLSX(data);
        parsedHeaders = result.headers;
        parsedRows = result.rows;
      } else {
        const text = e.target?.result as string;
        const result = parseCSV(text);
        parsedHeaders = result.headers;
        parsedRows = result.rows;
      }
      
      if (parsedHeaders.length === 0) {
        return;
      }

      setHeaders(parsedHeaders);
      setRows(parsedRows);
      
      // Auto-map columns
      const autoMappings = autoMapColumns(parsedHeaders);
      setMappings(autoMappings);
      
      setStep('mapping');
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  }, []);

  const handleMappingChange = useCallback((csvColumn: string, propertyField: string | null) => {
    setMappings(prev => prev.map(m => 
      m.csvColumn === csvColumn 
        ? { ...m, propertyField, confidence: propertyField ? 100 : 0 }
        : m
    ));
  }, []);

  const handleImport = async () => {
    const errors = validateMappings(mappings);
    if (errors.length > 0) {
      return;
    }

    setStep('importing');
    
    const result = await importMutation.mutateAsync({
      rows,
      mappings,
      source,
      calculatePIW,
    });

    setImportResult(result);
    setStep('complete');
  };

  const handleReset = () => {
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setRows([]);
    setMappings([]);
    setImportResult(null);
  };

  const validationErrors = validateMappings(mappings);

  return (
    <div className="space-y-6">
      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Subir archivo CSV
            </CardTitle>
            <CardDescription>
              Sube un archivo CSV exportado de PropWire u otra fuente de datos.
              El sistema detectará automáticamente las columnas y las mapeará a los campos de propiedades.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <span className="text-lg font-medium">Arrastra un archivo o haz clic para seleccionar</span>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </Label>
              <p className="text-sm text-muted-foreground mt-2">
                Soporta archivos CSV, con delimitadores de coma, punto y coma, o tabulador
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'mapping' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                {fileName}
              </CardTitle>
              <CardDescription>
                {rows.length} registros encontrados • {headers.length} columnas detectadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ColumnMapper 
                mappings={mappings} 
                onMappingChange={handleMappingChange} 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Opciones de Importación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="source">Fuente de Datos</Label>
                  <Input
                    id="source"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="PropWire, DataTree, etc."
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <Label htmlFor="calculate-piw">Calcular PIW-Score</Label>
                    <p className="text-sm text-muted-foreground">
                      Asignar prioridad automáticamente
                    </p>
                  </div>
                  <Switch
                    id="calculate-piw"
                    checked={calculatePIW}
                    onCheckedChange={setCalculatePIW}
                  />
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2">
                  <div className="flex items-center gap-2 text-destructive font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Errores de validación
                  </div>
                  <ul className="text-sm text-destructive/80 list-disc list-inside">
                    {validationErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={handleReset}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={validationErrors.length > 0}
                >
                  Importar {rows.length} registros
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Step 3: Importing */}
      {step === 'importing' && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Importando datos...</h3>
                <p className="text-muted-foreground">
                  Procesando {rows.length} registros. Esto puede tomar unos minutos.
                </p>
              </div>
              <Progress value={50} className="w-64" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.failed === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : importResult.success === 0 ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              Importación Completada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="text-3xl font-bold text-green-500">{importResult.success}</div>
                <div className="text-sm text-green-400">Leads importados exitosamente</div>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="text-3xl font-bold text-destructive">{importResult.failed}</div>
                <div className="text-sm text-destructive/80">Registros con errores</div>
              </div>
            </div>

            {(importResult.skippedSold ?? 0) > 0 && (
              <div className="p-3 rounded-lg bg-muted border border-border text-sm">
                📋 {importResult.skippedSold} propiedades SOLD descartadas automáticamente
              </div>
            )}

            {importResult.hotLeadsNoPhone && importResult.hotLeadsNoPhone.length > 0 && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  🔥 {importResult.hotLeadsNoPhone.length} propiedades HOT sin teléfono — busca el contacto manualmente
                </div>
                <ul className="text-sm text-amber-300/80 list-disc list-inside space-y-1">
                  {importResult.hotLeadsNoPhone.map((addr, i) => (
                    <li key={i}>{addr}</li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Tip: Busca en TruePeopleSearch, WhitePages o FastPeopleSearch. También puedes ir al condado y buscar por APN.
                </p>
              </div>
            )}

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <Label>Errores ({importResult.errors.length})</Label>
                <ScrollArea className="h-[200px] rounded-lg border p-3">
                  <div className="space-y-1 text-sm font-mono">
                    {importResult.errors.slice(0, 100).map((error, i) => (
                      <div key={i} className="text-destructive/80">{error}</div>
                    ))}
                    {importResult.errors.length > 100 && (
                      <div className="text-muted-foreground">
                        ... y {importResult.errors.length - 100} errores más
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleReset}>
                Importar otro archivo
              </Button>
              <Button onClick={() => window.location.href = '/leads'}>
                Ver Leads
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

import { Layout } from '@/components/layout/Layout';
import { CSVImporter } from '@/components/import/CSVImporter';
import { FileSpreadsheet, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Import = () => {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
            Importar Datos
          </h1>
          <p className="text-muted-foreground mt-1">
            Importa listas de propiedades desde PropWire u otras fuentes de datos
          </p>
        </div>

        {/* Info Banner */}
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle>Mapeo Inteligente de Columnas</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            El sistema detecta automáticamente las columnas de tu archivo CSV y las mapea a los campos de propiedades.
            Maneja variaciones en nombres de columnas, mayúsculas/minúsculas, y diferentes formatos de datos.
            Puedes ajustar el mapeo manualmente antes de importar.
          </AlertDescription>
        </Alert>

        {/* CSV Importer */}
        <CSVImporter />
      </div>
    </Layout>
  );
};

export default Import;

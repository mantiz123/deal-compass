import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Upload, 
  File, 
  FileText, 
  FileImage, 
  Trash2, 
  Download,
  Loader2,
  FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useLeadDocuments, 
  useUploadDocument, 
  useDeleteDocument,
  useGetDocumentUrl,
  type LeadDocument 
} from '@/hooks/useLeadDocuments';

interface LeadDocumentsProps {
  leadId: string;
  className?: string;
}

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return File;
  if (fileType.startsWith('image/')) return FileImage;
  if (fileType.includes('pdf')) return FileText;
  return File;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function LeadDocuments({ leadId, className }: LeadDocumentsProps) {
  const { data: documents, isLoading } = useLeadDocuments(leadId);
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();
  const getDocumentUrl = useGetDocumentUrl();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    await uploadDocument.mutateAsync({ leadId, file });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (doc: LeadDocument) => {
    setDownloadingId(doc.id);
    try {
      const url = await getDocumentUrl(doc.file_path);
      if (url) {
        window.open(url, '_blank');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (doc: LeadDocument) => {
    if (window.confirm('¿Estás seguro de eliminar este documento?')) {
      await deleteDocument.mutateAsync({
        id: doc.id,
        filePath: doc.file_path,
        leadId,
      });
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <div 
        className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
        />
        {uploadDocument.isPending ? (
          <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
        ) : (
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          {uploadDocument.isPending 
            ? 'Subiendo archivo...' 
            : 'Arrastra archivos o haz clic para subir'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, DOC, XLS, Imágenes (máx. 10MB)
        </p>
      </div>

      {/* Documents List */}
      {!documents?.length ? (
        <div className="text-center py-8 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No hay documentos adjuntos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const FileIcon = getFileIcon(doc.file_type);
            
            return (
              <Card key={doc.id} variant="interactive" className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded bg-secondary flex items-center justify-center">
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc.file_size)} • {format(new Date(doc.created_at), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(doc)}
                      disabled={downloadingId === doc.id}
                    >
                      {downloadingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(doc)}
                      disabled={deleteDocument.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

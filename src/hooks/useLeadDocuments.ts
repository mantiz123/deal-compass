import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LeadDocument {
  id: string;
  lead_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export function useLeadDocuments(leadId: string) {
  return useQuery({
    queryKey: ['lead-documents', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_documents')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LeadDocument[];
    },
    enabled: !!leadId,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leadId, file }: { leadId: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `${leadId}/${Date.now()}-${file.name}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('lead-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create document record
      const { data, error } = await supabase
        .from('lead_documents')
        .insert({
          lead_id: leadId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-documents', variables.leadId] });
      toast({
        title: 'Documento subido',
        description: 'El archivo se ha subido correctamente',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo subir el documento',
        variant: 'destructive',
      });
      console.error('Error uploading document:', error);
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, filePath, leadId }: { id: string; filePath: string; leadId: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('lead-documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete record
      const { error } = await supabase
        .from('lead_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { leadId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-documents', data.leadId] });
      toast({
        title: 'Documento eliminado',
        description: 'El archivo se ha eliminado correctamente',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el documento',
        variant: 'destructive',
      });
      console.error('Error deleting document:', error);
    },
  });
}

export function useGetDocumentUrl() {
  return async (filePath: string) => {
    const { data } = await supabase.storage
      .from('lead-documents')
      .createSignedUrl(filePath, 3600);
    
    return data?.signedUrl;
  };
}

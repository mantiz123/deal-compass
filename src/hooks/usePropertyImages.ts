import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PropertyImage {
  id: string;
  property_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  is_primary: boolean;
  uploaded_by: string | null;
  created_at: string;
}

export function usePropertyImages(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['property-images', propertyId],
    queryFn: async (): Promise<PropertyImage[]> => {
      if (!propertyId) return [];
      
      const { data, error } = await supabase
        .from('property_images')
        .select('*')
        .eq('property_id', propertyId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PropertyImage[];
    },
    enabled: !!propertyId,
  });
}

export function useUploadPropertyImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      propertyId, 
      file, 
      isPrimary = false 
    }: { 
      propertyId: string; 
      file: File; 
      isPrimary?: boolean;
    }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${propertyId}/${Date.now()}.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // If setting as primary, unset current primary first
      if (isPrimary) {
        await supabase
          .from('property_images')
          .update({ is_primary: false })
          .eq('property_id', propertyId)
          .eq('is_primary', true);
      }

      // Create database record
      const { data, error } = await supabase
        .from('property_images')
        .insert({
          property_id: propertyId,
          file_path: fileName,
          file_name: file.name,
          file_size: file.size,
          is_primary: isPrimary,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['property-images', variables.propertyId] });
      toast({
        title: 'Imagen subida',
        description: 'La imagen se ha añadido correctamente',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo subir la imagen',
        variant: 'destructive',
      });
      console.error('Error uploading image:', error);
    },
  });
}

export function useSetPrimaryImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ imageId, propertyId }: { imageId: string; propertyId: string }) => {
      // Unset current primary
      await supabase
        .from('property_images')
        .update({ is_primary: false })
        .eq('property_id', propertyId)
        .eq('is_primary', true);

      // Set new primary
      const { data, error } = await supabase
        .from('property_images')
        .update({ is_primary: true })
        .eq('id', imageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['property-images', variables.propertyId] });
      toast({
        title: 'Imagen destacada actualizada',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la imagen destacada',
        variant: 'destructive',
      });
    },
  });
}

export function useDeletePropertyImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ imageId, propertyId, filePath }: { imageId: string; propertyId: string; filePath: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('property-images')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }

      // Delete from database
      const { error } = await supabase
        .from('property_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['property-images', variables.propertyId] });
      toast({
        title: 'Imagen eliminada',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la imagen',
        variant: 'destructive',
      });
    },
  });
}

export function getPropertyImageUrl(filePath: string): string {
  const { data } = supabase.storage
    .from('property-images')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

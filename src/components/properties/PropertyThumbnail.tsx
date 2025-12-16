import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getPropertyImageUrl } from '@/hooks/usePropertyImages';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PropertyThumbnailProps {
  propertyId: string;
  className?: string;
}

export function PropertyThumbnail({ propertyId, className }: PropertyThumbnailProps) {
  const { data: primaryImage } = useQuery({
    queryKey: ['property-primary-image', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_images')
        .select('file_path')
        .eq('property_id', propertyId)
        .eq('is_primary', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  if (!primaryImage) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-secondary/50 rounded",
        className
      )}>
        <Building2 className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={getPropertyImageUrl(primaryImage.file_path)}
      alt=""
      className={cn("object-cover rounded", className)}
    />
  );
}

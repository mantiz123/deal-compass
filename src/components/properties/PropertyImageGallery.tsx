import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePropertyImages,
  useUploadPropertyImage,
  useSetPrimaryImage,
  useDeletePropertyImage,
  getPropertyImageUrl,
  PropertyImage,
} from '@/hooks/usePropertyImages';
import {
  ImagePlus,
  Star,
  Trash2,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface PropertyImageGalleryProps {
  propertyId: string;
  editable?: boolean;
}

export function PropertyImageGallery({ propertyId, editable = false }: PropertyImageGalleryProps) {
  const { data: images, isLoading } = usePropertyImages(propertyId);
  const uploadImage = useUploadPropertyImage();
  const setPrimary = useSetPrimaryImage();
  const deleteImage = useDeletePropertyImage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<PropertyImage | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const isPrimary = !images || images.length === 0;
    
    await uploadImage.mutateAsync({ propertyId, file, isPrimary });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSetPrimary = (image: PropertyImage) => {
    setPrimary.mutate({ imageId: image.id, propertyId });
  };

  const handleDelete = (image: PropertyImage) => {
    deleteImage.mutate({ imageId: image.id, propertyId, filePath: image.file_path });
  };

  const openViewer = (image: PropertyImage) => {
    setSelectedImage(image);
    setViewerOpen(true);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!images || !selectedImage) return;
    const currentIndex = images.findIndex(img => img.id === selectedImage.id);
    const newIndex = direction === 'prev' 
      ? (currentIndex - 1 + images.length) % images.length
      : (currentIndex + 1) % images.length;
    setSelectedImage(images[newIndex]);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  const primaryImage = images?.find(img => img.is_primary);
  const otherImages = images?.filter(img => !img.is_primary) || [];

  return (
    <div className="space-y-3">
      {/* Primary Image */}
      {primaryImage ? (
        <div className="relative group">
          <img
            src={getPropertyImageUrl(primaryImage.file_path)}
            alt="Imagen principal"
            className="w-full aspect-video object-cover rounded-lg cursor-pointer"
            onClick={() => openViewer(primaryImage)}
          />
          <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground">
            <Star className="h-3 w-3 mr-1" />
            Principal
          </Badge>
          {editable && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(primaryImage);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm h-8 w-8"
            onClick={() => openViewer(primaryImage)}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Card className="aspect-video flex items-center justify-center bg-secondary/30 border-dashed">
          <div className="text-center text-muted-foreground">
            <ImagePlus className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Sin imagen principal</p>
          </div>
        </Card>
      )}

      {/* Thumbnail Grid */}
      {(otherImages.length > 0 || editable) && (
        <div className="grid grid-cols-4 gap-2">
          {otherImages.map((image) => (
            <div key={image.id} className="relative group">
              <img
                src={getPropertyImageUrl(image.file_path)}
                alt={image.file_name}
                className="aspect-square object-cover rounded-lg cursor-pointer"
                onClick={() => openViewer(image)}
              />
              {editable && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetPrimary(image);
                    }}
                    title="Establecer como principal"
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(image);
                    }}
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          
          {/* Upload Button */}
          {editable && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadImage.isPending}
              className={cn(
                "aspect-square rounded-lg border-2 border-dashed border-border",
                "flex flex-col items-center justify-center gap-1",
                "hover:border-primary hover:bg-primary/5 transition-colors",
                "text-muted-foreground hover:text-primary",
                uploadImage.isPending && "opacity-50 cursor-not-allowed"
              )}
            >
              {uploadImage.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-xs">Añadir</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Image Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          {selectedImage && (
            <div className="relative">
              <img
                src={getPropertyImageUrl(selectedImage.file_path)}
                alt={selectedImage.file_name}
                className="w-full max-h-[80vh] object-contain"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-white hover:bg-white/20"
                onClick={() => setViewerOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              {images && images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10"
                    onClick={() => navigateImage('prev')}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10"
                    onClick={() => navigateImage('next')}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}
              {selectedImage.is_primary && (
                <Badge className="absolute bottom-4 left-4 bg-accent text-accent-foreground">
                  <Star className="h-3 w-3 mr-1" />
                  Imagen Principal
                </Badge>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

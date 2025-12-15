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
import { useDeleteBuyer, type Buyer } from '@/hooks/useBuyers';
import { Loader2 } from 'lucide-react';

interface DeleteBuyerDialogProps {
  buyer: Buyer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteBuyerDialog({ buyer, open, onOpenChange }: DeleteBuyerDialogProps) {
  const deleteBuyer = useDeleteBuyer();

  const handleDelete = async () => {
    if (!buyer) return;
    await deleteBuyer.mutateAsync(buyer.id);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar comprador?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente a{' '}
            <span className="font-semibold text-foreground">
              {buyer?.company_name || buyer?.contact_name}
            </span>{' '}
            de tu red de compradores.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteBuyer.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteBuyer.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              'Eliminar'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

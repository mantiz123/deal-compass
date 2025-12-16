import { useState, useEffect } from "react";
import { useUpdateRealtor, Realtor } from "@/hooks/useRealtors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EditRealtorDialogProps {
  realtor: Realtor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditRealtorDialog({
  realtor,
  open,
  onOpenChange,
}: EditRealtorDialogProps) {
  const updateRealtor = useUpdateRealtor();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
  });

  useEffect(() => {
    if (realtor) {
      setFormData({
        name: realtor.name || "",
        email: realtor.email || "",
        phone: realtor.phone || "",
        company: realtor.company || "",
        notes: realtor.notes || "",
      });
    }
  }, [realtor]);

  const handleSubmit = () => {
    if (!realtor || !formData.name.trim()) return;

    updateRealtor.mutate(
      {
        id: realtor.id,
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        company: formData.company.trim() || null,
        notes: formData.notes.trim() || null,
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Realtor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Nombre del Realtor"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Teléfono</Label>
            <Input
              id="edit-phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-company">Empresa</Label>
            <Input
              id="edit-company"
              value={formData.company}
              onChange={(e) =>
                setFormData({ ...formData, company: e.target.value })
              }
              placeholder="RE/MAX, Keller Williams, etc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notas</Label>
            <Textarea
              id="edit-notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Notas adicionales..."
              rows={3}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim() || updateRealtor.isPending}
              className="flex-1 gradient-primary"
            >
              {updateRealtor.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

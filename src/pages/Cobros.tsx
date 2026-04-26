import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Copy, ExternalLink, Link2, CheckCircle, Clock, XCircle, Trash2, Ban } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PUBLIC_BASE_URL = "https://goklose.com";

type PaymentLink = {
  id: string;
  token: string;
  title: string;
  description: string | null;
  amount_cents: number;
  currency: string;
  customer_email: string | null;
  customer_name: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
  notes: string | null;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") {
    return (
      <Badge className="bg-success/20 text-success border-success/30">
        <CheckCircle className="h-3 w-3 mr-1" /> Pagado
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" /> Falló
      </Badge>
    );
  }
  if (status === "cancelled") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Ban className="h-3 w-3 mr-1" /> Cancelado
      </Badge>
    );
  }
  if (status === "expired") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Clock className="h-3 w-3 mr-1" /> Expirado
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <Clock className="h-3 w-3 mr-1" /> Pendiente
    </Badge>
  );
}

export default function Cobros() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    amount: "",
    customer_email: "",
    customer_name: "",
    notes: "",
  });

  const { data: links, isLoading } = useQuery({
    queryKey: ["payment_links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_links")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PaymentLink[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(form.amount);
      if (!amount || amount < 0.7) throw new Error("Monto mínimo: $0.70");
      if (!form.title.trim()) throw new Error("El título es obligatorio");

      const { data, error } = await supabase
        .from("payment_links")
        .insert({
          created_by: user!.id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          amount_cents: Math.round(amount * 100),
          currency: "USD",
          customer_email: form.customer_email.trim() || null,
          customer_name: form.customer_name.trim() || null,
          notes: form.notes.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as PaymentLink;
    },
    onSuccess: (link) => {
      qc.invalidateQueries({ queryKey: ["payment_links"] });
      setOpen(false);
      setForm({ title: "", description: "", amount: "", customer_email: "", customer_name: "", notes: "" });
      const url = `${PUBLIC_BASE_URL}/pay/${link.token}`;
      navigator.clipboard.writeText(url);
      toast.success("Cobro creado", {
        description: "Link copiado al portapapeles",
      });
    },
    onError: (e: any) => toast.error(e.message || "Error al crear cobro"),
  });

  const copyLink = (token: string) => {
    const url = `${PUBLIC_BASE_URL}/pay/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_links")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment_links"] });
      toast.success("Cobro cancelado", { description: "Ya no aparece como pendiente" });
    },
    onError: (e: any) => toast.error(e.message || "No se pudo cancelar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment_links"] });
      toast.success("Cobro eliminado");
    },
    onError: (e: any) =>
      toast.error(e.message || "No se pudo eliminar (requiere permisos de admin)"),
  });

  const totals = (links || []).reduce(
    (acc, l) => {
      if (l.status === "paid") acc.paid += l.amount_cents;
      else if (l.status === "pending") acc.pending += l.amount_cents;
      return acc;
    },
    { paid: 0, pending: 0 }
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Link2 className="h-6 w-6 sm:h-7 sm:w-7" /> Cobros
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Genera links de pago únicos para tus servicios
            </p>
          </div>
          <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Cobro
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="glass" className="p-4">
            <p className="text-sm text-muted-foreground">Total Cobrado</p>
            <p className="text-2xl font-bold text-success">{formatMoney(totals.paid, "USD")}</p>
          </Card>
          <Card variant="glass" className="p-4">
            <p className="text-sm text-muted-foreground">Pendiente de cobro</p>
            <p className="text-2xl font-bold text-warning">{formatMoney(totals.pending, "USD")}</p>
          </Card>
          <Card variant="glass" className="p-4">
            <p className="text-sm text-muted-foreground">Links generados</p>
            <p className="text-2xl font-bold">{links?.length || 0}</p>
          </Card>
        </div>

        <Card variant="glass" className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && (links?.length || 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Aún no has creado ningún cobro. Haz clic en "Nuevo Cobro" para empezar.
                  </TableCell>
                </TableRow>
              )}
              {links?.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="font-medium">{l.title}</div>
                    {l.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">{l.description}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {l.customer_name || l.customer_email || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="font-mono">{formatMoney(l.amount_cents, l.currency)}</TableCell>
                  <TableCell><StatusBadge status={l.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(l.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => copyLink(l.token)} title="Copiar link">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(`${PUBLIC_BASE_URL}/pay/${l.token}`, "_blank")}
                      title="Abrir checkout"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    {l.status === "pending" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" title="Quitar de pendientes">
                            <Ban className="h-4 w-4 text-warning" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Quitar de pendientes?</AlertDialogTitle>
                            <AlertDialogDescription>
                              El cobro "{l.title}" se marcará como cancelado y dejará de
                              sumar en "Pendiente de cobro". El link dejará de ser pagable.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => cancel.mutate(l.id)}>
                              Sí, cancelar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" title="Eliminar">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar cobro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción borra permanentemente el cobro "{l.title}" y su link
                            de pago. Solo administradores pueden eliminar registros.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => remove.mutate(l.id)}
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Cobro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título del servicio *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ej: Consultoría wholesaling 1h"
              />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detalle visible en el checkout"
                rows={2}
              />
            </div>
            <div>
              <Label>Monto en USD *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.7"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="500.00"
              />
              <p className="text-xs text-muted-foreground mt-1">Mínimo $0.70</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nombre del cliente</Label>
                <Input
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
              <div>
                <Label>Email del cliente</Label>
                <Input
                  type="email"
                  value={form.customer_email}
                  onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div>
              <Label>Notas internas</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="No visible para el cliente"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? "Generando..." : "Generar link de pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

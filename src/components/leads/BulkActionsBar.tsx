import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Archive, ChevronDown, UserPlus, Tag, X, Loader2 } from 'lucide-react';
import {
  useBulkUpdateStatus,
  useBulkAssignAgent,
  useBulkArchive,
  useAssignableAgents,
} from '@/hooks/useBulkLeadActions';
import { archiveReasonLabels, type ArchiveReason } from '@/hooks/useArchiveLead';
import type { LeadStatus } from '@/hooks/useLeads';

interface BulkActionsBarProps {
  selectedIds: string[];
  onClear: () => void;
}

const statusOptions: { value: LeadStatus; label: string }[] = [
  { value: 'captacion', label: 'Captación' },
  { value: 'contacto', label: 'Contacto' },
  { value: 'bajo_contrato', label: 'Bajo Contrato' },
  { value: 'cesion', label: 'Cesión' },
  { value: 'cerrado', label: 'Cerrado' },
];

export function BulkActionsBar({ selectedIds, onClear }: BulkActionsBarProps) {
  const count = selectedIds.length;
  const updateStatus = useBulkUpdateStatus();
  const assignAgent = useBulkAssignAgent();
  const archive = useBulkArchive();
  const { data: agents = [] } = useAssignableAgents();

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('unassigned');
  const [archiveReason, setArchiveReason] = useState<ArchiveReason>('not_motivated');
  const [archiveNotes, setArchiveNotes] = useState('');

  if (count === 0) return null;

  const handleStatusChange = async (status: LeadStatus) => {
    await updateStatus.mutateAsync({ leadIds: selectedIds, status });
    onClear();
  };

  const handleAssign = async () => {
    const agentId = selectedAgent === 'unassigned' ? null : selectedAgent;
    await assignAgent.mutateAsync({ leadIds: selectedIds, agentId });
    setAssignDialogOpen(false);
    onClear();
  };

  const handleArchive = async () => {
    await archive.mutateAsync({
      leadIds: selectedIds,
      reason: archiveReason,
      notes: archiveNotes || undefined,
    });
    setArchiveDialogOpen(false);
    setArchiveNotes('');
    onClear();
  };

  const isPending = updateStatus.isPending || assignAgent.isPending || archive.isPending;

  return (
    <>
      <div className="sticky top-2 z-30 mb-4 animate-fade-in">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 backdrop-blur-md px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              {count}
            </span>
            <span className="text-sm font-medium">
              lead{count === 1 ? '' : 's'} seleccionado{count === 1 ? '' : 's'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={isPending}>
                  <Tag className="mr-2 h-4 w-4" />
                  Cambiar estado
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mover a etapa</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {statusOptions.map(opt => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => setAssignDialogOpen(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Asignar agente
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => setArchiveDialogOpen(true)}
              className="border-warning/50 text-warning hover:bg-warning/10 hover:text-warning"
            >
              <Archive className="mr-2 h-4 w-4" />
              Archivar
            </Button>

            <Button size="sm" variant="ghost" onClick={onClear} disabled={isPending}>
              <X className="h-4 w-4" />
            </Button>

            {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
      </div>

      {/* Assign Agent Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar agente</DialogTitle>
            <DialogDescription>
              Reasigna {count} lead{count === 1 ? '' : 's'} a un agente aprobado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Agente</Label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un agente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Sin asignar</SelectItem>
                {agents.map(a => (
                  <SelectItem key={a.user_id} value={a.user_id}>
                    {a.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssign} disabled={assignAgent.isPending}>
              {assignAgent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archivar {count} lead{count === 1 ? '' : 's'}</AlertDialogTitle>
            <AlertDialogDescription>
              Los leads se moverán al archivo. Podrás restaurarlos más tarde desde la sección de archivados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Razón</Label>
              <Select value={archiveReason} onValueChange={(v) => setArchiveReason(v as ArchiveReason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(archiveReasonLabels) as ArchiveReason[]).map(r => (
                    <SelectItem key={r} value={r}>
                      {archiveReasonLabels[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={archiveNotes}
                onChange={(e) => setArchiveNotes(e.target.value)}
                placeholder="Detalles adicionales..."
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={archive.isPending}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {archive.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

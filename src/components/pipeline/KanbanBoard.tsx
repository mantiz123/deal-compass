import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCardOverlay } from './KanbanCard';
import { useLeads, useUpdateLeadStatus, useBulkUpdateLeadStatus, type Lead, type LeadStatus } from '@/hooks/useLeads';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, X, Loader2 } from 'lucide-react';

const COLUMNS: { id: LeadStatus; name: string; color: string }[] = [
  { id: 'captacion', name: 'Captación', color: 'border-t-info' },
  { id: 'contacto', name: 'Contacto', color: 'border-t-primary' },
  { id: 'bajo_contrato', name: 'Bajo Contrato', color: 'border-t-warning' },
  { id: 'cesion', name: 'Cesión', color: 'border-t-accent' },
  { id: 'cerrado', name: 'Cerrado', color: 'border-t-success' },
];

interface KanbanBoardProps {
  onAddDeal?: () => void;
}

export function KanbanBoard({ onAddDeal }: KanbanBoardProps) {
  const { data: result, isLoading } = useLeads();
  const leads = result?.data;
  const updateStatus = useUpdateLeadStatus();
  const bulkUpdateStatus = useBulkUpdateLeadStatus();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTargetStatus, setBulkTargetStatus] = useState<LeadStatus | ''>('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const leadsByStatus = useMemo(() => {
    if (!leads) return {};
    return leads.reduce((acc, lead) => {
      const status = lead.status as LeadStatus;
      if (!acc[status]) acc[status] = [];
      acc[status].push(lead);
      return acc;
    }, {} as Record<LeadStatus, Lead[]>);
  }, [leads]);

  const activeLead = useMemo(() => {
    if (!activeId || !leads) return null;
    return leads.find(l => l.id === activeId) || null;
  }, [activeId, leads]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setBulkTargetStatus('');
  }, []);

  const handleBulkMove = async () => {
    if (!bulkTargetStatus || selectedIds.size === 0) return;
    await bulkUpdateStatus.mutateAsync({ ids: Array.from(selectedIds), status: bulkTargetStatus as LeadStatus });
    clearSelection();
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;
    const lead = leads?.find(l => l.id === leadId);
    if (!lead) return;

    const isColumnId = COLUMNS.some(col => col.id === overId);
    let newStatus: LeadStatus;
    if (isColumnId) {
      newStatus = overId as LeadStatus;
    } else {
      const targetLead = leads?.find(l => l.id === overId);
      if (!targetLead) return;
      newStatus = targetLead.status as LeadStatus;
    }

    if (lead.status === newStatus) return;
    updateStatus.mutate({ id: leadId, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div key={col.id} className="min-w-[320px] flex-shrink-0">
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 animate-fade-in flex-wrap">
          <Badge variant="secondary" className="shrink-0">
            {selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''}
          </Badge>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={bulkTargetStatus} onValueChange={(v) => setBulkTargetStatus(v as LeadStatus)}>
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue placeholder="Mover a etapa..." />
              </SelectTrigger>
              <SelectContent>
                {COLUMNS.map(col => (
                  <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-8"
              disabled={!bulkTargetStatus || bulkUpdateStatus.isPending}
              onClick={handleBulkMove}
            >
              {bulkUpdateStatus.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                : <ArrowRight className="h-3.5 w-3.5 mr-1.5" />}
              Mover
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="h-8 ml-auto" onClick={clearSelection}>
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column, index) => (
            <div
              key={column.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <KanbanColumn
                id={column.id}
                name={column.name}
                color={column.color}
                leads={leadsByStatus[column.id] || []}
                onAddDeal={onAddDeal}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
              />
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeLead ? (
            <div className="rotate-3 scale-105">
              <KanbanCardOverlay lead={activeLead} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

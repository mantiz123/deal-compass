import { useState, useMemo } from 'react';
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
import { KanbanCard } from './KanbanCard';
import { useLeads, useUpdateLeadStatus, type Lead, type LeadStatus } from '@/hooks/useLeads';
import { Skeleton } from '@/components/ui/skeleton';

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
  const { data: leads, isLoading } = useLeads();
  const updateStatus = useUpdateLeadStatus();
  
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group leads by status
  const leadsByStatus = useMemo(() => {
    if (!leads) return {};
    
    return leads.reduce((acc, lead) => {
      const status = lead.status as LeadStatus;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(lead);
      return acc;
    }, {} as Record<LeadStatus, Lead[]>);
  }, [leads]);

  const activeLead = useMemo(() => {
    if (!activeId || !leads) return null;
    return leads.find(l => l.id === activeId) || null;
  }, [activeId, leads]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    // Find the current lead being dragged
    const lead = leads?.find(l => l.id === leadId);
    if (!lead) return;

    // Determine the target status
    // over.id could be a column ID or a lead ID
    let newStatus: LeadStatus;
    
    // Check if overId is a valid column status
    const isColumnId = COLUMNS.some(col => col.id === overId);
    
    if (isColumnId) {
      newStatus = overId as LeadStatus;
    } else {
      // overId is a lead ID, find which column it belongs to
      const targetLead = leads?.find(l => l.id === overId);
      if (!targetLead) return;
      newStatus = targetLead.status as LeadStatus;
    }

    // Don't update if status hasn't changed
    if (lead.status === newStatus) return;

    // Update status in database
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
            />
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="rotate-3 scale-105">
            <KanbanCard lead={activeLead} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

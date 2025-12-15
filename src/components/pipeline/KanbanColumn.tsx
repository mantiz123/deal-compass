import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KanbanCard } from './KanbanCard';
import type { Lead, LeadStatus } from '@/hooks/useLeads';

interface KanbanColumnProps {
  id: LeadStatus;
  name: string;
  color: string;
  leads: Lead[];
  onAddDeal?: () => void;
}

export function KanbanColumn({ id, name, color, leads, onAddDeal }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div className="min-w-[320px] flex-shrink-0">
      <Card 
        variant="glass" 
        className={cn(
          'border-t-4 transition-all duration-200',
          color,
          isOver && 'ring-2 ring-primary/50 bg-primary/5'
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              {name}
            </CardTitle>
            <Badge variant="outline">{leads.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={setNodeRef}
            className="space-y-3 min-h-[200px]"
          >
            <SortableContext
              items={leads.map(l => l.id)}
              strategy={verticalListSortingStrategy}
            >
              {leads.map((lead) => (
                <KanbanCard key={lead.id} lead={lead} />
              ))}
            </SortableContext>
          </div>
          <Button 
            variant="ghost" 
            className="w-full mt-3 border border-dashed border-border hover:border-primary/50"
            onClick={onAddDeal}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Deal
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

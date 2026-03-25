import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KScoreGauge } from '@/components/dashboard/KScoreGauge';
import { LeadDetailSheet } from '@/components/leads/LeadDetailSheet';
import { Phone, MoreHorizontal, DollarSign, GripVertical, MapPin, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lead } from '@/hooks/useLeads';

interface KanbanCardProps {
  lead: Lead;
  isDragOverlay?: boolean;
}

// Presentational component for the card content
function KanbanCardContent({ 
  lead, 
  onShowDetail, 
  isDragging = false 
}: { 
  lead: Lead; 
  onShowDetail?: () => void;
  isDragging?: boolean;
}) {
  const property = lead.property;
  const assignmentFee = lead.assignment_fee ? Number(lead.assignment_fee) : null;

  return (
    <Card
      variant="interactive"
      className={cn(
        'p-4 transition-all duration-200',
        isDragging && 'opacity-50 shadow-lg scale-105 rotate-1 z-50'
      )}
    >
      <div className="space-y-3">
        {/* Header with grip handle */}
        <div className="flex items-start gap-2">
          <div className="cursor-grab active:cursor-grabbing p-1 -ml-2 rounded hover:bg-secondary/50 touch-none">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div 
            className="flex-1 min-w-0 cursor-pointer"
            onClick={onShowDetail}
          >
            <p className="font-medium text-sm truncate hover:text-primary transition-colors">
              {property?.address || 'Sin dirección'}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{property?.city}, {property?.state} {property?.zip_code}</span>
            </div>
          </div>
          <KScoreGauge score={lead.piw_score || 0} size="sm" />
        </div>

        {/* Owner Info */}
        <p className="text-xs text-muted-foreground pl-6">
          {property?.owner_name || 'Propietario desconocido'}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pl-6">
          <div className="flex items-center gap-1 text-success">
            <DollarSign className="h-4 w-4" />
            <span className="font-semibold text-sm">
              {assignmentFee 
                ? `$${assignmentFee.toLocaleString()}`
                : property?.mao 
                  ? `$${Number(property.mao).toLocaleString()}`
                  : 'TBD'
              }
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onShowDetail?.();
              }}
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                if (property?.owner_phone) {
                  window.open(`tel:${property.owner_phone}`);
                }
              }}
            >
              <Phone className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Property Type Badge */}
        <div className="pl-6">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
            {property?.property_type?.replace('_', ' ') || 'N/A'}
          </span>
        </div>
      </div>
    </Card>
  );
}

// Drag overlay version - no sortable hooks
export function KanbanCardOverlay({ lead }: { lead: Lead }) {
  return <KanbanCardContent lead={lead} />;
}

// Main sortable version
export function KanbanCard({ lead, isDragOverlay = false }: KanbanCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // If this is a drag overlay, render simple version
  if (isDragOverlay) {
    return <KanbanCardContent lead={lead} />;
  }

  const property = lead.property;
  const assignmentFee = lead.assignment_fee ? Number(lead.assignment_fee) : null;

  return (
    <>
      <div ref={setNodeRef} style={style}>
        <Card
          variant="interactive"
          className={cn(
            'p-4 transition-all duration-200',
            isDragging && 'opacity-50 shadow-lg scale-105 rotate-1 z-50'
          )}
        >
          <div className="space-y-3">
            {/* Header with grip handle */}
            <div className="flex items-start gap-2">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 -ml-2 rounded hover:bg-secondary/50 touch-none"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => setShowDetail(true)}
              >
                <p className="font-medium text-sm truncate hover:text-primary transition-colors">
                  {property?.address || 'Sin dirección'}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{property?.city}, {property?.state} {property?.zip_code}</span>
                </div>
              </div>
              <KScoreGauge score={lead.piw_score || 0} size="sm" />
            </div>

            {/* Owner Info */}
            <p className="text-xs text-muted-foreground pl-6">
              {property?.owner_name || 'Propietario desconocido'}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between pl-6">
              <div className="flex items-center gap-1 text-success">
                <DollarSign className="h-4 w-4" />
                <span className="font-semibold text-sm">
                  {assignmentFee 
                    ? `$${assignmentFee.toLocaleString()}`
                    : property?.mao 
                      ? `$${Number(property.mao).toLocaleString()}`
                      : 'TBD'
                  }
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetail(true);
                  }}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (property?.owner_phone) {
                      window.open(`tel:${property.owner_phone}`);
                    }
                  }}
                >
                  <Phone className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Property Type Badge */}
            <div className="pl-6">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
                {property?.property_type?.replace('_', ' ') || 'N/A'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Lead Detail Sheet */}
      <LeadDetailSheet
        lead={lead}
        open={showDetail}
        onOpenChange={setShowDetail}
      />
    </>
  );
}

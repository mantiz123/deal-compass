import { useState } from 'react';
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { KanbanBoard } from '@/components/pipeline/KanbanBoard';
import { NewLeadDialog } from '@/components/leads/NewLeadDialog';

const Pipeline = () => {
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false);

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">
            Arrastra y suelta deals entre etapas de tu workflow
          </p>
        </div>
        <Button onClick={() => setShowNewLeadDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Deal
        </Button>
      </div>

      {/* Kanban Board with real data and drag & drop */}
      <KanbanBoard onAddDeal={() => setShowNewLeadDialog(true)} />

      {/* New Lead Dialog */}
      <NewLeadDialog 
        open={showNewLeadDialog} 
        onOpenChange={setShowNewLeadDialog} 
      />
    </Layout>
  );
};

export default Pipeline;

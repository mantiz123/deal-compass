import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrgIdSafe } from '@/contexts/OrganizationContext';
import { Mail, Send, Archive, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface DraftRow {
  id: string;
  lead_id: string;
  to_email: string | null;
  to_name: string | null;
  subject: string;
  body: string;
  draft_type: string;
  generated_at: string;
  lead: {
    id: string;
    piw_score: number | null;
    property: {
      address: string;
      city: string;
      owner_name: string | null;
      owner_email: string | null;
    } | null;
  } | null;
}

const DRAFT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  foreclosure: { label: "Foreclosure", color: "border-red-500/50 text-red-500" },
  tax_delinquent: { label: "Tax Delinquent", color: "border-orange-500/50 text-orange-500" },
  absentee_owner: { label: "Absentee", color: "border-blue-500/50 text-blue-500" },
  vacant: { label: "Vacant", color: "border-purple-500/50 text-purple-500" },
  general: { label: "General", color: "border-muted text-muted-foreground" },
};

function usePendingDrafts() {
  const orgId = useCurrentOrgIdSafe();
  return useQuery<DraftRow[]>({
    queryKey: ['outreach-drafts-pending', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_email_drafts')
        .select(`
          id, lead_id, to_email, to_name, subject, body, draft_type, generated_at,
          lead:leads(
            id, piw_score,
            property:properties(address, city, owner_name, owner_email)
          )
        `)
        .eq('status', 'pending_review')
        .order('generated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as DraftRow[];
    },
    refetchInterval: 5 * 60 * 1000,
  });
}

export function OutreachDraftsWidget() {
  const { data: drafts, isLoading } = usePendingDrafts();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<DraftRow | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  const openDraft = (draft: DraftRow) => {
    setSelected(draft);
    setEditSubject(draft.subject);
    setEditBody(draft.body);
  };

  const sendMutation = useMutation({
    mutationFn: async ({ draftId, subject, body }: { draftId: string; subject: string; body: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-draft-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            draft_id: draftId,
            subject_override: subject,
            body_override: body,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Send failed');
      return result;
    },
    onSuccess: () => {
      toast.success('Email sent to seller');
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ['outreach-drafts-pending'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await supabase
        .from('lead_email_drafts')
        .update({ status: 'archived' })
        .eq('id', draftId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Draft archived');
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ['outreach-drafts-pending'] });
    },
  });

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardContent className="p-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!drafts?.length) return null;

  const topDrafts = drafts.slice(0, 5);
  const typeInfo = (type: string) => DRAFT_TYPE_LABELS[type] ?? DRAFT_TYPE_LABELS.general;

  return (
    <>
      <Card variant="glass" className="border-primary/40 bg-primary/5 animate-fade-in">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              Drafts listos para enviar
              <Badge variant="outline" className="border-primary/50 text-primary text-xs">
                {drafts.length}
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {topDrafts.map((draft) => {
            const p = draft.lead?.property;
            const ti = typeInfo(draft.draft_type);
            return (
              <button
                key={draft.id}
                onClick={() => openDraft(draft)}
                className="w-full flex items-center justify-between rounded-lg bg-background/60 px-3 py-2 hover:bg-background/90 transition-colors text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {p?.owner_name ?? 'Unknown'} — {p?.address ?? '?'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p?.city} · {draft.subject}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <Badge variant="outline" className={`text-xs ${ti.color}`}>
                    {ti.label}
                  </Badge>
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </button>
            );
          })}

          {drafts.length > 5 && (
            <p className="text-xs text-center text-muted-foreground pt-1">
              {drafts.length - 5} más esperando revisión
            </p>
          )}
        </CardContent>
      </Card>

      {/* Review modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Revisar y enviar email
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {selected.lead?.property?.owner_name ?? 'Unknown Seller'}
                </span>
                <span>·</span>
                <span>{selected.lead?.property?.address}, {selected.lead?.property?.city}</span>
                <Badge variant="outline" className={`text-xs ${typeInfo(selected.draft_type).color}`}>
                  {typeInfo(selected.draft_type).label}
                </Badge>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Para</label>
                <p className="text-sm mt-1">
                  {selected.to_email ?? selected.lead?.property?.owner_email ?? (
                    <span className="text-destructive">No email on file</span>
                  )}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Asunto
                </label>
                <Input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Cuerpo del email
                </label>
                <Textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="mt-1 min-h-[300px] font-mono text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => selected && archiveMutation.mutate(selected.id)}
              disabled={archiveMutation.isPending}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archivar
            </Button>
            <Button
              size="sm"
              onClick={() =>
                selected &&
                sendMutation.mutate({
                  draftId: selected.id,
                  subject: editSubject,
                  body: editBody,
                })
              }
              disabled={
                sendMutation.isPending ||
                !editSubject ||
                !editBody ||
                !(selected?.to_email ?? selected?.lead?.property?.owner_email)
              }
            >
              <Send className="mr-2 h-4 w-4" />
              {sendMutation.isPending ? 'Enviando…' : 'Enviar ahora'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

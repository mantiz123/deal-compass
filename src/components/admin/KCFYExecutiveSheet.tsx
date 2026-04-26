import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Phone,
  Mail,
  Copy,
  AlertTriangle,
  ShieldAlert,
  Home,
  DollarSign,
  TrendingUp,
  Flame,
  User,
  ExternalLink,
  Calendar,
  FileText,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { KCFYHorizontalTimeline } from './KCFYHorizontalTimeline';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kcfyRequestId: string | null;
  leadId: string | null;
  propertyAddress?: string;
}

interface ContactPhone {
  number: string;
  type: string | null;
  dnc: boolean;
  index: number;
}

interface ContactEmail {
  email: string;
  index: number;
}

function formatCurrency(v: number | null | undefined) {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

function MotivationBadges({ property }: { property: any }) {
  const badges: { label: string; tone: string; icon?: React.ElementType }[] = [];
  if (property.is_foreclosure) badges.push({ label: 'FORECLOSURE', tone: 'bg-red-500/15 text-red-500 border-red-500/30', icon: AlertTriangle });
  if (property.is_vacant) badges.push({ label: 'VACANT', tone: 'bg-orange-500/15 text-orange-500 border-orange-500/30' });
  if (property.tax_delinquent) badges.push({ label: 'TAX DELINQ', tone: 'bg-amber-500/15 text-amber-600 border-amber-500/30' });
  if (property.is_probate) badges.push({ label: 'PROBATE', tone: 'bg-purple-500/15 text-purple-500 border-purple-500/30' });
  if (property.is_absentee_owner) badges.push({ label: 'ABSENTEE', tone: 'bg-blue-500/15 text-blue-500 border-blue-500/30' });
  if (property.divorce_date) badges.push({ label: 'DIVORCE', tone: 'bg-pink-500/15 text-pink-500 border-pink-500/30' });
  if (property.bk_date) badges.push({ label: 'BANKRUPTCY', tone: 'bg-rose-500/15 text-rose-500 border-rose-500/30' });
  if (property.is_litigator) badges.push({ label: 'LITIGATOR', tone: 'bg-destructive/15 text-destructive border-destructive/30', icon: ShieldAlert });
  if (badges.length === 0) return <span className="text-xs text-muted-foreground">Sin señales de distress</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => {
        const Icon = b.icon;
        return (
          <Badge key={b.label} variant="outline" className={cn('text-[10px] font-bold', b.tone)}>
            {Icon && <Icon className="h-2.5 w-2.5 mr-1" />}
            {b.label}
          </Badge>
        );
      })}
    </div>
  );
}

export function KCFYExecutiveSheet({ open, onOpenChange, kcfyRequestId, leadId, propertyAddress }: Props) {
  const [copying, setCopying] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['kcfy-executive', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const { data: lead, error } = await supabase
        .from('leads')
        .select(`
          *,
          property:properties!inner(*),
          assigned_agent:profiles!leads_assigned_agent_id_fkey(full_name, phone, avatar_url),
          interactions(id, interaction_type, content, sentiment, direction, created_at, created_by),
          documents:lead_documents(id, file_name, file_path, file_type, created_at)
        `)
        .eq('id', leadId)
        .maybeSingle();
      if (error) throw error;
      return lead;
    },
    enabled: open && !!leadId,
  });

  const phones: ContactPhone[] = useMemo(() => {
    const p = data?.property;
    if (!p) return [];
    const list: ContactPhone[] = [];
    if (p.owner_phone) list.push({ number: p.owner_phone, type: 'Primary', dnc: !!p.phone_1_dnc, index: 1 });
    for (let i = 2; i <= 5; i++) {
      const num = (p as any)[`phone_${i}`];
      if (num) {
        list.push({
          number: num,
          type: (p as any)[`phone_${i}_type`] || null,
          dnc: !!(p as any)[`phone_${i}_dnc`],
          index: i,
        });
      }
    }
    return list;
  }, [data]);

  const emails: ContactEmail[] = useMemo(() => {
    const p = data?.property;
    if (!p) return [];
    const list: ContactEmail[] = [];
    if (p.owner_email) list.push({ email: p.owner_email, index: 1 });
    if (p.owner_email_2) list.push({ email: p.owner_email_2, index: 2 });
    if (p.owner_email_3) list.push({ email: p.owner_email_3, index: 3 });
    if (p.owner_email_4) list.push({ email: p.owner_email_4, index: 4 });
    return list;
  }, [data]);

  const firstCallable = phones.find((p) => !p.dnc);

  const copyContacts = async () => {
    if (!data?.property) return;
    setCopying(true);
    const p = data.property;
    const lines: string[] = [
      `KCFY Lead — ${p.address}, ${p.city}, ${p.state} ${p.zip_code}`,
      `Owner: ${p.owner_name || '—'}`,
      '',
      'PHONES:',
      ...phones.map((ph) => `  ${ph.index}. ${ph.number}${ph.type ? ` (${ph.type})` : ''}${ph.dnc ? ' [DNC]' : ''}`),
      '',
      'EMAILS:',
      ...emails.map((em) => `  ${em.index}. ${em.email}`),
      '',
      `K-Score: ${data.piw_score ?? '—'} | ARV: ${formatCurrency(p.arv)} | MAO: ${formatCurrency(p.mao)}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast.success('Contactos copiados al portapapeles');
    } catch {
      toast.error('No se pudo copiar');
    } finally {
      setCopying(false);
    }
  };

  const buildMailto = (email: string) => {
    if (!data?.property) return `mailto:${email}`;
    const subject = `Regarding your property at ${data.property.address}`;
    const body = `Hi ${data.property.owner_name?.split(' ')[0] || 'there'},\n\nI'm reaching out from Klose regarding your property at ${data.property.address}, ${data.property.city}. We work with a network of cash buyers and may be able to present you with a fast, no-fee cash offer.\n\nWould you be open to a brief 5-minute call this week?\n\nBest regards,\nKlose Acquisitions Team`;
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Vista Ejecutiva KCFY
          </SheetTitle>
          <SheetDescription>{propertyAddress || 'Datos completos del lead para el equipo Klose'}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {isLoading || !data ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <>
                {/* QUICK ACTIONS */}
                <div className="flex flex-wrap gap-2">
                  {firstCallable && (
                    <Button asChild size="sm" className="gap-2">
                      <a href={`tel:${firstCallable.number}`}>
                        <Phone className="h-4 w-4" />
                        Llamar {firstCallable.number}
                      </a>
                    </Button>
                  )}
                  {emails[0] && (
                    <Button asChild size="sm" variant="outline" className="gap-2">
                      <a href={buildMailto(emails[0].email)}>
                        <Mail className="h-4 w-4" />
                        Email
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="gap-2" onClick={copyContacts} disabled={copying}>
                    <Copy className="h-4 w-4" />
                    Copiar contactos
                  </Button>
                </div>

                {/* TIMELINE */}
                {kcfyRequestId && (
                  <Card>
                    <CardContent className="pt-5">
                      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4">
                        Ruta del Deal
                      </h3>
                      <KCFYHorizontalTimeline kcfyRequestId={kcfyRequestId} />
                    </CardContent>
                  </Card>
                )}

                {/* PROPERTY SNAPSHOT */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricCard label="K-Score" value={data.piw_score ?? '—'} icon={Flame} highlight={!!(data.piw_score && data.piw_score >= 75)} />
                  <MetricCard label="ARV" value={formatCurrency(data.property?.arv)} icon={Home} />
                  <MetricCard label="MAO" value={formatCurrency(data.property?.mao)} icon={DollarSign} />
                  <MetricCard
                    label="Net Equity"
                    value={
                      data.property?.arv && data.property?.mortgage_balance != null
                        ? formatCurrency(data.property.arv - data.property.mortgage_balance)
                        : '—'
                    }
                    icon={TrendingUp}
                  />
                </div>

                {/* OWNER & CONTACTS */}
                <Card>
                  <CardContent className="pt-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                          Propietario
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{data.property?.owner_name || 'Sin nombre'}</span>
                        </div>
                        {data.property?.owner_2_name && (
                          <p className="text-sm text-muted-foreground ml-6">+ {data.property.owner_2_name}</p>
                        )}
                        {data.property?.mailing_address_different && data.property?.owner_mailing_address && (
                          <p className="text-xs text-muted-foreground mt-1 ml-6">
                            Dirección postal: {data.property.owner_mailing_address}, {data.property.owner_mailing_city}, {data.property.owner_mailing_state}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="bg-primary/5">
                        <MapPin className="h-3 w-3 mr-1" />
                        {data.property?.city}, {data.property?.state}
                      </Badge>
                    </div>

                    <Separator />

                    {/* Phones */}
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
                        <Phone className="h-3 w-3" /> Teléfonos ({phones.length})
                      </h4>
                      {phones.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Sin teléfonos registrados — skip-trace pendiente</p>
                      ) : (
                        <div className="space-y-1.5">
                          {phones.map((p) => (
                            <div
                              key={p.index}
                              className={cn(
                                'flex items-center justify-between gap-2 px-3 py-2 rounded-md border',
                                p.dnc ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/30',
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-mono text-muted-foreground">#{p.index}</span>
                                <a
                                  href={`tel:${p.number}`}
                                  className="font-mono text-sm font-semibold hover:text-primary truncate"
                                >
                                  {p.number}
                                </a>
                                {p.type && (
                                  <Badge variant="outline" className="text-[9px] uppercase">
                                    {p.type}
                                  </Badge>
                                )}
                                {p.dnc && (
                                  <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/30">
                                    DNC
                                  </Badge>
                                )}
                              </div>
                              <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                                <a href={`tel:${p.number}`}>
                                  <Phone className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Emails */}
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
                        <Mail className="h-3 w-3" /> Emails ({emails.length})
                      </h4>
                      {emails.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Sin emails registrados</p>
                      ) : (
                        <div className="space-y-1.5">
                          {emails.map((e) => (
                            <div
                              key={e.index}
                              className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-border bg-muted/30"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-mono text-muted-foreground">#{e.index}</span>
                                <a href={buildMailto(e.email)} className="text-sm hover:text-primary truncate">
                                  {e.email}
                                </a>
                              </div>
                              <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                                <a href={buildMailto(e.email)}>
                                  <Mail className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Motivation */}
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                        Señales de motivación
                      </h4>
                      <MotivationBadges property={data.property} />
                    </div>
                  </CardContent>
                </Card>

                {/* PROPERTY DETAILS */}
                <Card>
                  <CardContent className="pt-5">
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                      Detalles de la propiedad
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                      <DetailRow label="Tipo" value={data.property?.property_type} />
                      <DetailRow label="Beds / Baths" value={`${data.property?.bedrooms ?? '—'} / ${data.property?.bathrooms ?? '—'}`} />
                      <DetailRow label="Sqft" value={data.property?.sqft?.toLocaleString() ?? '—'} />
                      <DetailRow label="Año construcción" value={data.property?.year_built ?? '—'} />
                      <DetailRow label="Condición" value={data.property?.property_condition ?? '—'} />
                      <DetailRow label="Repair Cost" value={formatCurrency(data.property?.repair_cost)} />
                      <DetailRow label="Mortgage Balance" value={formatCurrency(data.property?.mortgage_balance)} />
                      <DetailRow label="Equity %" value={data.property?.equity_percent != null ? `${data.property.equity_percent}%` : '—'} />
                      <DetailRow label="Days on Market" value={data.property?.days_on_market ?? '—'} />
                      <DetailRow label="Last Sale" value={data.property?.last_sale_date ? format(new Date(data.property.last_sale_date), 'MMM yyyy', { locale: es }) : '—'} />
                      <DetailRow label="Last Sale $" value={formatCurrency(data.property?.last_sale_price)} />
                      <DetailRow label="Tenure (años)" value={data.property?.owner_tenure_years ?? '—'} />
                    </div>
                  </CardContent>
                </Card>

                {/* STRATEGY */}
                {data.recommended_strategy && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="pt-5">
                      <h3 className="text-xs uppercase tracking-wider text-primary font-semibold mb-2 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" /> Estrategia recomendada
                      </h3>
                      <div className="flex items-baseline gap-3">
                        <span className="text-lg font-bold uppercase">{data.recommended_strategy.replace(/_/g, ' ')}</span>
                        {data.strategy_confidence != null && (
                          <Badge variant="outline" className="bg-primary/10">
                            {data.strategy_confidence}% confianza
                          </Badge>
                        )}
                      </div>
                      {data.strategy_mao && (
                        <p className="text-sm mt-1">
                          MAO sugerido: <span className="font-semibold">{formatCurrency(data.strategy_mao)}</span>
                        </p>
                      )}
                      {Array.isArray(data.strategy_reasons) && data.strategy_reasons.length > 0 && (
                        <ul className="mt-2 text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                          {(data.strategy_reasons as string[]).slice(0, 4).map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* INTERACTIONS */}
                {Array.isArray(data.interactions) && data.interactions.length > 0 && (
                  <Card>
                    <CardContent className="pt-5">
                      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" /> Historial de interacciones del estudiante ({data.interactions.length})
                      </h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {data.interactions
                          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .slice(0, 10)
                          .map((i: any) => (
                            <div key={i.id} className="text-xs border-l-2 border-primary/30 pl-3 py-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] uppercase">
                                  {i.interaction_type}
                                </Badge>
                                {i.sentiment && (
                                  <span className="text-[10px] text-muted-foreground">· {i.sentiment}</span>
                                )}
                                <span className="text-[10px] text-muted-foreground ml-auto">
                                  {format(new Date(i.created_at), "d MMM HH:mm", { locale: es })}
                                </span>
                              </div>
                              {i.content && <p className="mt-1 text-foreground/80">{i.content}</p>}
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* DOCUMENTS */}
                {Array.isArray(data.documents) && data.documents.length > 0 && (
                  <Card>
                    <CardContent className="pt-5">
                      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-1.5">
                        <FileText className="h-3 w-3" /> Documentos ({data.documents.length})
                      </h3>
                      <div className="space-y-1.5">
                        {data.documents.map((doc: any) => (
                          <div key={doc.id} className="flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-md bg-muted/30">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{doc.file_name}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={async () => {
                                const { data: signed } = await supabase.storage
                                  .from('lead-documents')
                                  .createSignedUrl(doc.file_path, 60);
                                if (signed?.signedUrl) window.open(signed.signedUrl, '_blank');
                              }}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* NOTES */}
                {data.property?.notes && (
                  <Card>
                    <CardContent className="pt-5">
                      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                        Notas internas del estudiante
                      </h3>
                      <p className="text-sm italic text-foreground/80 whitespace-pre-wrap">{data.property.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && 'border-primary/40 bg-primary/5')}>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          <Icon className="h-3 w-3" />
          {label}
        </div>
        <p className={cn('text-lg font-bold mt-1', highlight && 'text-primary')}>{value}</p>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/40 py-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium text-xs text-right">{value || '—'}</span>
    </div>
  );
}

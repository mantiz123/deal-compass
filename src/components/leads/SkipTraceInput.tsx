import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateProperty } from '@/hooks/useProperties';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, UserSearch, ClipboardPaste, Pencil, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SkipTraceInputProps {
  propertyId: string;
  currentData: {
    owner_phone?: string | null;
    phone_2?: string | null;
    phone_3?: string | null;
    phone_4?: string | null;
    phone_5?: string | null;
    phone_1_type?: string | null;
    phone_2_type?: string | null;
    phone_3_type?: string | null;
    phone_4_type?: string | null;
    phone_5_type?: string | null;
    phone_1_dnc?: boolean | null;
    phone_2_dnc?: boolean | null;
    phone_3_dnc?: boolean | null;
    phone_4_dnc?: boolean | null;
    phone_5_dnc?: boolean | null;
    owner_email?: string | null;
    owner_email_2?: string | null;
    owner_email_3?: string | null;
    owner_email_4?: string | null;
  };
  onSaved?: () => void;
}

const phoneFields = [
  { numKey: 'owner_phone', typeKey: 'phone_1_type', dncKey: 'phone_1_dnc', label: 'Phone 1' },
  { numKey: 'phone_2', typeKey: 'phone_2_type', dncKey: 'phone_2_dnc', label: 'Phone 2' },
  { numKey: 'phone_3', typeKey: 'phone_3_type', dncKey: 'phone_3_dnc', label: 'Phone 3' },
  { numKey: 'phone_4', typeKey: 'phone_4_type', dncKey: 'phone_4_dnc', label: 'Phone 4' },
  { numKey: 'phone_5', typeKey: 'phone_5_type', dncKey: 'phone_5_dnc', label: 'Phone 5' },
] as const;

const emailFields = [
  { key: 'owner_email', label: 'Email 1' },
  { key: 'owner_email_2', label: 'Email 2' },
  { key: 'owner_email_3', label: 'Email 3' },
  { key: 'owner_email_4', label: 'Email 4' },
] as const;

interface PhoneData {
  number: string;
  type: string;
  dnc: boolean;
}

function parseSkipTraceText(text: string): { phones: PhoneData[]; emails: string[] } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const phones: PhoneData[] = [];
  const emails: string[] = [];

  for (const line of lines) {
    // Check for email pattern
    const emailMatch = line.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
    if (emailMatch && !line.match(/phone/i)) {
      emails.push(emailMatch[0]);
      continue;
    }

    // Check for phone pattern - extract number like (205) 835-5212 or 2058355212
    const phoneMatch = line.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
    if (phoneMatch) {
      const number = phoneMatch[0];
      
      // Detect type
      let type = '';
      if (/mobile|cell/i.test(line)) type = 'Mobile';
      else if (/landline|land/i.test(line)) type = 'Landline';
      else if (/voip/i.test(line)) type = 'VoIP';

      // Detect DNC
      const dnc = /dnc|do not call/i.test(line);

      phones.push({ number, type, dnc });
    }
  }

  return { phones, emails };
}

type Mode = 'paste' | 'manual';

export function SkipTraceInput({ propertyId, currentData, onSaved }: SkipTraceInputProps) {
  const updateProperty = useUpdateProperty();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<Mode>('paste');
  const [pasteText, setPasteText] = useState('');
  const [parsed, setParsed] = useState(false);

  const [phones, setPhones] = useState<PhoneData[]>(() =>
    phoneFields.map(f => ({
      number: (currentData as any)?.[f.numKey] || '',
      type: (currentData as any)?.[f.typeKey] || '',
      dnc: !!(currentData as any)?.[f.dncKey],
    }))
  );

  const [emails, setEmails] = useState<string[]>(() =>
    emailFields.map(f => (currentData as any)?.[f.key] || '')
  );

  const updatePhone = (idx: number, field: keyof PhoneData, value: any) => {
    setPhones(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const handleParse = () => {
    const result = parseSkipTraceText(pasteText);
    
    // Merge parsed data into existing — fill empty slots
    const newPhones = [...phones];
    let phoneIdx = 0;
    for (const p of result.phones) {
      // Find next empty slot or overwrite from start
      while (phoneIdx < 5 && newPhones[phoneIdx].number) phoneIdx++;
      if (phoneIdx >= 5) {
        // All slots full, overwrite from beginning
        phoneIdx = 0;
        for (let i = 0; i < 5; i++) {
          if (!newPhones[i].number) { phoneIdx = i; break; }
        }
        if (newPhones[phoneIdx].number) break; // truly full
      }
      newPhones[phoneIdx] = p;
      phoneIdx++;
    }
    setPhones(newPhones);

    const newEmails = [...emails];
    let emailIdx = 0;
    for (const e of result.emails) {
      while (emailIdx < 4 && newEmails[emailIdx]) emailIdx++;
      if (emailIdx >= 4) break;
      newEmails[emailIdx] = e;
      emailIdx++;
    }
    setEmails(newEmails);

    setParsed(true);
    setMode('manual'); // Switch to manual to review

    toast({
      title: 'Skip Trace parseado',
      description: `${result.phones.length} teléfonos y ${result.emails.length} emails detectados. Revisa y guarda.`,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Record<string, any> = {};

      phones.forEach((p, i) => {
        const f = phoneFields[i];
        updates[f.numKey] = p.number || null;
        updates[f.typeKey] = p.type || null;
        updates[f.dncKey] = p.dnc;
      });

      emails.forEach((email, i) => {
        updates[emailFields[i].key] = email || null;
      });

      await updateProperty.mutateAsync({ id: propertyId, ...updates });
      
      // Refresh all relevant queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['leads'] }),
        queryClient.invalidateQueries({ queryKey: ['properties'] }),
        queryClient.invalidateQueries({ queryKey: ['property', propertyId] }),
      ]);

      onSaved?.();
    } finally {
      setIsSaving(false);
    }
  };

  const hasPhoneData = phones.some(p => p.number);

  return (
    <Card variant="glass" className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <UserSearch className="h-4 w-4 text-primary" />
          Skip Trace
        </h4>
        <div className="flex gap-1">
          <Button
            variant={mode === 'paste' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => setMode('paste')}
          >
            <ClipboardPaste className="h-3 w-3 mr-1" />
            Pegar
          </Button>
          <Button
            variant={mode === 'manual' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => setMode('manual')}
          >
            <Pencil className="h-3 w-3 mr-1" />
            Manual
          </Button>
        </div>
      </div>

      {mode === 'paste' && (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Pega los datos de skip trace directamente. El sistema detecta teléfonos, tipos (Mobile/Landline), DNC y emails automáticamente.
          </div>
          <Textarea
            placeholder={`Ejemplo:\nPhone 1  (205) 835-5212  Mobile  -\nPhone 2  (205) 435-2038  Mobile  -\nPhone 3  (205) 563-2341  Mobile  DNC\nPhone 4  (205) 624-3578  Landline  -\nEmail 1  brookie80@gmail.com\nEmail 2  blkaiser4@gmail.com`}
            value={pasteText}
            onChange={e => { setPasteText(e.target.value); setParsed(false); }}
            rows={8}
            className="text-xs font-mono"
          />
          <Button 
            onClick={handleParse} 
            disabled={!pasteText.trim()}
            size="sm" 
            className="w-full"
          >
            <ClipboardPaste className="mr-2 h-4 w-4" />
            Parsear y Revisar
          </Button>
        </div>
      )}

      {mode === 'manual' && (
        <div className="space-y-3">
          {parsed && (
            <div className="flex items-center gap-2 p-2 rounded bg-primary/10 border border-primary/20 text-xs text-primary">
              <CheckCircle className="h-3 w-3" />
              Datos parseados — revisa y ajusta antes de guardar
            </div>
          )}

          {/* Phones */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Teléfonos</Label>
            {phones.map((phone, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-4 shrink-0">{idx + 1}</span>
                <Input
                  placeholder="Teléfono"
                  value={phone.number}
                  onChange={e => updatePhone(idx, 'number', e.target.value)}
                  className="flex-1 h-8 text-xs font-mono"
                />
                <Select
                  value={phone.type || 'none'}
                  onValueChange={v => updatePhone(idx, 'type', v === 'none' ? '' : v)}
                >
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="Mobile">Mobile</SelectItem>
                    <SelectItem value="Landline">Landline</SelectItem>
                    <SelectItem value="VoIP">VoIP</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Checkbox
                    checked={phone.dnc}
                    onCheckedChange={v => updatePhone(idx, 'dnc', !!v)}
                    id={`dnc-${idx}`}
                  />
                  <Label htmlFor={`dnc-${idx}`} className="text-[10px] text-destructive cursor-pointer">
                    DNC
                  </Label>
                </div>
              </div>
            ))}
          </div>

          {/* Emails */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Emails</Label>
            {emails.map((email, idx) => (
              <Input
                key={idx}
                placeholder={`Email ${idx + 1}`}
                type="email"
                value={email}
                onChange={e => {
                  const newEmails = [...emails];
                  newEmails[idx] = e.target.value;
                  setEmails(newEmails);
                }}
                className="h-8 text-xs"
              />
            ))}
          </div>

          <Button onClick={handleSave} disabled={isSaving} size="sm" className="w-full">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Skip Trace
          </Button>
        </div>
      )}
    </Card>
  );
}

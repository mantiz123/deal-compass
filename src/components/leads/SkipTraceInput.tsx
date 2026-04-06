import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateProperty } from '@/hooks/useProperties';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, UserSearch } from 'lucide-react';

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

export function SkipTraceInput({ propertyId, currentData }: SkipTraceInputProps) {
  const updateProperty = useUpdateProperty();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const [phones, setPhones] = useState(() =>
    phoneFields.map(f => ({
      number: (currentData as any)?.[f.numKey] || '',
      type: (currentData as any)?.[f.typeKey] || '',
      dnc: !!(currentData as any)?.[f.dncKey],
    }))
  );

  const [emails, setEmails] = useState(() =>
    emailFields.map(f => (currentData as any)?.[f.key] || '')
  );

  const updatePhone = (idx: number, field: 'number' | 'type' | 'dnc', value: any) => {
    setPhones(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
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
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card variant="glass" className="p-4 space-y-4">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <UserSearch className="h-4 w-4 text-primary" />
        Datos de Skip Trace
      </h4>

      {/* Phones */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Teléfonos</Label>
        {phones.map((phone, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              placeholder={`Phone ${idx + 1}`}
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
    </Card>
  );
}

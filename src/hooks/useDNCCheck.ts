import { useMemo } from 'react';
import type { Tables } from '@/integrations/supabase/types';

type Property = Tables<'properties'>;

export interface DNCStatus {
  /** Hard block: do_not_mail or is_litigator — no outreach of any kind */
  isHardBlocked: boolean;
  /** At least one phone slot has the DNC flag set */
  hasDncPhones: boolean;
  /** Which phone numbers have DNC set (for display) */
  dncPhones: string[];
  /** Human-readable reason for the block or warning */
  reason: string | null;
}

export function useDNCCheck(property: Property | null | undefined): DNCStatus {
  return useMemo(() => {
    if (!property) {
      return { isHardBlocked: false, hasDncPhones: false, dncPhones: [], reason: null };
    }

    const isHardBlocked = !!property.do_not_mail || !!property.is_litigator;

    const slots = [
      { num: property.phone_1, dnc: property.phone_1_dnc },
      { num: property.phone_2, dnc: property.phone_2_dnc },
      { num: property.phone_3, dnc: property.phone_3_dnc },
      { num: property.phone_4, dnc: property.phone_4_dnc },
      { num: property.phone_5, dnc: property.phone_5_dnc },
    ];

    const dncPhones = slots
      .filter(s => s.dnc && s.num)
      .map(s => s.num as string);

    const hasDncPhones = dncPhones.length > 0;

    let reason: string | null = null;
    if (property.is_litigator) {
      reason = 'Lead marcado como litigante — outreach bloqueado';
    } else if (property.do_not_mail) {
      reason = 'Lead marcado como Do Not Contact';
    } else if (hasDncPhones) {
      reason = `${dncPhones.length} teléfono${dncPhones.length > 1 ? 's' : ''} en lista DNC`;
    }

    return { isHardBlocked, hasDncPhones, dncPhones, reason };
  }, [
    property?.do_not_mail,
    property?.is_litigator,
    property?.phone_1_dnc, property?.phone_1,
    property?.phone_2_dnc, property?.phone_2,
    property?.phone_3_dnc, property?.phone_3,
    property?.phone_4_dnc, property?.phone_4,
    property?.phone_5_dnc, property?.phone_5,
  ]);
}

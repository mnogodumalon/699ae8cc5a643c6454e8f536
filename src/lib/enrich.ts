import type { EnrichedAnmeldungen, EnrichedKursanmeldung, EnrichedKurse } from '@/types/enriched';
import type { Anmeldungen, Dozenten, Kursanmeldung, Kurse, Raeume, Teilnehmer } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: string | undefined, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

export function enrichKurse(
  kurse: Kurse[],
  dozentenMap: Map<string, Dozenten>,
  raeumeMap: Map<string, Raeume>
): EnrichedKurse[] {
  return kurse.map(r => ({
    ...r,
    dozentName: resolveDisplay(r.fields.dozent, dozentenMap, 'vorname', 'nachname'),
    raumName: resolveDisplay(r.fields.raum, raeumeMap, 'raumname'),
  }));
}

export function enrichKursanmeldung(
  kursanmeldung: Kursanmeldung[],
  kurseMap: Map<string, Kurse>
): EnrichedKursanmeldung[] {
  return kursanmeldung.map(r => ({
    ...r,
    kursName: resolveDisplay(r.fields.kurs, kurseMap, 'titel'),
  }));
}

export function enrichAnmeldungen(
  anmeldungen: Anmeldungen[],
  teilnehmerMap: Map<string, Teilnehmer>,
  kurseMap: Map<string, Kurse>
): EnrichedAnmeldungen[] {
  return anmeldungen.map(r => ({
    ...r,
    teilnehmerName: resolveDisplay(r.fields.teilnehmer, teilnehmerMap, 'vorname', 'nachname'),
    kursName: resolveDisplay(r.fields.kurs, kurseMap, 'titel'),
  }));
}

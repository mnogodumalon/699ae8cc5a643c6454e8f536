// AUTOMATICALLY GENERATED SERVICE
import { APP_IDS, LOOKUP_OPTIONS, FIELD_TYPES } from '@/types/app';
import type { Teilnehmer, Kursanmeldung, Raeume, Kurse, Dozenten, Anmeldungen, CreateTeilnehmer, CreateKursanmeldung, CreateRaeume, CreateKurse, CreateDozenten, CreateAnmeldungen } from '@/types/app';

// Base Configuration
const API_BASE_URL = 'https://my.living-apps.de/rest';

// --- HELPER FUNCTIONS ---
export function extractRecordId(url: unknown): string | null {
  if (!url) return null;
  if (typeof url !== 'string') return null;
  const match = url.match(/([a-f0-9]{24})$/i);
  return match ? match[1] : null;
}

export function createRecordUrl(appId: string, recordId: string): string {
  return `https://my.living-apps.de/rest/apps/${appId}/records/${recordId}`;
}

async function callApi(method: string, endpoint: string, data?: any) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',  // Nutze Session Cookies für Auth
    body: data ? JSON.stringify(data) : undefined
  });
  if (!response.ok) throw new Error(await response.text());
  // DELETE returns often empty body or simple status
  if (method === 'DELETE') return true;
  return response.json();
}

/** Upload a file to LivingApps. Returns the file URL for use in record fields. */
export async function uploadFile(file: File | Blob, filename?: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file, filename ?? (file instanceof File ? file.name : 'upload'));
  const res = await fetch(`${API_BASE_URL}/files`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) throw new Error(`File upload failed: ${res.status}`);
  const data = await res.json();
  return data.url;
}

function enrichLookupFields<T extends { fields: Record<string, unknown> }>(
  records: T[], entityKey: string
): T[] {
  const opts = LOOKUP_OPTIONS[entityKey];
  if (!opts) return records;
  return records.map(r => {
    const fields = { ...r.fields };
    for (const [fieldKey, options] of Object.entries(opts)) {
      const val = fields[fieldKey];
      if (typeof val === 'string') {
        const m = options.find(o => o.key === val);
        fields[fieldKey] = m ?? { key: val, label: val };
      } else if (Array.isArray(val)) {
        fields[fieldKey] = val.map(v => {
          if (typeof v === 'string') {
            const m = options.find(o => o.key === v);
            return m ?? { key: v, label: v };
          }
          return v;
        });
      }
    }
    return { ...r, fields } as T;
  });
}

/** Normalize fields for API writes: strip lookup objects to keys, fix date formats. */
export function cleanFieldsForApi(
  fields: Record<string, unknown>,
  entityKey: string
): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...fields };
  for (const [k, v] of Object.entries(clean)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && 'key' in v) clean[k] = (v as any).key;
    if (Array.isArray(v)) clean[k] = v.map((item: any) => item && typeof item === 'object' && 'key' in item ? item.key : item);
  }
  const types = FIELD_TYPES[entityKey];
  if (types) {
    for (const [k, ft] of Object.entries(types)) {
      if (!(k in clean)) continue;
      const val = clean[k];
      // applookup fields: undefined → null (clear single reference)
      if ((ft === 'applookup/select' || ft === 'applookup/choice') && val === undefined) { clean[k] = null; continue; }
      // multipleapplookup fields: undefined/null → [] (clear multi reference)
      if ((ft === 'multipleapplookup/select' || ft === 'multipleapplookup/choice') && (val === undefined || val === null)) { clean[k] = []; continue; }
      // lookup fields: undefined → null (clear single lookup)
      if ((ft.startsWith('lookup/')) && val === undefined) { clean[k] = null; continue; }
      // multiplelookup fields: undefined/null → [] (clear multi lookup)
      if ((ft.startsWith('multiplelookup/')) && (val === undefined || val === null)) { clean[k] = []; continue; }
      if (typeof val !== 'string' || !val) continue;
      if (ft === 'date/datetimeminute') clean[k] = val.slice(0, 16);
      else if (ft === 'date/date') clean[k] = val.slice(0, 10);
    }
  }
  return clean;
}

let _cachedUserProfile: Record<string, unknown> | null = null;

export async function getUserProfile(): Promise<Record<string, unknown>> {
  if (_cachedUserProfile) return _cachedUserProfile;
  const raw = await callApi('GET', '/user');
  const skip = new Set(['id', 'image', 'lang', 'gender', 'title', 'fax', 'menus', 'initials']);
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && !skip.has(k)) data[k] = v;
  }
  _cachedUserProfile = data;
  return data;
}

export interface HeaderProfile {
  firstname: string;
  surname: string;
  email: string;
  image: string | null;
  company: string | null;
}

let _cachedHeaderProfile: HeaderProfile | null = null;

export async function getHeaderProfile(): Promise<HeaderProfile> {
  if (_cachedHeaderProfile) return _cachedHeaderProfile;
  const raw = await callApi('GET', '/user');
  _cachedHeaderProfile = {
    firstname: raw.firstname ?? '',
    surname: raw.surname ?? '',
    email: raw.email ?? '',
    image: raw.image ?? null,
    company: raw.company ?? null,
  };
  return _cachedHeaderProfile;
}

export interface AppGroupInfo {
  id: string;
  name: string;
  image: string | null;
  createdat: string;
  /** Resolved link: /objects/{id}/ if the dashboard exists, otherwise /gateway/apps/{firstAppId}?template=list_page */
  href: string;
}

let _cachedAppGroups: AppGroupInfo[] | null = null;

export async function getAppGroups(): Promise<AppGroupInfo[]> {
  if (_cachedAppGroups) return _cachedAppGroups;
  const raw = await callApi('GET', '/appgroups?with=apps');
  const groups: AppGroupInfo[] = Object.values(raw)
    .map((g: any) => {
      const firstAppId = Object.keys(g.apps ?? {})[0] ?? g.id;
      return {
        id: g.id,
        name: g.name,
        image: g.image ?? null,
        createdat: g.createdat ?? '',
        href: `/gateway/apps/${firstAppId}?template=list_page`,
        _firstAppId: firstAppId,
      };
    })
    .sort((a, b) => b.createdat.localeCompare(a.createdat));

  // Check which appgroups have a working dashboard at /objects/{id}/
  const checks = await Promise.allSettled(
    groups.map(g => fetch(`/objects/${g.id}/`, { method: 'HEAD', credentials: 'include' }))
  );
  checks.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.ok) {
      groups[i].href = `/objects/${groups[i].id}/`;
    }
  });

  // Clean up internal helper property
  groups.forEach(g => delete (g as any)._firstAppId);

  _cachedAppGroups = groups;
  return _cachedAppGroups;
}

export class LivingAppsService {
  // --- TEILNEHMER ---
  static async getTeilnehmer(): Promise<Teilnehmer[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.TEILNEHMER}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Teilnehmer[];
    return enrichLookupFields(records, 'teilnehmer');
  }
  static async getTeilnehmerEntry(id: string): Promise<Teilnehmer | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.TEILNEHMER}/records/${id}`);
    const record = { record_id: data.id, ...data } as Teilnehmer;
    return enrichLookupFields([record], 'teilnehmer')[0];
  }
  static async createTeilnehmerEntry(fields: CreateTeilnehmer) {
    return callApi('POST', `/apps/${APP_IDS.TEILNEHMER}/records`, { fields: cleanFieldsForApi(fields as any, 'teilnehmer') });
  }
  static async updateTeilnehmerEntry(id: string, fields: Partial<CreateTeilnehmer>) {
    return callApi('PATCH', `/apps/${APP_IDS.TEILNEHMER}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'teilnehmer') });
  }
  static async deleteTeilnehmerEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.TEILNEHMER}/records/${id}`);
  }

  // --- KURSANMELDUNG ---
  static async getKursanmeldung(): Promise<Kursanmeldung[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.KURSANMELDUNG}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Kursanmeldung[];
    return enrichLookupFields(records, 'kursanmeldung');
  }
  static async getKursanmeldungEntry(id: string): Promise<Kursanmeldung | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.KURSANMELDUNG}/records/${id}`);
    const record = { record_id: data.id, ...data } as Kursanmeldung;
    return enrichLookupFields([record], 'kursanmeldung')[0];
  }
  static async createKursanmeldungEntry(fields: CreateKursanmeldung) {
    return callApi('POST', `/apps/${APP_IDS.KURSANMELDUNG}/records`, { fields: cleanFieldsForApi(fields as any, 'kursanmeldung') });
  }
  static async updateKursanmeldungEntry(id: string, fields: Partial<CreateKursanmeldung>) {
    return callApi('PATCH', `/apps/${APP_IDS.KURSANMELDUNG}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'kursanmeldung') });
  }
  static async deleteKursanmeldungEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.KURSANMELDUNG}/records/${id}`);
  }

  // --- RAEUME ---
  static async getRaeume(): Promise<Raeume[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.RAEUME}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Raeume[];
    return enrichLookupFields(records, 'raeume');
  }
  static async getRaeumeEntry(id: string): Promise<Raeume | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.RAEUME}/records/${id}`);
    const record = { record_id: data.id, ...data } as Raeume;
    return enrichLookupFields([record], 'raeume')[0];
  }
  static async createRaeumeEntry(fields: CreateRaeume) {
    return callApi('POST', `/apps/${APP_IDS.RAEUME}/records`, { fields: cleanFieldsForApi(fields as any, 'raeume') });
  }
  static async updateRaeumeEntry(id: string, fields: Partial<CreateRaeume>) {
    return callApi('PATCH', `/apps/${APP_IDS.RAEUME}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'raeume') });
  }
  static async deleteRaeumeEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.RAEUME}/records/${id}`);
  }

  // --- KURSE ---
  static async getKurse(): Promise<Kurse[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.KURSE}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Kurse[];
    return enrichLookupFields(records, 'kurse');
  }
  static async getKurseEntry(id: string): Promise<Kurse | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.KURSE}/records/${id}`);
    const record = { record_id: data.id, ...data } as Kurse;
    return enrichLookupFields([record], 'kurse')[0];
  }
  static async createKurseEntry(fields: CreateKurse) {
    return callApi('POST', `/apps/${APP_IDS.KURSE}/records`, { fields: cleanFieldsForApi(fields as any, 'kurse') });
  }
  static async updateKurseEntry(id: string, fields: Partial<CreateKurse>) {
    return callApi('PATCH', `/apps/${APP_IDS.KURSE}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'kurse') });
  }
  static async deleteKurseEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.KURSE}/records/${id}`);
  }

  // --- DOZENTEN ---
  static async getDozenten(): Promise<Dozenten[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.DOZENTEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Dozenten[];
    return enrichLookupFields(records, 'dozenten');
  }
  static async getDozentenEntry(id: string): Promise<Dozenten | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.DOZENTEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Dozenten;
    return enrichLookupFields([record], 'dozenten')[0];
  }
  static async createDozentenEntry(fields: CreateDozenten) {
    return callApi('POST', `/apps/${APP_IDS.DOZENTEN}/records`, { fields: cleanFieldsForApi(fields as any, 'dozenten') });
  }
  static async updateDozentenEntry(id: string, fields: Partial<CreateDozenten>) {
    return callApi('PATCH', `/apps/${APP_IDS.DOZENTEN}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'dozenten') });
  }
  static async deleteDozentenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.DOZENTEN}/records/${id}`);
  }

  // --- ANMELDUNGEN ---
  static async getAnmeldungen(): Promise<Anmeldungen[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.ANMELDUNGEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Anmeldungen[];
    return enrichLookupFields(records, 'anmeldungen');
  }
  static async getAnmeldungenEntry(id: string): Promise<Anmeldungen | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.ANMELDUNGEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Anmeldungen;
    return enrichLookupFields([record], 'anmeldungen')[0];
  }
  static async createAnmeldungenEntry(fields: CreateAnmeldungen) {
    return callApi('POST', `/apps/${APP_IDS.ANMELDUNGEN}/records`, { fields: cleanFieldsForApi(fields as any, 'anmeldungen') });
  }
  static async updateAnmeldungenEntry(id: string, fields: Partial<CreateAnmeldungen>) {
    return callApi('PATCH', `/apps/${APP_IDS.ANMELDUNGEN}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'anmeldungen') });
  }
  static async deleteAnmeldungenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.ANMELDUNGEN}/records/${id}`);
  }

}
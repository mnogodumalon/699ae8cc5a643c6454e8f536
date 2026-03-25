// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Teilnehmer {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    geburtsdatum?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export interface Kursanmeldung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kurs?: string; // applookup -> URL zu 'Kurse' Record
    teilnehmer_vorname?: string;
    teilnehmer_nachname?: string;
    teilnehmer_email?: string;
    teilnehmer_telefon?: string;
    teilnehmer_geburtsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    anmeldedatum?: string; // Format: YYYY-MM-DD oder ISO String
    bezahlt?: boolean;
  };
}

export interface Raeume {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    raumname?: string;
    gebaeude?: string;
    kapazitaet?: number;
  };
}

export interface Kurse {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    beschreibung?: string;
    startdatum?: string; // Format: YYYY-MM-DD oder ISO String
    enddatum?: string; // Format: YYYY-MM-DD oder ISO String
    max_teilnehmer?: number;
    preis?: number;
    dozent?: string; // applookup -> URL zu 'Dozenten' Record
    raum?: string; // applookup -> URL zu 'Raeume' Record
  };
}

export interface Dozenten {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    fachgebiet?: string;
  };
}

export interface Anmeldungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    teilnehmer?: string; // applookup -> URL zu 'Teilnehmer' Record
    kurs?: string; // applookup -> URL zu 'Kurse' Record
    anmeldedatum?: string; // Format: YYYY-MM-DD oder ISO String
    bezahlt?: boolean;
  };
}

export const APP_IDS = {
  TEILNEHMER: '699ae8b1c9d1cbfb6fca882e',
  KURSANMELDUNG: '699ae8b2260a2e5209ebfa1f',
  RAEUME: '699ae8b09300bacb8903a84c',
  KURSE: '699ae8b18700a39d668ef868',
  DOZENTEN: '699ae8aa3c91c2ef115da050',
  ANMELDUNGEN: '699ae8b2ae2a43295a0c2d3a',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'teilnehmer': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'geburtsdatum': 'date/date',
  },
  'kursanmeldung': {
    'kurs': 'applookup/select',
    'teilnehmer_vorname': 'string/text',
    'teilnehmer_nachname': 'string/text',
    'teilnehmer_email': 'string/email',
    'teilnehmer_telefon': 'string/tel',
    'teilnehmer_geburtsdatum': 'date/date',
    'anmeldedatum': 'date/date',
    'bezahlt': 'bool',
  },
  'raeume': {
    'raumname': 'string/text',
    'gebaeude': 'string/text',
    'kapazitaet': 'number',
  },
  'kurse': {
    'titel': 'string/text',
    'beschreibung': 'string/textarea',
    'startdatum': 'date/date',
    'enddatum': 'date/date',
    'max_teilnehmer': 'number',
    'preis': 'number',
    'dozent': 'applookup/select',
    'raum': 'applookup/select',
  },
  'dozenten': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'fachgebiet': 'string/text',
  },
  'anmeldungen': {
    'teilnehmer': 'applookup/select',
    'kurs': 'applookup/select',
    'anmeldedatum': 'date/date',
    'bezahlt': 'bool',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateTeilnehmer = StripLookup<Teilnehmer['fields']>;
export type CreateKursanmeldung = StripLookup<Kursanmeldung['fields']>;
export type CreateRaeume = StripLookup<Raeume['fields']>;
export type CreateKurse = StripLookup<Kurse['fields']>;
export type CreateDozenten = StripLookup<Dozenten['fields']>;
export type CreateAnmeldungen = StripLookup<Anmeldungen['fields']>;
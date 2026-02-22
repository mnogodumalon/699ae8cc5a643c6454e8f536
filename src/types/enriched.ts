import type { Anmeldungen, Kursanmeldung, Kurse } from './app';

export type EnrichedKurse = Kurse & {
  dozentName: string;
  raumName: string;
};

export type EnrichedKursanmeldung = Kursanmeldung & {
  kursName: string;
};

export type EnrichedAnmeldungen = Anmeldungen & {
  teilnehmerName: string;
  kursName: string;
};

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Kurse, Teilnehmer, Kursanmeldung, Dozenten, Raeume, Anmeldungen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [kurse, setKurse] = useState<Kurse[]>([]);
  const [teilnehmer, setTeilnehmer] = useState<Teilnehmer[]>([]);
  const [kursanmeldung, setKursanmeldung] = useState<Kursanmeldung[]>([]);
  const [dozenten, setDozenten] = useState<Dozenten[]>([]);
  const [raeume, setRaeume] = useState<Raeume[]>([]);
  const [anmeldungen, setAnmeldungen] = useState<Anmeldungen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [kurseData, teilnehmerData, kursanmeldungData, dozentenData, raeumeData, anmeldungenData] = await Promise.all([
        LivingAppsService.getKurse(),
        LivingAppsService.getTeilnehmer(),
        LivingAppsService.getKursanmeldung(),
        LivingAppsService.getDozenten(),
        LivingAppsService.getRaeume(),
        LivingAppsService.getAnmeldungen(),
      ]);
      setKurse(kurseData);
      setTeilnehmer(teilnehmerData);
      setKursanmeldung(kursanmeldungData);
      setDozenten(dozentenData);
      setRaeume(raeumeData);
      setAnmeldungen(anmeldungenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const kurseMap = useMemo(() => {
    const m = new Map<string, Kurse>();
    kurse.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kurse]);

  const teilnehmerMap = useMemo(() => {
    const m = new Map<string, Teilnehmer>();
    teilnehmer.forEach(r => m.set(r.record_id, r));
    return m;
  }, [teilnehmer]);

  const dozentenMap = useMemo(() => {
    const m = new Map<string, Dozenten>();
    dozenten.forEach(r => m.set(r.record_id, r));
    return m;
  }, [dozenten]);

  const raeumeMap = useMemo(() => {
    const m = new Map<string, Raeume>();
    raeume.forEach(r => m.set(r.record_id, r));
    return m;
  }, [raeume]);

  return { kurse, setKurse, teilnehmer, setTeilnehmer, kursanmeldung, setKursanmeldung, dozenten, setDozenten, raeume, setRaeume, anmeldungen, setAnmeldungen, loading, error, fetchAll, kurseMap, teilnehmerMap, dozentenMap, raeumeMap };
}
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Teilnehmer, Kursanmeldung, Raeume, Kurse, Dozenten, Anmeldungen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [teilnehmer, setTeilnehmer] = useState<Teilnehmer[]>([]);
  const [kursanmeldung, setKursanmeldung] = useState<Kursanmeldung[]>([]);
  const [raeume, setRaeume] = useState<Raeume[]>([]);
  const [kurse, setKurse] = useState<Kurse[]>([]);
  const [dozenten, setDozenten] = useState<Dozenten[]>([]);
  const [anmeldungen, setAnmeldungen] = useState<Anmeldungen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [teilnehmerData, kursanmeldungData, raeumeData, kurseData, dozentenData, anmeldungenData] = await Promise.all([
        LivingAppsService.getTeilnehmer(),
        LivingAppsService.getKursanmeldung(),
        LivingAppsService.getRaeume(),
        LivingAppsService.getKurse(),
        LivingAppsService.getDozenten(),
        LivingAppsService.getAnmeldungen(),
      ]);
      setTeilnehmer(teilnehmerData);
      setKursanmeldung(kursanmeldungData);
      setRaeume(raeumeData);
      setKurse(kurseData);
      setDozenten(dozentenData);
      setAnmeldungen(anmeldungenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [teilnehmerData, kursanmeldungData, raeumeData, kurseData, dozentenData, anmeldungenData] = await Promise.all([
          LivingAppsService.getTeilnehmer(),
          LivingAppsService.getKursanmeldung(),
          LivingAppsService.getRaeume(),
          LivingAppsService.getKurse(),
          LivingAppsService.getDozenten(),
          LivingAppsService.getAnmeldungen(),
        ]);
        setTeilnehmer(teilnehmerData);
        setKursanmeldung(kursanmeldungData);
        setRaeume(raeumeData);
        setKurse(kurseData);
        setDozenten(dozentenData);
        setAnmeldungen(anmeldungenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const teilnehmerMap = useMemo(() => {
    const m = new Map<string, Teilnehmer>();
    teilnehmer.forEach(r => m.set(r.record_id, r));
    return m;
  }, [teilnehmer]);

  const raeumeMap = useMemo(() => {
    const m = new Map<string, Raeume>();
    raeume.forEach(r => m.set(r.record_id, r));
    return m;
  }, [raeume]);

  const kurseMap = useMemo(() => {
    const m = new Map<string, Kurse>();
    kurse.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kurse]);

  const dozentenMap = useMemo(() => {
    const m = new Map<string, Dozenten>();
    dozenten.forEach(r => m.set(r.record_id, r));
    return m;
  }, [dozenten]);

  return { teilnehmer, setTeilnehmer, kursanmeldung, setKursanmeldung, raeume, setRaeume, kurse, setKurse, dozenten, setDozenten, anmeldungen, setAnmeldungen, loading, error, fetchAll, teilnehmerMap, raeumeMap, kurseMap, dozentenMap };
}
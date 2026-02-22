import { useState, useEffect, useMemo } from 'react';
import type { Kurse, Dozenten, Raeume } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import { format, parseISO, isBefore, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  BookOpen, Users, Euro, MapPin, Calendar, ChevronRight, Plus, CheckCircle2,
  Clock, AlertCircle, X, Edit2, Trash2, GraduationCap, Search,
  UserPlus, Check, ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | undefined | null): string {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

function formatCurrency(v: number | null | undefined): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);
}

function getCourseStatus(kurs: Kurse): 'upcoming' | 'active' | 'past' {
  const now = new Date();
  const start = kurs.fields.startdatum ? parseISO(kurs.fields.startdatum) : null;
  const end = kurs.fields.enddatum ? parseISO(kurs.fields.enddatum) : null;
  if (!start) return 'upcoming';
  if (end && isBefore(end, now)) return 'past';
  if (isBefore(start, now) || isToday(start)) return 'active';
  return 'upcoming';
}

// ── types ─────────────────────────────────────────────────────────────────────

interface AnmeldungForm {
  teilnehmer_vorname: string;
  teilnehmer_nachname: string;
  teilnehmer_email: string;
  teilnehmer_telefon: string;
  anmeldedatum: string;
  bezahlt: boolean;
  kurs: string;
}

const emptyAnmeldungForm = (kursId?: string): AnmeldungForm => ({
  teilnehmer_vorname: '',
  teilnehmer_nachname: '',
  teilnehmer_email: '',
  teilnehmer_telefon: '',
  anmeldedatum: format(new Date(), 'yyyy-MM-dd'),
  bezahlt: false,
  kurs: kursId ? createRecordUrl(APP_IDS.KURSANMELDUNG, kursId) : '',
});

// ── sub-components ────────────────────────────────────────────────────────────

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="rounded-xl border bg-card p-5 space-y-3" style={{ boxShadow: 'var(--shadow-card)' }}>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function DashboardOverview() {
  const [kurse, setKurse] = useState<Kurse[]>([]);
  const [dozenten, setDozenten] = useState<Dozenten[]>([]);
  const [raeume, setRaeume] = useState<Raeume[]>([]);
  const [kursanmeldungen, setKursanmeldungen] = useState<import('@/types/app').Kursanmeldung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [selectedKurs, setSelectedKurs] = useState<Kurse | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'active' | 'past'>('all');
  const [search, setSearch] = useState('');

  // Dialog state
  const [showAnmeldungDialog, setShowAnmeldungDialog] = useState(false);
  const [editingAnmeldung, setEditingAnmeldung] = useState<import('@/types/app').Kursanmeldung | null>(null);
  const [anmeldungForm, setAnmeldungForm] = useState<AnmeldungForm>(emptyAnmeldungForm());
  const [deleteAnmeldungId, setDeleteAnmeldungId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Kurs dialog
  const [showKursDialog, setShowKursDialog] = useState(false);
  const [editingKurs, setEditingKurs] = useState<Kurse | null>(null);
  const [kursForm, setKursForm] = useState({
    titel: '', beschreibung: '', startdatum: '', enddatum: '',
    max_teilnehmer: '', preis: '', dozent: 'none', raum: 'none',
  });
  const [deleteKursId, setDeleteKursId] = useState<string | null>(null);

  // ── fetch ──────────────────────────────────────────────────────────────────

  async function loadAll() {
    try {
      const [k, d, r, ka] = await Promise.all([
        LivingAppsService.getKurse(),
        LivingAppsService.getDozenten(),
        LivingAppsService.getRaeume(),
        LivingAppsService.getKursanmeldung(),
      ]);
      setKurse(k);
      setDozenten(d);
      setRaeume(r);
      setKursanmeldungen(ka);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  // ── lookup maps ────────────────────────────────────────────────────────────

  const dozentenMap = useMemo(() => {
    const m = new Map<string, Dozenten>();
    dozenten.forEach(d => m.set(d.record_id, d));
    return m;
  }, [dozenten]);

  const raeumeMap = useMemo(() => {
    const m = new Map<string, Raeume>();
    raeume.forEach(r => m.set(r.record_id, r));
    return m;
  }, [raeume]);

  // registrations per course (Kursanmeldung references Kurse via applookup)
  const anmeldungenByKurs = useMemo(() => {
    const m = new Map<string, import('@/types/app').Kursanmeldung[]>();
    kursanmeldungen.forEach(a => {
      const kid = extractRecordId(a.fields.kurs);
      if (!kid) return;
      if (!m.has(kid)) m.set(kid, []);
      m.get(kid)!.push(a);
    });
    return m;
  }, [kursanmeldungen]);

  // ── derived/filtered ───────────────────────────────────────────────────────

  const filteredKurse = useMemo(() => {
    let list = kurse;
    if (filter !== 'all') list = list.filter(k => getCourseStatus(k) === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(k =>
        k.fields.titel?.toLowerCase().includes(q) ||
        k.fields.beschreibung?.toLowerCase().includes(q)
      );
    }
    // sort: active first, then upcoming, then past
    const order = { active: 0, upcoming: 1, past: 2 };
    return [...list].sort((a, b) => order[getCourseStatus(a)] - order[getCourseStatus(b)]);
  }, [kurse, filter, search]);

  const statsOverall = useMemo(() => {
    const total = kurse.length;
    const active = kurse.filter(k => getCourseStatus(k) === 'active').length;
    const totalAnmeldungen = kursanmeldungen.length;
    const bezahlt = kursanmeldungen.filter(a => a.fields.bezahlt).length;
    return { total, active, totalAnmeldungen, bezahlt };
  }, [kurse, kursanmeldungen]);

  // ── kurs CRUD ──────────────────────────────────────────────────────────────

  function openCreateKurs() {
    setEditingKurs(null);
    setKursForm({ titel: '', beschreibung: '', startdatum: '', enddatum: '', max_teilnehmer: '', preis: '', dozent: 'none', raum: 'none' });
    setShowKursDialog(true);
  }

  function openEditKurs(k: Kurse, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingKurs(k);
    const dozId = extractRecordId(k.fields.dozent);
    const raumId = extractRecordId(k.fields.raum);
    setKursForm({
      titel: k.fields.titel ?? '',
      beschreibung: k.fields.beschreibung ?? '',
      startdatum: k.fields.startdatum ?? '',
      enddatum: k.fields.enddatum ?? '',
      max_teilnehmer: k.fields.max_teilnehmer != null ? String(k.fields.max_teilnehmer) : '',
      preis: k.fields.preis != null ? String(k.fields.preis) : '',
      dozent: dozId ?? 'none',
      raum: raumId ?? 'none',
    });
    setShowKursDialog(true);
  }

  async function saveKurs() {
    setSaving(true);
    try {
      const fields: Kurse['fields'] = {
        titel: kursForm.titel || undefined,
        beschreibung: kursForm.beschreibung || undefined,
        startdatum: kursForm.startdatum || undefined,
        enddatum: kursForm.enddatum || undefined,
        max_teilnehmer: kursForm.max_teilnehmer ? Number(kursForm.max_teilnehmer) : undefined,
        preis: kursForm.preis ? Number(kursForm.preis) : undefined,
        dozent: kursForm.dozent !== 'none' ? createRecordUrl(APP_IDS.DOZENTEN, kursForm.dozent) : undefined,
        raum: kursForm.raum !== 'none' ? createRecordUrl(APP_IDS.RAEUME, kursForm.raum) : undefined,
      };
      if (editingKurs) {
        await LivingAppsService.updateKurseEntry(editingKurs.record_id, fields);
      } else {
        await LivingAppsService.createKurseEntry(fields);
      }
      await loadAll();
      setShowKursDialog(false);
    } catch (e) {
      alert('Fehler beim Speichern: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  async function deleteKurs() {
    if (!deleteKursId) return;
    setSaving(true);
    try {
      await LivingAppsService.deleteKurseEntry(deleteKursId);
      if (selectedKurs?.record_id === deleteKursId) setSelectedKurs(null);
      await loadAll();
      setDeleteKursId(null);
    } catch (e) {
      alert('Fehler beim Löschen: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  // ── anmeldung CRUD ─────────────────────────────────────────────────────────

  function openCreateAnmeldung() {
    if (!selectedKurs) return;
    setEditingAnmeldung(null);
    setAnmeldungForm({ ...emptyAnmeldungForm(selectedKurs.record_id), kurs: createRecordUrl(APP_IDS.KURSE, selectedKurs.record_id) });
    setShowAnmeldungDialog(true);
  }

  function openEditAnmeldung(a: import('@/types/app').Kursanmeldung) {
    setEditingAnmeldung(a);
    setAnmeldungForm({
      teilnehmer_vorname: a.fields.teilnehmer_vorname ?? '',
      teilnehmer_nachname: a.fields.teilnehmer_nachname ?? '',
      teilnehmer_email: a.fields.teilnehmer_email ?? '',
      teilnehmer_telefon: a.fields.teilnehmer_telefon ?? '',
      anmeldedatum: a.fields.anmeldedatum ?? format(new Date(), 'yyyy-MM-dd'),
      bezahlt: a.fields.bezahlt ?? false,
      kurs: a.fields.kurs ?? '',
    });
    setShowAnmeldungDialog(true);
  }

  async function saveAnmeldung() {
    setSaving(true);
    try {
      const fields: import('@/types/app').Kursanmeldung['fields'] = {
        kurs: anmeldungForm.kurs || undefined,
        teilnehmer_vorname: anmeldungForm.teilnehmer_vorname || undefined,
        teilnehmer_nachname: anmeldungForm.teilnehmer_nachname || undefined,
        teilnehmer_email: anmeldungForm.teilnehmer_email || undefined,
        teilnehmer_telefon: anmeldungForm.teilnehmer_telefon || undefined,
        anmeldedatum: anmeldungForm.anmeldedatum || undefined,
        bezahlt: anmeldungForm.bezahlt,
      };
      if (editingAnmeldung) {
        await LivingAppsService.updateKursanmeldungEntry(editingAnmeldung.record_id, fields);
      } else {
        await LivingAppsService.createKursanmeldungEntry(fields);
      }
      await loadAll();
      setShowAnmeldungDialog(false);
    } catch (e) {
      alert('Fehler beim Speichern: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  async function deleteAnmeldung() {
    if (!deleteAnmeldungId) return;
    setSaving(true);
    try {
      await LivingAppsService.deleteKursanmeldungEntry(deleteAnmeldungId);
      await loadAll();
      setDeleteAnmeldungId(null);
    } catch (e) {
      alert('Fehler beim Löschen: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  // ── derived for selected course ────────────────────────────────────────────

  const selectedAnmeldungen = selectedKurs ? (anmeldungenByKurs.get(selectedKurs.record_id) ?? []) : [];
  const selectedDozent = selectedKurs ? dozentenMap.get(extractRecordId(selectedKurs.fields.dozent) ?? '') : undefined;
  const selectedRaum = selectedKurs ? raeumeMap.get(extractRecordId(selectedKurs.fields.raum) ?? '') : undefined;

  // ── render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <SkeletonCards />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="text-destructive" size={40} />
        <p className="text-lg font-semibold text-foreground">Fehler beim Laden</p>
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button onClick={() => { setError(null); setLoading(true); loadAll(); }}>Erneut versuchen</Button>
      </div>
    );
  }

  const statusConfig = {
    active: { label: 'Laufend', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    upcoming: { label: 'Bevorstehend', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    past: { label: 'Abgeschlossen', color: 'bg-gray-100 text-gray-500 border-gray-200' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-800 tracking-tight text-foreground">Kursübersicht</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {statsOverall.total} Kurse · {statsOverall.totalAnmeldungen} Anmeldungen
          </p>
        </div>
        <Button onClick={openCreateKurs} className="gap-2 shrink-0" style={{ background: 'var(--gradient-primary)' }}>
          <Plus size={16} />
          Neuer Kurs
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Aktive Kurse', value: statsOverall.active, icon: BookOpen, accent: 'text-primary' },
          { label: 'Gesamt Kurse', value: statsOverall.total, icon: Calendar, accent: 'text-violet-600' },
          { label: 'Anmeldungen', value: statsOverall.totalAnmeldungen, icon: Users, accent: 'text-amber-600' },
          { label: 'Bezahlt', value: statsOverall.bezahlt, icon: CheckCircle2, accent: 'text-emerald-600' },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="rounded-xl border bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={15} className={accent} />
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </div>
            <p className="text-2xl font-700 text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Filter + Search bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Kurs suchen…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'active', 'upcoming', 'past'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                filter === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {f === 'all' ? 'Alle' : statusConfig[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* Main workspace: course grid + detail panel */}
      <div className="flex gap-5 items-start">
        {/* Course cards */}
        <div className={`flex-1 min-w-0 ${selectedKurs ? 'xl:w-auto' : ''}`}>
          {filteredKurse.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
              <BookOpen size={36} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-foreground">Keine Kurse gefunden</p>
              <p className="text-sm text-muted-foreground mt-1">Erstelle deinen ersten Kurs oder passe den Filter an.</p>
              <Button className="mt-4" onClick={openCreateKurs}>
                <Plus size={15} className="mr-2" />
                Kurs erstellen
              </Button>
            </div>
          ) : (
            <div className={`grid gap-3 ${selectedKurs ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
              {filteredKurse.map(kurs => {
                const status = getCourseStatus(kurs);
                const sc = statusConfig[status];
                const regs = anmeldungenByKurs.get(kurs.record_id) ?? [];
                const max = kurs.fields.max_teilnehmer ?? 0;
                const fillPct = max > 0 ? Math.min(100, (regs.length / max) * 100) : 0;
                const bezahltCount = regs.filter(a => a.fields.bezahlt).length;
                const doz = dozentenMap.get(extractRecordId(kurs.fields.dozent) ?? '');
                const raum = raeumeMap.get(extractRecordId(kurs.fields.raum) ?? '');
                const isSelected = selectedKurs?.record_id === kurs.record_id;

                return (
                  <div
                    key={kurs.record_id}
                    onClick={() => setSelectedKurs(isSelected ? null : kurs)}
                    className={`rounded-xl border bg-card p-5 cursor-pointer transition-all group ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/40 hover:shadow-md'
                    }`}
                    style={{ boxShadow: 'var(--shadow-card)' }}
                  >
                    {/* top row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border mb-2 ${sc.color}`}>
                          {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                          {sc.label}
                        </span>
                        <h3 className="font-700 text-base text-foreground leading-snug truncate">
                          {kurs.fields.titel ?? 'Unbenannter Kurs'}
                        </h3>
                        {kurs.fields.beschreibung && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{kurs.fields.beschreibung}</p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={e => openEditKurs(kurs, e)}
                          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          title="Bearbeiten"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteKursId(kurs.record_id); }}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Löschen"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* meta */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
                      {(kurs.fields.startdatum || kurs.fields.enddatum) && (
                        <div className="flex items-center gap-1 col-span-2">
                          <Calendar size={11} />
                          <span>{formatDate(kurs.fields.startdatum)} – {formatDate(kurs.fields.enddatum)}</span>
                        </div>
                      )}
                      {doz && (
                        <div className="flex items-center gap-1">
                          <GraduationCap size={11} />
                          <span className="truncate">{doz.fields.vorname} {doz.fields.nachname}</span>
                        </div>
                      )}
                      {raum && (
                        <div className="flex items-center gap-1">
                          <MapPin size={11} />
                          <span className="truncate">{raum.fields.raumname}</span>
                        </div>
                      )}
                      {kurs.fields.preis != null && (
                        <div className="flex items-center gap-1">
                          <Euro size={11} />
                          <span>{formatCurrency(kurs.fields.preis)}</span>
                        </div>
                      )}
                    </div>

                    {/* capacity bar */}
                    {max > 0 && (
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{regs.length} / {max} Teilnehmer</span>
                          <span className="text-emerald-600 font-medium">{bezahltCount} bezahlt</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${fillPct}%`,
                              background: fillPct >= 100 ? 'oklch(0.577 0.245 27.325)' : fillPct >= 75 ? 'oklch(0.70 0.18 60)' : 'var(--primary)',
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex gap-1.5">
                        <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          <Users size={10} />
                          {regs.length}
                        </span>
                        {bezahltCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                            <CheckCircle2 size={10} />
                            {bezahltCount}
                          </span>
                        )}
                      </div>
                      <ChevronRight size={14} className={`text-muted-foreground transition-transform ${isSelected ? 'rotate-90 text-primary' : ''}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedKurs && (
          <div
            className="w-full xl:w-[380px] shrink-0 rounded-xl border bg-card overflow-hidden"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            {/* Panel header */}
            <div className="px-5 py-4 border-b" style={{ background: 'var(--gradient-primary)' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-primary-foreground/70 mb-0.5">Kursdetails</p>
                  <h2 className="font-700 text-base text-primary-foreground leading-tight">
                    {selectedKurs.fields.titel ?? 'Kurs'}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedKurs(null)}
                  className="p-1 rounded-md text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Course meta */}
            <div className="px-5 py-4 border-b space-y-2 text-sm">
              {(selectedKurs.fields.startdatum || selectedKurs.fields.enddatum) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar size={13} className="shrink-0 text-primary" />
                  <span>{formatDate(selectedKurs.fields.startdatum)} – {formatDate(selectedKurs.fields.enddatum)}</span>
                </div>
              )}
              {selectedDozent && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GraduationCap size={13} className="shrink-0 text-primary" />
                  <span>{selectedDozent.fields.vorname} {selectedDozent.fields.nachname}</span>
                  {selectedDozent.fields.fachgebiet && <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{selectedDozent.fields.fachgebiet}</span>}
                </div>
              )}
              {selectedRaum && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin size={13} className="shrink-0 text-primary" />
                  <span>{selectedRaum.fields.raumname}</span>
                  {selectedRaum.fields.gebaeude && <span className="text-muted-foreground/60">· {selectedRaum.fields.gebaeude}</span>}
                </div>
              )}
              {selectedKurs.fields.preis != null && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Euro size={13} className="shrink-0 text-primary" />
                  <span>{formatCurrency(selectedKurs.fields.preis)}</span>
                </div>
              )}
              {selectedKurs.fields.max_teilnehmer != null && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users size={13} className="shrink-0 text-primary" />
                  <span>{selectedAnmeldungen.length} / {selectedKurs.fields.max_teilnehmer} Plätze belegt</span>
                </div>
              )}
            </div>

            {/* Registrations list */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-600 text-foreground flex items-center gap-1.5">
                  <ClipboardList size={14} className="text-primary" />
                  Anmeldungen
                  <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full font-semibold">
                    {selectedAnmeldungen.length}
                  </span>
                </h3>
                <Button size="sm" variant="outline" onClick={openCreateAnmeldung} className="gap-1 h-7 text-xs">
                  <UserPlus size={12} />
                  Anmelden
                </Button>
              </div>

              {selectedAnmeldungen.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Noch keine Anmeldungen</p>
                  <button onClick={openCreateAnmeldung} className="text-xs text-primary mt-1 hover:underline">
                    Erste Anmeldung hinzufügen
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {selectedAnmeldungen.map(a => (
                    <div
                      key={a.record_id}
                      className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-accent/50 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-foreground truncate">
                            {a.fields.teilnehmer_vorname} {a.fields.teilnehmer_nachname}
                          </p>
                          {a.fields.bezahlt ? (
                            <Check size={12} className="shrink-0 text-emerald-600" />
                          ) : (
                            <Clock size={12} className="shrink-0 text-amber-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{a.fields.teilnehmer_email}</p>
                        {a.fields.anmeldedatum && (
                          <p className="text-xs text-muted-foreground/60">{formatDate(a.fields.anmeldedatum)}</p>
                        )}
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => openEditAnmeldung(a)}
                          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => setDeleteAnmeldungId(a.record_id)}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Kurs Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={showKursDialog} onOpenChange={setShowKursDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingKurs ? 'Kurs bearbeiten' : 'Neuen Kurs erstellen'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="k-titel">Kurstitel</Label>
              <Input
                id="k-titel"
                value={kursForm.titel}
                onChange={e => setKursForm(f => ({ ...f, titel: e.target.value }))}
                placeholder="z.B. Grundlagen der Programmierung"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="k-beschr">Beschreibung</Label>
              <textarea
                id="k-beschr"
                value={kursForm.beschreibung}
                onChange={e => setKursForm(f => ({ ...f, beschreibung: e.target.value }))}
                placeholder="Kurze Beschreibung des Kursinhalts"
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="k-start">Startdatum</Label>
                <Input
                  id="k-start"
                  type="date"
                  value={kursForm.startdatum}
                  onChange={e => setKursForm(f => ({ ...f, startdatum: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="k-end">Enddatum</Label>
                <Input
                  id="k-end"
                  type="date"
                  value={kursForm.enddatum}
                  onChange={e => setKursForm(f => ({ ...f, enddatum: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="k-max">Max. Teilnehmer</Label>
                <Input
                  id="k-max"
                  type="number"
                  min="1"
                  value={kursForm.max_teilnehmer}
                  onChange={e => setKursForm(f => ({ ...f, max_teilnehmer: e.target.value }))}
                  placeholder="20"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="k-preis">Preis (EUR)</Label>
                <Input
                  id="k-preis"
                  type="number"
                  min="0"
                  step="0.01"
                  value={kursForm.preis}
                  onChange={e => setKursForm(f => ({ ...f, preis: e.target.value }))}
                  placeholder="199.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dozent</Label>
                <Select value={kursForm.dozent} onValueChange={v => setKursForm(f => ({ ...f, dozent: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Dozent wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kein Dozent</SelectItem>
                    {dozenten.map(d => (
                      <SelectItem key={d.record_id} value={d.record_id}>
                        {d.fields.vorname} {d.fields.nachname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Raum</Label>
                <Select value={kursForm.raum} onValueChange={v => setKursForm(f => ({ ...f, raum: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Raum wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kein Raum</SelectItem>
                    {raeume.map(r => (
                      <SelectItem key={r.record_id} value={r.record_id}>
                        {r.fields.raumname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKursDialog(false)}>Abbrechen</Button>
            <Button onClick={saveKurs} disabled={saving || !kursForm.titel.trim()}>
              {saving ? 'Speichert…' : editingKurs ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Anmeldung Dialog ────────────────────────────────────────────────── */}
      <Dialog open={showAnmeldungDialog} onOpenChange={setShowAnmeldungDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAnmeldung ? 'Anmeldung bearbeiten' : 'Neue Anmeldung'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="a-vn">Vorname</Label>
                <Input
                  id="a-vn"
                  value={anmeldungForm.teilnehmer_vorname}
                  onChange={e => setAnmeldungForm(f => ({ ...f, teilnehmer_vorname: e.target.value }))}
                  placeholder="Max"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-nn">Nachname</Label>
                <Input
                  id="a-nn"
                  value={anmeldungForm.teilnehmer_nachname}
                  onChange={e => setAnmeldungForm(f => ({ ...f, teilnehmer_nachname: e.target.value }))}
                  placeholder="Mustermann"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-email">E-Mail</Label>
              <Input
                id="a-email"
                type="email"
                value={anmeldungForm.teilnehmer_email}
                onChange={e => setAnmeldungForm(f => ({ ...f, teilnehmer_email: e.target.value }))}
                placeholder="max@beispiel.de"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-tel">Telefon</Label>
              <Input
                id="a-tel"
                type="tel"
                value={anmeldungForm.teilnehmer_telefon}
                onChange={e => setAnmeldungForm(f => ({ ...f, teilnehmer_telefon: e.target.value }))}
                placeholder="+49 123 456789"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-date">Anmeldedatum</Label>
              <Input
                id="a-date"
                type="date"
                value={anmeldungForm.anmeldedatum}
                onChange={e => setAnmeldungForm(f => ({ ...f, anmeldedatum: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAnmeldungForm(f => ({ ...f, bezahlt: !f.bezahlt }))}
                className={`relative w-10 h-5 rounded-full transition-colors ${anmeldungForm.bezahlt ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${anmeldungForm.bezahlt ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <Label className="cursor-pointer" onClick={() => setAnmeldungForm(f => ({ ...f, bezahlt: !f.bezahlt }))}>
                Bezahlt
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnmeldungDialog(false)}>Abbrechen</Button>
            <Button onClick={saveAnmeldung} disabled={saving}>
              {saving ? 'Speichert…' : editingAnmeldung ? 'Aktualisieren' : 'Anmelden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmations ─────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteKursId} onOpenChange={o => !o && setDeleteKursId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kurs löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Kurs wird unwiderruflich gelöscht. Alle zugehörigen Anmeldungen bleiben erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={deleteKurs} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteAnmeldungId} onOpenChange={o => !o && setDeleteAnmeldungId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anmeldung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Anmeldung wird unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAnmeldung} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

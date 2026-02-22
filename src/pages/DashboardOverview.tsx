import { useState, useEffect, useMemo } from 'react';
import type { Kurse, Dozenten, Raeume, Anmeldungen, Teilnehmer } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  BookOpen, Users, Calendar, MapPin, Euro, Plus, X, ChevronRight,
  GraduationCap, CheckCircle2, Clock, AlertCircle, Search, UserPlus, Trash2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

function formatDate(s: string | undefined) {
  if (!s) return '—';
  try { return format(parseISO(s), 'dd.MM.yyyy', { locale: de }); } catch { return s; }
}

function formatCurrency(v: number | undefined) {
  if (v == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);
}

type EnrichedKurs = Kurse & {
  dozentName: string;
  raumName: string;
  anmeldungenCount: number;
  anmeldungen: EnrichedAnmeldung[];
};

type EnrichedAnmeldung = Anmeldungen & {
  teilnehmerName: string;
};

// ---- Enrollment Dialog ----
function EnrollmentDialog({
  kurs,
  anmeldungen,
  teilnehmerList,
  onClose,
  onAdd,
  onDelete,
}: {
  kurs: EnrichedKurs;
  anmeldungen: EnrichedAnmeldung[];
  teilnehmerList: Teilnehmer[];
  onClose: () => void;
  onAdd: (kursId: string, teilnehmerId: string) => Promise<void>;
  onDelete: (anmeldungId: string) => Promise<void>;
}) {
  const [selectedTeilnehmer, setSelectedTeilnehmer] = useState('none');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const enrolledIds = useMemo(() => {
    return new Set(
      anmeldungen.map(a => extractRecordId(a.fields.teilnehmer)).filter(Boolean)
    );
  }, [anmeldungen]);

  const availableTeilnehmer = teilnehmerList.filter(t => !enrolledIds.has(t.record_id));
  const filteredEnrolled = anmeldungen.filter(a =>
    a.teilnehmerName.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (selectedTeilnehmer === 'none') return;
    setSaving(true);
    try {
      await onAdd(kurs.record_id, selectedTeilnehmer);
      setSelectedTeilnehmer('none');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try { await onDelete(id); } finally { setDeletingId(null); }
  };

  const capacity = kurs.fields.max_teilnehmer ?? 0;
  const enrolled = anmeldungen.length;
  const fillPct = capacity > 0 ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;
  const isFull = capacity > 0 && enrolled >= capacity;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-700 text-foreground">
            {kurs.fields.titel ?? 'Kurs'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Capacity Bar */}
          <div className="p-3 rounded-xl bg-muted/60 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-500">Belegung</span>
              <span className={`font-700 ${isFull ? 'text-destructive' : 'text-primary'}`}>
                {enrolled} / {capacity || '∞'} Plätze
              </span>
            </div>
            {capacity > 0 && (
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${fillPct >= 90 ? 'bg-destructive' : fillPct >= 60 ? 'bg-chart-3' : 'bg-primary'}`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            )}
          </div>

          {/* Add Enrollment */}
          {!isFull && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={selectedTeilnehmer} onValueChange={setSelectedTeilnehmer}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Teilnehmer auswählen…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Teilnehmer auswählen —</SelectItem>
                    {availableTeilnehmer.map(t => (
                      <SelectItem key={t.record_id} value={t.record_id}>
                        {t.fields.vorname} {t.fields.nachname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                disabled={selectedTeilnehmer === 'none' || saving}
                onClick={handleAdd}
                className="gap-1.5 h-9"
              >
                <UserPlus size={14} />
                Anmelden
              </Button>
            </div>
          )}
          {isFull && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/8 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              Kurs ist vollständig belegt
            </div>
          )}

          {/* Enrolled List */}
          {anmeldungen.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-600 uppercase tracking-wide text-muted-foreground">
                  Angemeldete Teilnehmer
                </span>
                <div className="relative">
                  <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Suchen…"
                    className="h-7 pl-6 pr-2 text-xs bg-muted rounded-md border-0 outline-none w-28 focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto space-y-1 rounded-xl border bg-card p-1">
                {filteredEnrolled.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">Keine Ergebnisse</p>
                ) : (
                  filteredEnrolled.map(a => (
                    <div
                      key={a.record_id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/60 group"
                    >
                      <div>
                        <p className="text-sm font-500 text-foreground">{a.teilnehmerName}</p>
                        {a.fields.anmeldedatum && (
                          <p className="text-xs text-muted-foreground">
                            Angemeldet {formatDate(a.fields.anmeldedatum)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={a.fields.bezahlt ? 'default' : 'secondary'}
                          className={`text-xs ${a.fields.bezahlt ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                        >
                          {a.fields.bezahlt ? 'Bezahlt' : 'Ausstehend'}
                        </Badge>
                        <button
                          onClick={() => handleDelete(a.record_id)}
                          disabled={deletingId === a.record_id}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {anmeldungen.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Noch keine Anmeldungen für diesen Kurs
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Quick Add Course Dialog ----
function AddKursDialog({
  dozenten,
  raeume,
  onClose,
  onSave,
}: {
  dozenten: Dozenten[];
  raeume: Raeume[];
  onClose: () => void;
  onSave: (fields: Kurse['fields']) => Promise<void>;
}) {
  const [form, setForm] = useState<Kurse['fields']>({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.titel) return;
    setSaving(true);
    try { await onSave(form); onClose(); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Neuen Kurs erstellen</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Titel *</Label>
            <Input
              value={form.titel ?? ''}
              onChange={e => setForm(f => ({ ...f, titel: e.target.value }))}
              placeholder="Kurstitel…"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Beschreibung</Label>
            <textarea
              value={form.beschreibung ?? ''}
              onChange={e => setForm(f => ({ ...f, beschreibung: e.target.value }))}
              placeholder="Kurze Beschreibung…"
              rows={2}
              className="mt-1 w-full text-sm rounded-md border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Startdatum</Label>
              <Input type="date" value={form.startdatum ?? ''} onChange={e => setForm(f => ({ ...f, startdatum: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Enddatum</Label>
              <Input type="date" value={form.enddatum ?? ''} onChange={e => setForm(f => ({ ...f, enddatum: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Max. Teilnehmer</Label>
              <Input
                type="number"
                value={form.max_teilnehmer ?? ''}
                onChange={e => setForm(f => ({ ...f, max_teilnehmer: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="20"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Preis (EUR)</Label>
              <Input
                type="number"
                value={form.preis ?? ''}
                onChange={e => setForm(f => ({ ...f, preis: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="199"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Dozent</Label>
            <Select
              value={extractRecordId(form.dozent) ?? 'none'}
              onValueChange={v => setForm(f => ({ ...f, dozent: v === 'none' ? undefined : createRecordUrl(APP_IDS.DOZENTEN, v) }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Dozent wählen…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Kein Dozent —</SelectItem>
                {dozenten.map(d => (
                  <SelectItem key={d.record_id} value={d.record_id}>
                    {d.fields.vorname} {d.fields.nachname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Raum</Label>
            <Select
              value={extractRecordId(form.raum) ?? 'none'}
              onValueChange={v => setForm(f => ({ ...f, raum: v === 'none' ? undefined : createRecordUrl(APP_IDS.RAEUME, v) }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Raum wählen…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Kein Raum —</SelectItem>
                {raeume.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.raumname} {r.fields.gebaeude ? `(${r.fields.gebaeude})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} size="sm">Abbrechen</Button>
            <Button onClick={handleSave} disabled={!form.titel || saving} size="sm">
              Kurs erstellen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Course Card ----
function KursCard({ kurs, onClick }: { kurs: EnrichedKurs; onClick: () => void }) {
  const capacity = kurs.fields.max_teilnehmer ?? 0;
  const enrolled = kurs.anmeldungenCount;
  const fillPct = capacity > 0 ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;
  const isFull = capacity > 0 && enrolled >= capacity;
  const isAlmostFull = fillPct >= 80 && !isFull;

  const statusColor = isFull
    ? 'bg-red-50 text-red-600 border-red-200'
    : isAlmostFull
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  const statusLabel = isFull ? 'Ausgebucht' : isAlmostFull ? 'Fast voll' : 'Verfügbar';
  const StatusIcon = isFull ? AlertCircle : isAlmostFull ? Clock : CheckCircle2;

  return (
    <button
      onClick={onClick}
      className="group text-left w-full bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-700 text-foreground text-base leading-tight truncate group-hover:text-primary transition-colors">
            {kurs.fields.titel ?? 'Unbenannter Kurs'}
          </h3>
          {kurs.fields.beschreibung && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
              {kurs.fields.beschreibung}
            </p>
          )}
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-600 ${statusColor}`}>
          <StatusIcon size={10} />
          {statusLabel}
        </span>
      </div>

      <div className="space-y-1.5 mb-4">
        {(kurs.fields.startdatum || kurs.fields.enddatum) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar size={11} className="shrink-0" />
            <span>
              {formatDate(kurs.fields.startdatum)}
              {kurs.fields.enddatum && ` – ${formatDate(kurs.fields.enddatum)}`}
            </span>
          </div>
        )}
        {kurs.dozentName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <GraduationCap size={11} className="shrink-0" />
            <span>{kurs.dozentName}</span>
          </div>
        )}
        {kurs.raumName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin size={11} className="shrink-0" />
            <span>{kurs.raumName}</span>
          </div>
        )}
        {kurs.fields.preis != null && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Euro size={11} className="shrink-0" />
            <span>{formatCurrency(kurs.fields.preis)}</span>
          </div>
        )}
      </div>

      {/* Capacity bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            <Users size={10} className="inline mr-1" />
            {enrolled} Anmeldung{enrolled !== 1 ? 'en' : ''}
          </span>
          <span className={`font-600 ${isFull ? 'text-red-600' : 'text-muted-foreground'}`}>
            {capacity > 0 ? `${capacity} Plätze` : 'Unbegrenzt'}
          </span>
        </div>
        {capacity > 0 && (
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isFull ? 'bg-red-400' : isAlmostFull ? 'bg-amber-400' : 'bg-primary'}`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Anmeldungen verwalten</span>
        <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}

// ---- KPI Bar ----
function KpiBar({ kurse, anmeldungen }: { kurse: EnrichedKurs[]; anmeldungen: Anmeldungen[] }) {
  const totalKurse = kurse.length;
  const totalAnmeldungen = anmeldungen.length;
  const bezahlt = anmeldungen.filter(a => a.fields.bezahlt).length;
  const ausstehend = totalAnmeldungen - bezahlt;
  const ausgebucht = kurse.filter(k => {
    const c = k.fields.max_teilnehmer ?? 0;
    return c > 0 && k.anmeldungenCount >= c;
  }).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
      {[
        { label: 'Kurse gesamt', value: totalKurse, icon: BookOpen, color: 'text-primary', bg: 'bg-primary/8' },
        { label: 'Anmeldungen', value: totalAnmeldungen, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
        { label: 'Bezahlt', value: bezahlt, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Ausstehend', value: ausstehend, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
      ].map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
            <Icon size={16} className={color} />
          </div>
          <div>
            <p className="text-2xl font-800 text-foreground leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Main Dashboard ----
export default function DashboardOverview() {
  const [kurse, setKurse] = useState<Kurse[]>([]);
  const [dozenten, setDozenten] = useState<Dozenten[]>([]);
  const [raeume, setRaeume] = useState<Raeume[]>([]);
  const [anmeldungen, setAnmeldungen] = useState<Anmeldungen[]>([]);
  const [teilnehmer, setTeilnehmer] = useState<Teilnehmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [selectedKurs, setSelectedKurs] = useState<EnrichedKurs | null>(null);
  const [showAddKurs, setShowAddKurs] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'full'>('all');

  const fetchAll = async () => {
    try {
      const [k, d, r, a, t] = await Promise.all([
        LivingAppsService.getKurse(),
        LivingAppsService.getDozenten(),
        LivingAppsService.getRaeume(),
        LivingAppsService.getAnmeldungen(),
        LivingAppsService.getTeilnehmer(),
      ]);
      setKurse(k);
      setDozenten(d);
      setRaeume(r);
      setAnmeldungen(a);
      setTeilnehmer(t);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

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

  const teilnehmerMap = useMemo(() => {
    const m = new Map<string, Teilnehmer>();
    teilnehmer.forEach(t => m.set(t.record_id, t));
    return m;
  }, [teilnehmer]);

  const enrichedKurse: EnrichedKurs[] = useMemo(() => {
    return kurse.map(k => {
      const dozentId = extractRecordId(k.fields.dozent);
      const raumId = extractRecordId(k.fields.raum);
      const kursAnmeldungen = anmeldungen.filter(a => extractRecordId(a.fields.kurs) === k.record_id);

      const enrichedAnmeldungen: EnrichedAnmeldung[] = kursAnmeldungen.map(a => {
        const tnId = extractRecordId(a.fields.teilnehmer);
        const tn = tnId ? teilnehmerMap.get(tnId) : undefined;
        return {
          ...a,
          teilnehmerName: tn ? `${tn.fields.vorname ?? ''} ${tn.fields.nachname ?? ''}`.trim() : 'Unbekannt',
        };
      });

      return {
        ...k,
        dozentName: dozentId
          ? `${dozentenMap.get(dozentId)?.fields.vorname ?? ''} ${dozentenMap.get(dozentId)?.fields.nachname ?? ''}`.trim()
          : '',
        raumName: raumId
          ? `${raeumeMap.get(raumId)?.fields.raumname ?? ''}`
          : '',
        anmeldungenCount: kursAnmeldungen.length,
        anmeldungen: enrichedAnmeldungen,
      };
    });
  }, [kurse, anmeldungen, dozentenMap, raeumeMap, teilnehmerMap]);

  const filteredKurse = useMemo(() => {
    return enrichedKurse.filter(k => {
      const matchSearch = filterSearch === '' ||
        (k.fields.titel ?? '').toLowerCase().includes(filterSearch.toLowerCase()) ||
        k.dozentName.toLowerCase().includes(filterSearch.toLowerCase());
      const cap = k.fields.max_teilnehmer ?? 0;
      const isFull = cap > 0 && k.anmeldungenCount >= cap;
      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'available' && !isFull) ||
        (filterStatus === 'full' && isFull);
      return matchSearch && matchStatus;
    });
  }, [enrichedKurse, filterSearch, filterStatus]);

  const handleAddKurs = async (fields: Kurse['fields']) => {
    await LivingAppsService.createKurseEntry(fields);
    await fetchAll();
  };

  const handleAddAnmeldung = async (kursId: string, teilnehmerId: string) => {
    await LivingAppsService.createAnmeldungenEntry({
      kurs: createRecordUrl(APP_IDS.KURSE, kursId),
      teilnehmer: createRecordUrl(APP_IDS.TEILNEHMER, teilnehmerId),
      anmeldedatum: new Date().toISOString().split('T')[0],
      bezahlt: false,
    });
    const updated = await LivingAppsService.getAnmeldungen();
    setAnmeldungen(updated);
    // Update selectedKurs with new data
    setSelectedKurs(prev => {
      if (!prev) return prev;
      const newKursAnmeldungen = updated.filter(a => extractRecordId(a.fields.kurs) === prev.record_id);
      const enrichedAnmeldungen: EnrichedAnmeldung[] = newKursAnmeldungen.map(a => {
        const tnId = extractRecordId(a.fields.teilnehmer);
        const tn = tnId ? teilnehmerMap.get(tnId) : undefined;
        return {
          ...a,
          teilnehmerName: tn ? `${tn.fields.vorname ?? ''} ${tn.fields.nachname ?? ''}`.trim() : 'Unbekannt',
        };
      });
      return { ...prev, anmeldungenCount: newKursAnmeldungen.length, anmeldungen: enrichedAnmeldungen };
    });
  };

  const handleDeleteAnmeldung = async (id: string) => {
    await LivingAppsService.deleteAnmeldungenEntry(id);
    const updated = await LivingAppsService.getAnmeldungen();
    setAnmeldungen(updated);
    setSelectedKurs(prev => {
      if (!prev) return prev;
      const newKursAnmeldungen = updated.filter(a => extractRecordId(a.fields.kurs) === prev.record_id);
      const enrichedAnmeldungen: EnrichedAnmeldung[] = newKursAnmeldungen.map(a => {
        const tnId = extractRecordId(a.fields.teilnehmer);
        const tn = tnId ? teilnehmerMap.get(tnId) : undefined;
        return {
          ...a,
          teilnehmerName: tn ? `${tn.fields.vorname ?? ''} ${tn.fields.nachname ?? ''}`.trim() : 'Unbekannt',
        };
      });
      return { ...prev, anmeldungenCount: newKursAnmeldungen.length, anmeldungen: enrichedAnmeldungen };
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertCircle size={22} className="text-destructive" />
        </div>
        <div className="text-center">
          <h3 className="font-600 text-foreground mb-1">Fehler beim Laden</h3>
          <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setError(null); setLoading(true); fetchAll(); }}>
          Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-800 text-foreground tracking-tight">Kursübersicht</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {enrichedKurse.length} Kurs{enrichedKurse.length !== 1 ? 'e' : ''} · Klicken zum Verwalten
          </p>
        </div>
        <Button onClick={() => setShowAddKurs(true)} className="gap-2 shrink-0">
          <Plus size={16} />
          Neuer Kurs
        </Button>
      </div>

      {/* KPI Bar */}
      <KpiBar kurse={enrichedKurse} anmeldungen={anmeldungen} />

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            placeholder="Kurse oder Dozent suchen…"
            className="pl-9 h-9 text-sm"
          />
          {filterSearch && (
            <button
              onClick={() => setFilterSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {(['all', 'available', 'full'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-600 border transition-colors ${
                filterStatus === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/40'
              }`}
            >
              {f === 'all' ? 'Alle' : f === 'available' ? 'Verfügbar' : 'Ausgebucht'}
            </button>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      {filteredKurse.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <BookOpen size={24} className="text-muted-foreground" />
          </div>
          <div className="text-center">
            <h3 className="font-600 text-foreground mb-1">
              {filterSearch || filterStatus !== 'all' ? 'Keine Kurse gefunden' : 'Noch keine Kurse'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {filterSearch || filterStatus !== 'all'
                ? 'Versuche andere Filtereinstellungen'
                : 'Erstelle deinen ersten Kurs'}
            </p>
          </div>
          {!(filterSearch || filterStatus !== 'all') && (
            <Button onClick={() => setShowAddKurs(true)} className="gap-2">
              <Plus size={15} />
              Ersten Kurs erstellen
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredKurse.map(k => (
            <KursCard key={k.record_id} kurs={k} onClick={() => setSelectedKurs(k)} />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {selectedKurs && (
        <EnrollmentDialog
          kurs={selectedKurs}
          anmeldungen={selectedKurs.anmeldungen}
          teilnehmerList={teilnehmer}
          onClose={() => setSelectedKurs(null)}
          onAdd={handleAddAnmeldung}
          onDelete={handleDeleteAnmeldung}
        />
      )}
      {showAddKurs && (
        <AddKursDialog
          dozenten={dozenten}
          raeume={raeume}
          onClose={() => setShowAddKurs(false)}
          onSave={handleAddKurs}
        />
      )}
    </div>
  );
}

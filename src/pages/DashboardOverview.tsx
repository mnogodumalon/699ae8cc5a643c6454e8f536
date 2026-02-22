import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichKurse, enrichAnmeldungen } from '@/lib/enrich';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import type { Kurse } from '@/types/app';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertCircle, BookOpen, Users, Euro, Calendar, MapPin, GraduationCap,
  Plus, Pencil, Trash2, ChevronRight, CheckCircle2, XCircle, UserPlus, X
} from 'lucide-react';
import { useMemo, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface KursFormData {
  titel: string;
  beschreibung: string;
  startdatum: string;
  enddatum: string;
  max_teilnehmer: string;
  preis: string;
  dozentId: string;
  raumId: string;
}

interface AnmeldungFormData {
  teilnehmerId: string;
  anmeldedatum: string;
  bezahlt: boolean;
}

const emptyKursForm = (): KursFormData => ({
  titel: '', beschreibung: '', startdatum: '', enddatum: '',
  max_teilnehmer: '', preis: '', dozentId: 'none', raumId: 'none',
});

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DashboardOverview() {
  const {
    kurse, teilnehmer, anmeldungen,
    kurseMap, teilnehmerMap, dozentenMap, raeumeMap,
    dozenten, raeume,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedKurse = enrichKurse(kurse, { dozentenMap, raeumeMap });
  const enrichedAnmeldungen = enrichAnmeldungen(anmeldungen, { teilnehmerMap, kurseMap });

  const [selectedKursId, setSelectedKursId] = useState<string | null>(null);
  const [kursDialog, setKursDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; data: KursFormData; editId?: string }>({
    open: false, mode: 'create', data: emptyKursForm(),
  });
  const [anmeldungDialog, setAnmeldungDialog] = useState<{ open: boolean; kursId: string }>({ open: false, kursId: '' });
  const [deleteKursId, setDeleteKursId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedKurs = useMemo(
    () => enrichedKurse.find(k => k.record_id === selectedKursId) ?? null,
    [enrichedKurse, selectedKursId]
  );

  const kursAnmeldungen = useMemo(
    () => enrichedAnmeldungen.filter(a => {
      const kursId = extractRecordId(a.fields.kurs);
      return kursId === selectedKursId;
    }),
    [enrichedAnmeldungen, selectedKursId]
  );

  // KPI stats
  const totalKurse = kurse.length;
  const totalTeilnehmer = teilnehmer.length;
  const totalAnmeldungen = anmeldungen.length;
  const totalUmsatz = useMemo(() => {
    let sum = 0;
    anmeldungen.forEach(a => {
      if (a.fields.bezahlt) {
        const kursId = extractRecordId(a.fields.kurs);
        if (kursId) {
          const k = kurseMap.get(kursId);
          if (k?.fields.preis) sum += k.fields.preis;
        }
      }
    });
    return sum;
  }, [anmeldungen, kurseMap]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openCreateKurs = () => {
    setKursDialog({ open: true, mode: 'create', data: emptyKursForm() });
  };

  const openEditKurs = (k: Kurse) => {
    setKursDialog({
      open: true,
      mode: 'edit',
      editId: k.record_id,
      data: {
        titel: k.fields.titel ?? '',
        beschreibung: k.fields.beschreibung ?? '',
        startdatum: k.fields.startdatum ?? '',
        enddatum: k.fields.enddatum ?? '',
        max_teilnehmer: k.fields.max_teilnehmer != null ? String(k.fields.max_teilnehmer) : '',
        preis: k.fields.preis != null ? String(k.fields.preis) : '',
        dozentId: extractRecordId(k.fields.dozent) ?? 'none',
        raumId: extractRecordId(k.fields.raum) ?? 'none',
      },
    });
  };

  const handleSaveKurs = async () => {
    setSaving(true);
    try {
      const { data, mode, editId } = kursDialog;
      const fields: Kurse['fields'] = {
        titel: data.titel || undefined,
        beschreibung: data.beschreibung || undefined,
        startdatum: data.startdatum || undefined,
        enddatum: data.enddatum || undefined,
        max_teilnehmer: data.max_teilnehmer ? Number(data.max_teilnehmer) : undefined,
        preis: data.preis ? Number(data.preis) : undefined,
        dozent: data.dozentId && data.dozentId !== 'none' ? createRecordUrl(APP_IDS.DOZENTEN, data.dozentId) : undefined,
        raum: data.raumId && data.raumId !== 'none' ? createRecordUrl(APP_IDS.RAEUME, data.raumId) : undefined,
      };
      if (mode === 'create') {
        await LivingAppsService.createKurseEntry(fields);
      } else if (editId) {
        await LivingAppsService.updateKurseEntry(editId, fields);
      }
      setKursDialog(d => ({ ...d, open: false }));
      fetchAll();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKurs = async (id: string) => {
    setSaving(true);
    try {
      await LivingAppsService.deleteKurseEntry(id);
      if (selectedKursId === id) setSelectedKursId(null);
      setDeleteKursId(null);
      fetchAll();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnmeldung = async (id: string) => {
    await LivingAppsService.deleteAnmeldungenEntry(id);
    fetchAll();
  };

  const handleToggleBezahlt = async (id: string, current: boolean) => {
    await LivingAppsService.updateAnmeldungenEntry(id, { bezahlt: !current });
    fetchAll();
  };

  const handleSaveAnmeldung = async (form: AnmeldungFormData) => {
    setSaving(true);
    try {
      await LivingAppsService.createAnmeldungenEntry({
        teilnehmer: form.teilnehmerId !== 'none' ? createRecordUrl(APP_IDS.TEILNEHMER, form.teilnehmerId) : undefined,
        kurs: createRecordUrl(APP_IDS.KURSE, anmeldungDialog.kursId),
        anmeldedatum: form.anmeldedatum || undefined,
        bezahlt: form.bezahlt,
      });
      setAnmeldungDialog(d => ({ ...d, open: false }));
      fetchAll();
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kursübersicht</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Verwalte Kurse, Räume und Anmeldungen</p>
        </div>
        <Button onClick={openCreateKurs} className="gap-2">
          <Plus size={15} />
          Neuer Kurs
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={<BookOpen size={16} />} label="Kurse" value={totalKurse} color="indigo" />
        <KpiCard icon={<Users size={16} />} label="Teilnehmer" value={totalTeilnehmer} color="violet" />
        <KpiCard icon={<GraduationCap size={16} />} label="Anmeldungen" value={totalAnmeldungen} color="sky" />
        <KpiCard icon={<Euro size={16} />} label="Umsatz (bezahlt)" value={formatCurrency(totalUmsatz)} color="emerald" />
      </div>

      {/* Main workspace: course list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: course cards */}
        <div className="lg:col-span-2 space-y-2">
          {enrichedKurse.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card flex flex-col items-center justify-center py-16 text-center gap-3">
              <BookOpen size={32} className="text-muted-foreground/40" />
              <div>
                <p className="font-medium text-foreground">Keine Kurse vorhanden</p>
                <p className="text-sm text-muted-foreground">Erstelle deinen ersten Kurs</p>
              </div>
              <Button size="sm" onClick={openCreateKurs} className="gap-1.5 mt-1">
                <Plus size={13} /> Kurs erstellen
              </Button>
            </div>
          )}
          {enrichedKurse.map(k => {
            const enrolled = enrichedAnmeldungen.filter(a => extractRecordId(a.fields.kurs) === k.record_id).length;
            const max = k.fields.max_teilnehmer ?? 0;
            const pct = max > 0 ? Math.min(100, Math.round((enrolled / max) * 100)) : 0;
            const isFull = max > 0 && enrolled >= max;
            const isSelected = selectedKursId === k.record_id;

            return (
              <button
                key={k.record_id}
                onClick={() => setSelectedKursId(isSelected ? null : k.record_id)}
                className={`w-full text-left rounded-2xl border bg-card p-4 transition-all hover:shadow-md group ${
                  isSelected ? 'border-primary shadow-md ring-1 ring-primary/20' : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{k.fields.titel || '(Kein Titel)'}</p>
                      {isFull && <Badge variant="destructive" className="shrink-0 text-xs">Ausgebucht</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 mt-1">
                      {k.dozentName && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <GraduationCap size={10} /> {k.dozentName}
                        </span>
                      )}
                      {k.raumName && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin size={10} /> {k.raumName}
                        </span>
                      )}
                    </div>
                    {(k.fields.startdatum || k.fields.enddatum) && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Calendar size={10} />
                        {formatDate(k.fields.startdatum)}
                        {k.fields.enddatum ? ` – ${formatDate(k.fields.enddatum)}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      {enrolled}{max > 0 ? `/${max}` : ''}
                    </span>
                    <ChevronRight size={14} className={`text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                  </div>
                </div>
                {max > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 90 ? 'bg-destructive' : pct >= 60 ? 'bg-amber-500' : 'bg-primary'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: detail panel */}
        <div className="lg:col-span-3">
          {!selectedKurs ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 h-full min-h-64 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Kurs auswählen um Details zu sehen</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {/* Course header */}
              <div className="bg-primary/5 border-b border-border p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-lg leading-tight">{selectedKurs.fields.titel || '(Kein Titel)'}</h2>
                    {selectedKurs.fields.beschreibung && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{selectedKurs.fields.beschreibung}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => openEditKurs(selectedKurs)}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteKursId(selectedKurs.record_id)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <InfoChip icon={<Calendar size={13} />} label="Start" value={formatDate(selectedKurs.fields.startdatum)} />
                  <InfoChip icon={<Calendar size={13} />} label="Ende" value={formatDate(selectedKurs.fields.enddatum)} />
                  <InfoChip icon={<Euro size={13} />} label="Preis" value={formatCurrency(selectedKurs.fields.preis)} />
                  <InfoChip icon={<GraduationCap size={13} />} label="Dozent" value={selectedKurs.dozentName || '—'} />
                </div>
              </div>

              {/* Registrations */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">Anmeldungen</h3>
                    <Badge variant="secondary" className="text-xs">
                      {kursAnmeldungen.length}
                      {selectedKurs.fields.max_teilnehmer ? ` / ${selectedKurs.fields.max_teilnehmer}` : ''}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => setAnmeldungDialog({ open: true, kursId: selectedKurs.record_id })}
                  >
                    <UserPlus size={12} /> Anmelden
                  </Button>
                </div>

                {kursAnmeldungen.length === 0 ? (
                  <div className="py-8 text-center rounded-xl border border-dashed border-border">
                    <Users size={24} className="mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Noch keine Anmeldungen</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {kursAnmeldungen.map(a => (
                      <div key={a.record_id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {(a.teilnehmerName || '?')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{a.teilnehmerName || '(Unbekannt)'}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(a.fields.anmeldedatum)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleToggleBezahlt(a.record_id, a.fields.bezahlt ?? false)}
                            className="flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border transition-colors"
                            title={a.fields.bezahlt ? 'Als unbezahlt markieren' : 'Als bezahlt markieren'}
                            style={{
                              color: a.fields.bezahlt ? 'var(--color-emerald-600, #059669)' : 'var(--muted-foreground)',
                              borderColor: a.fields.bezahlt ? 'var(--color-emerald-300, #6ee7b7)' : 'var(--border)',
                              backgroundColor: a.fields.bezahlt ? 'color-mix(in srgb, #059669 10%, transparent)' : 'transparent',
                            }}
                          >
                            {a.fields.bezahlt ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {a.fields.bezahlt ? 'Bezahlt' : 'Offen'}
                          </button>
                          <button
                            onClick={() => handleDeleteAnmeldung(a.record_id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:text-destructive"
                          >
                            <X size={13} />
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
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}

      {/* Kurs create/edit dialog */}
      <Dialog open={kursDialog.open} onOpenChange={o => setKursDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{kursDialog.mode === 'create' ? 'Neuer Kurs' : 'Kurs bearbeiten'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Titel</Label>
              <Input
                placeholder="Kurstitel"
                value={kursDialog.data.titel}
                onChange={e => setKursDialog(d => ({ ...d, data: { ...d.data, titel: e.target.value } }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Beschreibung</Label>
              <Textarea
                placeholder="Kursbeschreibung..."
                rows={2}
                value={kursDialog.data.beschreibung}
                onChange={e => setKursDialog(d => ({ ...d, data: { ...d.data, beschreibung: e.target.value } }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Startdatum</Label>
                <Input
                  type="date"
                  value={kursDialog.data.startdatum}
                  onChange={e => setKursDialog(d => ({ ...d, data: { ...d.data, startdatum: e.target.value } }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Enddatum</Label>
                <Input
                  type="date"
                  value={kursDialog.data.enddatum}
                  onChange={e => setKursDialog(d => ({ ...d, data: { ...d.data, enddatum: e.target.value } }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Max. Teilnehmer</Label>
                <Input
                  type="number"
                  placeholder="z.B. 20"
                  value={kursDialog.data.max_teilnehmer}
                  onChange={e => setKursDialog(d => ({ ...d, data: { ...d.data, max_teilnehmer: e.target.value } }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Preis (EUR)</Label>
                <Input
                  type="number"
                  placeholder="z.B. 199"
                  value={kursDialog.data.preis}
                  onChange={e => setKursDialog(d => ({ ...d, data: { ...d.data, preis: e.target.value } }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dozent</Label>
                <Select
                  value={kursDialog.data.dozentId}
                  onValueChange={v => setKursDialog(d => ({ ...d, data: { ...d.data, dozentId: v } }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Keiner —</SelectItem>
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
                <Select
                  value={kursDialog.data.raumId}
                  onValueChange={v => setKursDialog(d => ({ ...d, data: { ...d.data, raumId: v } }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Keiner —</SelectItem>
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
            <Button variant="outline" onClick={() => setKursDialog(d => ({ ...d, open: false }))}>Abbrechen</Button>
            <Button onClick={handleSaveKurs} disabled={saving || !kursDialog.data.titel}>
              {saving ? 'Speichern...' : kursDialog.mode === 'create' ? 'Kurs erstellen' : 'Änderungen speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Anmeldung dialog */}
      <AnmeldungDialog
        open={anmeldungDialog.open}
        onClose={() => setAnmeldungDialog(d => ({ ...d, open: false }))}
        teilnehmer={teilnehmer}
        saving={saving}
        onSave={handleSaveAnmeldung}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteKursId} onOpenChange={o => !o && setDeleteKursId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kurs löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Dieser Kurs wird unwiderruflich gelöscht. Bestehende Anmeldungen bleiben erhalten.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteKursId(null)}>Abbrechen</Button>
            <Button
              variant="destructive"
              disabled={saving}
              onClick={() => deleteKursId && handleDeleteKurs(deleteKursId)}
            >
              {saving ? 'Löschen...' : 'Kurs löschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: 'indigo' | 'violet' | 'sky' | 'emerald';
}) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/30',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950/30',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30',
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-muted-foreground flex items-center gap-1">{icon} {label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}

function AnmeldungDialog({ open, onClose, teilnehmer, saving, onSave }: {
  open: boolean;
  onClose: () => void;
  teilnehmer: import('@/types/app').Teilnehmer[];
  saving: boolean;
  onSave: (form: AnmeldungFormData) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<AnmeldungFormData>({ teilnehmerId: 'none', anmeldedatum: today, bezahlt: false });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Teilnehmer anmelden</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Teilnehmer</Label>
            <Select value={form.teilnehmerId} onValueChange={v => setForm(f => ({ ...f, teilnehmerId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Auswählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Auswählen —</SelectItem>
                {teilnehmer.map(t => (
                  <SelectItem key={t.record_id} value={t.record_id}>
                    {t.fields.vorname} {t.fields.nachname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Anmeldedatum</Label>
            <Input type="date" value={form.anmeldedatum} onChange={e => setForm(f => ({ ...f, anmeldedatum: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded"
              checked={form.bezahlt}
              onChange={e => setForm(f => ({ ...f, bezahlt: e.target.checked }))}
            />
            <span className="text-sm">Bereits bezahlt</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button
            disabled={saving || form.teilnehmerId === 'none'}
            onClick={() => onSave(form)}
          >
            {saving ? 'Speichern...' : 'Anmelden'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}

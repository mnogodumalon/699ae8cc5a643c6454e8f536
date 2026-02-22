import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichKurse, enrichAnmeldungen } from '@/lib/enrich';
import type { EnrichedKurse, EnrichedAnmeldungen } from '@/types/enriched';
import type { Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, BookOpen, Users, Euro, MapPin, UserCheck, Plus, Pencil, Trash2, ChevronRight, CheckCircle2, Clock, X, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DashboardOverview() {
  const {
    kurse, teilnehmer, anmeldungen,
    kurseMap, teilnehmerMap, dozentenMap, raeumeMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedKurse = enrichKurse(kurse, dozentenMap, raeumeMap);
  const enrichedAnmeldungen = enrichAnmeldungen(anmeldungen, teilnehmerMap, kurseMap);

  const [selectedKursId, setSelectedKursId] = useState<string | null>(null);
  const [showKursDialog, setShowKursDialog] = useState(false);
  const [editingKurs, setEditingKurs] = useState<EnrichedKurse | null>(null);
  const [showAnmeldungDialog, setShowAnmeldungDialog] = useState(false);
  const [editingAnmeldung, setEditingAnmeldung] = useState<EnrichedAnmeldungen | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'kurs' | 'anmeldung'; id: string } | null>(null);

  const selectedKurs = useMemo(
    () => enrichedKurse.find(k => k.record_id === selectedKursId) ?? null,
    [enrichedKurse, selectedKursId]
  );

  const kursAnmeldungen = useMemo(
    () => enrichedAnmeldungen.filter(a => {
      const kid = extractRecordId(a.fields.kurs);
      return kid === selectedKursId;
    }),
    [enrichedAnmeldungen, selectedKursId]
  );

  // KPI numbers
  const totalKurse = kurse.length;
  const totalTeilnehmer = teilnehmer.length;
  const totalAnmeldungen = anmeldungen.length;
  const bezahltCount = anmeldungen.filter(a => a.fields.bezahlt).length;
  const totalUmsatz = kurse.reduce((sum, k) => {
    const anmCount = anmeldungen.filter(a => extractRecordId(a.fields.kurs) === k.record_id).length;
    return sum + (k.fields.preis ?? 0) * anmCount;
  }, 0);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Übersicht</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kursverwaltung auf einen Blick</p>
        </div>
        <Button
          onClick={() => { setEditingKurs(null); setShowKursDialog(true); }}
          className="gap-2 font-semibold"
        >
          <Plus size={15} />
          Neuer Kurs
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<BookOpen size={16} />}
          label="Kurse"
          value={totalKurse}
          color="blue"
        />
        <KpiCard
          icon={<Users size={16} />}
          label="Anmeldungen"
          value={totalAnmeldungen}
          sub={`${bezahltCount} bezahlt`}
          color="green"
        />
        <KpiCard
          icon={<GraduationCap size={16} />}
          label="Teilnehmer"
          value={totalTeilnehmer}
          color="purple"
        />
        <KpiCard
          icon={<Euro size={16} />}
          label="Umsatz"
          value={formatCurrency(totalUmsatz)}
          color="amber"
        />
      </div>

      {/* Master-Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[480px]">
        {/* Course List */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm text-foreground">Alle Kurse</h2>
            <p className="text-xs text-muted-foreground">{totalKurse} Kurs{totalKurse !== 1 ? 'e' : ''}</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {enrichedKurse.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <BookOpen size={28} className="opacity-30" />
                <p className="text-sm">Noch keine Kurse</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setEditingKurs(null); setShowKursDialog(true); }}
                >
                  Ersten Kurs anlegen
                </Button>
              </div>
            ) : (
              enrichedKurse.map(kurs => {
                const anmCount = anmeldungen.filter(a => extractRecordId(a.fields.kurs) === kurs.record_id).length;
                const maxT = kurs.fields.max_teilnehmer ?? 0;
                const fill = maxT > 0 ? Math.min(anmCount / maxT, 1) : 0;
                const isSelected = selectedKursId === kurs.record_id;
                return (
                  <button
                    key={kurs.record_id}
                    onClick={() => setSelectedKursId(isSelected ? null : kurs.record_id)}
                    className={`w-full text-left px-4 py-3 transition-colors group ${
                      isSelected
                        ? 'bg-primary/8 border-l-2 border-l-primary'
                        : 'hover:bg-accent/60 border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium text-sm truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {kurs.fields.titel ?? 'Unbenannter Kurs'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(kurs.fields.startdatum)}
                          </span>
                          {kurs.dozentName && (
                            <span className="text-xs text-muted-foreground truncate">· {kurs.dozentName}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {kurs.fields.preis != null && (
                          <span className="text-xs font-semibold text-muted-foreground">
                            {formatCurrency(kurs.fields.preis)}
                          </span>
                        )}
                        <ChevronRight
                          size={14}
                          className={`transition-transform ${isSelected ? 'rotate-90 text-primary' : 'text-muted-foreground/40 group-hover:text-muted-foreground'}`}
                        />
                      </div>
                    </div>
                    {maxT > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span>{anmCount} Anmeldungen</span>
                          <span>{maxT} max</span>
                        </div>
                        <div className="h-1 bg-border rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              fill >= 1 ? 'bg-destructive' : fill >= 0.8 ? 'bg-amber-500' : 'bg-primary'
                            }`}
                            style={{ width: `${fill * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          {!selectedKurs ? (
            <div className="flex flex-col items-center justify-center flex-1 py-20 gap-3 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center">
                <BookOpen size={22} className="text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Kurs auswählen</p>
              <p className="text-xs text-muted-foreground">Wähle einen Kurs aus der Liste, um Details zu sehen</p>
            </div>
          ) : (
            <>
              {/* Course header */}
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-foreground truncate">
                      {selectedKurs.fields.titel ?? 'Unbenannter Kurs'}
                    </h2>
                    {selectedKurs.fields.beschreibung && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {selectedKurs.fields.beschreibung}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => { setEditingKurs(selectedKurs); setShowKursDialog(true); }}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm({ type: 'kurs', id: selectedKurs.record_id })}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>

                {/* Course meta chips */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedKurs.fields.startdatum && (
                    <MetaChip icon={<Clock size={11} />}>
                      {formatDate(selectedKurs.fields.startdatum)}
                      {selectedKurs.fields.enddatum && ` – ${formatDate(selectedKurs.fields.enddatum)}`}
                    </MetaChip>
                  )}
                  {selectedKurs.dozentName && (
                    <MetaChip icon={<GraduationCap size={11} />}>{selectedKurs.dozentName}</MetaChip>
                  )}
                  {selectedKurs.raumName && (
                    <MetaChip icon={<MapPin size={11} />}>{selectedKurs.raumName}</MetaChip>
                  )}
                  {selectedKurs.fields.preis != null && (
                    <MetaChip icon={<Euro size={11} />}>{formatCurrency(selectedKurs.fields.preis)}</MetaChip>
                  )}
                  {selectedKurs.fields.max_teilnehmer != null && (
                    <MetaChip icon={<Users size={11} />}>
                      {kursAnmeldungen.length} / {selectedKurs.fields.max_teilnehmer} Plätze
                    </MetaChip>
                  )}
                </div>
              </div>

              {/* Enrollments */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">
                  Anmeldungen <span className="text-muted-foreground font-normal">({kursAnmeldungen.length})</span>
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs font-medium"
                  onClick={() => { setEditingAnmeldung(null); setShowAnmeldungDialog(true); }}
                >
                  <Plus size={12} />
                  Anmelden
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {kursAnmeldungen.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                    <UserCheck size={24} className="opacity-30" />
                    <p className="text-sm">Noch keine Anmeldungen</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {kursAnmeldungen.map(anm => (
                      <div key={anm.record_id} className="flex items-center justify-between px-5 py-3 hover:bg-accent/30 group transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {anm.teilnehmerName ? anm.teilnehmerName.charAt(0).toUpperCase() : '?'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {anm.teilnehmerName || 'Unbekannt'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {anm.fields.anmeldedatum ? formatDate(anm.fields.anmeldedatum) : '—'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant={anm.fields.bezahlt ? 'default' : 'secondary'}
                            className={`text-[10px] px-2 py-0 ${
                              anm.fields.bezahlt
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {anm.fields.bezahlt ? (
                              <><CheckCircle2 size={9} className="mr-1" />Bezahlt</>
                            ) : (
                              <><Clock size={9} className="mr-1" />Ausstehend</>
                            )}
                          </Badge>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => { setEditingAnmeldung(anm); setShowAnmeldungDialog(true); }}
                            >
                              <Pencil size={11} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirm({ type: 'anmeldung', id: anm.record_id })}
                            >
                              <Trash2 size={11} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Kurs Dialog */}
      <KursDialog
        open={showKursDialog}
        kurs={editingKurs}
        dozentenMap={dozentenMap}
        raeumeMap={raeumeMap}
        onClose={() => setShowKursDialog(false)}
        onSave={async (fields) => {
          if (editingKurs) {
            await LivingAppsService.updateKurseEntry(editingKurs.record_id, fields);
          } else {
            await LivingAppsService.createKurseEntry(fields);
          }
          fetchAll();
          setShowKursDialog(false);
        }}
      />

      {/* Anmeldung Dialog */}
      <AnmeldungDialog
        open={showAnmeldungDialog}
        anmeldung={editingAnmeldung}
        selectedKursId={selectedKursId}
        teilnehmerList={teilnehmer}
        onClose={() => setShowAnmeldungDialog(false)}
        onSave={async (fields) => {
          if (editingAnmeldung) {
            await LivingAppsService.updateAnmeldungenEntry(editingAnmeldung.record_id, fields);
          } else {
            await LivingAppsService.createAnmeldungenEntry(fields);
          }
          fetchAll();
          setShowAnmeldungDialog(false);
        }}
      />

      {/* Delete Confirm */}
      {deleteConfirm && (
        <Dialog open onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Löschen bestätigen</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {deleteConfirm.type === 'kurs'
                ? 'Möchtest du diesen Kurs wirklich löschen? Alle zugehörigen Daten gehen verloren.'
                : 'Möchtest du diese Anmeldung wirklich löschen?'}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Abbrechen</Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (deleteConfirm.type === 'kurs') {
                    await LivingAppsService.deleteKurseEntry(deleteConfirm.id);
                    if (selectedKursId === deleteConfirm.id) setSelectedKursId(null);
                  } else {
                    await LivingAppsService.deleteAnmeldungenEntry(deleteConfirm.id);
                  }
                  fetchAll();
                  setDeleteConfirm(null);
                }}
              >
                Löschen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function MetaChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
      {icon}
      {children}
    </span>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: 'blue' | 'green' | 'purple' | 'amber';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
        <p className="text-xl font-bold text-foreground leading-tight mt-0.5 truncate">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Kurs Dialog ───────────────────────────────────────────────────────────────

function KursDialog({
  open,
  kurs,
  dozentenMap,
  raeumeMap,
  onClose,
  onSave,
}: {
  open: boolean;
  kurs: EnrichedKurse | null;
  dozentenMap: Map<string, import('@/types/app').Dozenten>;
  raeumeMap: Map<string, import('@/types/app').Raeume>;
  onClose: () => void;
  onSave: (fields: import('@/types/app').Kurse['fields']) => Promise<void>;
}) {
  const [titel, setTitel] = useState(kurs?.fields.titel ?? '');
  const [beschreibung, setBeschreibung] = useState(kurs?.fields.beschreibung ?? '');
  const [startdatum, setStartdatum] = useState(kurs?.fields.startdatum ?? '');
  const [enddatum, setEnddatum] = useState(kurs?.fields.enddatum ?? '');
  const [maxTeilnehmer, setMaxTeilnehmer] = useState(String(kurs?.fields.max_teilnehmer ?? ''));
  const [preis, setPreis] = useState(String(kurs?.fields.preis ?? ''));
  const [dozentId, setDozentId] = useState(() => {
    if (!kurs?.fields.dozent) return 'none';
    return extractRecordId(kurs.fields.dozent) ?? 'none';
  });
  const [raumId, setRaumId] = useState(() => {
    if (!kurs?.fields.raum) return 'none';
    return extractRecordId(kurs.fields.raum) ?? 'none';
  });
  const [saving, setSaving] = useState(false);

  // Reset on open
  const handleOpen = () => {
    setTitel(kurs?.fields.titel ?? '');
    setBeschreibung(kurs?.fields.beschreibung ?? '');
    setStartdatum(kurs?.fields.startdatum ?? '');
    setEnddatum(kurs?.fields.enddatum ?? '');
    setMaxTeilnehmer(String(kurs?.fields.max_teilnehmer ?? ''));
    setPreis(String(kurs?.fields.preis ?? ''));
    setDozentId(kurs?.fields.dozent ? extractRecordId(kurs.fields.dozent) ?? 'none' : 'none');
    setRaumId(kurs?.fields.raum ? extractRecordId(kurs.fields.raum) ?? 'none' : 'none');
  };

  const dozentenList = Array.from(dozentenMap.values());
  const raeumeList = Array.from(raeumeMap.values());

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const fields: import('@/types/app').Kurse['fields'] = {
        titel: titel || undefined,
        beschreibung: beschreibung || undefined,
        startdatum: startdatum || undefined,
        enddatum: enddatum || undefined,
        max_teilnehmer: maxTeilnehmer ? Number(maxTeilnehmer) : undefined,
        preis: preis ? Number(preis) : undefined,
        dozent: dozentId !== 'none' ? createRecordUrl(APP_IDS.DOZENTEN, dozentId) : undefined,
        raum: raumId !== 'none' ? createRecordUrl(APP_IDS.RAEUME, raumId) : undefined,
      };
      await onSave(fields);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else handleOpen(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{kurs ? 'Kurs bearbeiten' : 'Neuen Kurs anlegen'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Titel</Label>
            <Input value={titel} onChange={e => setTitel(e.target.value)} placeholder="Kurstitel" />
          </div>
          <div className="space-y-1.5">
            <Label>Beschreibung</Label>
            <Input value={beschreibung} onChange={e => setBeschreibung(e.target.value)} placeholder="Kurzbeschreibung" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Startdatum</Label>
              <Input type="date" value={startdatum} onChange={e => setStartdatum(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Enddatum</Label>
              <Input type="date" value={enddatum} onChange={e => setEnddatum(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Max. Teilnehmer</Label>
              <Input type="number" value={maxTeilnehmer} onChange={e => setMaxTeilnehmer(e.target.value)} placeholder="z.B. 20" />
            </div>
            <div className="space-y-1.5">
              <Label>Preis (EUR)</Label>
              <Input type="number" value={preis} onChange={e => setPreis(e.target.value)} placeholder="z.B. 199" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Dozent</Label>
            <Select value={dozentId} onValueChange={setDozentId}>
              <SelectTrigger>
                <SelectValue placeholder="Dozent wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Dozent</SelectItem>
                {dozentenList.map(d => (
                  <SelectItem key={d.record_id} value={d.record_id}>
                    {d.fields.vorname} {d.fields.nachname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Raum</Label>
            <Select value={raumId} onValueChange={setRaumId}>
              <SelectTrigger>
                <SelectValue placeholder="Raum wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Raum</SelectItem>
                {raeumeList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.raumname}{r.fields.gebaeude ? ` (${r.fields.gebaeude})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Speichern...' : kurs ? 'Aktualisieren' : 'Anlegen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Anmeldung Dialog ──────────────────────────────────────────────────────────

function AnmeldungDialog({
  open,
  anmeldung,
  selectedKursId,
  teilnehmerList,
  onClose,
  onSave,
}: {
  open: boolean;
  anmeldung: EnrichedAnmeldungen | null;
  selectedKursId: string | null;
  teilnehmerList: import('@/types/app').Teilnehmer[];
  onClose: () => void;
  onSave: (fields: import('@/types/app').Anmeldungen['fields']) => Promise<void>;
}) {
  const [teilnehmerId, setTeilnehmerId] = useState(() => {
    if (!anmeldung?.fields.teilnehmer) return 'none';
    return extractRecordId(anmeldung.fields.teilnehmer) ?? 'none';
  });
  const [anmeldedatum, setAnmeldedatum] = useState(anmeldung?.fields.anmeldedatum ?? new Date().toISOString().slice(0, 10));
  const [bezahlt, setBezahlt] = useState(String(anmeldung?.fields.bezahlt ?? 'false'));
  const [saving, setSaving] = useState(false);

  const handleOpen = () => {
    setTeilnehmerId(anmeldung?.fields.teilnehmer ? extractRecordId(anmeldung.fields.teilnehmer) ?? 'none' : 'none');
    setAnmeldedatum(anmeldung?.fields.anmeldedatum ?? new Date().toISOString().slice(0, 10));
    setBezahlt(String(anmeldung?.fields.bezahlt ?? 'false'));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const fields: Anmeldungen['fields'] = {
        teilnehmer: teilnehmerId !== 'none' ? createRecordUrl(APP_IDS.TEILNEHMER, teilnehmerId) : undefined,
        kurs: selectedKursId ? createRecordUrl(APP_IDS.KURSE, selectedKursId) : (anmeldung?.fields.kurs ?? undefined),
        anmeldedatum: anmeldedatum || undefined,
        bezahlt: bezahlt === 'true',
      };
      await onSave(fields);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else handleOpen(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{anmeldung ? 'Anmeldung bearbeiten' : 'Neue Anmeldung'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Teilnehmer</Label>
            <Select value={teilnehmerId} onValueChange={setTeilnehmerId}>
              <SelectTrigger>
                <SelectValue placeholder="Teilnehmer wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Teilnehmer</SelectItem>
                {teilnehmerList.map(t => (
                  <SelectItem key={t.record_id} value={t.record_id}>
                    {t.fields.vorname} {t.fields.nachname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Anmeldedatum</Label>
            <Input type="date" value={anmeldedatum} onChange={e => setAnmeldedatum(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Bezahlt</Label>
            <Select value={bezahlt} onValueChange={setBezahlt}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Ja — bezahlt</SelectItem>
                <SelectItem value="false">Nein — ausstehend</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Speichern...' : anmeldung ? 'Aktualisieren' : 'Anmelden'}
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
      <Skeleton className="h-[480px] rounded-2xl" />
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

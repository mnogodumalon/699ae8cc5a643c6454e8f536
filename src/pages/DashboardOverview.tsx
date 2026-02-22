import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichKurse, enrichAnmeldungen } from '@/lib/enrich';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { APP_IDS } from '@/types/app';
import type { Kurse, Anmeldungen } from '@/types/app';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  BookOpen,
  Users,
  Plus,
  Calendar,
  MapPin,
  GraduationCap,
  Trash2,
  Euro,
  ChevronRight,
  Search,
  X,
  CheckCircle2,
  Clock,
  BarChart3,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardOverview() {
  const {
    kurse, anmeldungen, kursanmeldung,
    kurseMap, teilnehmerMap, dozentenMap, raeumeMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedKurse = enrichKurse(kurse, { dozentenMap, raeumeMap });
  const enrichedAnmeldungen = enrichAnmeldungen(anmeldungen, { teilnehmerMap, kurseMap });

  const [selectedKursId, setSelectedKursId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showKursDialog, setShowKursDialog] = useState(false);
  const [editingKurs, setEditingKurs] = useState<Kurse | null>(null);
  const [showAnmeldungDialog, setShowAnmeldungDialog] = useState(false);
  const [editingAnmeldung, setEditingAnmeldung] = useState<Anmeldungen | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteType, setConfirmDeleteType] = useState<'kurs' | 'anmeldung'>('kurs');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredKurse = useMemo(() => {
    if (!searchQuery) return enrichedKurse;
    const q = searchQuery.toLowerCase();
    return enrichedKurse.filter(k =>
      (k.fields.titel ?? '').toLowerCase().includes(q) ||
      (k.dozentName ?? '').toLowerCase().includes(q) ||
      (k.raumName ?? '').toLowerCase().includes(q)
    );
  }, [enrichedKurse, searchQuery]);

  const selectedKurs = enrichedKurse.find(k => k.record_id === selectedKursId) ?? null;

  const kursAnmeldungenIds = useMemo(() => {
    if (!selectedKursId) return new Set<string>();
    return new Set(
      anmeldungen
        .filter(a => {
          const id = extractRecordId(a.fields.kurs);
          return id === selectedKursId;
        })
        .map(a => a.record_id)
    );
  }, [anmeldungen, selectedKursId]);

  const selectedKursAnmeldungen = useMemo(() => {
    return enrichedAnmeldungen.filter(a => kursAnmeldungenIds.has(a.record_id));
  }, [enrichedAnmeldungen, kursAnmeldungenIds]);

  // KPI Stats
  const totalKurse = kurse.length;
  const totalAnmeldungen = anmeldungen.length;
  const bezahltAnmeldungen = anmeldungen.filter(a => a.fields.bezahlt === true).length;
  const unbezahltAnmeldungen = totalAnmeldungen - bezahltAnmeldungen;

  const revenue = useMemo(() => {
    let total = 0;
    anmeldungen.forEach(a => {
      if (!a.fields.bezahlt) return;
      const kursId = extractRecordId(a.fields.kurs);
      if (!kursId) return;
      const kurs = kurseMap.get(kursId);
      if (kurs?.fields.preis) total += kurs.fields.preis;
    });
    return total;
  }, [anmeldungen, kurseMap]);

  // Chart data: registrations per course (top 6)
  const chartData = useMemo(() => {
    return enrichedKurse
      .map(k => {
        const count = anmeldungen.filter(a => extractRecordId(a.fields.kurs) === k.record_id).length;
        return { name: (k.fields.titel ?? 'Kurs').slice(0, 16), count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [enrichedKurse, anmeldungen]);

  const getAnmeldungCountForKurs = (kursId: string) =>
    anmeldungen.filter(a => extractRecordId(a.fields.kurs) === kursId).length;

  const getBelegungPercent = (kurs: Kurse) => {
    const max = kurs.fields.max_teilnehmer;
    if (!max || max === 0) return 0;
    const count = getAnmeldungCountForKurs(kurs.record_id);
    return Math.min(100, Math.round((count / max) * 100));
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-800 tracking-tight text-foreground">Kursübersicht</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Verwalten Sie Kurse und Anmeldungen</p>
        </div>
        <Button
          onClick={() => { setEditingKurs(null); setShowKursDialog(true); }}
          className="gap-2 bg-primary text-primary-foreground shadow-sm hover:opacity-90"
        >
          <Plus size={15} />
          Neuer Kurs
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Kurse gesamt"
          value={totalKurse}
          icon={<BookOpen size={16} />}
          accent="blue"
        />
        <KpiCard
          label="Anmeldungen"
          value={totalAnmeldungen}
          icon={<Users size={16} />}
          accent="purple"
        />
        <KpiCard
          label="Bezahlt"
          value={bezahltAnmeldungen}
          icon={<CheckCircle2 size={16} />}
          accent="green"
        />
        <KpiCard
          label="Offene Zahlung"
          value={unbezahltAnmeldungen}
          icon={<Clock size={16} />}
          accent="orange"
        />
      </div>

      {/* Main: Kurs List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Kurs List */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Kurse durchsuchen…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 text-sm bg-card"
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery('')}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredKurse.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen size={28} className="text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Keine Kurse gefunden</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-primary"
                  onClick={() => { setEditingKurs(null); setShowKursDialog(true); }}
                >
                  <Plus size={13} className="mr-1" /> Kurs anlegen
                </Button>
              </div>
            ) : (
              filteredKurse.map(kurs => {
                const count = getAnmeldungCountForKurs(kurs.record_id);
                const pct = getBelegungPercent(kurs);
                const isSelected = kurs.record_id === selectedKursId;
                return (
                  <button
                    key={kurs.record_id}
                    onClick={() => setSelectedKursId(isSelected ? null : kurs.record_id)}
                    className={`w-full text-left rounded-xl border p-4 transition-all duration-150 group ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-600 text-sm text-foreground truncate">{kurs.fields.titel ?? '—'}</p>
                        {kurs.dozentName && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <GraduationCap size={11} />
                            {kurs.dozentName}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-500 text-muted-foreground">
                          {count}{kurs.fields.max_teilnehmer ? `/${kurs.fields.max_teilnehmer}` : ''}
                        </span>
                        <ChevronRight
                          size={14}
                          className={`text-muted-foreground transition-transform ${isSelected ? 'rotate-90 text-primary' : 'group-hover:translate-x-0.5'}`}
                        />
                      </div>
                    </div>
                    {kurs.fields.max_teilnehmer ? (
                      <div className="mt-2.5 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-yellow-500' : 'bg-primary'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    ) : null}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {kurs.fields.startdatum && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDate(kurs.fields.startdatum)}
                        </span>
                      )}
                      {kurs.raumName && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} />
                          {kurs.raumName}
                        </span>
                      )}
                      {kurs.fields.preis != null && (
                        <span className="flex items-center gap-1">
                          <Euro size={11} />
                          {formatCurrency(kurs.fields.preis)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div className="lg:col-span-3">
          {selectedKurs ? (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              {/* Kurs Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-700 text-foreground">{selectedKurs.fields.titel ?? '—'}</h2>
                  {selectedKurs.fields.beschreibung && (
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                      {selectedKurs.fields.beschreibung}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingKurs(selectedKurs); setShowKursDialog(true); }}
                  >
                    Bearbeiten
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => { setConfirmDeleteId(selectedKurs.record_id); setConfirmDeleteType('kurs'); }}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>

              {/* Kurs Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {selectedKurs.fields.startdatum && (
                  <MetaChip icon={<Calendar size={13} />} label="Start" value={formatDate(selectedKurs.fields.startdatum)} />
                )}
                {selectedKurs.fields.enddatum && (
                  <MetaChip icon={<Calendar size={13} />} label="Ende" value={formatDate(selectedKurs.fields.enddatum)} />
                )}
                {selectedKurs.dozentName && (
                  <MetaChip icon={<GraduationCap size={13} />} label="Dozent" value={selectedKurs.dozentName} />
                )}
                {selectedKurs.raumName && (
                  <MetaChip icon={<MapPin size={13} />} label="Raum" value={selectedKurs.raumName} />
                )}
                {selectedKurs.fields.preis != null && (
                  <MetaChip icon={<Euro size={13} />} label="Preis" value={formatCurrency(selectedKurs.fields.preis)} />
                )}
                {selectedKurs.fields.max_teilnehmer != null && (
                  <MetaChip
                    icon={<Users size={13} />}
                    label="Kapazität"
                    value={`${getAnmeldungCountForKurs(selectedKurs.record_id)} / ${selectedKurs.fields.max_teilnehmer}`}
                  />
                )}
              </div>

              {/* Anmeldungen Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-600 text-foreground">
                    Anmeldungen
                    <span className="ml-2 text-xs font-400 text-muted-foreground">
                      ({selectedKursAnmeldungen.length})
                    </span>
                  </h3>
                  <Button
                    size="sm"
                    className="gap-1.5 h-7 text-xs bg-primary text-primary-foreground hover:opacity-90"
                    onClick={() => { setEditingAnmeldung(null); setShowAnmeldungDialog(true); }}
                  >
                    <Plus size={12} /> Anmeldung
                  </Button>
                </div>

                {selectedKursAnmeldungen.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-border text-center">
                    <Users size={22} className="text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">Noch keine Anmeldungen</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {selectedKursAnmeldungen.map(a => (
                      <div
                        key={a.record_id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-600 text-primary">
                            {(a.teilnehmerName || '?')[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-500 text-foreground truncate">
                            {a.teilnehmerName || '—'}
                          </p>
                          {a.fields.anmeldedatum && (
                            <p className="text-xs text-muted-foreground">{formatDate(a.fields.anmeldedatum)}</p>
                          )}
                        </div>
                        <Badge
                          variant={a.fields.bezahlt ? 'default' : 'outline'}
                          className={`text-xs shrink-0 ${
                            a.fields.bezahlt
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : 'text-orange-600 border-orange-300 bg-orange-50'
                          }`}
                        >
                          {a.fields.bezahlt ? 'Bezahlt' : 'Offen'}
                        </Badge>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            className="p-1 rounded hover:bg-destructive/10 text-destructive"
                            onClick={() => { setConfirmDeleteId(a.record_id); setConfirmDeleteType('anmeldung'); }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* No Selection: show chart overview */
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 h-full">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-primary" />
                <h3 className="text-sm font-600 text-foreground">Anmeldungen pro Kurs</h3>
              </div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} barCategoryGap="35%">
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        fontSize: 12,
                        boxShadow: '0 4px 12px -2px oklch(0.18 0.02 255 / 0.12)',
                      }}
                      cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                    />
                    <Bar
                      dataKey="count"
                      name="Anmeldungen"
                      fill="var(--primary)"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <BarChart3 size={28} className="text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Noch keine Daten</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center">
                Kurs auswählen für Details &amp; Anmeldungen
              </p>

              {/* Revenue summary */}
              {revenue > 0 && (
                <div className="mt-2 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Einnahmen (bezahlt)</span>
                  <span className="text-base font-700 text-green-600">{formatCurrency(revenue)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Kurs Dialog */}
      <KursDialog
        open={showKursDialog}
        onClose={() => { setShowKursDialog(false); setEditingKurs(null); }}
        editingKurs={editingKurs}
        dozenten={[...dozentenMap.values()]}
        raeume={[...raeumeMap.values()]}
        onSaved={() => { setShowKursDialog(false); setEditingKurs(null); fetchAll(); }}
      />

      {/* Anmeldung Dialog */}
      <AnmeldungDialog
        open={showAnmeldungDialog}
        onClose={() => { setShowAnmeldungDialog(false); setEditingAnmeldung(null); }}
        kursId={selectedKursId}
        teilnehmer={[...teilnehmerMap.values()]}
        onSaved={() => { setShowAnmeldungDialog(false); setEditingAnmeldung(null); fetchAll(); }}
      />

      {/* Confirm Delete */}
      <ConfirmDeleteDialog
        open={confirmDeleteId !== null}
        type={confirmDeleteType}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (!confirmDeleteId) return;
          if (confirmDeleteType === 'kurs') {
            await LivingAppsService.deleteKurseEntry(confirmDeleteId);
            if (selectedKursId === confirmDeleteId) setSelectedKursId(null);
          } else {
            await LivingAppsService.deleteAnmeldungenEntry(confirmDeleteId);
          }
          setConfirmDeleteId(null);
          fetchAll();
        }}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
      />
    </div>
  );
}

// ---- Sub-components ----

function KpiCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: 'blue' | 'purple' | 'green' | 'orange';
}) {
  const accentMap = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accentMap[accent]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-800 text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function MetaChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2">
      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
        {icon}
        {label}
      </p>
      <p className="text-sm font-500 text-foreground truncate">{value}</p>
    </div>
  );
}

// ---- KursDialog ----
import type { Dozenten, Raeume } from '@/types/app';

function KursDialog({
  open,
  onClose,
  editingKurs,
  dozenten,
  raeume,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editingKurs: Kurse | null;
  dozenten: Dozenten[];
  raeume: Raeume[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    titel: editingKurs?.fields.titel ?? '',
    beschreibung: editingKurs?.fields.beschreibung ?? '',
    startdatum: editingKurs?.fields.startdatum ?? '',
    enddatum: editingKurs?.fields.enddatum ?? '',
    max_teilnehmer: editingKurs?.fields.max_teilnehmer?.toString() ?? '',
    preis: editingKurs?.fields.preis?.toString() ?? '',
    dozent: editingKurs?.fields.dozent ? (extractRecordId(editingKurs.fields.dozent) ?? 'none') : 'none',
    raum: editingKurs?.fields.raum ? (extractRecordId(editingKurs.fields.raum) ?? 'none') : 'none',
  });
  const [saving, setSaving] = useState(false);

  // Reset when dialog opens
  useState(() => {
    setForm({
      titel: editingKurs?.fields.titel ?? '',
      beschreibung: editingKurs?.fields.beschreibung ?? '',
      startdatum: editingKurs?.fields.startdatum ?? '',
      enddatum: editingKurs?.fields.enddatum ?? '',
      max_teilnehmer: editingKurs?.fields.max_teilnehmer?.toString() ?? '',
      preis: editingKurs?.fields.preis?.toString() ?? '',
      dozent: editingKurs?.fields.dozent ? (extractRecordId(editingKurs.fields.dozent) ?? 'none') : 'none',
      raum: editingKurs?.fields.raum ? (extractRecordId(editingKurs.fields.raum) ?? 'none') : 'none',
    });
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const fields: Kurse['fields'] = {
        titel: form.titel || undefined,
        beschreibung: form.beschreibung || undefined,
        startdatum: form.startdatum || undefined,
        enddatum: form.enddatum || undefined,
        max_teilnehmer: form.max_teilnehmer ? Number(form.max_teilnehmer) : undefined,
        preis: form.preis ? Number(form.preis) : undefined,
        dozent: form.dozent !== 'none' ? createRecordUrl(APP_IDS.DOZENTEN, form.dozent) : undefined,
        raum: form.raum !== 'none' ? createRecordUrl(APP_IDS.RAEUME, form.raum) : undefined,
      };
      if (editingKurs) {
        await LivingAppsService.updateKurseEntry(editingKurs.record_id, fields);
      } else {
        await LivingAppsService.createKurseEntry(fields);
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingKurs ? 'Kurs bearbeiten' : 'Neuen Kurs anlegen'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs font-500">Kurstitel</Label>
            <Input value={form.titel} onChange={e => setForm(f => ({ ...f, titel: e.target.value }))} placeholder="Titel…" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-500">Beschreibung</Label>
            <Input value={form.beschreibung} onChange={e => setForm(f => ({ ...f, beschreibung: e.target.value }))} placeholder="Beschreibung…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-500">Startdatum</Label>
              <Input type="date" value={form.startdatum} onChange={e => setForm(f => ({ ...f, startdatum: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-500">Enddatum</Label>
              <Input type="date" value={form.enddatum} onChange={e => setForm(f => ({ ...f, enddatum: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-500">Max. Teilnehmer</Label>
              <Input type="number" value={form.max_teilnehmer} onChange={e => setForm(f => ({ ...f, max_teilnehmer: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-500">Preis (€)</Label>
              <Input type="number" value={form.preis} onChange={e => setForm(f => ({ ...f, preis: e.target.value }))} placeholder="0.00" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-500">Dozent</Label>
            <Select value={form.dozent} onValueChange={v => setForm(f => ({ ...f, dozent: v }))}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Dozent wählen" /></SelectTrigger>
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
          <div className="space-y-1">
            <Label className="text-xs font-500">Raum</Label>
            <Select value={form.raum} onValueChange={v => setForm(f => ({ ...f, raum: v }))}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Raum wählen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Raum</SelectItem>
                {raeume.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.raumname}{r.fields.gebaeude ? ` · ${r.fields.gebaeude}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={saving || !form.titel}>
            {saving ? 'Speichern…' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- AnmeldungDialog ----
import type { Teilnehmer } from '@/types/app';

function AnmeldungDialog({
  open,
  onClose,
  kursId,
  teilnehmer,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  kursId: string | null;
  teilnehmer: Teilnehmer[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    teilnehmer_id: 'none',
    anmeldedatum: new Date().toISOString().slice(0, 10),
    bezahlt: false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!kursId) return;
    setSaving(true);
    try {
      const fields: Anmeldungen['fields'] = {
        kurs: createRecordUrl(APP_IDS.KURSE, kursId),
        teilnehmer: form.teilnehmer_id !== 'none'
          ? createRecordUrl(APP_IDS.TEILNEHMER, form.teilnehmer_id)
          : undefined,
        anmeldedatum: form.anmeldedatum || undefined,
        bezahlt: form.bezahlt,
      };
      await LivingAppsService.createAnmeldungenEntry(fields);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Neue Anmeldung</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs font-500">Teilnehmer</Label>
            <Select value={form.teilnehmer_id} onValueChange={v => setForm(f => ({ ...f, teilnehmer_id: v }))}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Teilnehmer wählen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Teilnehmer</SelectItem>
                {teilnehmer.map(t => (
                  <SelectItem key={t.record_id} value={t.record_id}>
                    {t.fields.vorname} {t.fields.nachname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-500">Anmeldedatum</Label>
            <Input type="date" value={form.anmeldedatum} onChange={e => setForm(f => ({ ...f, anmeldedatum: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="bezahlt"
              checked={form.bezahlt}
              onCheckedChange={v => setForm(f => ({ ...f, bezahlt: v === true }))}
            />
            <Label htmlFor="bezahlt" className="text-sm cursor-pointer">Bereits bezahlt</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Speichern…' : 'Anmelden'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Confirm Delete ----
function ConfirmDeleteDialog({
  open,
  type,
  onCancel,
  onConfirm,
  isSubmitting,
  setIsSubmitting,
}: {
  open: boolean;
  type: 'kurs' | 'anmeldung';
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
}) {
  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{type === 'kurs' ? 'Kurs löschen?' : 'Anmeldung löschen?'}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          {type === 'kurs'
            ? 'Dieser Kurs und alle zugehörigen Daten werden unwiderruflich gelöscht.'
            : 'Diese Anmeldung wird unwiderruflich gelöscht.'}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>Abbrechen</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Löschen…' : 'Löschen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Loading / Error ----
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

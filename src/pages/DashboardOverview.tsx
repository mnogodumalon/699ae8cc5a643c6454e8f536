import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichKurse, enrichAnmeldungen } from '@/lib/enrich';
import type { EnrichedKurse, EnrichedAnmeldungen } from '@/types/enriched';
import type { Kurse } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { IconAlertCircle, IconChevronLeft, IconChevronRight, IconPlus, IconUsers, IconBook, IconSchool, IconCurrencyEuro, IconCalendar, IconMapPin, IconClock, IconX, IconCheck, IconEdit, IconTrash } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isWithinInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export default function DashboardOverview() {
  const {
    kurse, teilnehmer, kursanmeldung, dozenten, raeume, anmeldungen,
    kurseMap, teilnehmerMap, dozentenMap, raeumeMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedKurs, setSelectedKurs] = useState<EnrichedKurse | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const enrichedKurse = enrichKurse(kurse, { dozentenMap, raeumeMap });
  const enrichedAnmeldungen = enrichAnmeldungen(anmeldungen, { teilnehmerMap, kurseMap });

  const stats = useMemo(() => {
    const activeKurse = kurse.filter(k => {
      if (!k.fields.enddatum) return true;
      return new Date(k.fields.enddatum) >= new Date();
    });
    const totalRevenue = anmeldungen
      .filter(a => a.fields.bezahlt)
      .reduce((sum, a) => {
        const kursId = extractRecordId(a.fields.kurs);
        const kurs = kursId ? kurseMap.get(kursId) : null;
        return sum + (kurs?.fields.preis || 0);
      }, 0);
    const pendingPayments = anmeldungen.filter(a => !a.fields.bezahlt).length;

    return {
      totalKurse: activeKurse.length,
      totalTeilnehmer: teilnehmer.length,
      totalDozenten: dozenten.length,
      totalRevenue,
      pendingPayments,
      totalAnmeldungen: anmeldungen.length,
    };
  }, [kurse, teilnehmer, dozenten, anmeldungen, kurseMap]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    const startDay = start.getDay();
    const prefixDays = startDay === 0 ? 6 : startDay - 1;

    const allDays: (Date | null)[] = [];
    for (let i = 0; i < prefixDays; i++) {
      allDays.push(null);
    }
    allDays.push(...days);

    return allDays;
  }, [currentMonth]);

  const getKurseForDate = (date: Date): EnrichedKurse[] => {
    return enrichedKurse.filter(k => {
      if (!k.fields.startdatum) return false;
      const start = parseISO(k.fields.startdatum);
      const end = k.fields.enddatum ? parseISO(k.fields.enddatum) : start;
      return isWithinInterval(date, { start, end }) || isSameDay(date, start) || isSameDay(date, end);
    });
  };

  const handleCreateKurs = async (data: Kurse['fields']) => {
    await LivingAppsService.createKurseEntry(data);
    setIsCreateDialogOpen(false);
    setSelectedDate(null);
    fetchAll();
  };

  const handleUpdateKurs = async (id: string, data: Kurse['fields']) => {
    await LivingAppsService.updateKurseEntry(id, data);
    setIsEditDialogOpen(false);
    setSelectedKurs(null);
    fetchAll();
  };

  const handleDeleteKurs = async (id: string) => {
    await LivingAppsService.deleteKurseEntry(id);
    setIsDeleteConfirmOpen(false);
    setSelectedKurs(null);
    fetchAll();
  };

  const getAnmeldungenForKurs = (kursId: string): EnrichedAnmeldungen[] => {
    return enrichedAnmeldungen.filter(a => {
      const id = extractRecordId(a.fields.kurs);
      return id === kursId;
    });
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const selectedDateKurse = selectedDate ? getKurseForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kursübersicht</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Verwalten Sie Ihre Kurse und Anmeldungen</p>
        </div>
        <Button onClick={() => { setSelectedDate(new Date()); setIsCreateDialogOpen(true); }} className="gap-2">
          <IconPlus size={16} stroke={1.5} />
          Neuer Kurs
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <IconBook size={18} stroke={1.5} className="text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalKurse}</p>
              <p className="text-xs text-muted-foreground">Aktive Kurse</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <IconUsers size={18} stroke={1.5} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalAnmeldungen}</p>
              <p className="text-xs text-muted-foreground">Anmeldungen</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <IconCurrencyEuro size={18} stroke={1.5} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">Bezahlt</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <IconClock size={18} stroke={1.5} className="text-rose-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.pendingPayments}</p>
              <p className="text-xs text-muted-foreground">Ausstehend</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar and Detail Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border/50 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-foreground">
              {format(currentMonth, 'MMMM yyyy', { locale: de })}
            </h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <IconChevronLeft size={16} stroke={1.5} />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={() => setCurrentMonth(new Date())}>
                Heute
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <IconChevronRight size={16} stroke={1.5} />
              </Button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="aspect-square" />;
              }

              const dayKurse = getKurseForDate(day);
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    aspect-square rounded-xl p-1 flex flex-col items-center justify-start gap-0.5
                    transition-all hover:bg-accent relative
                    ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                    ${isSelected ? 'bg-primary text-primary-foreground' : ''}
                  `}
                >
                  <span className={`text-sm font-medium ${isSelected ? 'text-primary-foreground' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {dayKurse.length > 0 && (
                    <div className="flex gap-0.5">
                      {dayKurse.slice(0, 3).map((k) => (
                        <div
                          key={k.record_id}
                          className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`}
                        />
                      ))}
                      {dayKurse.length > 3 && (
                        <span className={`text-[9px] ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                          +{dayKurse.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Detail */}
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">
              {selectedDate ? format(selectedDate, 'EEEE, d. MMMM', { locale: de }) : 'Wählen Sie einen Tag'}
            </h3>
            {selectedDate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => { setIsCreateDialogOpen(true); }}
              >
                <IconPlus size={16} stroke={1.5} />
              </Button>
            )}
          </div>

          {!selectedDate ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <IconCalendar size={40} stroke={1.5} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Klicken Sie auf einen Tag im Kalender</p>
            </div>
          ) : selectedDateKurse.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <IconBook size={40} stroke={1.5} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Keine Kurse an diesem Tag</p>
              <Button variant="outline" size="sm" onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                <IconPlus size={14} stroke={1.5} />
                Kurs anlegen
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateKurse.map(kurs => {
                const kursAnmeldungen = getAnmeldungenForKurs(kurs.record_id);
                const maxTeilnehmer = kurs.fields.max_teilnehmer || 0;
                const fillPercent = maxTeilnehmer > 0 ? Math.min(100, (kursAnmeldungen.length / maxTeilnehmer) * 100) : 0;

                return (
                  <div
                    key={kurs.record_id}
                    className="p-4 rounded-xl bg-accent/50 border border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => { setSelectedKurs(kurs); setIsEditDialogOpen(true); }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-foreground line-clamp-1">{kurs.fields.titel || 'Ohne Titel'}</h4>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {formatCurrency(kurs.fields.preis)}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {kurs.dozentName && (
                        <div className="flex items-center gap-1.5">
                          <IconSchool size={12} stroke={1.5} />
                          <span>{kurs.dozentName}</span>
                        </div>
                      )}
                      {kurs.raumName && (
                        <div className="flex items-center gap-1.5">
                          <IconMapPin size={12} stroke={1.5} />
                          <span>{kurs.raumName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <IconUsers size={12} stroke={1.5} />
                        <span>{kursAnmeldungen.length} / {maxTeilnehmer || '∞'} Teilnehmer</span>
                      </div>
                    </div>

                    {maxTeilnehmer > 0 && (
                      <div className="mt-3">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${fillPercent >= 100 ? 'bg-rose-500' : fillPercent >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Courses List */}
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <h3 className="font-semibold text-foreground mb-4">Kommende Kurse</h3>
        {enrichedKurse.filter(k => k.fields.startdatum && new Date(k.fields.startdatum) >= new Date()).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Keine kommenden Kurse</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground py-2 pr-4">Kurs</th>
                  <th className="text-left text-xs font-medium text-muted-foreground py-2 pr-4 hidden sm:table-cell">Dozent</th>
                  <th className="text-left text-xs font-medium text-muted-foreground py-2 pr-4">Zeitraum</th>
                  <th className="text-left text-xs font-medium text-muted-foreground py-2 pr-4 hidden md:table-cell">Raum</th>
                  <th className="text-right text-xs font-medium text-muted-foreground py-2">Teilnehmer</th>
                </tr>
              </thead>
              <tbody>
                {enrichedKurse
                  .filter(k => k.fields.startdatum && new Date(k.fields.startdatum) >= new Date())
                  .sort((a, b) => new Date(a.fields.startdatum!).getTime() - new Date(b.fields.startdatum!).getTime())
                  .slice(0, 10)
                  .map(kurs => {
                    const kursAnmeldungen = getAnmeldungenForKurs(kurs.record_id);
                    return (
                      <tr
                        key={kurs.record_id}
                        className="border-b border-border/50 last:border-0 hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => { setSelectedKurs(kurs); setIsEditDialogOpen(true); }}
                      >
                        <td className="py-3 pr-4">
                          <p className="font-medium text-foreground text-sm">{kurs.fields.titel}</p>
                        </td>
                        <td className="py-3 pr-4 hidden sm:table-cell">
                          <p className="text-sm text-muted-foreground">{kurs.dozentName || '—'}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-sm text-muted-foreground">
                            {formatDate(kurs.fields.startdatum)}
                            {kurs.fields.enddatum && kurs.fields.enddatum !== kurs.fields.startdatum && (
                              <> – {formatDate(kurs.fields.enddatum)}</>
                            )}
                          </p>
                        </td>
                        <td className="py-3 pr-4 hidden md:table-cell">
                          <p className="text-sm text-muted-foreground">{kurs.raumName || '—'}</p>
                        </td>
                        <td className="py-3 text-right">
                          <Badge variant={kursAnmeldungen.length >= (kurs.fields.max_teilnehmer || 999) ? 'destructive' : 'secondary'}>
                            {kursAnmeldungen.length} / {kurs.fields.max_teilnehmer || '∞'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <KursDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSave={handleCreateKurs}
        defaultDate={selectedDate}
        dozenten={dozenten}
        raeume={raeume}
      />

      {/* Edit Dialog */}
      {selectedKurs && (
        <KursDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setSelectedKurs(null); }}
          onSave={(data) => handleUpdateKurs(selectedKurs.record_id, data)}
          onDelete={() => setIsDeleteConfirmOpen(true)}
          kurs={selectedKurs}
          dozenten={dozenten}
          raeume={raeume}
          anmeldungen={getAnmeldungenForKurs(selectedKurs.record_id)}
        />
      )}

      {/* Delete Confirm Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kurs löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Möchten Sie den Kurs "{selectedKurs?.fields.titel}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={() => selectedKurs && handleDeleteKurs(selectedKurs.record_id)}>
              Löschen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface KursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Kurse['fields']) => void;
  onDelete?: () => void;
  kurs?: EnrichedKurse;
  defaultDate?: Date | null;
  dozenten: Array<{ record_id: string; fields: { vorname?: string; nachname?: string } }>;
  raeume: Array<{ record_id: string; fields: { raumname?: string; gebaeude?: string } }>;
  anmeldungen?: EnrichedAnmeldungen[];
}

function KursDialog({ open, onOpenChange, onSave, onDelete, kurs, defaultDate, dozenten, raeume, anmeldungen }: KursDialogProps) {
  const [formData, setFormData] = useState<Kurse['fields']>({});
  const [saving, setSaving] = useState(false);

  useState(() => {
    if (kurs) {
      setFormData({
        titel: kurs.fields.titel || '',
        beschreibung: kurs.fields.beschreibung || '',
        startdatum: kurs.fields.startdatum || '',
        enddatum: kurs.fields.enddatum || '',
        max_teilnehmer: kurs.fields.max_teilnehmer,
        preis: kurs.fields.preis,
        dozent: kurs.fields.dozent,
        raum: kurs.fields.raum,
      });
    } else if (defaultDate) {
      setFormData({
        startdatum: format(defaultDate, 'yyyy-MM-dd'),
        enddatum: format(defaultDate, 'yyyy-MM-dd'),
      });
    } else {
      setFormData({});
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const dozentId = kurs?.fields.dozent ? extractRecordId(kurs.fields.dozent) : undefined;
  const raumId = kurs?.fields.raum ? extractRecordId(kurs.fields.raum) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{kurs ? 'Kurs bearbeiten' : 'Neuer Kurs'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="titel">Kurstitel</Label>
            <Input
              id="titel"
              value={formData.titel || ''}
              onChange={(e) => setFormData({ ...formData, titel: e.target.value })}
              placeholder="z.B. Yoga für Anfänger"
            />
          </div>

          <div>
            <Label htmlFor="beschreibung">Beschreibung</Label>
            <Textarea
              id="beschreibung"
              value={formData.beschreibung || ''}
              onChange={(e) => setFormData({ ...formData, beschreibung: e.target.value })}
              placeholder="Kursbeschreibung..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startdatum">Startdatum</Label>
              <Input
                id="startdatum"
                type="date"
                value={formData.startdatum || ''}
                onChange={(e) => setFormData({ ...formData, startdatum: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="enddatum">Enddatum</Label>
              <Input
                id="enddatum"
                type="date"
                value={formData.enddatum || ''}
                onChange={(e) => setFormData({ ...formData, enddatum: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max_teilnehmer">Max. Teilnehmer</Label>
              <Input
                id="max_teilnehmer"
                type="number"
                min={0}
                value={formData.max_teilnehmer ?? ''}
                onChange={(e) => setFormData({ ...formData, max_teilnehmer: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Unbegrenzt"
              />
            </div>
            <div>
              <Label htmlFor="preis">Preis (EUR)</Label>
              <Input
                id="preis"
                type="number"
                min={0}
                step="0.01"
                value={formData.preis ?? ''}
                onChange={(e) => setFormData({ ...formData, preis: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="0,00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="dozent">Dozent</Label>
            <Select
              value={formData.dozent ? extractRecordId(formData.dozent) || 'none' : dozentId || 'none'}
              onValueChange={(val) => setFormData({
                ...formData,
                dozent: val === 'none' ? undefined : createRecordUrl(APP_IDS.DOZENTEN, val)
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Dozent auswählen" />
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

          <div>
            <Label htmlFor="raum">Raum</Label>
            <Select
              value={formData.raum ? extractRecordId(formData.raum) || 'none' : raumId || 'none'}
              onValueChange={(val) => setFormData({
                ...formData,
                raum: val === 'none' ? undefined : createRecordUrl(APP_IDS.RAEUME, val)
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Raum auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Raum</SelectItem>
                {raeume.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.raumname} {r.fields.gebaeude && `(${r.fields.gebaeude})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Show registrations if editing */}
          {kurs && anmeldungen && anmeldungen.length > 0 && (
            <div className="border-t border-border pt-4">
              <Label className="mb-2 block">Anmeldungen ({anmeldungen.length})</Label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {anmeldungen.map(a => (
                  <div key={a.record_id} className="flex items-center justify-between py-1.5 px-2 rounded bg-accent/50 text-sm">
                    <span>{a.teilnehmerName || 'Unbekannt'}</span>
                    <Badge variant={a.fields.bezahlt ? 'default' : 'secondary'} className="text-xs">
                      {a.fields.bezahlt ? <IconCheck size={10} stroke={1.5} className="mr-1" /> : null}
                      {a.fields.bezahlt ? 'Bezahlt' : 'Offen'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            {onDelete ? (
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
                <IconTrash size={16} stroke={1.5} className="mr-2" />
                Löschen
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
          </div>
        </form>
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
        <IconAlertCircle size={22} stroke={1.5} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}

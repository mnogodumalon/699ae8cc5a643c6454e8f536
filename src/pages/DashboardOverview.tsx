import { useState, useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichKurse, enrichAnmeldungen } from '@/lib/enrich';
import type { EnrichedKurse, EnrichedAnmeldungen } from '@/types/enriched';
import type { Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Users, BookOpen, Calendar, Euro, GraduationCap, MapPin, Plus, Check, X, ChevronRight, UserPlus, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export default function DashboardOverview() {
  const {
    kurse, teilnehmer, kursanmeldung, dozenten, raeume, anmeldungen,
    kurseMap, teilnehmerMap, dozentenMap, raeumeMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const [selectedKurs, setSelectedKurs] = useState<EnrichedKurse | null>(null);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedTeilnehmer, setSelectedTeilnehmer] = useState<string>('');
  const [bezahlt, setBezahlt] = useState(false);
  const [saving, setSaving] = useState(false);

  const enrichedKurse = enrichKurse(kurse, { dozentenMap, raeumeMap });
  const enrichedAnmeldungen = enrichAnmeldungen(anmeldungen, { teilnehmerMap, kurseMap });

  // Get registrations per course
  const anmeldungenByKurs = useMemo(() => {
    const map = new Map<string, EnrichedAnmeldungen[]>();
    enrichedAnmeldungen.forEach(a => {
      const kursId = extractRecordId(a.fields.kurs);
      if (kursId) {
        const existing = map.get(kursId) || [];
        existing.push(a);
        map.set(kursId, existing);
      }
    });
    return map;
  }, [enrichedAnmeldungen]);

  // Sort courses by start date
  const sortedKurse = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return [...enrichedKurse].sort((a, b) => {
      const dateA = a.fields.startdatum || '9999-12-31';
      const dateB = b.fields.startdatum || '9999-12-31';
      return dateA.localeCompare(dateB);
    });
  }, [enrichedKurse]);

  // Upcoming courses (start date >= today)
  const upcomingKurse = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return sortedKurse.filter(k => (k.fields.startdatum || '') >= today);
  }, [sortedKurse]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const activeKurse = kurse.filter(k => {
      const start = k.fields.startdatum || '';
      const end = k.fields.enddatum || '9999-12-31';
      return start <= today && end >= today;
    });
    const totalRevenue = anmeldungen.reduce((sum, a) => {
      if (!a.fields.bezahlt) return sum;
      const kursId = extractRecordId(a.fields.kurs);
      if (!kursId) return sum;
      const kurs = kurseMap.get(kursId);
      return sum + (kurs?.fields.preis || 0);
    }, 0);
    const unpaidCount = anmeldungen.filter(a => !a.fields.bezahlt).length;
    return {
      totalKurse: kurse.length,
      activeKurse: activeKurse.length,
      totalTeilnehmer: teilnehmer.length,
      totalAnmeldungen: anmeldungen.length,
      totalRevenue,
      unpaidCount,
    };
  }, [kurse, teilnehmer, anmeldungen, kurseMap]);

  // Handle registration
  const handleRegister = async () => {
    if (!selectedKurs || !selectedTeilnehmer) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await LivingAppsService.createAnmeldungenEntry({
        kurs: createRecordUrl(APP_IDS.KURSE, selectedKurs.record_id),
        teilnehmer: createRecordUrl(APP_IDS.TEILNEHMER, selectedTeilnehmer),
        anmeldedatum: today,
        bezahlt,
      });
      await fetchAll();
      setRegisterDialogOpen(false);
      setSelectedTeilnehmer('');
      setBezahlt(false);
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle bezahlt
  const handleToggleBezahlt = async (anmeldung: EnrichedAnmeldungen) => {
    await LivingAppsService.updateAnmeldungenEntry(anmeldung.record_id, {
      bezahlt: !anmeldung.fields.bezahlt,
    });
    fetchAll();
  };

  // Handle remove registration
  const handleRemoveAnmeldung = async (id: string) => {
    await LivingAppsService.deleteAnmeldungenEntry(id);
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const kursAnmeldungen = selectedKurs ? anmeldungenByKurs.get(selectedKurs.record_id) || [] : [];
  const registeredTeilnehmerIds = new Set(kursAnmeldungen.map(a => extractRecordId(a.fields.teilnehmer)).filter(Boolean));
  const availableTeilnehmer = teilnehmer.filter(t => !registeredTeilnehmerIds.has(t.record_id));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Kursverwaltung</h1>
        <p className="text-muted-foreground mt-1">Übersicht aller Kurse und Anmeldungen</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen size={18} className="text-primary" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalKurse}</p>
          <p className="text-sm text-muted-foreground">Kurse gesamt</p>
        </div>
        <div className="bg-card rounded-2xl border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Users size={18} className="text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalAnmeldungen}</p>
          <p className="text-sm text-muted-foreground">Anmeldungen</p>
        </div>
        <div className="bg-card rounded-2xl border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Euro size={18} className="text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-sm text-muted-foreground">Bezahlte Einnahmen</p>
        </div>
        <div className="bg-card rounded-2xl border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <Clock size={18} className="text-rose-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.unpaidCount}</p>
          <p className="text-sm text-muted-foreground">Offene Zahlungen</p>
        </div>
      </div>

      {/* Main Content: Course Cards + Detail Panel */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Course Cards */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Kommende Kurse</h2>
            <Badge variant="secondary" className="font-normal">
              {upcomingKurse.length} Kurse
            </Badge>
          </div>

          {upcomingKurse.length === 0 ? (
            <div className="bg-card rounded-2xl border p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Calendar size={20} className="text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Keine kommenden Kurse</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingKurse.map(kurs => {
                const kursAnm = anmeldungenByKurs.get(kurs.record_id) || [];
                const maxTeilnehmer = kurs.fields.max_teilnehmer || 0;
                const currentCount = kursAnm.length;
                const isFull = maxTeilnehmer > 0 && currentCount >= maxTeilnehmer;
                const fillPercent = maxTeilnehmer > 0 ? Math.min(100, (currentCount / maxTeilnehmer) * 100) : 0;
                const isSelected = selectedKurs?.record_id === kurs.record_id;

                return (
                  <button
                    key={kurs.record_id}
                    onClick={() => setSelectedKurs(kurs)}
                    className={cn(
                      "w-full text-left bg-card rounded-2xl border p-5 transition-all hover:shadow-md",
                      isSelected && "ring-2 ring-primary border-primary"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground truncate">{kurs.fields.titel || 'Unbenannter Kurs'}</h3>
                          {isFull && (
                            <Badge variant="destructive" className="text-xs shrink-0">Ausgebucht</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar size={14} />
                            {formatDate(kurs.fields.startdatum)}
                            {kurs.fields.enddatum && kurs.fields.enddatum !== kurs.fields.startdatum && (
                              <> – {formatDate(kurs.fields.enddatum)}</>
                            )}
                          </span>
                          {kurs.dozentName && (
                            <span className="flex items-center gap-1.5">
                              <GraduationCap size={14} />
                              {kurs.dozentName}
                            </span>
                          )}
                          {kurs.raumName && (
                            <span className="flex items-center gap-1.5">
                              <MapPin size={14} />
                              {kurs.raumName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-foreground">{formatCurrency(kurs.fields.preis)}</p>
                        <p className="text-sm text-muted-foreground">
                          {currentCount}{maxTeilnehmer > 0 && `/${maxTeilnehmer}`} Teilnehmer
                        </p>
                      </div>
                    </div>
                    {maxTeilnehmer > 0 && (
                      <div className="mt-4">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              fillPercent >= 100 ? "bg-destructive" : fillPercent >= 75 ? "bg-amber-500" : "bg-primary"
                            )}
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2">
          {selectedKurs ? (
            <div className="bg-card rounded-2xl border sticky top-6">
              <div className="p-5 border-b">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground">{selectedKurs.fields.titel}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDate(selectedKurs.fields.startdatum)}
                      {selectedKurs.fields.enddatum && selectedKurs.fields.enddatum !== selectedKurs.fields.startdatum && (
                        <> – {formatDate(selectedKurs.fields.enddatum)}</>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setRegisterDialogOpen(true)}
                    disabled={selectedKurs.fields.max_teilnehmer ? kursAnmeldungen.length >= selectedKurs.fields.max_teilnehmer : false}
                  >
                    <UserPlus size={16} className="mr-1.5" />
                    Anmelden
                  </Button>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-foreground">Teilnehmer</h4>
                  <Badge variant="outline">
                    {kursAnmeldungen.length}
                    {selectedKurs.fields.max_teilnehmer && ` / ${selectedKurs.fields.max_teilnehmer}`}
                  </Badge>
                </div>

                {kursAnmeldungen.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                      <Users size={16} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Noch keine Anmeldungen</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {kursAnmeldungen.map(anm => (
                      <div
                        key={anm.record_id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/50 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-medium text-primary">
                              {anm.teilnehmerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{anm.teilnehmerName}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(anm.fields.anmeldedatum)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleBezahlt(anm)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                              anm.fields.bezahlt
                                ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                            )}
                          >
                            {anm.fields.bezahlt ? 'Bezahlt' : 'Offen'}
                          </button>
                          <button
                            onClick={() => handleRemoveAnmeldung(anm.record_id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border p-8 text-center sticky top-6">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <ChevronRight size={20} className="text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Wählen Sie einen Kurs aus, um die Teilnehmer zu sehen</p>
            </div>
          )}
        </div>
      </div>

      {/* Registration Dialog */}
      <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teilnehmer anmelden</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Kurs</Label>
              <div className="p-3 rounded-lg bg-muted text-sm">
                {selectedKurs?.fields.titel}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Teilnehmer</Label>
              <Select value={selectedTeilnehmer} onValueChange={setSelectedTeilnehmer}>
                <SelectTrigger>
                  <SelectValue placeholder="Teilnehmer auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {availableTeilnehmer.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Alle Teilnehmer bereits angemeldet
                    </div>
                  ) : (
                    availableTeilnehmer.map(t => (
                      <SelectItem key={t.record_id} value={t.record_id}>
                        {t.fields.vorname} {t.fields.nachname}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <Label htmlFor="bezahlt" className="cursor-pointer">Bereits bezahlt</Label>
              <Switch id="bezahlt" checked={bezahlt} onCheckedChange={setBezahlt} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleRegister} disabled={!selectedTeilnehmer || saving}>
              {saving ? 'Wird gespeichert...' : 'Anmelden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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

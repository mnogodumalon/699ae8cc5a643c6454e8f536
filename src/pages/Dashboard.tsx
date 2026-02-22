import { useState, useEffect, useMemo } from 'react';
import type {
  Dozenten, Raeume, Kurse, Teilnehmer, Anmeldungen, Kursanmeldung
} from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { format, parseISO, isAfter, isBefore, isToday, startOfDay, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Plus, Users, BookOpen, GraduationCap, DoorOpen, AlertCircle,
  Pencil, Trash2, ChevronRight, CalendarDays, Euro, User,
  TrendingUp, CheckCircle, XCircle, Building, Phone, Mail, Clock
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from '@/components/ui/accordion';

// Simple toast implementation using state
function useToast() {
  const [toasts, setToasts] = useState<Array<{id: number, title: string, description?: string, variant?: 'default' | 'destructive'}>>([]);

  const toast = ({ title, description, variant = 'default' }: { title: string; description?: string; variant?: 'default' | 'destructive' }) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, description, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  return { toast, toasts };
}

function ToastContainer({ toasts }: { toasts: Array<{id: number, title: string, description?: string, variant?: 'default' | 'destructive'}> }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`p-4 rounded-lg shadow-lg border ${
            t.variant === 'destructive'
              ? 'bg-destructive text-white border-destructive'
              : 'bg-card text-card-foreground border-border'
          }`}
        >
          <p className="font-semibold">{t.title}</p>
          {t.description && <p className="text-sm opacity-90">{t.description}</p>}
        </div>
      ))}
    </div>
  );
}

// Circular Progress Ring Component
function CapacityRing({ percentage, enrolled, total }: { percentage: number; enrolled: number; total: number }) {
  const radius = 80;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(235 65% 48%)" />
            <stop offset="100%" stopColor="hsl(173 65% 40%)" />
          </linearGradient>
        </defs>
        <circle
          stroke="hsl(45 20% 88%)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="url(#progressGradient)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease-out' }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold text-foreground">{Math.round(percentage)}%</span>
        <span className="text-sm text-muted-foreground">Auslastung</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{enrolled} von {total} Plätzen belegt</p>
    </div>
  );
}

// Loading Skeleton
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-64" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-4 max-w-sm">{description}</p>
      {action}
    </div>
  );
}

export default function Dashboard() {
  // Data state
  const [dozenten, setDozenten] = useState<Dozenten[]>([]);
  const [raeume, setRaeume] = useState<Raeume[]>([]);
  const [kurse, setKurse] = useState<Kurse[]>([]);
  const [teilnehmer, setTeilnehmer] = useState<Teilnehmer[]>([]);
  const [anmeldungen, setAnmeldungen] = useState<Anmeldungen[]>([]);
  const [kursanmeldungen, setKursanmeldungen] = useState<Kursanmeldung[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('kurse');
  const [kursFilter, setKursFilter] = useState('alle');

  // Dialog states
  const [anmeldungDialogOpen, setAnmeldungDialogOpen] = useState(false);
  const [kursDialogOpen, setKursDialogOpen] = useState(false);
  const [teilnehmerDialogOpen, setTeilnehmerDialogOpen] = useState(false);
  const [dozentDialogOpen, setDozentDialogOpen] = useState(false);
  const [raumDialogOpen, setRaumDialogOpen] = useState(false);

  // Edit state
  const [editingAnmeldung, setEditingAnmeldung] = useState<Anmeldungen | null>(null);
  const [editingKurs, setEditingKurs] = useState<Kurse | null>(null);
  const [editingTeilnehmer, setEditingTeilnehmer] = useState<Teilnehmer | null>(null);
  const [editingDozent, setEditingDozent] = useState<Dozenten | null>(null);
  const [editingRaum, setEditingRaum] = useState<Raeume | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{type: string; id: string; name: string} | null>(null);

  // Toast
  const { toast, toasts } = useToast();

  // Fetch all data
  async function fetchAllData() {
    try {
      setLoading(true);
      setError(null);
      const [d, r, k, t, a, ka] = await Promise.all([
        LivingAppsService.getDozenten(),
        LivingAppsService.getRaeume(),
        LivingAppsService.getKurse(),
        LivingAppsService.getTeilnehmer(),
        LivingAppsService.getAnmeldungen(),
        LivingAppsService.getKursanmeldung(),
      ]);
      setDozenten(d);
      setRaeume(r);
      setKurse(k);
      setTeilnehmer(t);
      setAnmeldungen(a);
      setKursanmeldungen(ka);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();
  }, []);

  // Helper functions
  const today = startOfDay(new Date());

  const getDozentName = (dozentUrl: string | undefined) => {
    if (!dozentUrl) return 'Kein Dozent';
    const id = extractRecordId(dozentUrl);
    const dozent = dozenten.find(d => d.record_id === id);
    return dozent ? `${dozent.fields.vorname} ${dozent.fields.nachname}` : 'Unbekannt';
  };

  const getRaumName = (raumUrl: string | undefined) => {
    if (!raumUrl) return 'Kein Raum';
    const id = extractRecordId(raumUrl);
    const raum = raeume.find(r => r.record_id === id);
    return raum ? `${raum.fields.raumname} (${raum.fields.gebaeude || ''})` : 'Unbekannt';
  };

  const getTeilnehmerName = (teilnehmerUrl: string | undefined) => {
    if (!teilnehmerUrl) return 'Unbekannt';
    const id = extractRecordId(teilnehmerUrl);
    const t = teilnehmer.find(p => p.record_id === id);
    return t ? `${t.fields.vorname} ${t.fields.nachname}` : 'Unbekannt';
  };

  const getKursTitle = (kursUrl: string | undefined) => {
    if (!kursUrl) return 'Unbekannt';
    const id = extractRecordId(kursUrl);
    const k = kurse.find(c => c.record_id === id);
    return k?.fields.titel || 'Unbekannt';
  };

  const getKursStatus = (kurs: Kurse) => {
    const start = kurs.fields.startdatum ? parseISO(kurs.fields.startdatum) : null;
    const end = kurs.fields.enddatum ? parseISO(kurs.fields.enddatum) : null;
    if (!start || !end) return 'unbekannt';
    if (isBefore(end, today)) return 'vergangen';
    if (isAfter(start, today)) return 'kommend';
    return 'aktiv';
  };

  const getAnmeldungenForKurs = (kursId: string) => {
    return anmeldungen.filter(a => extractRecordId(a.fields.kurs) === kursId);
  };

  // Computed values
  const activeKurse = useMemo(() => {
    return kurse.filter(k => getKursStatus(k) === 'aktiv');
  }, [kurse]);

  const filteredKurse = useMemo(() => {
    if (kursFilter === 'alle') return kurse;
    return kurse.filter(k => getKursStatus(k) === kursFilter);
  }, [kurse, kursFilter]);

  const totalCapacity = useMemo(() => {
    return activeKurse.reduce((sum, k) => sum + (k.fields.max_teilnehmer || 0), 0);
  }, [activeKurse]);

  const totalEnrolled = useMemo(() => {
    return activeKurse.reduce((sum, k) => {
      return sum + getAnmeldungenForKurs(k.record_id).length;
    }, 0);
  }, [activeKurse, anmeldungen]);

  const capacityPercentage = totalCapacity > 0 ? (totalEnrolled / totalCapacity) * 100 : 0;

  const unpaidCount = useMemo(() => {
    return anmeldungen.filter(a => a.fields.bezahlt === false).length;
  }, [anmeldungen]);

  const recentAnmeldungen = useMemo(() => {
    return [...anmeldungen]
      .sort((a, b) => {
        const dateA = a.fields.anmeldedatum || a.createdat;
        const dateB = b.fields.anmeldedatum || b.createdat;
        return dateB.localeCompare(dateA);
      })
      .slice(0, 8);
  }, [anmeldungen]);

  const chartData = useMemo(() => {
    const last30Days: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const count = anmeldungen.filter(a => {
        const aDate = a.fields.anmeldedatum?.split('T')[0] || a.createdat.split('T')[0];
        return aDate === dateStr;
      }).length;
      last30Days.push({
        date: format(date, 'dd.MM', { locale: de }),
        count
      });
    }
    return last30Days;
  }, [anmeldungen, today]);

  // CRUD Handlers
  async function handleDeleteConfirm() {
    if (!deleteConfirm) return;
    try {
      switch (deleteConfirm.type) {
        case 'dozent':
          await LivingAppsService.deleteDozentenEntry(deleteConfirm.id);
          break;
        case 'raum':
          await LivingAppsService.deleteRaeumeEntry(deleteConfirm.id);
          break;
        case 'kurs':
          await LivingAppsService.deleteKurseEntry(deleteConfirm.id);
          break;
        case 'teilnehmer':
          await LivingAppsService.deleteTeilnehmerEntry(deleteConfirm.id);
          break;
        case 'anmeldung':
          await LivingAppsService.deleteAnmeldungenEntry(deleteConfirm.id);
          break;
      }
      toast({ title: 'Gelöscht', description: `"${deleteConfirm.name}" wurde gelöscht.` });
      setDeleteConfirm(null);
      fetchAllData();
    } catch (err) {
      toast({
        title: 'Fehler',
        description: 'Eintrag konnte nicht gelöscht werden.',
        variant: 'destructive'
      });
    }
  }

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Fehler beim Laden</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchAllData}>Erneut versuchen</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Kursverwaltung</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex"
              onClick={() => { setEditingKurs(null); setKursDialogOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-1" /> Neuer Kurs
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex"
              onClick={() => { setEditingTeilnehmer(null); setTeilnehmerDialogOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-1" /> Neuer Teilnehmer
            </Button>
            <Button
              onClick={() => { setEditingAnmeldung(null); setAnmeldungDialogOpen(true); }}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Neue</span> Anmeldung
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Hero Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Active Courses Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Aktive Kurse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{activeKurse.length}</span>
                <span className="text-sm text-muted-foreground">von {kurse.length} gesamt</span>
              </div>
            </CardContent>
          </Card>

          {/* Hero Capacity Ring */}
          <Card className="md:row-span-1 hover:shadow-md transition-shadow">
            <CardContent className="pt-6 flex justify-center">
              <CapacityRing
                percentage={capacityPercentage}
                enrolled={totalEnrolled}
                total={totalCapacity}
              />
            </CardContent>
          </Card>

          {/* Total Participants Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Teilnehmer Gesamt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{teilnehmer.length}</span>
                <span className="text-sm text-muted-foreground">registriert</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile KPI Chips */}
        <div className="flex gap-3 overflow-x-auto pb-4 md:hidden scrollbar-hide">
          <div className="flex-shrink-0 bg-card border border-border rounded-lg px-4 py-2 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <div>
              <p className="text-lg font-bold">{dozenten.length}</p>
              <p className="text-xs text-muted-foreground">Dozenten</p>
            </div>
          </div>
          <div className="flex-shrink-0 bg-card border border-border rounded-lg px-4 py-2 flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-accent" />
            <div>
              <p className="text-lg font-bold">{raeume.length}</p>
              <p className="text-xs text-muted-foreground">Räume</p>
            </div>
          </div>
          <div className={`flex-shrink-0 bg-card border rounded-lg px-4 py-2 flex items-center gap-2 ${unpaidCount > 0 ? 'border-destructive' : 'border-border'}`}>
            <AlertCircle className={`h-5 w-5 ${unpaidCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-lg font-bold">{unpaidCount}</p>
              <p className="text-xs text-muted-foreground">Unbezahlt</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="kurse">Kurse</TabsTrigger>
                <TabsTrigger value="teilnehmer">Teilnehmer</TabsTrigger>
                <TabsTrigger value="dozenten">Dozenten</TabsTrigger>
                <TabsTrigger value="raeume">Räume</TabsTrigger>
              </TabsList>

              {/* Kurse Tab */}
              <TabsContent value="kurse">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Kurse</CardTitle>
                    <Select value={kursFilter} onValueChange={setKursFilter}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alle">Alle</SelectItem>
                        <SelectItem value="aktiv">Aktiv</SelectItem>
                        <SelectItem value="kommend">Kommend</SelectItem>
                        <SelectItem value="vergangen">Vergangen</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardHeader>
                  <CardContent>
                    {filteredKurse.length === 0 ? (
                      <EmptyState
                        title="Keine Kurse"
                        description="Es wurden noch keine Kurse angelegt."
                        action={
                          <Button onClick={() => { setEditingKurs(null); setKursDialogOpen(true); }}>
                            <Plus className="h-4 w-4 mr-1" /> Kurs anlegen
                          </Button>
                        }
                      />
                    ) : (
                      <div className="hidden md:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Kurstitel</TableHead>
                              <TableHead>Dozent</TableHead>
                              <TableHead>Zeitraum</TableHead>
                              <TableHead>Anmeldungen</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="w-20"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredKurse.map(kurs => {
                              const kursAnmeldungen = getAnmeldungenForKurs(kurs.record_id);
                              const status = getKursStatus(kurs);
                              return (
                                <TableRow key={kurs.record_id} className="group">
                                  <TableCell className="font-medium">{kurs.fields.titel}</TableCell>
                                  <TableCell>{getDozentName(kurs.fields.dozent)}</TableCell>
                                  <TableCell>
                                    {kurs.fields.startdatum && kurs.fields.enddatum ? (
                                      <span className="text-sm">
                                        {format(parseISO(kurs.fields.startdatum), 'dd.MM.yy')} - {format(parseISO(kurs.fields.enddatum), 'dd.MM.yy')}
                                      </span>
                                    ) : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span>{kursAnmeldungen.length}/{kurs.fields.max_teilnehmer || 0}</span>
                                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-primary rounded-full transition-all"
                                          style={{
                                            width: `${Math.min(100, (kursAnmeldungen.length / (kurs.fields.max_teilnehmer || 1)) * 100)}%`
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={status === 'aktiv' ? 'default' : 'secondary'}
                                      className={status === 'aktiv' ? 'bg-accent text-accent-foreground' : ''}
                                    >
                                      {status === 'aktiv' ? 'Aktiv' : status === 'kommend' ? 'Kommend' : 'Vergangen'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => { setEditingKurs(kurs); setKursDialogOpen(true); }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => setDeleteConfirm({ type: 'kurs', id: kurs.record_id, name: kurs.fields.titel || 'Kurs' })}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {/* Mobile Course Cards */}
                    <div className="md:hidden space-y-3">
                      {filteredKurse.map(kurs => {
                        const kursAnmeldungen = getAnmeldungenForKurs(kurs.record_id);
                        const status = getKursStatus(kurs);
                        return (
                          <div
                            key={kurs.record_id}
                            className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-medium">{kurs.fields.titel}</h3>
                                <p className="text-sm text-muted-foreground">{getDozentName(kurs.fields.dozent)}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  {kurs.fields.startdatum && kurs.fields.enddatum && (
                                    <Badge variant="outline" className="text-xs">
                                      {format(parseISO(kurs.fields.startdatum), 'dd.MM')} - {format(parseISO(kurs.fields.enddatum), 'dd.MM')}
                                    </Badge>
                                  )}
                                  <span className="text-sm text-muted-foreground">
                                    {kursAnmeldungen.length}/{kurs.fields.max_teilnehmer} Plätze
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge
                                  variant={status === 'aktiv' ? 'default' : 'secondary'}
                                  className={status === 'aktiv' ? 'bg-accent text-accent-foreground' : ''}
                                >
                                  {status === 'aktiv' ? 'Aktiv' : status === 'kommend' ? 'Kommend' : 'Vergangen'}
                                </Badge>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => { setEditingKurs(kurs); setKursDialogOpen(true); }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => setDeleteConfirm({ type: 'kurs', id: kurs.record_id, name: kurs.fields.titel || 'Kurs' })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Teilnehmer Tab */}
              <TabsContent value="teilnehmer">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Teilnehmer</CardTitle>
                    <Button size="sm" onClick={() => { setEditingTeilnehmer(null); setTeilnehmerDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-1" /> Neu
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {teilnehmer.length === 0 ? (
                      <EmptyState
                        title="Keine Teilnehmer"
                        description="Es wurden noch keine Teilnehmer registriert."
                        action={
                          <Button onClick={() => { setEditingTeilnehmer(null); setTeilnehmerDialogOpen(true); }}>
                            <Plus className="h-4 w-4 mr-1" /> Teilnehmer anlegen
                          </Button>
                        }
                      />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>E-Mail</TableHead>
                            <TableHead className="hidden md:table-cell">Telefon</TableHead>
                            <TableHead className="hidden md:table-cell">Kurse</TableHead>
                            <TableHead className="w-20"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teilnehmer.map(t => {
                            const teilnehmerKurse = anmeldungen.filter(a => extractRecordId(a.fields.teilnehmer) === t.record_id);
                            return (
                              <TableRow key={t.record_id} className="group">
                                <TableCell className="font-medium">
                                  {t.fields.vorname} {t.fields.nachname}
                                </TableCell>
                                <TableCell>{t.fields.email || '-'}</TableCell>
                                <TableCell className="hidden md:table-cell">{t.fields.telefon || '-'}</TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <Badge variant="secondary">{teilnehmerKurse.length} Kurse</Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => { setEditingTeilnehmer(t); setTeilnehmerDialogOpen(true); }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => setDeleteConfirm({
                                        type: 'teilnehmer',
                                        id: t.record_id,
                                        name: `${t.fields.vorname} ${t.fields.nachname}`
                                      })}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Dozenten Tab */}
              <TabsContent value="dozenten">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Dozenten</CardTitle>
                    <Button size="sm" onClick={() => { setEditingDozent(null); setDozentDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-1" /> Neu
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {dozenten.length === 0 ? (
                      <EmptyState
                        title="Keine Dozenten"
                        description="Es wurden noch keine Dozenten angelegt."
                        action={
                          <Button onClick={() => { setEditingDozent(null); setDozentDialogOpen(true); }}>
                            <Plus className="h-4 w-4 mr-1" /> Dozent anlegen
                          </Button>
                        }
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dozenten.map(d => {
                          const dozentKurse = kurse.filter(k => extractRecordId(k.fields.dozent) === d.record_id);
                          return (
                            <div
                              key={d.record_id}
                              className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow group"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold">{d.fields.vorname} {d.fields.nachname}</h3>
                                  <p className="text-sm text-muted-foreground">{d.fields.fachgebiet || 'Kein Fachgebiet'}</p>
                                  <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                                    {d.fields.email && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {d.fields.email}
                                      </span>
                                    )}
                                  </div>
                                  <Badge variant="secondary" className="mt-2">
                                    {dozentKurse.length} Kurse
                                  </Badge>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => { setEditingDozent(d); setDozentDialogOpen(true); }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setDeleteConfirm({
                                      type: 'dozent',
                                      id: d.record_id,
                                      name: `${d.fields.vorname} ${d.fields.nachname}`
                                    })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Räume Tab */}
              <TabsContent value="raeume">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Räume</CardTitle>
                    <Button size="sm" onClick={() => { setEditingRaum(null); setRaumDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-1" /> Neu
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {raeume.length === 0 ? (
                      <EmptyState
                        title="Keine Räume"
                        description="Es wurden noch keine Räume angelegt."
                        action={
                          <Button onClick={() => { setEditingRaum(null); setRaumDialogOpen(true); }}>
                            <Plus className="h-4 w-4 mr-1" /> Raum anlegen
                          </Button>
                        }
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {raeume.map(r => {
                          const raumKurse = kurse.filter(k => extractRecordId(k.fields.raum) === r.record_id);
                          return (
                            <div
                              key={r.record_id}
                              className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow group"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold flex items-center gap-2">
                                    <DoorOpen className="h-4 w-4 text-accent" />
                                    {r.fields.raumname}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                    <Building className="h-3 w-3" />
                                    {r.fields.gebaeude || 'Kein Gebäude'}
                                  </div>
                                  <div className="flex items-center gap-3 mt-2">
                                    <Badge variant="outline">
                                      <Users className="h-3 w-3 mr-1" />
                                      {r.fields.kapazitaet || 0} Plätze
                                    </Badge>
                                    <Badge variant="secondary">{raumKurse.length} Kurse</Badge>
                                  </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => { setEditingRaum(r); setRaumDialogOpen(true); }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setDeleteConfirm({
                                      type: 'raum',
                                      id: r.record_id,
                                      name: r.fields.raumname || 'Raum'
                                    })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Enrollment Trend Chart */}
            <Card className="hidden md:block">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Anmeldungen der letzten 30 Tage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(235 65% 48%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(235 65% 48%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        stroke="hsl(230 10% 45%)"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="hsl(230 10% 45%)"
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(0 0% 100%)',
                          border: '1px solid hsl(45 20% 88%)',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ fontWeight: 600 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(235 65% 48%)"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCount)"
                        name="Anmeldungen"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats Card */}
            <Card className="hidden md:block">
              <CardHeader>
                <CardTitle className="text-base">Übersicht</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Offene Zahlungen</span>
                  <Badge variant={unpaidCount > 0 ? 'destructive' : 'secondary'}>
                    {unpaidCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Freie Plätze</span>
                  <span className="font-semibold">{totalCapacity - totalEnrolled}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Dozenten</span>
                  <span className="font-semibold">{dozenten.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Räume</span>
                  <span className="font-semibold">{raeume.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Registrations Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Letzte Anmeldungen</CardTitle>
              </CardHeader>
              <CardContent>
                {recentAnmeldungen.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Noch keine Anmeldungen vorhanden.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentAnmeldungen.map(a => (
                      <div
                        key={a.record_id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                        onClick={() => { setEditingAnmeldung(a); setAnmeldungDialogOpen(true); }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {getTeilnehmerName(a.fields.teilnehmer)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {getKursTitle(a.fields.kurs)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={a.fields.bezahlt ? 'default' : 'outline'}
                            className={a.fields.bezahlt ? 'bg-accent text-accent-foreground' : 'border-destructive text-destructive'}
                          >
                            {a.fields.bezahlt ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mobile: Accordion for Recent Registrations */}
            <div className="md:hidden">
              <Accordion type="single" collapsible>
                <AccordionItem value="anmeldungen">
                  <AccordionTrigger>Letzte Anmeldungen ({recentAnmeldungen.length})</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {recentAnmeldungen.slice(0, 5).map(a => (
                        <div
                          key={a.record_id}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                          onClick={() => { setEditingAnmeldung(a); setAnmeldungDialogOpen(true); }}
                        >
                          <div>
                            <p className="font-medium text-sm">{getTeilnehmerName(a.fields.teilnehmer)}</p>
                            <p className="text-xs text-muted-foreground">{getKursTitle(a.fields.kurs)}</p>
                          </div>
                          <Badge
                            variant={a.fields.bezahlt ? 'default' : 'outline'}
                            className={a.fields.bezahlt ? 'bg-accent text-accent-foreground' : 'border-destructive text-destructive'}
                          >
                            {a.fields.bezahlt ? 'Bezahlt' : 'Offen'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Dozenten Overview (Desktop) */}
            <Card className="hidden md:block">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Dozenten</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('dozenten')}>
                  Alle anzeigen
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dozenten.slice(0, 5).map(d => {
                    const count = kurse.filter(k => extractRecordId(k.fields.dozent) === d.record_id).length;
                    return (
                      <div key={d.record_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm">{d.fields.vorname} {d.fields.nachname}</span>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Mobile FAB */}
      <button
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-50"
        onClick={() => { setEditingAnmeldung(null); setAnmeldungDialogOpen(true); }}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Anmeldung Dialog */}
      <AnmeldungDialog
        open={anmeldungDialogOpen}
        onOpenChange={setAnmeldungDialogOpen}
        anmeldung={editingAnmeldung}
        kurse={kurse}
        teilnehmer={teilnehmer}
        onSuccess={() => {
          fetchAllData();
          toast({
            title: editingAnmeldung ? 'Gespeichert' : 'Erstellt',
            description: editingAnmeldung ? 'Anmeldung wurde aktualisiert.' : 'Neue Anmeldung wurde erstellt.'
          });
        }}
        toast={toast}
      />

      {/* Kurs Dialog */}
      <KursDialog
        open={kursDialogOpen}
        onOpenChange={setKursDialogOpen}
        kurs={editingKurs}
        dozenten={dozenten}
        raeume={raeume}
        onSuccess={() => {
          fetchAllData();
          toast({
            title: editingKurs ? 'Gespeichert' : 'Erstellt',
            description: editingKurs ? 'Kurs wurde aktualisiert.' : 'Neuer Kurs wurde erstellt.'
          });
        }}
        toast={toast}
      />

      {/* Teilnehmer Dialog */}
      <TeilnehmerDialog
        open={teilnehmerDialogOpen}
        onOpenChange={setTeilnehmerDialogOpen}
        teilnehmer={editingTeilnehmer}
        onSuccess={() => {
          fetchAllData();
          toast({
            title: editingTeilnehmer ? 'Gespeichert' : 'Erstellt',
            description: editingTeilnehmer ? 'Teilnehmer wurde aktualisiert.' : 'Neuer Teilnehmer wurde erstellt.'
          });
        }}
        toast={toast}
      />

      {/* Dozent Dialog */}
      <DozentDialog
        open={dozentDialogOpen}
        onOpenChange={setDozentDialogOpen}
        dozent={editingDozent}
        onSuccess={() => {
          fetchAllData();
          toast({
            title: editingDozent ? 'Gespeichert' : 'Erstellt',
            description: editingDozent ? 'Dozent wurde aktualisiert.' : 'Neuer Dozent wurde erstellt.'
          });
        }}
        toast={toast}
      />

      {/* Raum Dialog */}
      <RaumDialog
        open={raumDialogOpen}
        onOpenChange={setRaumDialogOpen}
        raum={editingRaum}
        onSuccess={() => {
          fetchAllData();
          toast({
            title: editingRaum ? 'Gespeichert' : 'Erstellt',
            description: editingRaum ? 'Raum wurde aktualisiert.' : 'Neuer Raum wurde erstellt.'
          });
        }}
        toast={toast}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du "{deleteConfirm?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

// Anmeldung Dialog Component
function AnmeldungDialog({
  open, onOpenChange, anmeldung, kurse, teilnehmer, onSuccess, toast
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anmeldung: Anmeldungen | null;
  kurse: Kurse[];
  teilnehmer: Teilnehmer[];
  onSuccess: () => void;
  toast: (props: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;
}) {
  const isEditing = !!anmeldung;
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    kurs: '',
    teilnehmer: '',
    anmeldedatum: format(new Date(), 'yyyy-MM-dd'),
    bezahlt: false,
  });

  useEffect(() => {
    if (open) {
      if (anmeldung) {
        setFormData({
          kurs: extractRecordId(anmeldung.fields.kurs) || '',
          teilnehmer: extractRecordId(anmeldung.fields.teilnehmer) || '',
          anmeldedatum: anmeldung.fields.anmeldedatum?.split('T')[0] || format(new Date(), 'yyyy-MM-dd'),
          bezahlt: anmeldung.fields.bezahlt || false,
        });
      } else {
        setFormData({
          kurs: '',
          teilnehmer: '',
          anmeldedatum: format(new Date(), 'yyyy-MM-dd'),
          bezahlt: false,
        });
      }
    }
  }, [open, anmeldung]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.kurs || !formData.teilnehmer) {
      toast({ title: 'Fehler', description: 'Bitte Kurs und Teilnehmer auswählen.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const data = {
        kurs: createRecordUrl(APP_IDS.KURSE, formData.kurs),
        teilnehmer: createRecordUrl(APP_IDS.TEILNEHMER, formData.teilnehmer),
        anmeldedatum: formData.anmeldedatum,
        bezahlt: formData.bezahlt,
      };
      if (isEditing) {
        await LivingAppsService.updateAnmeldungenEntry(anmeldung!.record_id, data);
      } else {
        await LivingAppsService.createAnmeldungenEntry(data);
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast({
        title: 'Fehler',
        description: `Fehler beim ${isEditing ? 'Speichern' : 'Erstellen'}: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Anmeldung bearbeiten' : 'Neue Anmeldung'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Bearbeite die Anmeldungsdaten.' : 'Melde einen Teilnehmer für einen Kurs an.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kurs">Kurs *</Label>
            <Select value={formData.kurs} onValueChange={(v) => setFormData(prev => ({ ...prev, kurs: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Kurs auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {kurse.map(k => (
                  <SelectItem key={k.record_id} value={k.record_id}>
                    {k.fields.titel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="teilnehmer">Teilnehmer *</Label>
            <Select value={formData.teilnehmer} onValueChange={(v) => setFormData(prev => ({ ...prev, teilnehmer: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Teilnehmer auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {teilnehmer.map(t => (
                  <SelectItem key={t.record_id} value={t.record_id}>
                    {t.fields.vorname} {t.fields.nachname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="anmeldedatum">Anmeldedatum</Label>
            <Input
              id="anmeldedatum"
              type="date"
              value={formData.anmeldedatum}
              onChange={(e) => setFormData(prev => ({ ...prev, anmeldedatum: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="bezahlt"
              checked={formData.bezahlt}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, bezahlt: !!checked }))}
            />
            <Label htmlFor="bezahlt" className="cursor-pointer">Bezahlt</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Speichert...' : (isEditing ? 'Speichern' : 'Anmelden')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Kurs Dialog Component
function KursDialog({
  open, onOpenChange, kurs, dozenten, raeume, onSuccess, toast
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kurs: Kurse | null;
  dozenten: Dozenten[];
  raeume: Raeume[];
  onSuccess: () => void;
  toast: (props: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;
}) {
  const isEditing = !!kurs;
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    titel: '',
    beschreibung: '',
    startdatum: format(new Date(), 'yyyy-MM-dd'),
    enddatum: '',
    max_teilnehmer: 20,
    preis: 0,
    dozent: '',
    raum: '',
  });

  useEffect(() => {
    if (open) {
      if (kurs) {
        setFormData({
          titel: kurs.fields.titel || '',
          beschreibung: kurs.fields.beschreibung || '',
          startdatum: kurs.fields.startdatum?.split('T')[0] || format(new Date(), 'yyyy-MM-dd'),
          enddatum: kurs.fields.enddatum?.split('T')[0] || '',
          max_teilnehmer: kurs.fields.max_teilnehmer || 20,
          preis: kurs.fields.preis || 0,
          dozent: extractRecordId(kurs.fields.dozent) || '',
          raum: extractRecordId(kurs.fields.raum) || '',
        });
      } else {
        setFormData({
          titel: '',
          beschreibung: '',
          startdatum: format(new Date(), 'yyyy-MM-dd'),
          enddatum: '',
          max_teilnehmer: 20,
          preis: 0,
          dozent: '',
          raum: '',
        });
      }
    }
  }, [open, kurs]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.titel || !formData.startdatum || !formData.enddatum) {
      toast({ title: 'Fehler', description: 'Bitte alle Pflichtfelder ausfüllen.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const data: Kurse['fields'] = {
        titel: formData.titel,
        beschreibung: formData.beschreibung || undefined,
        startdatum: formData.startdatum,
        enddatum: formData.enddatum,
        max_teilnehmer: formData.max_teilnehmer,
        preis: formData.preis || undefined,
        dozent: formData.dozent ? createRecordUrl(APP_IDS.DOZENTEN, formData.dozent) : undefined,
        raum: formData.raum ? createRecordUrl(APP_IDS.RAEUME, formData.raum) : undefined,
      };
      if (isEditing) {
        await LivingAppsService.updateKurseEntry(kurs!.record_id, data);
      } else {
        await LivingAppsService.createKurseEntry(data);
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast({
        title: 'Fehler',
        description: `Fehler beim ${isEditing ? 'Speichern' : 'Erstellen'}: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Kurs bearbeiten' : 'Neuer Kurs'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titel">Kurstitel *</Label>
            <Input
              id="titel"
              value={formData.titel}
              onChange={(e) => setFormData(prev => ({ ...prev, titel: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beschreibung">Beschreibung</Label>
            <Textarea
              id="beschreibung"
              value={formData.beschreibung}
              onChange={(e) => setFormData(prev => ({ ...prev, beschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startdatum">Startdatum *</Label>
              <Input
                id="startdatum"
                type="date"
                value={formData.startdatum}
                onChange={(e) => setFormData(prev => ({ ...prev, startdatum: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="enddatum">Enddatum *</Label>
              <Input
                id="enddatum"
                type="date"
                value={formData.enddatum}
                onChange={(e) => setFormData(prev => ({ ...prev, enddatum: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_teilnehmer">Max. Teilnehmer *</Label>
              <Input
                id="max_teilnehmer"
                type="number"
                min={1}
                value={formData.max_teilnehmer}
                onChange={(e) => setFormData(prev => ({ ...prev, max_teilnehmer: parseInt(e.target.value) || 20 }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preis">Preis (EUR)</Label>
              <Input
                id="preis"
                type="number"
                min={0}
                step={0.01}
                value={formData.preis}
                onChange={(e) => setFormData(prev => ({ ...prev, preis: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dozent">Dozent</Label>
            <Select value={formData.dozent || "none"} onValueChange={(v) => setFormData(prev => ({ ...prev, dozent: v === "none" ? "" : v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Dozent auswählen..." />
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
          <div className="space-y-2">
            <Label htmlFor="raum">Raum</Label>
            <Select value={formData.raum || "none"} onValueChange={(v) => setFormData(prev => ({ ...prev, raum: v === "none" ? "" : v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Raum auswählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Raum</SelectItem>
                {raeume.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.raumname} ({r.fields.gebaeude})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Speichert...' : (isEditing ? 'Speichern' : 'Erstellen')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Teilnehmer Dialog Component
function TeilnehmerDialog({
  open, onOpenChange, teilnehmer, onSuccess, toast
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teilnehmer: Teilnehmer | null;
  onSuccess: () => void;
  toast: (props: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;
}) {
  const isEditing = !!teilnehmer;
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    geburtsdatum: '',
  });

  useEffect(() => {
    if (open) {
      if (teilnehmer) {
        setFormData({
          vorname: teilnehmer.fields.vorname || '',
          nachname: teilnehmer.fields.nachname || '',
          email: teilnehmer.fields.email || '',
          telefon: teilnehmer.fields.telefon || '',
          geburtsdatum: teilnehmer.fields.geburtsdatum?.split('T')[0] || '',
        });
      } else {
        setFormData({
          vorname: '',
          nachname: '',
          email: '',
          telefon: '',
          geburtsdatum: '',
        });
      }
    }
  }, [open, teilnehmer]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.vorname || !formData.nachname || !formData.email) {
      toast({ title: 'Fehler', description: 'Bitte alle Pflichtfelder ausfüllen.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const data: Teilnehmer['fields'] = {
        vorname: formData.vorname,
        nachname: formData.nachname,
        email: formData.email,
        telefon: formData.telefon || undefined,
        geburtsdatum: formData.geburtsdatum || undefined,
      };
      if (isEditing) {
        await LivingAppsService.updateTeilnehmerEntry(teilnehmer!.record_id, data);
      } else {
        await LivingAppsService.createTeilnehmerEntry(data);
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast({
        title: 'Fehler',
        description: `Fehler beim ${isEditing ? 'Speichern' : 'Erstellen'}: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Teilnehmer bearbeiten' : 'Neuer Teilnehmer'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vorname">Vorname *</Label>
              <Input
                id="vorname"
                value={formData.vorname}
                onChange={(e) => setFormData(prev => ({ ...prev, vorname: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nachname">Nachname *</Label>
              <Input
                id="nachname"
                value={formData.nachname}
                onChange={(e) => setFormData(prev => ({ ...prev, nachname: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefon">Telefon</Label>
            <Input
              id="telefon"
              type="tel"
              value={formData.telefon}
              onChange={(e) => setFormData(prev => ({ ...prev, telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="geburtsdatum">Geburtsdatum</Label>
            <Input
              id="geburtsdatum"
              type="date"
              value={formData.geburtsdatum}
              onChange={(e) => setFormData(prev => ({ ...prev, geburtsdatum: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Speichert...' : (isEditing ? 'Speichern' : 'Erstellen')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Dozent Dialog Component
function DozentDialog({
  open, onOpenChange, dozent, onSuccess, toast
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dozent: Dozenten | null;
  onSuccess: () => void;
  toast: (props: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;
}) {
  const isEditing = !!dozent;
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    fachgebiet: '',
  });

  useEffect(() => {
    if (open) {
      if (dozent) {
        setFormData({
          vorname: dozent.fields.vorname || '',
          nachname: dozent.fields.nachname || '',
          email: dozent.fields.email || '',
          telefon: dozent.fields.telefon || '',
          fachgebiet: dozent.fields.fachgebiet || '',
        });
      } else {
        setFormData({
          vorname: '',
          nachname: '',
          email: '',
          telefon: '',
          fachgebiet: '',
        });
      }
    }
  }, [open, dozent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.vorname || !formData.nachname) {
      toast({ title: 'Fehler', description: 'Bitte Vor- und Nachname angeben.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const data: Dozenten['fields'] = {
        vorname: formData.vorname,
        nachname: formData.nachname,
        email: formData.email || undefined,
        telefon: formData.telefon || undefined,
        fachgebiet: formData.fachgebiet || undefined,
      };
      if (isEditing) {
        await LivingAppsService.updateDozentenEntry(dozent!.record_id, data);
      } else {
        await LivingAppsService.createDozentenEntry(data);
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast({
        title: 'Fehler',
        description: `Fehler beim ${isEditing ? 'Speichern' : 'Erstellen'}: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Dozent bearbeiten' : 'Neuer Dozent'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vorname">Vorname *</Label>
              <Input
                id="vorname"
                value={formData.vorname}
                onChange={(e) => setFormData(prev => ({ ...prev, vorname: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nachname">Nachname *</Label>
              <Input
                id="nachname"
                value={formData.nachname}
                onChange={(e) => setFormData(prev => ({ ...prev, nachname: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefon">Telefon</Label>
            <Input
              id="telefon"
              type="tel"
              value={formData.telefon}
              onChange={(e) => setFormData(prev => ({ ...prev, telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fachgebiet">Fachgebiet</Label>
            <Input
              id="fachgebiet"
              value={formData.fachgebiet}
              onChange={(e) => setFormData(prev => ({ ...prev, fachgebiet: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Speichert...' : (isEditing ? 'Speichern' : 'Erstellen')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Raum Dialog Component
function RaumDialog({
  open, onOpenChange, raum, onSuccess, toast
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  raum: Raeume | null;
  onSuccess: () => void;
  toast: (props: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;
}) {
  const isEditing = !!raum;
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    raumname: '',
    gebaeude: '',
    kapazitaet: 0,
  });

  useEffect(() => {
    if (open) {
      if (raum) {
        setFormData({
          raumname: raum.fields.raumname || '',
          gebaeude: raum.fields.gebaeude || '',
          kapazitaet: raum.fields.kapazitaet || 0,
        });
      } else {
        setFormData({
          raumname: '',
          gebaeude: '',
          kapazitaet: 0,
        });
      }
    }
  }, [open, raum]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.raumname) {
      toast({ title: 'Fehler', description: 'Bitte Raumname angeben.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const data: Raeume['fields'] = {
        raumname: formData.raumname,
        gebaeude: formData.gebaeude || undefined,
        kapazitaet: formData.kapazitaet || undefined,
      };
      if (isEditing) {
        await LivingAppsService.updateRaeumeEntry(raum!.record_id, data);
      } else {
        await LivingAppsService.createRaeumeEntry(data);
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast({
        title: 'Fehler',
        description: `Fehler beim ${isEditing ? 'Speichern' : 'Erstellen'}: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Raum bearbeiten' : 'Neuer Raum'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="raumname">Raumname *</Label>
            <Input
              id="raumname"
              value={formData.raumname}
              onChange={(e) => setFormData(prev => ({ ...prev, raumname: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gebaeude">Gebäude</Label>
            <Input
              id="gebaeude"
              value={formData.gebaeude}
              onChange={(e) => setFormData(prev => ({ ...prev, gebaeude: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kapazitaet">Kapazität</Label>
            <Input
              id="kapazitaet"
              type="number"
              min={0}
              value={formData.kapazitaet}
              onChange={(e) => setFormData(prev => ({ ...prev, kapazitaet: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Speichert...' : (isEditing ? 'Speichern' : 'Erstellen')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

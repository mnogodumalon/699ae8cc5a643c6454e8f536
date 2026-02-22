import { useState, useEffect } from 'react';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { Kursanmeldung, Kurse } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import { KursanmeldungDialog } from '@/components/dialogs/KursanmeldungDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

export default function KursanmeldungPage() {
  const [records, setRecords] = useState<Kursanmeldung[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Kursanmeldung | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Kursanmeldung | null>(null);
  const [kurseList, setKurseList] = useState<Kurse[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, kurseData] = await Promise.all([
        LivingAppsService.getKursanmeldung(),
        LivingAppsService.getKurse(),
      ]);
      setRecords(mainData);
      setKurseList(kurseData);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(fields: Kursanmeldung['fields']) {
    await LivingAppsService.createKursanmeldungEntry(fields);
    await loadData();
    setDialogOpen(false);
  }

  async function handleUpdate(fields: Kursanmeldung['fields']) {
    if (!editingRecord) return;
    await LivingAppsService.updateKursanmeldungEntry(editingRecord.record_id, fields);
    await loadData();
    setEditingRecord(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteKursanmeldungEntry(deleteTarget.record_id);
    setRecords(prev => prev.filter(r => r.record_id !== deleteTarget.record_id));
    setDeleteTarget(null);
  }

  function getKurseDisplayName(url?: string) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return kurseList.find(r => r.record_id === id)?.fields.titel ?? '—';
  }

  const filtered = records.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(r.fields).some(v =>
      String(v ?? '').toLowerCase().includes(s)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <PageShell
      title="Kursanmeldung"
      subtitle={`${records.length} Kursanmeldung im System`}
      action={
        <Button onClick={() => setDialogOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Kursanmeldung suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kurs</TableHead>
              <TableHead>Vorname</TableHead>
              <TableHead>Nachname</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Geburtsdatum</TableHead>
              <TableHead>Anmeldedatum</TableHead>
              <TableHead>Bezahlt</TableHead>
              <TableHead className="w-24">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(record => (
              <TableRow key={record.record_id} className="hover:bg-muted/50 transition-colors">
                <TableCell>{getKurseDisplayName(record.fields.kurs)}</TableCell>
                <TableCell className="font-medium">{record.fields.teilnehmer_vorname ?? '—'}</TableCell>
                <TableCell>{record.fields.teilnehmer_nachname ?? '—'}</TableCell>
                <TableCell>{record.fields.teilnehmer_email ?? '—'}</TableCell>
                <TableCell>{record.fields.teilnehmer_telefon ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(record.fields.teilnehmer_geburtsdatum)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(record.fields.anmeldedatum)}</TableCell>
                <TableCell><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${record.fields.bezahlt ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{record.fields.bezahlt ? 'Ja' : 'Nein'}</span></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingRecord(record)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(record)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                  {search ? 'Keine Ergebnisse gefunden.' : 'Noch keine Kursanmeldung. Jetzt hinzufügen!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <KursanmeldungDialog
        open={dialogOpen || !!editingRecord}
        onClose={() => { setDialogOpen(false); setEditingRecord(null); }}
        onSubmit={editingRecord ? handleUpdate : handleCreate}
        defaultValues={editingRecord?.fields}
        kurseList={kurseList}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Kursanmeldung löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </PageShell>
  );
}
import { useState, useEffect } from 'react';
import type { Kursanmeldung, Kurse } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface KursanmeldungDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Kursanmeldung['fields']) => Promise<void>;
  defaultValues?: Kursanmeldung['fields'];
  kurseList: Kurse[];
}

export function KursanmeldungDialog({ open, onClose, onSubmit, defaultValues, kurseList }: KursanmeldungDialogProps) {
  const [fields, setFields] = useState<Partial<Kursanmeldung['fields']>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setFields(defaultValues ?? {});
  }, [open, defaultValues]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(fields as Kursanmeldung['fields']);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{defaultValues ? 'Kursanmeldung bearbeiten' : 'Kursanmeldung hinzufügen'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kurs">Kurs</Label>
            <Select
              value={extractRecordId(fields.kurs) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, kurs: v === 'none' ? undefined : createRecordUrl(APP_IDS.KURSE, v) }))}
            >
              <SelectTrigger id="kurs"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {kurseList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.titel ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="teilnehmer_vorname">Vorname</Label>
            <Input
              id="teilnehmer_vorname"
              value={fields.teilnehmer_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, teilnehmer_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teilnehmer_nachname">Nachname</Label>
            <Input
              id="teilnehmer_nachname"
              value={fields.teilnehmer_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, teilnehmer_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teilnehmer_email">E-Mail</Label>
            <Input
              id="teilnehmer_email"
              type="email"
              value={fields.teilnehmer_email ?? ''}
              onChange={e => setFields(f => ({ ...f, teilnehmer_email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teilnehmer_telefon">Telefon</Label>
            <Input
              id="teilnehmer_telefon"
              value={fields.teilnehmer_telefon ?? ''}
              onChange={e => setFields(f => ({ ...f, teilnehmer_telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teilnehmer_geburtsdatum">Geburtsdatum</Label>
            <Input
              id="teilnehmer_geburtsdatum"
              type="date"
              value={fields.teilnehmer_geburtsdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, teilnehmer_geburtsdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anmeldedatum">Anmeldedatum</Label>
            <Input
              id="anmeldedatum"
              type="date"
              value={fields.anmeldedatum ?? ''}
              onChange={e => setFields(f => ({ ...f, anmeldedatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bezahlt">Bezahlt</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="bezahlt"
                checked={!!fields.bezahlt}
                onCheckedChange={(v) => setFields(f => ({ ...f, bezahlt: !!v }))}
              />
              <Label htmlFor="bezahlt" className="font-normal">Bezahlt</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
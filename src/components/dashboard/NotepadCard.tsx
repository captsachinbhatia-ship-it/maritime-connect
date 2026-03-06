import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { StickyNote } from 'lucide-react';
import { useCrmUser } from '@/hooks/useCrmUser';
import { getNotepad, saveNotepad } from '@/services/userNotepad';
import { format } from 'date-fns';

export function NotepadCard() {
  const { crmUserId } = useCrmUser();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderAt, setReminderAt] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getDefaultReminder = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (!crmUserId) return;
    const load = async () => {
      setLoading(true);
      const { data, reminderAt: ra } = await getNotepad(crmUserId);
      setContent(data);
      if (ra) {
        setReminderEnabled(true);
        setReminderAt(ra.slice(0, 16));
        const diff = new Date(ra).getTime() - Date.now();
        if (diff <= 10 * 60 * 1000) setShowAlert(true);
      }
      setLoading(false);
    };
    load();
  }, [crmUserId]);

  const triggerSave = (newContent: string, newReminderAt: string | null) => {
    if (!crmUserId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      await saveNotepad(crmUserId, newContent, newReminderAt);
      setSaving(false);
    }, 1000);
  };

  const handleChange = (value: string) => {
    setContent(value);
    triggerSave(value, reminderEnabled ? reminderAt : null);
  };

  const handleReminderToggle = (checked: boolean) => {
    setReminderEnabled(checked);
    const ra = checked ? (reminderAt || getDefaultReminder()) : null;
    if (checked && !reminderAt) setReminderAt(getDefaultReminder());
    triggerSave(content, ra);
  };

  const handleReminderChange = (val: string) => {
    setReminderAt(val);
    triggerSave(content, val || null);
  };

  const dismissReminder = async () => {
    if (!crmUserId) return;
    setShowAlert(false);
    setReminderEnabled(false);
    setReminderAt(null);
    setSaving(true);
    await saveNotepad(crmUserId, content, null);
    setSaving(false);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <StickyNote className="h-4.5 w-4.5 text-primary" />
          </div>
          <CardTitle className="text-base">Notepad</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <Skeleton className="h-[160px] w-full" />
        ) : (
          <div className="space-y-1.5">
            {showAlert && reminderAt && (
              <div className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-300">
                <span>⏰ Reminder: {format(new Date(reminderAt), 'dd MMM yyyy, HH:mm')}</span>
                <button onClick={dismissReminder} className="ml-2 font-bold leading-none">×</button>
              </div>
            )}
            <Textarea
              value={content}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Quick notes, reminders..."
              className="min-h-[160px] text-sm resize-none"
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="notepad-card-reminder"
                checked={reminderEnabled}
                onCheckedChange={(c) => handleReminderToggle(c === true)}
                className="h-3.5 w-3.5"
              />
              <label htmlFor="notepad-card-reminder" className="text-[11px] text-muted-foreground cursor-pointer select-none">
                Set reminder
              </label>
              {reminderEnabled && (
                <input
                  type="datetime-local"
                  value={reminderAt || ''}
                  onChange={(e) => handleReminderChange(e.target.value)}
                  className="ml-auto h-6 rounded border border-input bg-background px-1.5 text-[11px] text-foreground"
                />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground text-right">
              {saving ? 'Saving...' : 'Auto-saved'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

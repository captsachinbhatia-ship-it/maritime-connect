import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote } from 'lucide-react';
import { useCrmUser } from '@/hooks/useCrmUser';
import { getNotepad, saveNotepad } from '@/services/userNotepad';

export function NotepadCard() {
  const { crmUserId } = useCrmUser();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!crmUserId) return;
    const load = async () => {
      setLoading(true);
      const { data } = await getNotepad(crmUserId);
      setContent(data);
      setLoading(false);
    };
    load();
  }, [crmUserId]);

  const handleChange = (value: string) => {
    setContent(value);
    if (!crmUserId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      await saveNotepad(crmUserId, value);
      setSaving(false);
    }, 1000);
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
          <div className="space-y-1">
            <Textarea
              value={content}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Quick notes, reminders..."
              className="min-h-[160px] text-sm resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {saving ? 'Saving...' : 'Auto-saved'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

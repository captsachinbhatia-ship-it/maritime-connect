import { useState, useEffect, useRef } from 'react';
import { Loader2, Pencil, UserPlus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';

interface CrmUser {
  id: string;
  full_name: string;
}

interface InlineOwnerSelectorProps {
  contactId: string;
  currentOwnerName: string | null;
  role: 'PRIMARY' | 'SECONDARY';
  onAssign: (contactId: string, userId: string, role: 'PRIMARY' | 'SECONDARY') => Promise<void>;
  onRemove?: (contactId: string, role: 'PRIMARY' | 'SECONDARY') => Promise<void>;
}

export function InlineOwnerSelector({
  contactId,
  currentOwnerName,
  role,
  onAssign,
  onRemove,
}: InlineOwnerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch users when popover opens
  useEffect(() => {
    if (!open) {
      setFilter('');
      return;
    }
    setLoading(true);
    supabase
      .from('crm_users')
      .select('id, full_name')
      .eq('active', true)
      .order('full_name', { ascending: true })
      .then(({ data }) => {
        setUsers((data as CrmUser[]) || []);
        setLoading(false);
        // Focus search after load
        setTimeout(() => inputRef.current?.focus(), 50);
      });
  }, [open]);

  const filtered = filter
    ? users.filter((u) => u.full_name.toLowerCase().includes(filter.toLowerCase()))
    : users;

  const handleSelect = async (userId: string) => {
    setSaving(true);
    try {
      await onAssign(contactId, userId, role);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRemove) return;
    setSaving(true);
    try {
      await onRemove(contactId, role);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  if (saving) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="text-xs">Saving…</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          data-no-row-click
          className={cn(
            'group flex items-center gap-1 rounded px-1.5 py-0.5 text-sm transition-colors',
            'hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            currentOwnerName
              ? 'text-foreground'
              : 'text-muted-foreground/60 italic'
          )}
        >
          {currentOwnerName ? (
            <>
              <span className="truncate max-w-[100px]">{currentOwnerName}</span>
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
            </>
          ) : (
            <>
              <UserPlus className="h-3 w-3 shrink-0" />
              <span className="text-xs">Assign</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-56 p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-2 border-b">
          <Input
            ref={inputRef}
            data-no-row-click
            placeholder="Search users…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="max-h-48 overflow-y-auto p-1">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">
              No users found
            </p>
          ) : (
            filtered.map((u) => (
              <button
                key={u.id}
                data-no-row-click
                onClick={() => handleSelect(u.id)}
                className={cn(
                  'flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-left transition-colors',
                  'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                  'outline-none'
                )}
              >
                {u.full_name}
              </button>
            ))
          )}
        </div>
        {currentOwnerName && onRemove && (
          <div className="border-t p-1">
            <button
              data-no-row-click
              onClick={handleRemove}
              className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Remove {role === 'PRIMARY' ? 'Primary' : 'Secondary'}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { isAutoSequenceEnabled, setAutoSequenceEnabled } from '@/services/coldCallSequence';

/**
 * Toggle for auto-creating follow-up sequences on new Cold Calling assignments.
 * Can be placed in any settings/admin area.
 */
export function AutoSequenceToggle() {
  const [enabled, setEnabled] = useState(isAutoSequenceEnabled);

  const handleChange = (checked: boolean) => {
    setEnabled(checked);
    setAutoSequenceEnabled(checked);
  };

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">Auto Follow-up Sequence</Label>
        <p className="text-xs text-muted-foreground">
          Automatically create 3 follow-up tasks (Day 1, 7, 30) when a contact is assigned with Cold Calling stage
        </p>
      </div>
      <Switch checked={enabled} onCheckedChange={handleChange} />
    </div>
  );
}

import { useState } from 'react';
import { Bookmark, Plus, Trash2, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { SmartView, SmartViewFilters, useSmartViews } from '@/hooks/useSmartViews';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SmartViewsDropdownProps {
  /** Current filters to save as a new view */
  currentFilters: SmartViewFilters;
  /** Called when a view is applied — parent sets its own filter state */
  onApplyFilters: (filters: SmartViewFilters) => void;
  /** Called when active view is cleared */
  onClear: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SmartViewsDropdown({
  currentFilters,
  onApplyFilters,
  onClear,
}: SmartViewsDropdownProps) {
  const { toast } = useToast();
  const { views, isLoading, activeViewId, saveView, deleteView, applyView, clearActiveView } =
    useSmartViews();

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveShared, setSaveShared] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleApply = (viewId: string) => {
    const filters = applyView(viewId);
    if (filters) onApplyFilters(filters);
  };

  const handleDelete = async (viewId: string) => {
    const result = await deleteView(viewId);
    if (result.error) {
      toast({ title: 'Delete failed', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'View deleted' });
    }
  };

  const handleClear = () => {
    clearActiveView();
    onClear();
  };

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setIsSaving(true);
    const result = await saveView(saveName.trim(), currentFilters, saveShared);
    setIsSaving(false);

    if (result.error) {
      toast({ title: 'Save failed', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Smart View saved', description: `"${saveName.trim()}" created` });
      setSaveName('');
      setSaveShared(false);
      setSaveModalOpen(false);
    }
  };

  const activeView = views.find((v) => v.id === activeViewId);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={activeView ? 'default' : 'outline'}
            size="sm"
            className="h-9 gap-1.5"
          >
            <Bookmark className="h-3.5 w-3.5" />
            {activeView ? activeView.name : 'Smart Views'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Saved Views
          </DropdownMenuLabel>

          {isLoading && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && views.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              No saved views yet
            </div>
          )}

          {views.map((view) => (
            <DropdownMenuItem
              key={view.id}
              className="flex items-center justify-between gap-2 cursor-pointer"
              onClick={() => handleApply(view.id)}
            >
              <span className="truncate flex items-center gap-1.5">
                {view.name}
                {view.is_shared && <Share2 className="h-3 w-3 text-muted-foreground" />}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 shrink-0 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(view.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </DropdownMenuItem>
          ))}

          {activeView && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleClear} className="text-xs text-muted-foreground">
                Clear active view
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSaveModalOpen(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Save current filters as view
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Modal */}
      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Smart View</DialogTitle>
            <DialogDescription>
              Save the current filter combination as a reusable view.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>View Name</Label>
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g., VLCC Contacts — No Call in 14 Days"
                maxLength={100}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="smart-view-shared"
                checked={saveShared}
                onCheckedChange={(c) => setSaveShared(c as boolean)}
              />
              <label htmlFor="smart-view-shared" className="text-sm cursor-pointer">
                Share with team
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!saveName.trim() || isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save View
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

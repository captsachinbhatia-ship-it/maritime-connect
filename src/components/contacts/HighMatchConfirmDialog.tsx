import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface HighMatchConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function HighMatchConfirmDialog({
  open,
  onOpenChange,
  matchCount,
  onConfirm,
  onCancel,
}: HighMatchConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            High Match Detected
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {matchCount === 1 
              ? 'A contact with a very similar phone number already exists.'
              : `${matchCount} contacts with very similar phone numbers already exist.`}
            <br /><br />
            Are you sure you want to create this contact anyway?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Create Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

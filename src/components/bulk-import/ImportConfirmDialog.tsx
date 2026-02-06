import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

interface ImportConfirmDialogProps {
  validCount: number;
  disabled: boolean;
  loading: boolean;
  onConfirm: () => void;
}

export function ImportConfirmDialog({
  validCount,
  disabled,
  loading,
  onConfirm,
}: ImportConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={disabled || loading} variant="default">
          <Upload className="mr-2 h-4 w-4" />
          {loading ? 'Importing…' : 'Import Validated'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Import</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to import <strong>{validCount}</strong> validated contact
            {validCount !== 1 ? 's' : ''}. Proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Import
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { AlertTriangle, UserCheck, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { maskPhone, maskEmail } from '@/lib/duplicateDetection';

export interface DuplicateMatch {
  id: string;
  full_name: string | null;
  company_name: string | null;
  stage: string | null;
  phone: string | null;
  email: string | null;
  matchType: 'high' | 'possible';
  matchReason: string;
}

interface DuplicateMatchesPanelProps {
  highMatches: DuplicateMatch[];
  possibleMatches: DuplicateMatch[];
  onOpenContact: (contactId: string) => void;
  onUseExisting: (contactId: string) => void;
}

function formatStage(stage: string | null): string {
  if (!stage) return '-';
  return stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function MatchRow({
  match,
  onOpenContact,
  onUseExisting,
}: {
  match: DuplicateMatch;
  onOpenContact: () => void;
  onUseExisting: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-md border bg-card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {match.full_name || 'Unknown'}
          </span>
          <Badge variant="outline" className="text-xs shrink-0">
            {formatStage(match.stage)}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {match.company_name || 'No company'}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
          {match.phone && <span>📞 {maskPhone(match.phone)}</span>}
          {match.email && <span>✉️ {maskEmail(match.email)}</span>}
        </div>
        <div className="text-xs text-warning mt-1 italic">
          {match.matchReason}
        </div>
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onOpenContact}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Open
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={onUseExisting}
        >
          <UserCheck className="h-3 w-3 mr-1" />
          Use
        </Button>
      </div>
    </div>
  );
}

export function DuplicateMatchesPanel({
  highMatches,
  possibleMatches,
  onOpenContact,
  onUseExisting,
}: DuplicateMatchesPanelProps) {
  const hasMatches = highMatches.length > 0 || possibleMatches.length > 0;

  if (!hasMatches) return null;

  return (
    <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 space-y-3">
      <div className="flex items-center gap-2 text-warning">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-medium text-sm">Potential Duplicates Found</span>
      </div>

      <div className="max-h-[320px] overflow-y-auto pr-1">
        <div className="space-y-3">
          {highMatches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Badge variant="destructive" className="text-xs">High Match</Badge>
                <span className="text-xs text-muted-foreground">
                  ({highMatches.length})
                </span>
              </div>
              {highMatches.map((match) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  onOpenContact={() => onOpenContact(match.id)}
                  onUseExisting={() => onUseExisting(match.id)}
                />
              ))}
            </div>
          )}

          {possibleMatches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-xs">Possible Match</Badge>
                <span className="text-xs text-muted-foreground">
                  ({possibleMatches.length})
                </span>
              </div>
              {possibleMatches.map((match) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  onOpenContact={() => onOpenContact(match.id)}
                  onUseExisting={() => onUseExisting(match.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {(highMatches.length + possibleMatches.length) > 3 && (
        <p className="text-xs text-muted-foreground text-center pt-1">
          Scroll to see all {highMatches.length + possibleMatches.length} potential matches
        </p>
      )}
    </div>
  );
}

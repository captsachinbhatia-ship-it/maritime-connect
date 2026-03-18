import { X, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MapEnquiry, MatchResult } from '@/types/maritime';

interface MatchingPanelProps {
  enquiry: MapEnquiry | null;
  results: MatchResult[];
  open: boolean;
  onClose: () => void;
}

function scoreColor(score: number) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' {
  if (score >= 80) return 'default';
  if (score >= 50) return 'secondary';
  return 'destructive';
}

export function MatchingPanel({ enquiry, results, open, onClose }: MatchingPanelProps) {
  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">
            Cargo Matching — {enquiry?.ref_no || ''}
          </SheetTitle>
          {enquiry && (
            <p className="text-xs text-muted-foreground">
              {enquiry.cargo} · {enquiry.qty_mt?.toLocaleString()} MT · {enquiry.load_port} → {enquiry.disch_port}
            </p>
          )}
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No matching vessels found.</p>
          ) : (
            results.map(result => (
              <div key={result.vessel.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{result.vessel.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.vessel.vessel_type} · {result.vessel.dwt?.toLocaleString()} DWT · {result.vessel.flag}
                    </p>
                  </div>
                  <Badge variant={scoreBadgeVariant(result.score)} className="text-xs">
                    {result.score}%
                  </Badge>
                </div>

                {/* Score bar */}
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${scoreColor(result.score)}`}
                    style={{ width: `${result.score}%` }}
                  />
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <span>Open: <span className="text-foreground">{result.vessel.open_port}</span></span>
                  <span>Date: <span className="text-foreground">{result.vessel.open_date}</span></span>
                  <span>Region: <span className="text-foreground">{result.vessel.region}</span></span>
                  <span>Built: <span className="text-foreground">{result.vessel.year_built}</span></span>
                </div>

                {/* Why this match tooltip */}
                <div className="flex items-center justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2">
                          <Info className="h-3 w-3" /> Why this match
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <div className="space-y-1 text-xs">
                          <p className="font-medium">Score Breakdown:</p>
                          <p>DWT: {result.breakdown.dwtScore}/30 · Type: {result.breakdown.typeScore}/25</p>
                          <p>Region: {result.breakdown.regionScore}/25 · Date: {result.breakdown.dateScore}/20</p>
                          <div className="border-t pt-1 mt-1">
                            {result.reasons.map((r, i) => (
                              <p key={i} className="text-muted-foreground">• {r}</p>
                            ))}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button variant="outline" size="sm" className="h-6 text-xs">
                    Send Enquiry
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

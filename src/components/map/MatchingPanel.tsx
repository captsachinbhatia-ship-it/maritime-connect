import { useState } from 'react';
import { Info, AlertTriangle, Calculator } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MapEnquiry, MatchResult } from '@/types/maritime';
import { TankerEnquiry, TankerMatchResult, TankerVessel } from '@/types/tanker';
import { TceCalculator } from './TceCalculator';

// ─── Generic matching panel props ───────────────────────────────────
interface GenericMatchingPanelProps {
  mode: 'generic';
  enquiry: MapEnquiry | null;
  results: MatchResult[];
  open: boolean;
  onClose: () => void;
}

// ─── Tanker matching panel props ────────────────────────────────────
interface TankerMatchingPanelProps {
  mode: 'tanker';
  enquiry: TankerEnquiry | null;
  results: TankerMatchResult[];
  open: boolean;
  onClose: () => void;
}

type MatchingPanelProps = GenericMatchingPanelProps | TankerMatchingPanelProps;

function scoreColor(score: number) {
  if (score >= 75) return 'bg-green-500';
  if (score >= 45) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' {
  if (score >= 75) return 'default';
  if (score >= 45) return 'secondary';
  return 'destructive';
}

export function MatchingPanel(props: MatchingPanelProps) {
  const { open, onClose, results } = props;
  const [tceVessel, setTceVessel] = useState<TankerVessel | null>(null);

  const isTanker = props.mode === 'tanker';
  const enquiryLabel = isTanker
    ? (props.enquiry as TankerEnquiry)?.ref_no || ''
    : (props.enquiry as MapEnquiry)?.ref_no || '';
  const enquiryDesc = isTanker
    ? `${(props.enquiry as TankerEnquiry)?.cargo_grade} · ${(props.enquiry as TankerEnquiry)?.quantity_mt?.toLocaleString()} MT · ${(props.enquiry as TankerEnquiry)?.load_port} → ${(props.enquiry as TankerEnquiry)?.disch_port}`
    : `${(props.enquiry as MapEnquiry)?.cargo} · ${(props.enquiry as MapEnquiry)?.qty_mt?.toLocaleString()} MT · ${(props.enquiry as MapEnquiry)?.load_port} → ${(props.enquiry as MapEnquiry)?.disch_port}`;

  return (
    <>
      <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
        <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">Cargo Matching — {enquiryLabel}</SheetTitle>
            {props.enquiry && <p className="text-xs text-muted-foreground">{enquiryDesc}</p>}
          </SheetHeader>

          <div className="mt-4 space-y-3">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No matching vessels found.</p>
            ) : (
              results.map((result: any) => {
                const vessel = result.vessel;
                const name = vessel.vessel_name || vessel.name || 'Unknown';
                const type = vessel.vessel_class || vessel.vessel_type || '';
                const dwt = vessel.dwt_mt || vessel.dwt || 0;
                const warnings: string[] = result.warnings || [];

                return (
                  <div key={vessel.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {type} · {dwt.toLocaleString()} DWT · {vessel.flag}
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
                      <span>Open: <span className="text-foreground">{vessel.open_port}</span></span>
                      <span>Date: <span className="text-foreground">{vessel.open_date}</span></span>
                      <span>Region: <span className="text-foreground">{vessel.open_area || vessel.region}</span></span>
                      <span>Built: <span className="text-foreground">{vessel.built_year || vessel.year_built}</span></span>
                      {isTanker && vessel.last_cargo && (
                        <span>Last: <span className="text-foreground">{vessel.last_cargo}</span></span>
                      )}
                      {isTanker && vessel.coated && (
                        <span>Coating: <span className="text-foreground">{vessel.coated}</span></span>
                      )}
                    </div>

                    {/* Warnings */}
                    {warnings.length > 0 && (
                      <div className="space-y-0.5">
                        {warnings.map((w: string, i: number) => (
                          <p key={i} className="text-[10px] text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 shrink-0" /> {w}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
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
                              {isTanker ? (
                                <p>Class: {result.breakdown.classScore}/100 · Size: {result.breakdown.sizeScore}/100 · Region: {result.breakdown.regionScore}/100 · Date: {result.breakdown.dateScore}/100</p>
                              ) : (
                                <p>DWT: {result.breakdown.dwtScore}/30 · Type: {result.breakdown.typeScore}/25 · Region: {result.breakdown.regionScore}/25 · Date: {result.breakdown.dateScore}/20</p>
                              )}
                              <div className="border-t pt-1 mt-1">
                                {result.reasons.map((r: string, i: number) => (
                                  <p key={i} className="text-muted-foreground">• {r}</p>
                                ))}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <div className="flex gap-1.5">
                        {isTanker && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs gap-1"
                            onClick={() => setTceVessel(vessel as TankerVessel)}
                          >
                            <Calculator className="h-3 w-3" /> TCE
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-6 text-xs">
                          Send Enquiry
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* TCE Calculator */}
      {isTanker && (
        <TceCalculator
          vessel={tceVessel}
          enquiry={props.enquiry as TankerEnquiry}
          open={!!tceVessel}
          onClose={() => setTceVessel(null)}
        />
      )}
    </>
  );
}

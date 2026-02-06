import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

export function EnquiriesSummary() {
  const navigate = useNavigate();
  const handleClick = () => navigate('/enquiries');

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-4.5 w-4.5 text-primary" />
          </div>
          <CardTitle className="text-base">Enquiries Overview</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {/* Counts */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Generated Today', value: 0 },
            { label: 'Generated (7 Days)', value: 0 },
            { label: 'Closed Today', value: 0 },
            { label: 'Closed (7 Days)', value: 0 },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border p-2.5">
              <p className="text-[11px] text-muted-foreground leading-tight">{item.label}</p>
              <p
                className="text-lg font-bold tabular-nums cursor-pointer text-primary hover:underline leading-tight mt-0.5"
                onClick={handleClick}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Empty State */}
        <div className="rounded-lg border p-4 text-center">
          <FileText className="mx-auto h-7 w-7 text-muted-foreground/40 mb-1.5" />
          <p className="text-sm text-muted-foreground">Enquiry module pending rollout</p>
          <Badge variant="outline" className="mt-1.5 text-[11px]">Phase 2</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

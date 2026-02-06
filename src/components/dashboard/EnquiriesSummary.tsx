import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

export function EnquiriesSummary() {
  const navigate = useNavigate();

  const handleClick = () => navigate('/enquiries');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-lg">Enquiries Overview</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Counts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Generated Today</p>
            <p
              className="text-xl font-bold cursor-pointer text-primary hover:underline"
              onClick={handleClick}
            >
              0
            </p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Generated (7 Days)</p>
            <p
              className="text-xl font-bold cursor-pointer text-primary hover:underline"
              onClick={handleClick}
            >
              0
            </p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Closed Today</p>
            <p
              className="text-xl font-bold cursor-pointer text-primary hover:underline"
              onClick={handleClick}
            >
              0
            </p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Closed (7 Days)</p>
            <p
              className="text-xl font-bold cursor-pointer text-primary hover:underline"
              onClick={handleClick}
            >
              0
            </p>
          </div>
        </div>

        {/* Empty State */}
        <div className="rounded-lg border p-4 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">Enquiry module pending rollout</p>
          <Badge variant="outline" className="mt-2 text-xs">Phase 2</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

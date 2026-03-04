import { useNavigate } from 'react-router-dom';
import { Package, Ship, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function EnquiryTypePicker() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto py-12 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/enquiries')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Enquiry</h1>
          <p className="text-sm text-muted-foreground">Choose enquiry type to get started</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Cargo Enquiry */}
        <Card
          className="cursor-pointer hover:border-primary/60 hover:shadow-md transition-all group"
          onClick={() => navigate('/enquiries/new-cargo')}
        >
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4 text-center">
            <div className="rounded-full p-4 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 group-hover:scale-110 transition-transform">
              <Package className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Cargo Enquiry</h2>
              <p className="text-sm text-muted-foreground mt-1">Cargo looking for vessel (TBN)</p>
            </div>
          </CardContent>
        </Card>

        {/* Vessel Open */}
        <Card
          className="cursor-pointer hover:border-primary/60 hover:shadow-md transition-all group"
          onClick={() => navigate('/enquiries/new-vessel')}
        >
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4 text-center">
            <div className="rounded-full p-4 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 group-hover:scale-110 transition-transform">
              <Ship className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Vessel Open</h2>
              <p className="text-sm text-muted-foreground mt-1">Vessel looking for cargo</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

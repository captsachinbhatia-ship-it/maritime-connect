import { useNavigate } from 'react-router-dom';
import { Plus, Anchor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnquiryGlobalFeed } from '@/components/enquiries/EnquiryGlobalFeed';

export default function Enquiries() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Anchor className="h-7 w-7" />
            Enquiries
          </h1>
          <p className="mt-1 text-muted-foreground">
            Global enquiry feed — cargo & vessel positions
          </p>
        </div>
        <Button onClick={() => navigate('/enquiries/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          New Enquiry
        </Button>
      </div>

      <Tabs defaultValue="ALL">
        <TabsList>
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="MY_ENQS">My ENQs</TabsTrigger>
          <TabsTrigger value="HOT">Hot</TabsTrigger>
        </TabsList>

        <TabsContent value="ALL" className="mt-4">
          <EnquiryGlobalFeed tab="ALL" />
        </TabsContent>
        <TabsContent value="MY_ENQS" className="mt-4">
          <EnquiryGlobalFeed tab="MY_ENQS" />
        </TabsContent>
        <TabsContent value="HOT" className="mt-4">
          <EnquiryGlobalFeed tab="HOT" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

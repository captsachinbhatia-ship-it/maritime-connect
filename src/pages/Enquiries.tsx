import { useNavigate } from 'react-router-dom';
import { Plus, Anchor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnquiryFeedTab } from '@/components/enquiries/EnquiryFeedTab';
import { EnquiryPipelineTab } from '@/components/enquiries/EnquiryPipelineTab';

export default function Enquiries() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Anchor className="h-7 w-7" />
            Tanker Enquiry Desk
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage cargo enquiries and open vessel positions
          </p>
        </div>
        <Button onClick={() => navigate('/enquiries/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          New Enquiry
        </Button>
      </div>

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed" className="gap-1.5">
            Market Feed (All)
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5">
            My Work
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-4">
          <EnquiryFeedTab />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4">
          <EnquiryPipelineTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

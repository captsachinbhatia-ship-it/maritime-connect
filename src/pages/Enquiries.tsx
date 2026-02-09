import { FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnquiryFeedTab } from '@/components/enquiries/EnquiryFeedTab';
import { EnquiryPipelineTab } from '@/components/enquiries/EnquiryPipelineTab';

export default function Enquiries() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Enquiries</h1>
        <p className="mt-1 text-muted-foreground">
          Track and manage enquiries and quotes
        </p>
      </div>

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            All Enquiries
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5">
            My Enquiries
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

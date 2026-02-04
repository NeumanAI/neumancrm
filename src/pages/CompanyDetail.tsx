import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { CompanySidebar } from '@/components/companies/CompanySidebar';
import { CompanyTimeline } from '@/components/companies/CompanyTimeline';
import { CompanyContacts } from '@/components/companies/CompanyContacts';
import { CompanyDeals } from '@/components/companies/CompanyDeals';
import { CompanyDocuments } from '@/components/companies/CompanyDocuments';
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  TrendingUp,
  FileText 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function CompanyDetail() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();

  const { data: company, isLoading, error } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('No company ID');
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      
      if (error) throw error;
      return data as Company;
    },
    enabled: !!companyId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-20 w-20 rounded-lg mx-auto" />
            <Skeleton className="h-6 w-32 mx-auto" />
            <Skeleton className="h-4 w-24 mx-auto" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-muted-foreground">No se encontró la empresa</p>
        <Button variant="outline" onClick={() => navigate('/companies')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a empresas
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/companies')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <p className="text-sm text-muted-foreground">
            Detalle de la empresa
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-lg border bg-card p-6">
            <CompanySidebar company={company} />
          </div>
        </div>

        {/* Tabs content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="timeline" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="timeline" className="gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Timeline</span>
              </TabsTrigger>
              <TabsTrigger value="contacts" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Contactos</span>
              </TabsTrigger>
              <TabsTrigger value="deals" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Deals</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Documentos</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-6">
              <div className="rounded-lg border bg-card p-6">
                <CompanyTimeline companyId={company.id} />
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="mt-6">
              <div className="rounded-lg border bg-card p-6">
                <CompanyContacts companyId={company.id} />
              </div>
            </TabsContent>

            <TabsContent value="deals" className="mt-6">
              <div className="rounded-lg border bg-card p-6">
                <CompanyDeals companyId={company.id} />
              </div>
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
              <div className="rounded-lg border bg-card p-6">
                <CompanyDocuments companyId={company.id} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </motion.div>
  );
}

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, Users, Zap, ClipboardList, Database } from 'lucide-react';
import ImportTab from '@/components/data-management/ImportTab';
import ExportTab from '@/components/data-management/ExportTab';
import DuplicatesTab from '@/components/data-management/DuplicatesTab';
import BulkOperationsTab from '@/components/data-management/BulkOperationsTab';
import AuditLogTab from '@/components/data-management/AuditLogTab';

export default function DataManagement() {
  const [activeTab, setActiveTab] = useState('import');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestión de Datos</h1>
            <p className="text-sm text-muted-foreground">
              Importa, exporta y gestiona tus datos del CRM
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Importar</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </TabsTrigger>
          <TabsTrigger value="duplicates" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Duplicados</span>
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Operaciones</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Auditoría</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import">
          <ImportTab />
        </TabsContent>

        <TabsContent value="export">
          <ExportTab />
        </TabsContent>

        <TabsContent value="duplicates">
          <DuplicatesTab />
        </TabsContent>

        <TabsContent value="bulk">
          <BulkOperationsTab />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

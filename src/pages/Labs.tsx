import { Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function Labs() {
  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-lg mx-auto">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Construction className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">En Construcción</h2>
          <p className="text-muted-foreground">
            Esta sección está siendo desarrollada. Pronto tendrás acceso a nuevas funcionalidades experimentales.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

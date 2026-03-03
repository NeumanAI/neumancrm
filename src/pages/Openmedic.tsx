import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Clock, Users, CalendarDays, FileText, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const FEATURES = [
  { icon: Users, label: 'Gestión de Pacientes', desc: 'Historial clínico y seguimiento de tratamientos' },
  { icon: CalendarDays, label: 'Agenda de Atención', desc: 'Programación inteligente de consultas' },
  { icon: FileText, label: 'Evoluciones Clínicas', desc: 'Notas y documentación médica integrada' },
  { icon: Activity, label: 'Métricas de Clínica', desc: 'Dashboard especializado para salud' },
];

export default function Openmedic() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto py-12 px-4 text-center space-y-8"
    >
      <div>
        <div className="h-20 w-20 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-4xl mx-auto mb-4">
          🏥
        </div>
        <h1 className="text-3xl font-bold">Openmedic</h1>
        <p className="text-muted-foreground mt-2">CRM inteligente para clínicas y consultorios</p>
        <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm">
          <Clock className="h-4 w-4" />
          Próximamente
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
        {FEATURES.map((f, i) => (
          <Card key={i} className="border shadow-sm">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                <f.icon className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-sm">{f.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" onClick={() => navigate('/dashboard')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al Dashboard
      </Button>
    </motion.div>
  );
}

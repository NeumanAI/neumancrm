import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useRealEstateProjects } from '@/hooks/useRealEstateProjects';
import { Building2 } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planeación' },
  { value: 'pre_sale', label: 'Preventa' },
  { value: 'construction', label: 'Construcción' },
  { value: 'delivery', label: 'Entrega' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  code: z.string().optional(),
  description: z.string().optional(),
  status: z.string().min(1, 'La etapa es requerida'),
  cover_image_url: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  total_units: z.string().optional(),
  price_from: z.string().optional(),
  price_to: z.string().optional(),
  estimated_delivery: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRealEstateProjectDialog({ open, onOpenChange }: Props) {
  const { createProject } = useRealEstateProjects();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '', code: '', description: '', status: '', cover_image_url: '',
      address: '', city: '', state: '', country: '',
      total_units: '', price_from: '', price_to: '', estimated_delivery: '',
    },
  });

  const coverUrl = form.watch('cover_image_url');

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await createProject.mutateAsync({
        name: data.name,
        code: data.code || undefined,
        description: data.description || undefined,
        status: data.status,
        cover_image_url: data.cover_image_url || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        country: data.country || undefined,
        total_units: data.total_units ? parseInt(data.total_units) : 0,
        price_from: data.price_from ? parseFloat(data.price_from) : undefined,
        price_to: data.price_to ? parseFloat(data.price_to) : undefined,
        estimated_delivery: data.estimated_delivery || undefined,
      } as any);
      form.reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo Proyecto Inmobiliario</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="info">
              <TabsList className="w-full">
                <TabsTrigger value="info" className="flex-1">Info Básica</TabsTrigger>
                <TabsTrigger value="location" className="flex-1">Ubicación y Cifras</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del proyecto *</FormLabel>
                    <FormControl><Input placeholder="Torre Residencial Norte" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código</FormLabel>
                      <FormControl><Input placeholder="TRN-001" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Etapa *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar etapa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="estimated_delivery" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entrega estimada</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl><Textarea rows={3} placeholder="Descripción del proyecto..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cover_image_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL imagen de portada</FormLabel>
                    <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                    <FormMessage />
                    {coverUrl && (
                      <div className="mt-2 h-32 rounded-lg overflow-hidden border bg-muted">
                        <img
                          src={coverUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                    {!coverUrl && (
                      <div className="mt-2 h-32 rounded-lg border bg-muted flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                  </FormItem>
                )} />
              </TabsContent>

              <TabsContent value="location" className="space-y-4 mt-4">
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl><Input placeholder="Av. Principal #123" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl><Input placeholder="Ciudad" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl><Input placeholder="Estado" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <FormControl><Input placeholder="México" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="total_units" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total unidades</FormLabel>
                      <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="price_from" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio desde</FormLabel>
                      <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="price_to" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio hasta</FormLabel>
                      <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creando...' : 'Crear Proyecto'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

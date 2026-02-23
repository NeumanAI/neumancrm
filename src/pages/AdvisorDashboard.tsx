import { useState } from 'react';
import { useAdvisorMetrics } from '@/hooks/useAdvisorAttribution';
import { useTeam } from '@/hooks/useTeam';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Users, TrendingUp, DollarSign, Target } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdvisorDashboard() {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const { metrics, isLoading } = useAdvisorMetrics(period);
  const { isLoading: teamLoading } = useTeam();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const totalProspectos = metrics.reduce((s, m) => s + m.prospectos, 0);
  const totalCompradores = metrics.reduce((s, m) => s + m.compradores, 0);
  const totalUnitsSold = metrics.reduce((s, m) => s + m.units_sold, 0);
  const totalSalesValue = metrics.reduce((s, m) => s + m.sales_value, 0);

  const sorted = [...metrics].sort((a, b) => b.units_sold - a.units_sold || b.sales_value - a.sales_value);

  if (isLoading || teamLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const periodLabels = { month: 'Este Mes', quarter: 'Este Trimestre', year: 'Este Año' };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-500" />
            Gestión Comercial
          </h1>
          <p className="text-muted-foreground">Rendimiento del equipo de ventas</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Este Mes</SelectItem>
            <SelectItem value="quarter">Este Trimestre</SelectItem>
            <SelectItem value="year">Este Año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUnitsSold}</p>
                <p className="text-xs text-muted-foreground">Unidades Vendidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalSalesValue)}</p>
                <p className="text-xs text-muted-foreground">Valor Ventas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalProspectos}</p>
                <p className="text-xs text-muted-foreground">Prospectos Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-500/10">
                <TrendingUp className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCompradores}</p>
                <p className="text-xs text-muted-foreground">Compradores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Ranking de Asesores — {periodLabels[period]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay asesores configurados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Asesor</TableHead>
                  <TableHead className="text-center">Prospectos</TableHead>
                  <TableHead className="text-center">Compradores</TableHead>
                  <TableHead className="text-center">Uds. Vendidas</TableHead>
                  <TableHead className="text-right">Valor Ventas</TableHead>
                  <TableHead className="text-center">Conversión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((m, i) => (
                  <TableRow key={m.advisor_id}>
                    <TableCell>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={m.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{getInitials(m.advisor_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{m.advisor_name}</p>
                          <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{m.prospectos}</TableCell>
                    <TableCell className="text-center">{m.compradores}</TableCell>
                    <TableCell className="text-center font-semibold">{m.units_sold}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(m.sales_value)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={m.conversion_rate >= 30 ? 'default' : 'secondary'} className="text-xs">
                        {m.conversion_rate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

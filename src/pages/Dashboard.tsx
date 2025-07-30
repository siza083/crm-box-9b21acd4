import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrendingUp, Users, DollarSign, Percent, Calendar, BarChart3, Filter } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  newContacts: number;
  salesCompleted: number;
  totalVGV: number;
  totalCommissions: number;
  conversionRate: number;
  averageSaleCycle: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    newContacts: 0,
    salesCompleted: 0,
    totalVGV: 0,
    totalCommissions: 0,
    conversionRate: 0,
    averageSaleCycle: 0,
  });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (user) {
      loadDashboardStats();
    }
  }, [user, startDate, endDate]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const filterStartDate = parseISO(startDate);
      const filterEndDate = parseISO(endDate);

      // Get total contacts (within date range for new contacts)
      const { count: totalContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Get new contacts (within date range)
      const { count: newContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .gte('created_at', filterStartDate.toISOString())
        .lte('created_at', filterEndDate.toISOString());

      // Get sales (contacts with sale_date within date range)
      const { data: salesData } = await supabase
        .from('contacts')
        .select('sale_date, sale_value, created_at, property_id, properties(price, commission_percentage)')
        .eq('user_id', user?.id)
        .not('sale_date', 'is', null)
        .gte('sale_date', filterStartDate.toISOString())
        .lte('sale_date', filterEndDate.toISOString());

      // Calculate stats
      const salesCompleted = salesData?.length || 0;
      const totalVGV = salesData?.reduce((sum, sale) => sum + (sale.sale_value || 0), 0) || 0;
      const totalCommissions = salesData?.reduce((sum, sale) => {
        const property = sale.properties as any;
        const commissionAmount = (sale.sale_value || 0) * ((property?.commission_percentage || 0) / 100);
        return sum + commissionAmount;
      }, 0) || 0;

      const conversionRate = totalContacts ? (salesCompleted / totalContacts) * 100 : 0;

      // Calculate average sale cycle (from created_at to sale_date)
      const salesWithCycle = salesData
        ?.filter(sale => sale.sale_date && sale.created_at)
        .slice(-30) || [];

      const averageSaleCycle = salesWithCycle.length > 0 
        ? salesWithCycle.reduce((sum, sale) => {
            const saleDate = new Date(sale.sale_date!);
            const createdDate = new Date(sale.created_at!);
            const daysDiff = Math.abs(saleDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
            return sum + daysDiff;
          }, 0) / salesWithCycle.length
        : 0;

      setStats({
        newContacts: newContacts || 0,
        salesCompleted,
        totalVGV,
        totalCommissions,
        conversionRate,
        averageSaleCycle,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Visão geral do seu negócio imobiliário
        </p>
      </div>

      {/* Filtro de Datas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtro de Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="start-date">Data Inicial</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">Data Final</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Button onClick={loadDashboardStats} disabled={loading}>
                {loading ? 'Carregando...' : 'Atualizar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contatos Novos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newContacts}</div>
            <p className="text-xs text-muted-foreground">
              Período selecionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Realizadas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.salesCompleted}</div>
            <p className="text-xs text-muted-foreground">
              Total de vendas fechadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VGV Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(stats.totalVGV)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor Geral de Vendas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões Recebidas</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(stats.totalCommissions)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de comissões
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Contatos → Vendas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ciclo Médio de Venda</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.averageSaleCycle)} dias</div>
            <p className="text-xs text-muted-foreground">
              Últimas 30 vendas
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
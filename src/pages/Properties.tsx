import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Building } from 'lucide-react';

interface Property {
  id: string;
  description: string;
  price: number;
  commission_percentage: number;
  created_at: string;
}

const Properties = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  useEffect(() => {
    if (user) {
      loadProperties();
    }
  }, [user]);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar imóveis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const propertyData = {
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      commission_percentage: parseFloat(formData.get('commission_percentage') as string),
      user_id: user?.id,
    };

    try {
      if (editingProperty) {
        const { error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', editingProperty.id);
        
        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Imóvel atualizado com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from('properties')
          .insert([propertyData]);
        
        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Imóvel cadastrado com sucesso!",
        });
      }

      setDialogOpen(false);
      setEditingProperty(null);
      loadProperties();
    } catch (error) {
      console.error('Error saving property:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar imóvel",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este imóvel?')) return;

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Imóvel excluído com sucesso!",
      });
      loadProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir imóvel",
        variant: "destructive",
      });
    }
  };

  const openDialog = (property?: Property) => {
    setEditingProperty(property || null);
    setDialogOpen(true);
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Imóveis</h2>
          <p className="text-muted-foreground">
            Gerencie seu portfólio de imóveis
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Imóvel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProperty ? 'Editar Imóvel' : 'Novo Imóvel'}
              </DialogTitle>
              <DialogDescription>
                {editingProperty ? 'Atualize os dados do imóvel' : 'Cadastre um novo imóvel no seu portfólio'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={editingProperty?.description}
                  placeholder="Ex: Casa 3 quartos, Bairro Centro"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  defaultValue={editingProperty?.price}
                  placeholder="350000.00"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="commission_percentage">Comissão (%)</Label>
                <Input
                  id="commission_percentage"
                  name="commission_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  defaultValue={editingProperty?.commission_percentage}
                  placeholder="5.0"
                  required
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProperty ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum imóvel cadastrado</p>
            <p className="text-muted-foreground mb-4">Comece cadastrando seu primeiro imóvel</p>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Imóvel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Card key={property.id}>
              <CardHeader>
                <CardTitle className="text-lg">{property.description}</CardTitle>
                <CardDescription>
                  Comissão: {property.commission_percentage}%
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-primary">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(property.price)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Comissão estimada: {' '}
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(property.price * (property.commission_percentage / 100))}
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDialog(property)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(property.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Properties;
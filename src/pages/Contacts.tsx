import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Users, Phone, Mail } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  property_id?: string;
  stage_id?: string;
  created_at: string;
  properties?: {
    description: string;
    price: number;
  };
  pipeline_stages?: {
    name: string;
  };
}

interface Property {
  id: string;
  description: string;
  price: number;
}

interface Stage {
  id: string;
  name: string;
}

const Contacts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Load contacts with related data
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          *,
          properties(description, price),
          pipeline_stages(name)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (contactsError) throw contactsError;

      // Load properties for the select
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id, description, price')
        .eq('user_id', user?.id);

      if (propertiesError) throw propertiesError;

      // Load stages for the select
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('id, name')
        .eq('user_id', user?.id)
        .order('position');

      if (stagesError) throw stagesError;

      setContacts(contactsData || []);
      setProperties(propertiesData || []);
      setStages(stagesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const contactData = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string || null,
      email: formData.get('email') as string || null,
      property_id: formData.get('property_id') as string || null,
      stage_id: formData.get('stage_id') as string || stages[0]?.id,
      user_id: user?.id,
    };

    try {
      if (editingContact) {
        const { error } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', editingContact.id);
        
        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Contato atualizado com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from('contacts')
          .insert([contactData]);
        
        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Contato cadastrado com sucesso!",
        });
      }

      setDialogOpen(false);
      setEditingContact(null);
      loadData();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar contato",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este contato?')) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Contato excluído com sucesso!",
      });
      loadData();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir contato",
        variant: "destructive",
      });
    }
  };

  const openDialog = (contact?: Contact) => {
    setEditingContact(contact || null);
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
          <h2 className="text-3xl font-bold tracking-tight">Contatos</h2>
          <p className="text-muted-foreground">
            Gerencie seus leads e clientes
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Contato
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingContact ? 'Editar Contato' : 'Novo Contato'}
              </DialogTitle>
              <DialogDescription>
                {editingContact ? 'Atualize os dados do contato' : 'Cadastre um novo lead ou cliente'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingContact?.name}
                  placeholder="Nome completo"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={editingContact?.phone || ''}
                  placeholder="(11) 99999-9999"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingContact?.email || ''}
                  placeholder="email@exemplo.com"
                />
              </div>
              
              <div>
                <Label htmlFor="property_id">Imóvel de Interesse</Label>
                <Select name="property_id" defaultValue={editingContact?.property_id || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um imóvel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum imóvel específico</SelectItem>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.description} - {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(property.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="stage_id">Etapa do Pipeline</Label>
                <Select name="stage_id" defaultValue={editingContact?.stage_id || stages[0]?.id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingContact ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum contato cadastrado</p>
            <p className="text-muted-foreground mb-4">Comece adicionando seu primeiro lead</p>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Contato
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardHeader>
                <CardTitle className="text-lg">{contact.name}</CardTitle>
                <CardDescription>
                  {contact.pipeline_stages?.name || 'Sem etapa'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {contact.phone && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 mr-2" />
                      {contact.phone}
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 mr-2" />
                      {contact.email}
                    </div>
                  )}
                  {contact.properties && (
                    <div className="text-sm">
                      <strong>Imóvel:</strong> {contact.properties.description}
                      <br />
                      <span className="text-primary font-medium">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(contact.properties.price)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDialog(contact)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(contact.id)}
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

export default Contacts;
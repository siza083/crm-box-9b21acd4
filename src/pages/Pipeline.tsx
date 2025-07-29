import { useEffect, useState } from 'react';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search } from 'lucide-react';
import { PipelineColumn } from '@/components/pipeline/PipelineColumn';
import { ContactCard } from '@/components/pipeline/ContactCard';

interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  stage_id?: string;
  visit_date?: string;
  properties?: {
    description: string;
    price: number;
  };
}

interface Stage {
  id: string;
  name: string;
  position: number;
}

const Pipeline = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stages, setStages] = useState<Stage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Load stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('user_id', user?.id)
        .order('position');

      if (stagesError) throw stagesError;

      // Load contacts with properties
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          *,
          properties(description, price)
        `)
        .eq('user_id', user?.id);

      if (contactsError) throw contactsError;

      setStages(stagesData || []);
      setContacts(contactsData || []);
      setAllContacts(contactsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do pipeline",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getContactsByStage = (stageId: string) => {
    return contacts.filter(contact => contact.stage_id === stageId);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const contactId = active.id as string;
    const newStageId = over.id as string;

    // Update contact stage in database
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ stage_id: newStageId })
        .eq('id', contactId);

      if (error) throw error;

      // Update local state
      setContacts(prev => 
        prev.map(contact => 
          contact.id === contactId 
            ? { ...contact, stage_id: newStageId }
            : contact
        )
      );

      toast({
        title: "Sucesso",
        description: "Contato movido com sucesso!",
      });
    } catch (error) {
      console.error('Error updating contact stage:', error);
      toast({
        title: "Erro",
        description: "Erro ao mover contato",
        variant: "destructive",
      });
    }

    setActiveId(null);
  };

  const addContactToStage = async () => {
    if (!selectedStage || !searchTerm) return;

    const selectedContact = allContacts.find(contact => 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!selectedContact) {
      toast({
        title: "Erro",
        description: "Contato não encontrado",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .update({ stage_id: selectedStage })
        .eq('id', selectedContact.id);

      if (error) throw error;

      setContacts(prev => 
        prev.map(contact => 
          contact.id === selectedContact.id 
            ? { ...contact, stage_id: selectedStage }
            : contact
        )
      );

      setDialogOpen(false);
      setSearchTerm('');
      setSelectedStage('');

      toast({
        title: "Sucesso",
        description: "Contato adicionado à etapa!",
      });
    } catch (error) {
      console.error('Error adding contact to stage:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar contato",
        variant: "destructive",
      });
    }
  };

  const filteredContacts = allContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h2 className="text-3xl font-bold tracking-tight">Pipeline</h2>
          <p className="text-muted-foreground">
            Gerencie seus leads através do funil de vendas
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Contato
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Contato ao Pipeline</DialogTitle>
              <DialogDescription>
                Busque um contato e adicione-o à etapa desejada
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="Buscar contato por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
                    {filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="p-2 hover:bg-accent cursor-pointer"
                        onClick={() => setSearchTerm(contact.name)}
                      >
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {contact.email || contact.phone}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <Select value={selectedStage} onValueChange={setSelectedStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a etapa" />
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
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={addContactToStage}>
                  Adicionar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {stages.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              contacts={getContactsByStage(stage.id)}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
};

export default Pipeline;
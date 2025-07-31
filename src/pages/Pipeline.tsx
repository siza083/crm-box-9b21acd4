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
import { Plus, Search, Edit2, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
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
  is_default?: boolean;
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
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [addStageDialogOpen, setAddStageDialogOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');

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

    // Check if moving to "Venda Ganha" stage
    const vendaGanhaStage = stages.find(stage => stage.name === 'Venda Ganha');
    const isMovingToSale = newStageId === vendaGanhaStage?.id;

    // Get contact details for sale
    const contact = contacts.find(c => c.id === contactId);
    
    try {
      let updateData: any = { stage_id: newStageId };

      // If moving to "Venda Ganha", prompt for sale value and set sale date
      if (isMovingToSale && contact) {
        const propertyPrice = contact.properties?.price || 0;
        const saleValue = propertyPrice > 0 
          ? propertyPrice 
          : parseFloat(prompt(`Digite o valor da venda para ${contact.name}:`) || '0');

        if (saleValue > 0) {
          updateData.sale_date = new Date().toISOString();
          updateData.sale_value = saleValue;
        } else {
          toast({
            title: "Erro",
            description: "Valor de venda inválido",
            variant: "destructive",
          });
          return;
        }
      }

      const { error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', contactId);

      if (error) throw error;

      // Update local state
      setContacts(prev => 
        prev.map(contact => 
          contact.id === contactId 
            ? { ...contact, ...updateData }
            : contact
        )
      );

      const message = isMovingToSale 
        ? "Venda registrada com sucesso!" 
        : "Contato movido com sucesso!";

      toast({
        title: "Sucesso",
        description: message,
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

  const handleEditStageName = async (stageId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .update({ name: newName })
        .eq('id', stageId);

      if (error) throw error;

      setStages(prev => 
        prev.map(stage => 
          stage.id === stageId ? { ...stage, name: newName } : stage
        )
      );

      setEditingStage(null);
      setEditingName('');

      toast({
        title: "Sucesso",
        description: "Nome da etapa atualizado!",
      });
    } catch (error) {
      console.error('Error updating stage name:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar nome da etapa",
        variant: "destructive",
      });
    }
  };

  const handleMoveStage = async (stageId: string, direction: 'up' | 'down') => {
    const currentStage = stages.find(s => s.id === stageId);
    if (!currentStage) return;

    const sortedStages = [...stages].sort((a, b) => a.position - b.position);
    const currentIndex = sortedStages.findIndex(s => s.id === stageId);
    
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === sortedStages.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetStage = sortedStages[targetIndex];

    try {
      const { error: error1 } = await supabase
        .from('pipeline_stages')
        .update({ position: targetStage.position })
        .eq('id', currentStage.id);

      const { error: error2 } = await supabase
        .from('pipeline_stages')
        .update({ position: currentStage.position })
        .eq('id', targetStage.id);

      if (error1 || error2) throw error1 || error2;

      setStages(prev => 
        prev.map(stage => {
          if (stage.id === currentStage.id) return { ...stage, position: targetStage.position };
          if (stage.id === targetStage.id) return { ...stage, position: currentStage.position };
          return stage;
        })
      );

      toast({
        title: "Sucesso",
        description: "Posição da etapa atualizada!",
      });
    } catch (error) {
      console.error('Error moving stage:', error);
      toast({
        title: "Erro",
        description: "Erro ao mover etapa",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    const stageWithContacts = contacts.some(contact => contact.stage_id === stageId);
    
    if (stageWithContacts) {
      toast({
        title: "Erro",
        description: "Não é possível excluir uma etapa que possui contatos. Mova os contatos primeiro.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', stageId);

      if (error) throw error;

      setStages(prev => prev.filter(stage => stage.id !== stageId));

      toast({
        title: "Sucesso",
        description: "Etapa excluída!",
      });
    } catch (error) {
      console.error('Error deleting stage:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir etapa",
        variant: "destructive",
      });
    }
  };

  const handleAddStage = async () => {
    if (!newStageName.trim()) return;

    const maxPosition = Math.max(...stages.map(s => s.position), 0);

    try {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .insert([{ 
          name: newStageName, 
          position: maxPosition + 1,
          user_id: user?.id,
          is_default: false
        }])
        .select()
        .single();

      if (error) throw error;

      setStages(prev => [...prev, data]);
      setAddStageDialogOpen(false);
      setNewStageName('');

      toast({
        title: "Sucesso",
        description: "Nova etapa adicionada!",
      });
    } catch (error) {
      console.error('Error adding stage:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar etapa",
        variant: "destructive",
      });
    }
  };

  const handleContactStatusChange = async (contactId: string, newStageId: string) => {
    const vendaGanhaStage = stages.find(stage => stage.name === 'Venda Ganha');
    const isMovingToSale = newStageId === vendaGanhaStage?.id;
    const contact = contacts.find(c => c.id === contactId);

    try {
      let updateData: any = { stage_id: newStageId };

      if (isMovingToSale && contact) {
        const propertyPrice = contact.properties?.price || 0;
        const saleValue = propertyPrice > 0 
          ? propertyPrice 
          : parseFloat(prompt(`Digite o valor da venda para ${contact.name}:`) || '0');

        if (saleValue > 0) {
          updateData.sale_date = new Date().toISOString();
          updateData.sale_value = saleValue;
        } else {
          toast({
            title: "Erro",
            description: "Valor de venda inválido",
            variant: "destructive",
          });
          return;
        }
      }

      const { error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', contactId);

      if (error) throw error;

      setContacts(prev => 
        prev.map(contact => 
          contact.id === contactId 
            ? { ...contact, ...updateData }
            : contact
        )
      );

      const message = isMovingToSale 
        ? "Venda registrada com sucesso!" 
        : "Status do contato atualizado!";

      toast({
        title: "Sucesso",
        description: message,
      });
    } catch (error) {
      console.error('Error updating contact status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do contato",
        variant: "destructive",
      });
    }
  };

  const handleRemoveContactFromPipeline = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ stage_id: null })
        .eq('id', contactId);

      if (error) throw error;

      setContacts(prev => 
        prev.map(contact => 
          contact.id === contactId 
            ? { ...contact, stage_id: null }
            : contact
        )
      );

      toast({
        title: "Sucesso",
        description: "Contato removido do pipeline!",
      });
    } catch (error) {
      console.error('Error removing contact from pipeline:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover contato do pipeline",
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
        
        <div className="flex gap-2">
          <Dialog open={addStageDialogOpen} onOpenChange={setAddStageDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Nova Etapa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Nova Etapa</DialogTitle>
                <DialogDescription>
                  Digite o nome da nova etapa do pipeline
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <Input
                  placeholder="Nome da etapa..."
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                />
                
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setAddStageDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddStage}>
                    Adicionar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

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
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {stages.sort((a, b) => a.position - b.position).map((stage) => (
            <Card key={stage.id} className="min-h-[400px]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  {editingStage === stage.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="text-sm font-medium"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleEditStageName(stage.id, editingName);
                          }
                          if (e.key === 'Escape') {
                            setEditingStage(null);
                            setEditingName('');
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleEditStageName(stage.id, editingName)}
                      >
                        Salvar
                      </Button>
                    </div>
                  ) : (
                    <CardTitle className="text-sm font-medium">
                      {stage.name} ({getContactsByStage(stage.id).length})
                    </CardTitle>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMoveStage(stage.id, 'up')}
                      disabled={stage.position === Math.min(...stages.map(s => s.position))}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMoveStage(stage.id, 'down')}
                      disabled={stage.position === Math.max(...stages.map(s => s.position))}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingStage(stage.id);
                        setEditingName(stage.name);
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    {!stage.is_default && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteStage(stage.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <SortableContext items={getContactsByStage(stage.id).map(c => c.id)} strategy={verticalListSortingStrategy}>
                  {getContactsByStage(stage.id).map((contact) => (
                    <Card key={contact.id} className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{contact.name}</h4>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveContactFromPipeline(contact.id)}
                            className="text-destructive hover:text-destructive h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {contact.phone && (
                          <p className="text-xs text-muted-foreground">{contact.phone}</p>
                        )}
                        {contact.email && (
                          <p className="text-xs text-muted-foreground">{contact.email}</p>
                        )}
                        
                        {contact.properties && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{contact.properties.description}</p>
                            <p className="text-xs font-medium">
                              R$ {contact.properties.price.toLocaleString('pt-BR')}
                            </p>
                          </div>
                        )}
                        
                        <div className="pt-2">
                          <Select
                            value={contact.stage_id || ''}
                            onValueChange={(value) => handleContactStatusChange(contact.id, value)}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Alterar status" />
                            </SelectTrigger>
                            <SelectContent>
                              {stages.map((stageOption) => (
                                <SelectItem key={stageOption.id} value={stageOption.id}>
                                  {stageOption.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>
                  ))}
                </SortableContext>
              </CardContent>
            </Card>
          ))}
        </div>
      </DndContext>
    </div>
  );
};

export default Pipeline;
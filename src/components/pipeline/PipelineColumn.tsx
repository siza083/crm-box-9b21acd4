import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContactCard } from './ContactCard';

interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
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

interface PipelineColumnProps {
  stage: Stage;
  contacts: Contact[];
}

export const PipelineColumn = ({ stage, contacts }: PipelineColumnProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: stage.id,
  });

  return (
    <Card className={`min-h-[400px] ${isOver ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {stage.name} ({contacts.length})
        </CardTitle>
      </CardHeader>
      <CardContent ref={setNodeRef} className="space-y-2">
        <SortableContext items={contacts.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {contacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </SortableContext>
      </CardContent>
    </Card>
  );
};
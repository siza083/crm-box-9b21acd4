import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, Mail, Building } from 'lucide-react';

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

interface ContactCardProps {
  contact: Contact;
}

export const ContactCard = ({ contact }: ContactCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: contact.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-move transition-colors ${
        isDragging ? 'opacity-50 shadow-lg' : 'hover:shadow-md'
      }`}
    >
      <CardContent className="p-3">
        <div className="font-medium text-sm mb-2">{contact.name}</div>
        <div className="space-y-1">
          {contact.phone && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Phone className="h-3 w-3 mr-1" />
              {contact.phone}
            </div>
          )}
          {contact.email && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Mail className="h-3 w-3 mr-1" />
              {contact.email}
            </div>
          )}
          {contact.properties && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Building className="h-3 w-3 mr-1" />
              <div>
                <div>{contact.properties.description}</div>
                <div className="font-medium text-primary">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(contact.properties.price)}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
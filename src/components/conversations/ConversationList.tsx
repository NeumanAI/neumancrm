import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  MessageCircle, 
  MessageSquare, 
  Instagram,
  Mail,
  Facebook,
  Filter,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConversationItem } from './ConversationItem';
import type { 
  Conversation, 
  ConversationFilters, 
  ConversationChannel, 
  ConversationStatus 
} from '@/types/conversations';

interface ConversationListProps {
  conversations: Conversation[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  filters: ConversationFilters;
  onFiltersChange: (filters: ConversationFilters) => void;
}

const CHANNELS: { value: ConversationChannel; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'webchat', label: 'Webchat', icon: MessageCircle },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'messenger', label: 'Messenger', icon: Facebook },
  { value: 'email', label: 'Email', icon: Mail },
];

const STATUSES: { value: ConversationStatus; label: string }[] = [
  { value: 'open', label: 'Abiertas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'resolved', label: 'Resueltas' },
  { value: 'archived', label: 'Archivadas' },
];

export function ConversationList({ 
  conversations, 
  isLoading, 
  selectedId, 
  onSelect,
  filters,
  onFiltersChange,
}: ConversationListProps) {
  const [searchValue, setSearchValue] = useState(filters.search || '');

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const activeFiltersCount = [filters.channel, filters.status].filter(Boolean).length;

  const clearFilters = () => {
    setSearchValue('');
    onFiltersChange({});
  };

  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Conversaciones</h2>
          <Badge variant="secondary" className="text-xs">
            {conversations.length}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Canal</DropdownMenuLabel>
              {CHANNELS.map((channel) => (
                <DropdownMenuCheckboxItem
                  key={channel.value}
                  checked={filters.channel === channel.value}
                  onCheckedChange={(checked) => 
                    onFiltersChange({ 
                      ...filters, 
                      channel: checked ? channel.value : undefined 
                    })
                  }
                >
                  <channel.icon className="h-4 w-4 mr-2" />
                  {channel.label}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuLabel>Estado</DropdownMenuLabel>
              {STATUSES.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status.value}
                  checked={filters.status === status.value}
                  onCheckedChange={(checked) => 
                    onFiltersChange({ 
                      ...filters, 
                      status: checked ? status.value : undefined 
                    })
                  }
                >
                  {status.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {activeFiltersCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2"
              onClick={clearFilters}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No hay conversaciones</p>
            <p className="text-sm mt-1">
              {activeFiltersCount > 0 
                ? 'Prueba ajustando los filtros'
                : 'Las nuevas conversaciones aparecerán aquí'}
            </p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isSelected={selectedId === conversation.id}
              onClick={() => onSelect(conversation.id)}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}

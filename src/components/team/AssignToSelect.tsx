import { useTeam, TeamMember } from '@/hooks/useTeam';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCircle } from 'lucide-react';

interface AssignToSelectProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AssignToSelect({ 
  value, 
  onChange, 
  placeholder = 'Sin asignar',
  disabled = false 
}: AssignToSelectProps) {
  const { teamMembers, isLoading } = useTeam();

  const activeMembers = teamMembers.filter(m => m.is_active);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const selectedMember = activeMembers.find(m => m.user_id === value);

  return (
    <Select 
      value={value || 'unassigned'} 
      onValueChange={(v) => onChange(v === 'unassigned' ? undefined : v)}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue>
          {selectedMember ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={selectedMember.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(selectedMember.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selectedMember.full_name || selectedMember.email}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserCircle className="h-5 w-5" />
              <span>{placeholder}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">
          <div className="flex items-center gap-2 text-muted-foreground">
            <UserCircle className="h-5 w-5" />
            <span>Sin asignar</span>
          </div>
        </SelectItem>
        {activeMembers.map((member) => (
          <SelectItem key={member.user_id} value={member.user_id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(member.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span>{member.full_name || member.email}</span>
                <span className="text-xs text-muted-foreground capitalize">{member.role.replace('_', ' ')}</span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

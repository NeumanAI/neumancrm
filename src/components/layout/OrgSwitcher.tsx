import { useTeam } from '@/hooks/useTeam';
import { getVerticalConfig } from '@/config/verticals';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OrgSwitcherProps {
  collapsed?: boolean;
}

export function OrgSwitcher({ collapsed = false }: OrgSwitcherProps) {
  const { organization, allMemberships, switchOrganization } = useTeam();
  const [open, setOpen] = useState(false);

  // Don't show if only 1 org
  if (allMemberships.length <= 1) return null;

  const activeVertical = getVerticalConfig(organization?.industry_vertical);

  return (
    <div className="px-3 py-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 transition-colors",
              "hover:bg-sidebar-accent text-sidebar-foreground text-left",
              collapsed && "justify-center px-2"
            )}
          >
            <span className="text-lg flex-shrink-0">{activeVertical.icon}</span>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex items-center justify-between flex-1 min-w-0 overflow-hidden"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{organization?.name}</p>
                    <p className="text-[10px] text-sidebar-foreground/50 truncate">{activeVertical.brandName}</p>
                  </div>
                  <ChevronsUpDown className="h-3.5 w-3.5 text-sidebar-foreground/40 flex-shrink-0 ml-1" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          className="w-56 p-1"
        >
          <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">Cambiar vertical</p>
          {allMemberships.map((membership) => {
            const vertical = getVerticalConfig(
              // We need the org's industry_vertical — fetch from organization query or infer
              // For simplicity, use a sub-query approach: we know the org names
              undefined
            );
            const isActive = membership.organization_id === organization?.id;

            return (
              <OrgItem
                key={membership.id}
                membershipId={membership.organization_id}
                isActive={isActive}
                onSelect={() => {
                  switchOrganization(membership.organization_id);
                  setOpen(false);
                }}
              />
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function OrgItem({ membershipId, isActive, onSelect }: { membershipId: string; isActive: boolean; onSelect: () => void }) {
  // Fetch org info for this membership
  const { data: org } = useOrgInfo(membershipId);
  const vertical = getVerticalConfig(org?.industry_vertical);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors",
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
      )}
    >
      <span className="text-base">{vertical.icon}</span>
      <div className="flex-1 text-left min-w-0">
        <p className="font-medium truncate text-xs">{org?.name || '...'}</p>
        <p className="text-[10px] text-muted-foreground truncate">{vertical.brandName}</p>
      </div>
      {isActive && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
    </button>
  );
}

// Lightweight hook to get org info by id
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function useOrgInfo(orgId: string) {
  return useQuery({
    queryKey: ['org_info', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, industry_vertical, logo_url')
        .eq('id', orgId)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

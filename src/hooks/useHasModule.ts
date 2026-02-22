import { useTeam } from '@/hooks/useTeam';

export function useHasModule(moduleName: string): boolean {
  const { organization } = useTeam();
  if (!organization) return false;
  const modules = (organization as any).enabled_modules;
  return !!modules && !!modules[moduleName];
}

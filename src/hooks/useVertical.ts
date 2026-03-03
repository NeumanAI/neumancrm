import { useTeam } from '@/hooks/useTeam';
import { getVerticalConfig, VerticalConfig, VerticalId } from '@/config/verticals';

export function useVertical() {
  const { organization } = useTeam();
  const verticalId = (organization as any)?.industry_vertical as VerticalId ?? null;
  const config: VerticalConfig = getVerticalConfig(verticalId);

  return {
    verticalId: config.id,
    vertical: config,
    brandName: config.brandName,
    brandTagline: config.brandTagline,
    vocabulary: config.vocabulary,
    modules: config.modules,
    aiContext: config.aiContext,
    color: config.color,
    icon: config.icon,
    isRealEstate: config.id === 'real_estate',
    isHealth: config.id === 'health',
    isGeneral: config.id === 'general',
    comingSoon: config.comingSoon ?? false,
  };
}

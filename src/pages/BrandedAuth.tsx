import { useParams } from 'react-router-dom';
import { BrandingProvider } from '@/contexts/BrandingContext';
import Auth from './Auth';

export default function BrandedAuth() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <BrandingProvider slugOverride={slug}>
      <Auth />
    </BrandingProvider>
  );
}

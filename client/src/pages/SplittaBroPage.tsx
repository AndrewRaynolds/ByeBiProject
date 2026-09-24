import { SplittaBro } from '@/components/SplittaBro';
import { useEffect } from 'react';
import { trackProductEvent } from '@/lib/track';

export default function SplittaBroPage() {
  useEffect(() => trackProductEvent('splitta_opened'), []);
  return <SplittaBro />;
}

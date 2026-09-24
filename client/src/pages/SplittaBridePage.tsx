import { SplittaBride } from '@/components/SplittaBride';
import { useEffect } from 'react';
import { trackProductEvent } from '@/lib/track';

export default function SplittaBridePage() {
  useEffect(() => trackProductEvent('splitta_opened'), []);
  return <SplittaBride />;
}

import { FeaturePage } from '@/components/feature-page';

export default function ScannerPage() {
  return (
    <FeaturePage
      title="Scanner"
      description="Upload a graded slab image to extract the cert number, verify the card, and cache the result."
      bullets={[
        'PSA cert lookup and population data.',
        'Fallback manual cert entry when OCR misses.',
        'Save verified scans to your collection in one tap.',
      ]}
    />
  );
}


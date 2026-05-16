import { FeaturePage } from '@/components/feature-page';

export default function ImportPage() {
  return (
    <FeaturePage
      title="Import"
      description="Parse eBay CSVs, purchase screenshots, or pasted text into a review table before saving."
      bullets={[
        'Preview and edit all parsed rows before confirmation.',
        'Link imports back to collection cards for provenance.',
        'Designed for screenshot, CSV, and paste workflows.',
      ]}
    />
  );
}


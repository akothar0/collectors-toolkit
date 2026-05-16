import { FeaturePage } from '@/components/feature-page';

export default function CollectionPage() {
  return (
    <FeaturePage
      title="Collection"
      description="Manage your owned cards, grades, values, and provenance with a quick-edit collection grid."
      bullets={[
        'Manual add flow optimized for under 30 seconds.',
        'Track raw and graded cards in one place.',
        'Keep sold and traded history for ROI tracking.',
      ]}
    />
  );
}


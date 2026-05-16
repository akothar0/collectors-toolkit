import { FeaturePage } from '@/components/feature-page';

export default function PortfolioPage() {
  return (
    <FeaturePage
      title="Portfolio"
      description="See total cards, total value, gain/loss, and top holdings once collection data is connected."
      bullets={[
        'Total cost basis and unrealized gain/loss.',
        'Breakdown by sport and grade distribution.',
        'Top 5 cards by current value.',
      ]}
    />
  );
}


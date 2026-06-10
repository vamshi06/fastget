import { HeroSection } from '@/components/home/HeroSection';
import { TrustBadges } from '@/components/home/TrustBadges';
import { CategoryStrip } from '@/components/home/CategoryStrip';
import { RentalBanner } from '@/components/home/RentalBanner';
import { ProductSection } from '@/components/home/ProductSection';

export default function Home() {
  return (
    <div className="min-h-screen bg-brand-fog">

      {/* 1. Hero banner */}
      <HeroSection />

      {/* 4. Product-heavy feed */}
      <div className="page-container py-6 md:py-8 space-y-8 md:space-y-12">

        {/* Best Deals — all categories, show highest discount first */}
        <ProductSection
          title="Best Deals"
          subtitle="Lowest prices on construction materials"
          limit={10}
        />

        {/* Civil materials spotlight */}
        <ProductSection
          title="Cement & Civil Materials"
          subtitle="Strongest prices on site basics"
          category="civil-materials"
          limit={8}
        />

        {/* Carpentry section */}
        <ProductSection
          title="Carpentry Essentials"
          subtitle="Plywood, hinges, screws & more"
          category="carpentry"
          limit={8}
        />

        {/* 5. Category grid — Browse all sections */}
        <CategoryStrip />

        {/* Plumbing section */}
        <ProductSection
          title="Plumbing Supplies"
          subtitle="CPVC, PVC, fittings & fixtures"
          category="plumbing"
          limit={8}
        />

        {/* Electrical section */}
        <ProductSection
          title="Electrical Materials"
          subtitle="Wires, switches, boards & accessories"
          category="electrical"
          limit={8}
        />

        {/* Tools section */}
        <ProductSection
          title="Tools & Machines"
          subtitle="Power tools, hand tools & equipment"
          category="tools-machines"
          limit={8}
        />

        {/* 6. Promo / rental banner */}
        <RentalBanner />
      </div>

      {/* 7. Trust strip — full width at bottom */}
      <div className="bg-white border-t border-neutral-100">
        <div className="page-container">
          <TrustBadges />
        </div>
      </div>

    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { HeroSection } from '@/components/home/HeroSection';
import { TrustBadges } from '@/components/home/TrustBadges';
import { CategoryStrip } from '@/components/home/CategoryStrip';
import { RentalBanner } from '@/components/home/RentalBanner';
import { SearchBar } from '@/components/SearchBar';

export default function Home() {
  const router = useRouter();

  const handleSearch = (query: string) => {
    if (query.trim()) {
      router.push(`/catalog?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <HeroSection />

      {/* Search bar */}
      <div className="page-container py-6">
        <SearchBar
          onSearch={handleSearch}
          placeholder="Search for plywood, hinges, plumbing fittings..."
        />
      </div>

      <div className="page-container pb-8 space-y-12">
        <TrustBadges />
        <CategoryStrip />
        <RentalBanner />
      </div>
    </div>
  );
}

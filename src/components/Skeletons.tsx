// Placeholder screens shown the instant a route is tapped (via loading.tsx and
// in-page loading states), so navigation never looks frozen while the server
// or API responds. Shapes roughly match the real screens they stand in for.

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <div className="skeleton aspect-square w-full rounded-none" />
      <div className="p-2.5 space-y-2">
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-2/3" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Generic screen: title + a block + a product grid. Used as the app-wide
// fallback, so it has to look reasonable for any page.
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-brand-fog" aria-busy="true">
      <div className="page-container py-4 md:py-8 space-y-5">
        <div className="skeleton h-6 w-40" />
        <div className="skeleton h-28 w-full rounded-2xl" />
        <ProductGridSkeleton />
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-brand-fog md:py-8" aria-busy="true">
      <div className="max-w-7xl mx-auto md:px-6 lg:px-8">
        <div className="hidden md:block skeleton h-4 w-64 mb-8" />
        <div className="grid lg:grid-cols-2 gap-6 md:gap-10">
          <div className="skeleton aspect-square md:aspect-auto md:h-[500px] w-full rounded-none md:rounded-2xl" />
          <div className="px-4 md:px-0 space-y-4">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-7 w-4/5" />
            <div className="skeleton h-8 w-32" />
            <div className="skeleton h-20 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

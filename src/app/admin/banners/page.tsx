import { requireAdminPage } from '@/lib/auth';
import { getAllBannersForAdmin, type HomeBanner } from '@/lib/banners';
import { BannersManager } from './BannersManager';

export const dynamic = 'force-dynamic';

export default async function AdminBannersPage() {
  await requireAdminPage();

  // Before migration 024 runs the table doesn't exist - say so instead of
  // crashing the page.
  let banners: HomeBanner[] | null = null;
  try {
    banners = await getAllBannersForAdmin();
  } catch {
    banners = null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-brand-charcoal">Home banners</h1>
        <p className="text-brand-slate text-sm">
          Slides in the carousel at the top of the app&apos;s home screen. Live banners show in order;
          with none live, customers see the built-in text banner. Changes appear on the home screen right away.
        </p>
      </div>

      {banners === null ? (
        <div className="card p-6 text-sm text-red-700 bg-red-50 border-red-100">
          The banners table isn&apos;t set up yet. Run the database migration
          (<code>npm run sync-schema</code>, migration 024) and reload this page.
        </div>
      ) : (
        <BannersManager initialBanners={banners} />
      )}
    </div>
  );
}

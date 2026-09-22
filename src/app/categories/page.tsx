'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

// slug: DB category slug used for the /catalog link. tileKey: key under
// catalog.categoryTiles for this tile's display name. img/keyword: image
// filename + search keyword, unrelated to translation. Group titles use
// either titleKey (catalog namespace) or titleCategorySlug (reuses the
// shared categories namespace when the group name matches a DB category).
interface CategoryGroup {
  titleKey?: string;
  titleCategorySlug?: string;
  categories: { slug: string; tileKey: string; img: string; keyword: string }[];
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    titleKey: 'groupCivilConstruction',
    categories: [
      { slug: 'civil-materials',   tileKey: 'cement',       img: 'cement',        keyword: 'cement'      },
      { slug: 'flooring-ceilings', tileKey: 'tiling',       img: 'tiling',        keyword: 'tile'        },
      { slug: 'paints',            tileKey: 'paints',       img: 'paints',        keyword: 'paint'       },
      { slug: 'civil-materials',   tileKey: 'waterproofing',img: 'waterproofing', keyword: 'waterproof'  },
      { slug: 'carpentry',         tileKey: 'plywood',      img: 'plywood',       keyword: 'plywood'     },
      { slug: 'carpentry',         tileKey: 'adhesives',    img: 'adhesives',     keyword: 'adhesive'    },
      { slug: 'civil-materials',   tileKey: 'sand',         img: 'sand',          keyword: 'sand'        },
    ],
  },
  {
    titleCategorySlug: 'plumbing',
    categories: [
      { slug: 'plumbing', tileKey: 'pipes',    img: 'pipes',    keyword: 'pipe'     },
      { slug: 'plumbing', tileKey: 'taps',     img: 'taps',     keyword: 'tap'      },
      { slug: 'plumbing', tileKey: 'drainage', img: 'drainage', keyword: 'drainage' },
    ],
  },
  {
    titleKey: 'groupCarpentryHardware',
    categories: [
      { slug: 'carpentry',         tileKey: 'hinges',      img: 'hinges',       keyword: 'hinge'     },
      { slug: 'carpentry',         tileKey: 'handles',     img: 'handles',      keyword: 'handle'    },
      { slug: 'glass-aluminium',   tileKey: 'glass',       img: 'glass',        keyword: 'glass'     },
      { slug: 'glass-aluminium',   tileKey: 'aluminium',   img: 'aluminium',    keyword: 'aluminium' },
      { slug: 'glass-aluminium',   tileKey: 'doorWindow',  img: 'door-window',  keyword: 'door'      },
      { slug: 'glass-aluminium',   tileKey: 'locks',       img: 'locks',        keyword: 'lock'      },
      { slug: 'flooring-ceilings', tileKey: 'falseCeiling',img: 'false-ceiling',keyword: 'ceiling'   },
    ],
  },
  {
    titleCategorySlug: 'tools-machines',
    categories: [
      { slug: 'tools-machines', tileKey: 'handTools', img: 'hand-tools', keyword: 'hand'   },
      { slug: 'tools-machines', tileKey: 'measuring',  img: 'measuring',  keyword: 'measur' },
    ],
  },
  {
    titleCategorySlug: 'electrical',
    categories: [
      { slug: 'electrical', tileKey: 'wires',    img: 'wires',    keyword: 'wire'   },
      { slug: 'electrical', tileKey: 'switches', img: 'switches', keyword: 'switch' },
      { slug: 'electrical', tileKey: 'lighting', img: 'lighting', keyword: 'light'  },
      { slug: 'electrical', tileKey: 'mcb',      img: 'mcb',      keyword: 'mcb'    },
    ],
  },
];

function CategoryTile({ slug, name, img, keyword }: { slug: string; name: string; img: string; keyword: string }) {
  const href = `/catalog?category=${slug}&q=${encodeURIComponent(keyword)}`;
  return (
    <Link href={href as any} className="flex flex-col items-center gap-2 group">
      <div
        className="w-full aspect-square rounded-2xl overflow-hidden relative border border-gray-200"
        style={{ backgroundColor: '#dbeafe' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/categories/${img}.jpg`}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            if (!el.src.endsWith('.png')) { el.src = `/categories/${img}.png`; }
            else { el.style.display = 'none'; }
          }}
        />
      </div>
      <span className="text-[10px] sm:text-xs font-medium text-brand-charcoal text-center leading-tight px-0.5">
        {name}
      </span>
    </Link>
  );
}

export default function CategoriesPage() {
  const t = useTranslations('catalog');
  const tCategories = useTranslations('categories');

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="px-4 pt-4 space-y-8">
        {CATEGORY_GROUPS.map((group) => {
          const groupTitle = group.titleCategorySlug
            ? tCategories(`${group.titleCategorySlug}.full`)
            : t(`${group.titleKey}`);
          return (
            <section key={groupTitle}>
              <h2 className="text-xl font-black text-brand-charcoal mb-4">{groupTitle}</h2>
              <div className="grid grid-cols-4 gap-3">
                {group.categories.map((cat) => (
                  <CategoryTile
                    key={`${cat.slug}-${cat.img}`}
                    slug={cat.slug}
                    name={t(`categoryTiles.${cat.tileKey}`)}
                    img={cat.img}
                    keyword={cat.keyword}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

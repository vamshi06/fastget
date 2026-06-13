'use client';

import Link from 'next/link';

const CATEGORY_GROUPS = [
  {
    title: 'Civil & Construction',
    categories: [
      { slug: 'civil-materials',   name: 'Cement',           img: 'cement',        keyword: 'cement'      },
      { slug: 'flooring-ceilings', name: 'Tiling',           img: 'tiling',        keyword: 'tile'        },
      { slug: 'paints',            name: 'Paints',            img: 'paints',        keyword: 'paint'       },
      { slug: 'civil-materials',   name: 'Waterproofing',    img: 'waterproofing', keyword: 'waterproof'  },
      { slug: 'carpentry',         name: 'Plywood & Boards', img: 'plywood',       keyword: 'plywood'     },
      { slug: 'carpentry',         name: 'Adhesives',        img: 'adhesives',     keyword: 'adhesive'    },
      { slug: 'civil-materials',   name: 'Sand & Aggregates',img: 'sand',          keyword: 'sand'        },
    ],
  },
  {
    title: 'Plumbing',
    categories: [
      { slug: 'plumbing', name: 'Pipes',          img: 'pipes', keyword: 'pipe'     },
      { slug: 'plumbing', name: 'Taps & Valves', img: 'taps',       keyword: 'tap'      },
      { slug: 'plumbing', name: 'Drainage',      img: 'drainage',   keyword: 'drainage' },
    ],
  },
  {
    title: 'Carpentry & Hardware',
    categories: [
      { slug: 'carpentry',         name: 'Hinges',             img: 'hinges',       keyword: 'hinge'     },
      { slug: 'carpentry',         name: 'Handles & Knobs',    img: 'handles',      keyword: 'handle'    },
      { slug: 'glass-aluminium',   name: 'Glass Panels',       img: 'glass',        keyword: 'glass'     },
      { slug: 'glass-aluminium',   name: 'Aluminium Sections', img: 'aluminium',    keyword: 'aluminium' },
      { slug: 'glass-aluminium',   name: 'Door & Window',      img: 'door-window',  keyword: 'door'      },
      { slug: 'glass-aluminium',   name: 'Locks & Hardware',   img: 'locks',        keyword: 'lock'      },
      { slug: 'flooring-ceilings', name: 'False Ceiling',      img: 'false-ceiling',keyword: 'ceiling'   },
    ],
  },
  {
    title: 'Tools & Machines',
    categories: [
      { slug: 'tools-machines', name: 'Hand Tools',       img: 'hand-tools',  keyword: 'hand'     },
      { slug: 'tools-machines', name: 'Measuring Tools',  img: 'measuring',   keyword: 'measur'   },
    ],
  },
  {
    title: 'Electrical',
    categories: [
      { slug: 'electrical', name: 'Wires & Cables',     img: 'wires',    keyword: 'wire'   },
      { slug: 'electrical', name: 'Switches & Sockets', img: 'switches', keyword: 'switch' },
      { slug: 'electrical', name: 'Lighting',           img: 'lighting', keyword: 'light'  },
      { slug: 'electrical', name: 'MCBs & Panels',      img: 'mcb',      keyword: 'mcb'    },
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
  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="px-4 pt-4 space-y-8">
        {CATEGORY_GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="text-xl font-black text-brand-charcoal mb-4">{group.title}</h2>
            <div className="grid grid-cols-4 gap-3">
              {group.categories.map((cat) => (
                <CategoryTile key={`${cat.slug}-${cat.img}`} slug={cat.slug} name={cat.name} img={cat.img} keyword={cat.keyword} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

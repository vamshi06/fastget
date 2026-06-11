'use client';

import Link from 'next/link';

const CATEGORY_GROUPS = [
  {
    title: 'Civil & Construction',
    categories: [
      { slug: 'civil-materials', name: 'Cement',           img: 'cement'           },
      { slug: 'flooring-ceilings', name: 'Tiling',         img: 'tiling'           },
      { slug: 'paints',          name: 'Paints',            img: 'paints'           },
      { slug: 'civil-materials', name: 'Waterproofing',    img: 'waterproofing'    },
      { slug: 'carpentry',       name: 'Plywood & Boards', img: 'plywood'          },
      { slug: 'carpentry',       name: 'Adhesives',        img: 'adhesives'        },
      { slug: 'civil-materials', name: 'Sand & Aggregates',img: 'sand'             },
      { slug: 'civil-materials', name: 'Steel & TMT',      img: 'steel'            },
    ],
  },
  {
    title: 'Plumbing',
    categories: [
      { slug: 'plumbing', name: 'CPVC Pipes',       img: 'cpvc-pipes'    },
      { slug: 'plumbing', name: 'PVC Pipes',         img: 'pvc-pipes'     },
      { slug: 'plumbing', name: 'Taps & Valves',     img: 'taps'          },
      { slug: 'plumbing', name: 'Drainage',          img: 'drainage'      },
    ],
  },
  {
    title: 'Carpentry & Hardware',
    categories: [
      { slug: 'carpentry',       name: 'Hinges',             img: 'hinges'         },
      { slug: 'carpentry',       name: 'Handles & Knobs',    img: 'handles'        },
      { slug: 'glass-aluminium', name: 'Glass Panels',       img: 'glass'          },
      { slug: 'glass-aluminium', name: 'Aluminium Sections', img: 'aluminium'      },
      { slug: 'glass-aluminium', name: 'Door & Window',      img: 'door-window'    },
      { slug: 'glass-aluminium', name: 'Locks & Hardware',   img: 'locks'          },
      { slug: 'flooring-ceilings', name: 'False Ceiling',    img: 'false-ceiling'  },
      { slug: 'flooring-ceilings', name: 'Marble & Granite', img: 'marble'         },
    ],
  },
  {
    title: 'Tools & Machines',
    categories: [
      { slug: 'tools-machines', name: 'Power Tools',       img: 'power-tools'   },
      { slug: 'tools-machines', name: 'Hand Tools',        img: 'hand-tools'    },
      { slug: 'tools-machines', name: 'Safety Equipment',  img: 'safety'        },
      { slug: 'tools-machines', name: 'Measuring Tools',   img: 'measuring'     },
    ],
  },
  {
    title: 'Electrical',
    categories: [
      { slug: 'electrical', name: 'Wires & Cables',    img: 'wires'         },
      { slug: 'electrical', name: 'Switches & Sockets', img: 'switches'     },
      { slug: 'electrical', name: 'Lighting',           img: 'lighting'      },
      { slug: 'electrical', name: 'MCBs & Panels',      img: 'mcb'           },
    ],
  },
];

function CategoryTile({ slug, name, img }: { slug: string; name: string; img: string }) {
  return (
    <Link href={`/catalog?category=${slug}`} className="flex flex-col items-center gap-2 group">
      <div
        className="w-full aspect-square rounded-2xl overflow-hidden relative"
        style={{ backgroundColor: '#dbeafe' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/categories/${img}.png`}
          alt={name}
          className="absolute inset-0 w-full h-full object-contain p-2"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
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
                <CategoryTile key={`${cat.slug}-${cat.img}`} slug={cat.slug} name={cat.name} img={cat.img} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

import { Category, Product } from '@/types';

export const categories: Category[] = [
  {
    id: 'carpentry',
    name: 'Carpentry',
    description: 'Ply, hinges, screws, channels, and adhesives',
    icon: 'Hammer',
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    description: 'CPVC fittings, elbows, connectors, and sanitary fittings',
    icon: 'Droplet',
  },
  {
    id: 'hardware',
    name: 'Hardware',
    description: 'Nuts, bolts, nails, and general hardware',
    icon: 'Wrench',
  },
  {
    id: 'electrical',
    name: 'Electrical',
    description: 'Wires, switches, sockets, and electrical accessories',
    icon: 'Zap',
  },
  {
    id: 'adhesives',
    name: 'Adhesives',
    description: 'Glue, sealants, and bonding materials',
    icon: 'Droplets',
  },
];

export const products: Product[] = [
  // Carpentry
  {
    id: 'ply-8x4-12mm',
    name: 'Plywood Board 8x4 ft - 12mm',
    description: 'Standard commercial plywood for furniture and interiors. 12mm thick, suitable for cabinet making, partitioning, and interior construction. Marine grade plywood provides durability and water resistance.',
    price: 850,
    unit: 'sheet',
    category: 'carpentry',
    imageUrl: 'https://images.unsplash.com/photo-1504634126265-8238a2c8f859?w=400&h=300&fit=crop',
    stockStatus: 'in_stock',
  },
  {
    id: 'hinge-ss-4pc',
    name: 'Stainless Steel Hinges',
    description: '4 inch heavy duty SS hinges, pack of 2. Made from premium stainless steel for corrosion resistance. Perfect for doors, windows, and cabinets. Load capacity up to 50kg per hinge.',
    price: 120,
    unit: 'pack',
    category: 'carpentry',
    stockStatus: 'in_stock',
  },
  {
    id: 'screw-wood-1.5',
    name: 'Wood Screws 1.5 inch',
    description: 'Galvanized wood screws, pack of 50. High-quality hardened steel with anti-rust coating. Ideal for joining wood pieces, furniture assembly, and general carpentry work.',
    price: 45,
    unit: 'pack',
    category: 'carpentry',
    imageUrl: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=300&fit=crop',
    stockStatus: 'in_stock',
  },
  {
    id: 'channel-telescopic',
    name: 'Telescopic Channel 18 inch',
    description: 'Heavy duty drawer channel pair. Ball bearing telescopic slides for smooth operation. Rated for drawers up to 50kg capacity. Perfect for kitchen cabinets and storage units.',
    price: 180,
    unit: 'pair',
    category: 'carpentry',
    imageUrl: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=400&h=300&fit=crop',
    stockStatus: 'in_stock',
  },
  {
    id: 'fevicol-sh',
    name: 'Fevicol SH Synthetic Resin Adhesive',
    description: 'Strong wood adhesive, 500g pack. Professional grade synthetic resin glue used in furniture manufacturing. Water-resistant, gap-filling, and sandable after drying.',
    price: 95,
    unit: 'pack',
    category: 'adhesives',
    imageUrl: 'https://images.unsplash.com/photo-1576740711621-3007c2d5b6d1?w=400&h=300&fit=crop',
    stockStatus: 'in_stock',
  },
  
  // Plumbing
  {
    id: 'cpvc-elbow-1',
    name: 'CPVC Elbow 1 inch',
    description: '90-degree elbow for CPVC pipes. Schedule 40 CPVC for hot and cold water lines. Corrosion resistant, suitable for residential and commercial plumbing applications.',
    price: 35,
    unit: 'piece',
    category: 'plumbing',
    imageUrl: 'https://images.unsplash.com/photo-1585522188867-b63e52e1ea87?w=400&h=300&fit=crop',
    stockStatus: 'in_stock',
  },
  {
    id: 'cpvc-tee-1',
    name: 'CPVC Tee 1 inch',
    description: 'T-joint connector for CPVC pipes. Creates branch connections in plumbing lines. Compatible with CPVC fittings and Schedule 40 pipes. Simple push-fit installation.',
    price: 45,
    unit: 'piece',
    category: 'plumbing',
    imageUrl: 'https://images.unsplash.com/photo-1585522188867-b63e52e1ea87?w=400&h=300&fit=crop',
    stockStatus: 'in_stock',
  },
  {
    id: 'cpvc-coupler-1',
    name: 'CPVC Coupler 1 inch',
    description: 'Straight connector for CPVC pipes. Used to join two pieces of CPVC pipe in a straight line. Temperature rated for both hot and cold water applications.',
    price: 30,
    unit: 'piece',
    category: 'plumbing',
    imageUrl: 'https://images.unsplash.com/photo-1585522188867-b63e52e1ea87?w=400&h=300&fit=crop',
    stockStatus: 'in_stock',
  },
  {
    id: 'ptfe-tape',
    name: 'PTFE Thread Seal Tape',
    description: 'White Teflon tape for leak-proof joints, roll of standard width. Prevents water leakage in threaded connections. Easy to wrap around pipe threads. Reusable and weather-resistant.',
    price: 25,
    unit: 'roll',
    category: 'plumbing',
    imageUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=300&fit=crop',
    stockStatus: 'in_stock',
  },
  {
    id: 'waste-coupling',
    name: 'PVC Waste Coupling',
    description: 'Sink/basin waste coupling with nut. Complete waste assembly for sinks and washbasins. Includes coupling, washer, and lock nut. Chrome plated finish.',
    price: 85,
    unit: 'piece',
    category: 'plumbing',
    imageUrl: 'https://images.unsplash.com/photo-1585522188867-b63e52e1ea87?w=400&h=300&fit=crop',
    stockStatus: 'in_stock',
  },
  
  // Hardware
  {
    id: 'anchor-fastener-6mm',
    name: 'Anchor Fasteners 6mm',
    description: 'Wall anchor fasteners with screws, pack of 10. Perfect for hanging items on walls without using studs. Heavy-duty plastic anchors with machine screws included.',
    price: 55,
    unit: 'pack',
    category: 'hardware',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    stockStatus: 'in_stock',
  },
  {
    id: 'nail-concrete-2',
    name: 'Concrete Nails 2 inch',
    description: 'Hardened steel nails for concrete, pack of 100g. High carbon steel construction for driving into concrete and masonry. Heat treated for durability.',
    price: 40,
    unit: 'pack',
    category: 'hardware',
    imageUrl: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=300&fit=crop',
    stockStatus: 'in_stock',
  },
  {
    id: 'wire-nails-1.5',
    name: 'Wire Nails 1.5 inch',
    description: 'General purpose wire nails, pack of 250g. Galvanized coating prevents rust. Suitable for general carpentry, framing, and construction work.',
    price: 65,
    unit: 'pack',
    category: 'hardware',
    imageUrl: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=300&fit=crop',
    stockStatus: 'in_stock',
  },
  
  // Electrical
  {
    id: 'switch-modular-6a',
    name: 'Modular Switch 6A',
    description: 'White modular switch, 1-way. IP20 rated for indoor use. Compatible with standard modular plates. Easy installation on walls.',
    price: 35,
    unit: 'piece',
    category: 'electrical',
    imageUrl: 'https://images.unsplash.com/photo-1574482620811-1aa16ffe3c82?w=400&h=300&fit=crop',
    stockStatus: 'in_stock',
  },
  {
    id: 'socket-5pin-6a',
    name: '5-Pin Socket 6A',
    description: 'Standard 5-pin power socket. Rated for 6A current capacity. 250V AC. Safe and durable for household use. White finish.',
    price: 55,
    unit: 'piece',
    category: 'electrical',
    imageUrl: 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400&h=300&fit=crop',
    stockStatus: 'in_stock',
  },
  {
    id: 'wire-havells-1.5sq',
    name: 'Havells Wire 1.5 sq mm',
    description: 'PVC insulated copper wire, red, per meter. 1.5 square mm cross-section. Suitable for household electrical circuits. Single strand copper conductor.',
    price: 28,
    unit: 'meter',
    category: 'electrical',
    imageUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=300&fit=crop',
    stockStatus: 'in_stock',
  },
];

export function getProductsByCategory(categoryId: string): Product[] {
  return products.filter(p => p.category === categoryId);
}

export function getProductById(id: string): Product | undefined {
  return products.find(p => p.id === id);
}

export function searchProducts(query: string): Product[] {
  const lowercaseQuery = query.toLowerCase();
  return products.filter(
    p =>
      p.name.toLowerCase().includes(lowercaseQuery) ||
      p.description.toLowerCase().includes(lowercaseQuery)
  );
}

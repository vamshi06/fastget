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
    description: 'Standard commercial plywood for furniture and interiors',
    price: 850,
    unit: 'sheet',
    category: 'carpentry',
    stockStatus: 'in_stock',
  },
  {
    id: 'hinge-ss-4pc',
    name: 'Stainless Steel Hinges',
    description: '4 inch heavy duty SS hinges, pack of 2',
    price: 120,
    unit: 'pack',
    category: 'carpentry',
    stockStatus: 'in_stock',
  },
  {
    id: 'screw-wood-1.5',
    name: 'Wood Screws 1.5 inch',
    description: 'Galvanized wood screws, pack of 50',
    price: 45,
    unit: 'pack',
    category: 'carpentry',
    stockStatus: 'in_stock',
  },
  {
    id: 'channel-telescopic',
    name: 'Telescopic Channel 18 inch',
    description: 'Heavy duty drawer channel pair',
    price: 180,
    unit: 'pair',
    category: 'carpentry',
    stockStatus: 'in_stock',
  },
  {
    id: 'fevicol-sh',
    name: 'Fevicol SH Synthetic Resin Adhesive',
    description: 'Strong wood adhesive, 500g pack',
    price: 95,
    unit: 'pack',
    category: 'adhesives',
    stockStatus: 'in_stock',
  },
  
  // Plumbing
  {
    id: 'cpvc-elbow-1',
    name: 'CPVC Elbow 1 inch',
    description: '90-degree elbow for CPVC pipes',
    price: 35,
    unit: 'piece',
    category: 'plumbing',
    stockStatus: 'in_stock',
  },
  {
    id: 'cpvc-tee-1',
    name: 'CPVC Tee 1 inch',
    description: 'T-joint connector for CPVC pipes',
    price: 45,
    unit: 'piece',
    category: 'plumbing',
    stockStatus: 'in_stock',
  },
  {
    id: 'cpvc-coupler-1',
    name: 'CPVC Coupler 1 inch',
    description: 'Straight connector for CPVC pipes',
    price: 30,
    unit: 'piece',
    category: 'plumbing',
    stockStatus: 'in_stock',
  },
  {
    id: 'ptfe-tape',
    name: 'PTFE Thread Seal Tape',
    description: 'White Teflon tape for leak-proof joints',
    price: 25,
    unit: 'roll',
    category: 'plumbing',
    stockStatus: 'in_stock',
  },
  {
    id: 'waste-coupling',
    name: 'PVC Waste Coupling',
    description: 'Sink/basin waste coupling with nut',
    price: 85,
    unit: 'piece',
    category: 'plumbing',
    stockStatus: 'in_stock',
  },
  
  // Hardware
  {
    id: 'anchor-fastener-6mm',
    name: 'Anchor Fasteners 6mm',
    description: 'Wall anchor fasteners with screws, pack of 10',
    price: 55,
    unit: 'pack',
    category: 'hardware',
    stockStatus: 'in_stock',
  },
  {
    id: 'nail-concrete-2',
    name: 'Concrete Nails 2 inch',
    description: 'Hardened steel nails for concrete, pack of 100g',
    price: 40,
    unit: 'pack',
    category: 'hardware',
    stockStatus: 'in_stock',
  },
  {
    id: 'wire-nails-1.5',
    name: 'Wire Nails 1.5 inch',
    description: 'General purpose wire nails, pack of 250g',
    price: 65,
    unit: 'pack',
    category: 'hardware',
    stockStatus: 'in_stock',
  },
  
  // Electrical
  {
    id: 'switch-modular-6a',
    name: 'Modular Switch 6A',
    description: 'White modular switch, 1-way',
    price: 35,
    unit: 'piece',
    category: 'electrical',
    stockStatus: 'in_stock',
  },
  {
    id: 'socket-5pin-6a',
    name: '5-Pin Socket 6A',
    description: 'Standard 5-pin power socket',
    price: 55,
    unit: 'piece',
    category: 'electrical',
    stockStatus: 'in_stock',
  },
  {
    id: 'wire-havells-1.5sq',
    name: 'Havells Wire 1.5 sq mm',
    description: 'PVC insulated copper wire, red, per meter',
    price: 28,
    unit: 'meter',
    category: 'electrical',
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

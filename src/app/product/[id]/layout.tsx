import type { Metadata } from 'next';
import { cache } from 'react';
import { getProductWithVariants } from '@/lib/products';
import { formatCurrency } from '@/lib/utils';

// The product page itself renders in the browser; this layout only adds
// server-rendered metadata, so a product link shared on WhatsApp (or found on
// Google) shows its name, photo and price instead of a generic "FastGet".
const loadProduct = cache((id: string) => getProductWithVariants(decodeURIComponent(id)).catch(() => null));

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const product = await loadProduct(params.id);
  if (!product) return { title: 'Product not found | FastGet' };

  const title = `${product.name} | FastGet`;
  const priceLine = `${formatCurrency(product.price)} / ${product.unit}`;
  const description = [
    priceLine,
    product.description?.trim(),
    'Delivered to your Mumbai site in 60 minutes.',
  ].filter(Boolean).join(' · ').slice(0, 300);
  const images = product.imageUrl ? [{ url: product.imageUrl, alt: product.name }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/product/${params.id}` },
    openGraph: { title, description, type: 'website', siteName: 'FastGet', url: `/product/${params.id}`, images },
    twitter: { card: images ? 'summary_large_image' : 'summary', title, description, images: images?.map((i) => i.url) },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import { Metadata } from 'next';
import { MonterraProduct } from '@/types/affiliate.types';

/**
 * SEO utility to generate canonical and social media metadata for product pages.
 */
export function generateProductMetadata(product: MonterraProduct): Metadata {
  const url = `https://monterra.com/plants/${product.slug}`;
  
  return {
    title: `${product.name} | Monterra Premium Plants`,
    description: product.description.substring(0, 160) + '...',
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: product.name,
      description: product.description,
      url: url,
      siteName: 'Monterra',
      images: [
        {
          url: product.image,
          width: 800,
          height: 800,
          alt: product.name,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: [product.image],
    },
  };
}

import { ProductDetail } from '@/components/features/products/product-detail';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product - ThapCam E-Commerce',
};

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-background">
      <ProductDetail productId={id} />
    </div>
  );
}

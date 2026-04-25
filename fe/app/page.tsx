'use client';

import { Suspense } from 'react';
import { ProductGrid } from '@/components/features/products/product-grid';
import { Skeleton } from '@/components/ui/skeleton';

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-96 rounded-lg" />
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/10 to-background py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Welcome to ThapCam
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover our curated collection of high-quality products at unbeatable prices.
            </p>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Featured Products</h2>
        </div>

        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid />
        </Suspense>
      </section>
    </div>
  );
}

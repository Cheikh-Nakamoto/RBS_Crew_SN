import { notFound } from 'next/navigation';
import { fetchAdminProduct, fetchCategoryOptions, fetchTagOptions } from '@/lib/admin/queries';
import { ProductForm } from '../_components/product-form';

export const metadata = { title: 'Modifier le produit' };

interface EditProduitPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProduitPage({ params }: EditProduitPageProps) {
  const { id } = await params;
  let product;
  let categories;
  let tags;
  try {
    [product, categories, tags] = await Promise.all([
      fetchAdminProduct(id),
      fetchCategoryOptions(),
      fetchTagOptions(),
    ]);
  } catch {
    notFound();
  }

  return (
    <ProductForm mode="edit" initialData={product} categories={categories} tags={tags} />
  );
}

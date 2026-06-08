import { notFound } from 'next/navigation';
import { fetchAdminProduct, fetchAdminCategories, fetchAdminTags } from '@/lib/admin/queries';
import { ProductForm } from '../_components/product-form';

export const metadata = { title: 'Modifier le produit' };

interface EditProduitPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProduitPage({ params }: EditProduitPageProps) {
  const { id } = await params;
  let product;
  let categoriesData;
  let tagsData;
  try {
    [product, categoriesData, tagsData] = await Promise.all([
      fetchAdminProduct(id),
      fetchAdminCategories({ limit: 100 }),
      fetchAdminTags({ limit: 100 }),
    ]);
  } catch {
    notFound();
  }

  return (
    <ProductForm
      mode="edit"
      initialData={product}
      categories={categoriesData.data}
      tags={tagsData.data}
    />
  );
}

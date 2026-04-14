import { fetchAdminCategories, fetchAdminTags } from '@/lib/admin/queries';
import { ProductForm } from '../_components/product-form';

export const metadata = { title: 'Nouveau produit' };

export default async function NouveauProduitPage() {
  const [categoriesData, tagsData] = await Promise.all([
    fetchAdminCategories({ limit: 100 }),
    fetchAdminTags({ limit: 100 }),
  ]);

  return (
    <ProductForm
      mode="create"
      categories={categoriesData.data}
      tags={tagsData.data}
    />
  );
}

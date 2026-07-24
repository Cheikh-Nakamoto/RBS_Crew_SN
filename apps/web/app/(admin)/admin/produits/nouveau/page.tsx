import { fetchCategoryOptions, fetchTagOptions } from '@/lib/admin/queries';
import { ProductForm } from '../_components/product-form';

export const metadata = { title: 'Nouveau produit' };

export default async function NouveauProduitPage() {
  const [categories, tags] = await Promise.all([fetchCategoryOptions(), fetchTagOptions()]);

  return <ProductForm mode="create" categories={categories} tags={tags} />;
}

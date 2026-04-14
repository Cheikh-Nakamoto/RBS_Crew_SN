import { TranslatableEntityForm } from '@/components/admin/forms/translatable-entity-form';
import { createEditions } from '../actions';
export const metadata = { title: 'Nouveau edition' };
export default function NouveauEditionsPage() {
  return <TranslatableEntityForm mode="create" backHref="/admin/editions" entityLabel="edition" showImage={true} showGallery={true} showMeta={false} onCreate={createEditions} />;
}

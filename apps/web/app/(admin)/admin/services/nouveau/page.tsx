import { TranslatableEntityForm } from '@/components/admin/forms/translatable-entity-form';
import { createServices } from '../actions';
export const metadata = { title: 'Nouveau service' };
export default function NouveauServicesPage() {
  return <TranslatableEntityForm mode="create" backHref="/admin/services" entityLabel="service" showImage={true} showMeta={true} onCreate={createServices} />;
}

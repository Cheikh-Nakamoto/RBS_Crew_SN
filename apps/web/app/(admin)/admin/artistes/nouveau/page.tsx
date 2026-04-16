import { TranslatableEntityForm } from '@/components/admin/forms/translatable-entity-form';
import { createArtistes } from '../actions';
export const metadata = { title: 'Nouveau artiste' };
export default function NouveauArtistesPage() {
  return <TranslatableEntityForm mode="create" backHref="/admin/artistes" entityLabel="artiste" showContent={false} showShortDescription={false} showImage={true} showGallery={true} showMeta={false} onCreate={createArtistes} />;
}

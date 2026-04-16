import { FestivalEditionForm } from '@/components/admin/forms/festival-edition-form';
import { createEditions } from '../actions';
export const metadata = { title: 'Nouveau edition' };
export default function NouveauEditionsPage() {
  return <FestivalEditionForm mode="create" backHref="/admin/editions" onCreate={createEditions} />;
}

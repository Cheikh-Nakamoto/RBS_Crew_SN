import { notFound } from 'next/navigation';
import { fetchAdminArtist } from '@/lib/admin/queries';
import { ArtistForm } from '@/components/admin/forms/artist-form';
import { updateArtistes } from '../actions';
import { ArtistAccountPanel } from './artist-account-panel';

export const metadata = { title: 'Modifier' };

export default async function EditArtistesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data;
  try {
    data = await fetchAdminArtist(id);
  } catch {
    notFound();
  }
  const account = data as { accountEmail?: string | null; accountStatus?: string | null };
  return (
    <div className="space-y-8">
      <ArtistForm mode="edit" backHref="/admin/artistes" initialData={data} onUpdate={updateArtistes} />
      <ArtistAccountPanel
        artistId={id}
        accountEmail={account.accountEmail}
        accountStatus={account.accountStatus}
      />
    </div>
  );
}

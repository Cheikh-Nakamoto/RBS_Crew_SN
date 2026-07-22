import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, Calendar, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchAdminUser } from '@/lib/admin/queries';
import { RoleBadge } from '@/components/admin/role-badge';
import { AdminStatusSelect } from '@/components/admin/admin-status-select';
import { AdminDeleteButton } from '@/components/admin/admin-delete-button';
import { setUserRole, deleteUser } from '../actions';
import type { UserRole } from '@/types/admin';
import { VerifyEmailButton } from './_components/verify-email-button';

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrateur (accès complet)',
  ARTIST: 'Artiste (gère sa propre fiche)',
  EDITOR: 'Éditeur (accès back-office)',
  CUSTOMER: 'Client',
};

export const metadata = { title: 'Détail utilisateur' };

export default async function UtilisateurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let user;
  try {
    user = await fetchAdminUser(id);
  } catch {
    notFound();
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="text-white/60 hover:text-white">
            <Link href="/admin/utilisateurs"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--rbs-red)]/80">Utilisateurs</p>
            <h1 className="text-2xl font-black text-white">{fullName}</h1>
          </div>
        </div>
        <AdminDeleteButton
          id={user.id}
          title={`Supprimer ${fullName} ?`}
          description="Cet utilisateur et toutes ses données seront définitivement supprimés. Cette action est irréversible."
          successMessage="Utilisateur supprimé"
          redirectPath="/admin/utilisateurs"
          deleteAction={deleteUser}
        />
      </div>

      {/* Badges */}
      <div className="flex items-center gap-3">
        <RoleBadge role={user.role as UserRole} />
        {user.emailVerified ? (
          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
            Email vérifié
          </Badge>
        ) : (
          <>
            <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              Email non vérifié
            </Badge>
            <VerifyEmailButton userId={user.id} />
          </>
        )}
      </div>

      {/* Informations */}
      <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Informations</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-white/30 flex-shrink-0" />
            <span className="text-white">{user.email}</span>
          </div>
          {user.phone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-white/30 flex-shrink-0" />
              <span className="text-white">{user.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <Globe className="h-4 w-4 text-white/30 flex-shrink-0" />
            <span className="text-white uppercase">{user.preferredLocale}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-white/30 flex-shrink-0" />
            <span className="text-white/60">
              Inscrit le {new Date(user.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
            </span>
          </div>
        </div>
      </div>

      {/* Changer le rôle */}
      <AdminStatusSelect
        id={user.id}
        currentValue={user.role as UserRole}
        label="Modifier le rôle"
        options={ROLE_LABELS}
        updateAction={setUserRole}
      />
    </div>
  );
}

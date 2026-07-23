'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { ArtistClaimCard } from '@/components/artist-claim-card';
import { EmailVerificationNotice } from '@/components/email-verification-notice';
import { useCart } from '@/lib/cart-store';
import { formatXOF, formatDate } from '@/lib/format';
import { useAuthedFetch } from '@/lib/use-authed-fetch';
import { ROLE_META_BADGE } from '@/lib/admin/status-maps';
import Link from 'next/link';
import Image from 'next/image';
import {
  User,
  Mail,
  Shield,
  ShoppingBag,
  MapPin,
  LogOut,
  Package,
  ArrowRight,
  Edit3,
  Save,
  X,
  Plus,
  Settings,
  Palette,
  Truck,
} from 'lucide-react';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  items: OrderItem[];
  createdAt: string;
  shippingCarrier?: string;
  trackingNumber?: string;
}

interface Address {
  id: string;
  label?: string;
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  PROCESSING: { label: 'En cours', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  COMPLETED: { label: 'Livrée', color: 'bg-green-500/15 text-green-300 border-green-500/30' },
  CANCELLED: { label: 'Annulée', color: 'bg-red-500/15 text-red-300 border-red-500/30' },
  PAID: { label: 'Payée', color: 'bg-green-500/15 text-green-300 border-green-500/30' },
  UNPAID: { label: 'Non payée', color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
};

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-red-600 rounded-full animate-spin" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { count } = useCart();
  const { authedFetch } = useAuthedFetch();

  // Le middleware redirige ici quand le rôle ne donne pas accès à la page
  // demandée. Sans ce message, la redirection serait muette et donnerait
  // l'impression qu'un accès accordé n'a servi à rien.
  const rolePending = searchParams.get('reason') === 'role_pending';

  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'addresses'>('profile');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '' });

  const emptyAddress = {
    label: '',
    firstName: '',
    lastName: '',
    line1: '',
    line2: '',
    city: '',
    postalCode: '',
    country: 'SN',
    isDefault: false,
  };
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/profile');
    }
  }, [status, router]);

  // Le formulaire est pré-rempli depuis la session. Ajustement d'état pendant
  // le rendu (pattern documenté par React) : c'est une valeur dérivée, pas une
  // synchronisation avec un système externe.
  const sessionEmail = session?.user?.email ?? '';
  const [lastSessionEmail, setLastSessionEmail] = useState<string | null>(null);
  if (session?.user && lastSessionEmail !== sessionEmail) {
    setLastSessionEmail(sessionEmail);
    const nameParts = (session.user.name || '').split(' ');
    setProfileForm({
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: sessionEmail,
    });
  }

  const fetchOrders = useCallback(async () => {
    try {
      const res = await authedFetch('/orders/my');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || data || []);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }, [authedFetch]);

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await authedFetch('/users/me/addresses');
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.data || data || []);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }, [authedFetch]);

  // Statut de la demande « je suis un artiste RBS », renvoyé par /users/me.
  const [artistClaimStatus, setArtistClaimStatus] = useState<string | undefined>();

  const fetchArtistClaim = useCallback(async () => {
    try {
      const res = await authedFetch('/users/me');
      if (!res.ok) return;
      const me = (await res.json()) as { artistClaimStatus?: string };
      setArtistClaimStatus(me.artistClaimStatus);
    } catch {
      // non bloquant : la carte s'affiche avec son état par défaut
    }
  }, [authedFetch]);

  useEffect(() => {
    if (!session) return;
    void fetchArtistClaim();
  }, [session, fetchArtistClaim]);

  const [lastTab, setLastTab] = useState(activeTab);
  if (lastTab !== activeTab) {
    setLastTab(activeTab);
    setLoading(true);
  }

  // Fetch orders
  useEffect(() => {
    if (session && activeTab === 'orders') {
      fetchOrders();
    }
  }, [session, activeTab, fetchOrders]);

  // Fetch addresses
  useEffect(() => {
    if (session && activeTab === 'addresses') {
      fetchAddresses();
    }
  }, [session, activeTab, fetchAddresses]);

  async function handleSaveProfile() {
    try {
      const res = await authedFetch('/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
        }),
      });
      if (res.ok) {
        setEditing(false);
      }
    } catch {
      // silently fail
    }
  }

  async function handleCreateAddress() {
    setSavingAddress(true);
    setAddressError('');
    try {
      const res = await authedFetch('/users/me/addresses', {
        method: 'POST',
        body: JSON.stringify({
          label: addressForm.label || undefined,
          firstName: addressForm.firstName,
          lastName: addressForm.lastName,
          line1: addressForm.line1,
          line2: addressForm.line2 || undefined,
          city: addressForm.city,
          postalCode: addressForm.postalCode,
          country: addressForm.country,
          isDefault: addressForm.isDefault,
        }),
      });
      if (!res.ok) throw new Error("L'enregistrement a échoué. Vérifiez les champs.");
      setShowAddressForm(false);
      setAddressForm(emptyAddress);
      await fetchAddresses();
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleDeleteAddress(id: string) {
    try {
      const res = await authedFetch(`/users/me/addresses/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchAddresses();
    } catch {
      // silently fail
    }
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  const user = session!.user;
  const role = (user as { role?: string }).role ?? 'CUSTOMER';
  const isStaff = role === 'ADMIN' || role === 'EDITOR';
  const roleBadge = ROLE_META_BADGE[role];
  const initials = (user.name || user.email || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Un admin/éditeur gère le catalogue depuis /admin et n'achète pas via ce
  // compte : on lui masque Commandes/Adresses pour ne garder que l'essentiel.
  const tabs = [
    { id: 'profile' as const, label: 'Profil', icon: User },
    ...(isStaff
      ? []
      : [
          { id: 'orders' as const, label: 'Commandes', icon: Package },
          { id: 'addresses' as const, label: 'Adresses', icon: MapPin },
        ]),
  ];

  return (
    <div className="min-h-screen bg-[#111111] pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {rolePending && (
          <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 mb-8">
            <Shield className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300">
              Cette page demande des droits que ta session ne porte pas encore. Si un
              administrateur vient de te les accorder, utilise « Actualiser mon accès »
              ci-dessous — sinon ils arriveront d&apos;eux-mêmes d&apos;ici quelques minutes.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-10">
          {/* Avatar */}
          <div className="relative">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name || ''}
                width={80}
                height={80}
                className="rounded-full border-2 border-white/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-red-600/20 border-2 border-red-600/40 flex items-center justify-center">
                <span className="font-display text-2xl text-red-400">{initials}</span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-[#111111]" />
          </div>

          <div className="flex-1">
            <h1 className="font-display text-3xl sm:text-4xl text-white uppercase tracking-wider">
              {user.name || user.email}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-white/40">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </span>
              {roleBadge && (
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${roleBadge.className}`}
                >
                  <Shield className="w-3 h-3" />
                  {roleBadge.label}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/shop"
              className="relative p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-red-400 hover:border-red-400/30 transition-colors text-sm font-semibold"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-white/10 pb-px">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-all duration-200 border-b-2 -mb-px ${
                activeTab === id
                  ? 'text-white border-red-600'
                  : 'text-white/40 border-transparent hover:text-white/70'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* ── Profile Tab ── */}
          {activeTab === 'profile' && (
            <div className="max-w-lg space-y-6">
              <EmailVerificationNotice />

              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">
                  Informations personnelles
                </h2>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Modifier
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(false)}
                      className="flex items-center gap-1 text-xs text-white/40 hover:text-white font-semibold transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-semibold transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Enregistrer
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/30 uppercase tracking-wider mb-1.5 block">
                      Prénom
                    </label>
                    {editing ? (
                      <input
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                      />
                    ) : (
                      <p className="px-4 py-3 rounded-xl bg-white/4 border border-white/8 text-white text-sm">
                        {profileForm.firstName || '—'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-white/30 uppercase tracking-wider mb-1.5 block">
                      Nom
                    </label>
                    {editing ? (
                      <input
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                      />
                    ) : (
                      <p className="px-4 py-3 rounded-xl bg-white/4 border border-white/8 text-white text-sm">
                        {profileForm.lastName || '—'}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/30 uppercase tracking-wider mb-1.5 block">
                    Email
                  </label>
                  <p className="px-4 py-3 rounded-xl bg-white/4 border border-white/8 text-white/60 text-sm">
                    {profileForm.email}
                  </p>
                </div>
              </div>

              {/* Raccourci Administration — réservé aux comptes staff. */}
              {isStaff && (
                <Link
                  href="/admin"
                  className="flex items-center justify-between gap-3 p-4 rounded-xl bg-white/4 border border-white/10 hover:border-[var(--rbs-red)]/40 transition-colors group"
                >
                  <span className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-[var(--rbs-red)]" />
                    <span>
                      <span className="block text-sm font-semibold text-white">Administration</span>
                      <span className="block text-xs text-white/40">
                        Gérer le catalogue, les commandes et le contenu du site
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
                </Link>
              )}

              {/* Raccourci Espace artiste — pour les comptes rattachés à une fiche. */}
              {role === 'ARTIST' && (
                <Link
                  href="/espace-artiste"
                  className="flex items-center justify-between gap-3 p-4 rounded-xl bg-white/4 border border-white/10 hover:border-purple-500/40 transition-colors group"
                >
                  <span className="flex items-center gap-3">
                    <Palette className="w-5 h-5 text-purple-300" />
                    <span>
                      <span className="block text-sm font-semibold text-white">Mon espace artiste</span>
                      <span className="block text-xs text-white/40">
                        Mettre à jour ma fiche : bio, photos, réseaux et portfolio
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
                </Link>
              )}

              {/* La demande « devenir artiste » ne concerne que les clients :
                  le staff et les artistes déjà rattachés n'en ont pas l'usage. */}
              {role === 'CUSTOMER' && (
                <ArtistClaimCard initialStatus={artistClaimStatus} role={role} />
              )}
            </div>
          )}

          {/* ── Orders Tab ── */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-red-600 rounded-full animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-white/30">
                  <Package className="w-16 h-16 stroke-[1px]" />
                  <p className="text-sm font-medium">Aucune commande pour le moment</p>
                  <Link
                    href="/shop"
                    className="flex items-center gap-2 text-xs text-red-500 hover:text-white font-semibold uppercase tracking-wider transition-colors"
                  >
                    Découvrir le Shop <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ) : (
                orders.map((order) => {
                  const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-white/10 text-white/50 border-white/20' };
                  const paymentInfo = STATUS_LABELS[order.paymentStatus] || { label: order.paymentStatus, color: 'bg-white/10 text-white/50 border-white/20' };
                  return (
                    <div
                      key={order.id}
                      className="p-5 rounded-xl bg-white/4 border border-white/8 hover:border-white/15 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div>
                          <span className="font-display text-white text-sm uppercase tracking-wider">
                            #{order.orderNumber}
                          </span>
                          <span className="text-white/30 text-xs ml-3">
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${paymentInfo.color}`}>
                            {paymentInfo.label}
                          </span>
                        </div>
                      </div>
                      {order.items && order.items.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-white/60">
                                {item.productName} × {item.quantity}
                              </span>
                              <span className="text-white font-semibold">
                                {formatXOF(item.totalPrice)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between pt-3 border-t border-white/8">
                        <span className="text-xs text-white/40 uppercase tracking-wider font-bold">
                          Total
                        </span>
                        <span className="text-lg font-bold text-white">{formatXOF(order.total)}</span>
                      </div>
                      {order.trackingNumber && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/8 text-xs text-white/60">
                          <Truck className="w-3.5 h-3.5 text-white/40" />
                          <span>
                            Suivi&nbsp;:{' '}
                            {order.shippingCarrier && (
                              <span className="text-white/80">{order.shippingCarrier} · </span>
                            )}
                            <span className="font-mono text-white/80">{order.trackingNumber}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── Addresses Tab ── */}
          {activeTab === 'addresses' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-red-600 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {addresses.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-white/30">
                      <MapPin className="w-16 h-16 stroke-[1px]" />
                      <p className="text-sm font-medium">Aucune adresse enregistrée</p>
                    </div>
                  )}

                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`p-5 rounded-xl bg-white/4 border transition-colors ${
                        addr.isDefault ? 'border-red-600/40' : 'border-white/8 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          {addr.label && (
                            <span className="text-xs font-bold uppercase tracking-widest text-red-400 mb-1 block">
                              {addr.label}
                            </span>
                          )}
                          <p className="text-white font-semibold text-sm">
                            {addr.firstName} {addr.lastName}
                          </p>
                          <p className="text-white/50 text-sm mt-1">{addr.line1}</p>
                          {addr.line2 && <p className="text-white/50 text-sm">{addr.line2}</p>}
                          <p className="text-white/50 text-sm">
                            {addr.postalCode} {addr.city}, {addr.country}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {addr.isDefault && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">
                              Par défaut
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            aria-label="Supprimer l'adresse"
                            className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {showAddressForm ? (
                    <div className="p-5 rounded-xl bg-white/4 border border-white/10 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          value={addressForm.firstName}
                          onChange={(e) => setAddressForm((a) => ({ ...a, firstName: e.target.value }))}
                          placeholder="Prénom *"
                          className="px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/50"
                        />
                        <input
                          value={addressForm.lastName}
                          onChange={(e) => setAddressForm((a) => ({ ...a, lastName: e.target.value }))}
                          placeholder="Nom *"
                          className="px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/50"
                        />
                      </div>
                      <input
                        value={addressForm.label}
                        onChange={(e) => setAddressForm((a) => ({ ...a, label: e.target.value }))}
                        placeholder="Libellé (Maison, Bureau…)"
                        className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/50"
                      />
                      <input
                        value={addressForm.line1}
                        onChange={(e) => setAddressForm((a) => ({ ...a, line1: e.target.value }))}
                        placeholder="Adresse *"
                        className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/50"
                      />
                      <input
                        value={addressForm.line2}
                        onChange={(e) => setAddressForm((a) => ({ ...a, line2: e.target.value }))}
                        placeholder="Complément d'adresse"
                        className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/50"
                      />
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
                        <input
                          value={addressForm.postalCode}
                          onChange={(e) => setAddressForm((a) => ({ ...a, postalCode: e.target.value }))}
                          placeholder="Code postal *"
                          className="px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/50"
                        />
                        <input
                          value={addressForm.city}
                          onChange={(e) => setAddressForm((a) => ({ ...a, city: e.target.value }))}
                          placeholder="Ville *"
                          className="px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/50"
                        />
                        <input
                          value={addressForm.country}
                          onChange={(e) =>
                            setAddressForm((a) => ({ ...a, country: e.target.value.toUpperCase().slice(0, 2) }))
                          }
                          placeholder="Pays"
                          maxLength={2}
                          className="w-20 px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/50 uppercase"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addressForm.isDefault}
                          onChange={(e) => setAddressForm((a) => ({ ...a, isDefault: e.target.checked }))}
                          className="w-4 h-4 accent-red-600"
                        />
                        Définir comme adresse par défaut
                      </label>

                      {addressError && <p className="text-xs text-red-300">{addressError}</p>}

                      <div className="flex gap-2">
                        <button
                          onClick={handleCreateAddress}
                          disabled={savingAddress}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {savingAddress ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                        <button
                          onClick={() => {
                            setShowAddressForm(false);
                            setAddressError('');
                          }}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/8 border border-white/15 text-white/70 text-xs font-semibold hover:bg-white/12 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-white/15 text-white/30 hover:text-white/60 hover:border-white/30 transition-all text-sm font-semibold"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter une adresse
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

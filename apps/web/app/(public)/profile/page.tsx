'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCart } from '@/lib/cart-store';
import { formatXOF, formatDate } from '@/lib/format';
import { useAuthedFetch } from '@/lib/use-authed-fetch';
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const { count } = useCart();
  const { authedFetch } = useAuthedFetch();

  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'addresses'>('profile');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '' });

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/profile');
    }
  }, [status, router]);

  // Initialize profile form from session
  useEffect(() => {
    if (session?.user) {
      const nameParts = (session.user.name || '').split(' ');
      setProfileForm({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: session.user.email || '',
      });
    }
  }, [session]);

  // Fetch orders
  useEffect(() => {
    if (session && activeTab === 'orders') {
      fetchOrders();
    }
  }, [session, activeTab]);

  // Fetch addresses
  useEffect(() => {
    if (session && activeTab === 'addresses') {
      fetchAddresses();
    }
  }, [session, activeTab]);

  async function fetchOrders() {
    setLoading(true);
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
  }

  async function fetchAddresses() {
    setLoading(true);
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
  }

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

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  const user = session!.user;
  const initials = (user.name || user.email || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const tabs = [
    { id: 'profile' as const, label: 'Profil', icon: User },
    { id: 'orders' as const, label: 'Commandes', icon: Package },
    { id: 'addresses' as const, label: 'Adresses', icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-[#111111] pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
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
              {(user as any).role && (
                <span className="flex items-center gap-1.5 text-xs text-red-400/80">
                  <Shield className="w-3.5 h-3.5" />
                  {(user as any).role}
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
                        {addr.isDefault && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">
                            Par défaut
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  <button className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-white/15 text-white/30 hover:text-white/60 hover:border-white/30 transition-all text-sm font-semibold">
                    <Plus className="w-4 h-4" />
                    Ajouter une adresse
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

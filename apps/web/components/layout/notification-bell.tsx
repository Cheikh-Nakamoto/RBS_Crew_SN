'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Bell, CheckCheck } from 'lucide-react';
import { useAuthedFetch } from '@/lib/use-authed-fetch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl?: string;
  readAt?: string | null;
  createdAt: string;
}

// Intervalle de rafraîchissement de la pastille. Volontairement long : les
// notifications ne sont pas du temps réel, un polling léger suffit largement.
const POLL_INTERVAL_MS = 60_000;

export function NotificationBell() {
  const { status } = useSession();
  const { authedFetch } = useAuthedFetch();
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await authedFetch('/notifications?limit=10');
      if (!res.ok) return;
      const data = (await res.json()) as {
        data?: NotificationItem[];
        unreadCount?: number;
      };
      setItems(data.data ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      // Réseau indisponible : on garde le dernier état connu, sans bruit.
    }
  }, [authedFetch]);

  // Charge au montage, au retour de focus sur l'onglet, et à intervalle régulier.
  useEffect(() => {
    if (status !== 'authenticated') return;
    // `load` ne modifie l'état qu'après un await (fetch) : la règle ne peut pas
    // le prouver à travers l'appel de fonction. Même cas que les effets de
    // récupération de données dans app/(public)/profile/page.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const onFocus = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onFocus);
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      clearInterval(timer);
    };
  }, [status, load]);

  if (status !== 'authenticated') return null;

  async function handleOpenChange(open: boolean) {
    if (open) await load();
  }

  async function handleClick(n: NotificationItem) {
    if (!n.readAt) {
      try {
        await authedFetch(`/notifications/${n.id}/read`, { method: 'PATCH' });
        setUnread((u) => Math.max(0, u - 1));
        setItems((list) =>
          list.map((it) => (it.id === n.id ? { ...it, readAt: new Date().toISOString() } : it))
        );
      } catch {
        // non bloquant : la navigation prime sur le marquage
      }
    }
    if (n.linkUrl) router.push(n.linkUrl);
  }

  async function handleMarkAll() {
    try {
      const res = await authedFetch('/notifications/read-all', { method: 'POST' });
      if (res.ok) {
        setUnread(0);
        setItems((list) => list.map((it) => ({ ...it, readAt: it.readAt ?? new Date().toISOString() })));
      }
    } catch {
      // non bloquant
    }
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        aria-label={`Notifications${unread > 0 ? ` (${unread} non lue${unread > 1 ? 's' : ''})` : ''}`}
        className="relative p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-[var(--rbs-red)] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none shadow-[0_0_8px_var(--rbs-red)]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 border-white/10 bg-black/90 backdrop-blur-xl text-white p-0"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              onClick={handleMarkAll}
              className="flex items-center gap-1.5 text-[11px] text-white/50 hover:text-white transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Tout marquer lu
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-white/40">Aucune notification</p>
        ) : (
          <ScrollArea className="max-h-96">
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                      n.readAt ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.readAt && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-[var(--rbs-red)] shrink-0" />
                      )}
                      <div className={n.readAt ? 'pl-4' : ''}>
                        <p className="text-sm font-medium text-white leading-snug">{n.title}</p>
                        <p className="text-xs text-white/50 mt-0.5 leading-snug">{n.body}</p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

'use client';

import { useSyncExternalStore } from 'react';

interface CountdownProps {
  /** Date ISO de début de l'événement. */
  target: string;
  className?: string;
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function remainingFrom(target: number, now: number): Remaining | null {
  const diff = target - now;
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

// L'horloge est un système externe : on s'y abonne plutôt que de piloter un
// état par effet. Le snapshot serveur vaut 0 pour que rien ne soit rendu au SSR
// (l'écart dépend de l'horloge du visiteur, tout rendu serveur mismatcherait).
function subscribeToClock(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}

const getClockSnapshot = () => Math.floor(Date.now() / 1000);
const getClockServerSnapshot = () => 0;

/** Compte à rebours J/H/M/S. Rend `null` une fois l'échéance atteinte. */
export function Countdown({ target, className }: Readonly<CountdownProps>) {
  const targetMs = new Date(target).getTime();
  const nowSeconds = useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    getClockServerSnapshot
  );

  const remaining =
    nowSeconds === 0 || Number.isNaN(targetMs)
      ? null
      : remainingFrom(targetMs, nowSeconds * 1000);

  if (!remaining) return null;

  const units: Array<{ value: number; label: string }> = [
    { value: remaining.days, label: remaining.days > 1 ? 'jours' : 'jour' },
    { value: remaining.hours, label: 'heures' },
    { value: remaining.minutes, label: 'min' },
    { value: remaining.seconds, label: 'sec' },
  ];

  return (
    <div
      className={className}
      role="timer"
      aria-live="off"
      aria-label={`Début dans ${remaining.days} jours, ${remaining.hours} heures, ${remaining.minutes} minutes`}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {units.map((unit) => (
          <div
            key={unit.label}
            className="flex flex-col items-center rounded-xl bg-black/45 ring-1 ring-white/12 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-2.5 min-w-[3.75rem] sm:min-w-[4.5rem]"
          >
            <span className="font-display text-2xl sm:text-3xl leading-none text-[var(--rbs-gold)] tabular-nums">
              {String(unit.value).padStart(2, '0')}
            </span>
            <span className="mt-1 text-[0.6rem] font-mono uppercase tracking-[0.2em] text-white/55">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

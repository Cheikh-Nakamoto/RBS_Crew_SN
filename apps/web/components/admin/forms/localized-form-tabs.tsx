'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Control } from 'react-hook-form';
import type { Locale } from '@/types/admin';

const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'de', label: 'DE', flag: '🇩🇪' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  { code: 'it', label: 'IT', flag: '🇮🇹' },
];

interface LocalizedFormTabsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  renderFields: (index: number, locale: Locale) => React.ReactNode;
}

export function LocalizedFormTabs({ renderFields }: LocalizedFormTabsProps) {
  return (
    <Tabs defaultValue="fr">
      <TabsList className="bg-white/5 border border-white/10 p-1 h-auto gap-1">
        {LOCALES.map(({ code, label, flag }) => (
          <TabsTrigger
            key={code}
            value={code}
            className="flex items-center gap-1.5 text-xs font-medium data-[state=active]:bg-[var(--rbs-red)] data-[state=active]:text-white text-white/50 hover:text-white/80 transition-colors px-3 py-1.5 rounded-md"
          >
            <span>{flag}</span>
            <span>{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {LOCALES.map(({ code }, index) => (
        <TabsContent key={code} value={code} className="mt-4">
          {renderFields(index, code)}
        </TabsContent>
      ))}
    </Tabs>
  );
}

export { LOCALES };

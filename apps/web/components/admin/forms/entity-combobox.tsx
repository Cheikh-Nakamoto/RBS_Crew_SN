'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EntityOption {
  id: string;
  name: string;
}

interface EntityComboboxProps {
  options: EntityOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
}

export function EntityCombobox({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner...',
  label,
}: EntityComboboxProps) {
  const [open, setOpen] = useState(false);

  const selected = options.filter((o) => value.includes(o.id));

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm text-white/70">{label}</p>}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          role="combobox"
          aria-expanded={open}
          className="w-full flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white/70 hover:bg-white/10 hover:text-white min-h-9 h-auto text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          <span className="text-sm">{placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </PopoverTrigger>
        <PopoverContent
          className="w-[300px] p-0 border-white/10 bg-black/90 backdrop-blur-xl"
          align="start"
        >
          <Command className="bg-transparent">
            <CommandInput
              placeholder="Rechercher..."
              className="text-white border-white/10"
            />
            <CommandList>
              <CommandEmpty className="text-white/40 text-sm py-4 text-center">
                Aucun résultat.
              </CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    onSelect={() => toggle(option.id)}
                    className="text-white/80 hover:text-white cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 text-[var(--rbs-red)]',
                        value.includes(option.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {option.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected badges */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <Badge
              key={item.id}
              variant="secondary"
              className="bg-[var(--rbs-red)]/15 text-white/80 border-[var(--rbs-red)]/30 border gap-1 pr-1"
            >
              {item.name}
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className="hover:text-white transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

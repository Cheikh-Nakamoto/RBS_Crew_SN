import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Locale } from '@rbs/types';

const SUPPORTED: Locale[] = ['fr', 'en', 'de', 'es', 'it'];

export const LocaleParam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Locale => {
    const request = ctx.switchToHttp().getRequest();
    const raw: string = request.headers['accept-language'] ?? 'fr';
    const lang = raw.split(',')[0].split('-')[0].toLowerCase();
    return (SUPPORTED.includes(lang as Locale) ? lang : 'fr') as Locale;
  },
);

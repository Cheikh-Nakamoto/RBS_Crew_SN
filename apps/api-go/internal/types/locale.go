package types

import (
	"context"
)

type Locale string

const (
	LocaleFR Locale = "fr"
	LocaleEN Locale = "en"
	LocaleDE Locale = "de"
	LocaleES Locale = "es"
	LocaleIT Locale = "it"
)

func LocaleFromCtx(ctx context.Context) string {
	if loc, ok := ctx.Value(CtxLocale).(string); ok {
		return loc
	}
	return string(LocaleFR)
}

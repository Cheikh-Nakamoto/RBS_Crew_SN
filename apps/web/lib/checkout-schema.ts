import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

export const checkoutSchema = z.object({
  customerFirstName: z.string().trim().min(1, 'Le prénom est requis').max(60),
  customerLastName: z.string().trim().min(1, 'Le nom est requis').max(60),
  customerPhone: z
    .string()
    .trim()
    .refine((v) => v.startsWith('+'), {
      message: "Le numéro doit inclure l'indicatif pays, ex. +221771234567",
    })
    .refine((v) => isValidPhoneNumber(v), {
      message: 'Numéro de téléphone invalide',
    }),
  shippingAddress: z.object({
    line1: z.string().trim().min(1, 'Adresse requise'),
    line2: z.string().trim().optional(),
    city: z.string().trim().min(1, 'Ville requise'),
    postalCode: z.string().trim().optional(),
    country: z.string().trim().min(1, 'Le pays est requis'),
  }),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

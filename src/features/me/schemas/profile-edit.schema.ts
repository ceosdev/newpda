import { z } from 'zod';

export const PREFERRED_POSITIONS = [
  'goalkeeper',
  'defender',
  'midfielder',
  'forward',
] as const;

export type PreferredPosition = (typeof PREFERRED_POSITIONS)[number];

export const POSITION_LABELS: Record<PreferredPosition, string> = {
  goalkeeper: 'Goleiro',
  defender: 'Defesa',
  midfielder: 'Meio',
  forward: 'Ataque',
};

const MIN_BIRTH_DATE = '1900-01-01';

function isFutureDate(value: string): boolean {
  return value > new Date().toISOString().slice(0, 10);
}

export const profileEditSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Nome muito curto.')
    .max(60, 'Nome muito longo.'),
  phone: z
    .string()
    .trim()
    .max(30, 'Telefone muito longo.')
    .optional()
    .or(z.literal('')),
  birthDate: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || v >= MIN_BIRTH_DATE, 'Data muito antiga.')
    .refine((v) => !v || !isFutureDate(v), 'Data não pode ser no futuro.'),
  nickname: z
    .string()
    .trim()
    .max(30, 'Apelido muito longo.')
    .optional()
    .or(z.literal('')),
  preferredPosition: z.enum(PREFERRED_POSITIONS).nullable(),
});

export type ProfileEditInput = z.infer<typeof profileEditSchema>;

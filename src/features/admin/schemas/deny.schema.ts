import { z } from 'zod';

export const denySchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Motivo precisa ter ao menos 3 caracteres.')
    .max(280, 'Motivo muito longo (máx. 280).'),
});

export type DenyInput = z.infer<typeof denySchema>;

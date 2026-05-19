import { z } from 'zod';

/** Largest suggested amount the form accepts: R$ 999.999,99 (in cents). */
const MAX_AMOUNT_CENTS = 99_999_999;

export const transactionTypeSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'Descrição é obrigatória')
    .max(80, 'Descrição deve ter no máximo 80 caracteres'),
  suggestedAmountCents: z
    .number()
    .int()
    .min(0, 'Valor não pode ser negativo')
    .max(MAX_AMOUNT_CENTS, 'Valor muito alto')
    .nullable(),
  isActive: z.boolean(),
});

export type TransactionTypeInput = z.infer<typeof transactionTypeSchema>;

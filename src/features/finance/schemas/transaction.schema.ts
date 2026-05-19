import { z } from 'zod';

/** Largest amount the form accepts: R$ 999.999,99 (in cents). */
const MAX_AMOUNT_CENTS = 99_999_999;

export const transactionSchema = z
  .object({
    occurredOn: z.string().min(1, 'Data do lançamento é obrigatória'),
    transactionTypeId: z
      .string({
        required_error: 'Tipo de lançamento é obrigatório',
        invalid_type_error: 'Tipo de lançamento é obrigatório',
      })
      .min(1, 'Tipo de lançamento é obrigatório'),
    operation: z.enum(['income', 'expense'], {
      errorMap: () => ({ message: 'Operação é obrigatória' }),
    }),
    amountCents: z
      .number({
        required_error: 'Valor do lançamento é obrigatório',
        invalid_type_error: 'Valor do lançamento é obrigatório',
      })
      .int()
      .positive('Valor deve ser maior que zero')
      .max(MAX_AMOUNT_CENTS, 'Valor muito alto'),
    playerId: z.string().nullable(),
    // 0 ou vazio = sem pagamento (lançamento aberto). Só > 0 conta como pagamento.
    paidAmountCents: z
      .number()
      .int()
      .min(0, 'Valor pago não pode ser negativo')
      .max(MAX_AMOUNT_CENTS, 'Valor muito alto')
      .nullable(),
    paidOn: z.string().nullable(),
    notes: z.string().trim().max(500, 'Observação deve ter no máximo 500 caracteres'),
  })
  .refine((v) => v.paidAmountCents === null || v.paidAmountCents === 0 || v.paidOn !== null, {
    message: 'Informe a data de pagamento',
    path: ['paidOn'],
  })
  .refine((v) => v.paidAmountCents === null || v.paidAmountCents <= v.amountCents, {
    message: 'Valor pago não pode exceder o valor do lançamento',
    path: ['paidAmountCents'],
  });

export type TransactionInput = z.infer<typeof transactionSchema>;

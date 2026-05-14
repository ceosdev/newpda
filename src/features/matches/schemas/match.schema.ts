import { z } from 'zod';

export const matchScheduleSchema = z.object({
  matchDate: z
    .string()
    .min(1, 'Data é obrigatória')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  matchTime: z
    .string()
    .min(1, 'Hora é obrigatória')
    .regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
});

export type MatchScheduleInput = z.infer<typeof matchScheduleSchema>;

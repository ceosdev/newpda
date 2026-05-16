import { z } from 'zod';

// Each scout counter: non-negative integer, capped at 99 as a fat-finger guard
// (a single pelada day never exceeds it). The DB also enforces `>= 0`.
const counter = z
  .number({ invalid_type_error: 'Número inválido' })
  .int('Use um número inteiro')
  .min(0, 'Não pode ser negativo')
  .max(99, 'Máximo de 99');

export const scoutEntrySchema = z.object({
  playerId: z.string().uuid(),
  goals: counter,
  yellowCards: counter,
  blueCards: counter,
  redCards: counter,
  wins: counter,
  draws: counter,
});

export const recordScoutsSchema = z.object({
  entries: z.array(scoutEntrySchema),
});

export type ScoutEntryInput = z.infer<typeof scoutEntrySchema>;
export type RecordScoutsInput = z.infer<typeof recordScoutsSchema>;

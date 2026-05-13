import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().min(1, 'Informe seu email.').email('Email inválido.'),
  password: z.string().min(1, 'Informe sua senha.'),
});

export type SignInInput = z.infer<typeof signInSchema>;

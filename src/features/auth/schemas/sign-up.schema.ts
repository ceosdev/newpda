import { z } from 'zod';

export const signUpSchema = z
  .object({
    displayName: z
      .string()
      .min(2, 'Nome muito curto.')
      .max(60, 'Nome muito longo.'),
    email: z.string().min(1, 'Informe seu email.').email('Email inválido.'),
    password: z
      .string()
      .min(8, 'Senha precisa ter ao menos 8 caracteres.')
      .max(72, 'Senha muito longa.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

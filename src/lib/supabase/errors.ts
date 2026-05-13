import { isAuthError } from '@supabase/supabase-js';
import type { AuthError, PostgrestError } from '@supabase/supabase-js';

type AnySupabaseError = AuthError | PostgrestError | Error | unknown;

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email ou senha incorretos.',
  email_not_confirmed: 'Confirme seu email antes de entrar.',
  user_already_exists: 'Já existe uma conta com este email.',
  signup_disabled: 'Cadastro temporariamente desabilitado.',
  weak_password: 'Senha muito fraca. Tente uma senha mais longa.',
  email_address_invalid: 'Email inválido.',
  over_email_send_rate_limit: 'Muitas tentativas. Aguarde alguns instantes.',
  same_password: 'A nova senha precisa ser diferente da anterior.',
};

const PG_MESSAGES: Record<string, string> = {
  '23505': 'Registro duplicado.',
  '23503': 'Operação inválida: referência inexistente.',
  '42501': 'Você não tem permissão para esta ação.',
  PGRST301: 'Sessão expirada. Faça login novamente.',
};

export function mapSupabaseError(error: AnySupabaseError): string {
  if (!error) return 'Ocorreu um erro inesperado.';

  if (isAuthError(error)) {
    const code = error.code ?? '';
    return AUTH_MESSAGES[code] ?? error.message ?? 'Erro de autenticação.';
  }

  if (typeof error === 'object' && error !== null && 'code' in error) {
    const record = error as Record<string, unknown>;
    const code = String(record.code ?? '');
    const message = typeof record.message === 'string' ? record.message : '';
    return PG_MESSAGES[code] ?? message ?? 'Erro ao falar com o servidor.';
  }

  if (error instanceof Error) return error.message;

  return 'Ocorreu um erro inesperado.';
}

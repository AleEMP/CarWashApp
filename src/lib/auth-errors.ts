import type { AuthError } from '@supabase/supabase-js';

const messages: Record<string, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Confirma tu correo antes de ingresar. Revisa tu bandeja de entrada.',
  user_already_exists: 'Ya existe una cuenta con este correo. Prueba ingresar.',
  email_exists: 'Ya existe una cuenta con este correo. Prueba ingresar.',
  weak_password: 'La contraseña es muy débil. Usa al menos 8 caracteres.',
  over_email_send_rate_limit: 'Se enviaron demasiados correos. Espera unos minutos e inténtalo de nuevo.',
  over_request_rate_limit: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  signup_disabled: 'El registro de cuentas está desactivado por ahora.',
  email_provider_disabled: 'El ingreso con correo no está disponible por ahora. Inténtalo más tarde.',
};

export function authErrorMessage(error: AuthError): string {
  if (error.code && messages[error.code]) {
    return messages[error.code];
  }
  if (error.message.toLowerCase().includes('network')) {
    return 'No hay conexión. Revisa tu internet e inténtalo de nuevo.';
  }
  return 'No pudimos completar la acción. Inténtalo de nuevo.';
}

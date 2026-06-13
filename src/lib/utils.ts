import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatError(err: unknown): string {
  if (!err) return "Ocurrió un error desconocido";
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object') {
    const keys = Object.keys(err);
    if (keys.length > 0) {
      const val = (err as Record<string, unknown>)[keys[0]];
      if (typeof val === 'string') return val;
      return JSON.stringify(err);
    }
  }
  return String(err);
}

export const parseMetaError = (errString: string): string => {
  try {
    const parsedTauri = JSON.parse(errString);
    let innerErrorStr = errString;

    if (parsedTauri.message) {
      innerErrorStr = parsedTauri.message;
    }

    const jsonStrMatch = innerErrorStr.match(/\{.*\}/);
    let extractedMessage = null;

    if (jsonStrMatch) {
      const parsedMeta = JSON.parse(jsonStrMatch[0]);
      if (parsedMeta.error?.error_user_msg) extractedMessage = parsedMeta.error.error_user_msg;
      else if (parsedMeta.error?.message) extractedMessage = parsedMeta.error.message;
    }
    
    if (!extractedMessage && parsedTauri.message) extractedMessage = parsedTauri.message;

    if (extractedMessage) {
      if (extractedMessage.includes('Error validating access token') || extractedMessage.includes('401 Unauthorized') || extractedMessage.includes('OAuthException')) {
        return 'Tu sesión de Meta ha expirado o el token es inválido. Por favor, ve a Configuración y actualiza tu Token de Acceso.';
      }
      return extractedMessage;
    }
  } catch (e) {
  }
  
  if (errString.includes('Error validating access token') || errString.includes('401 Unauthorized') || errString.includes('OAuthException')) {
    return 'Tu sesión de Meta ha expirado o el token es inválido. Por favor, ve a Configuración y actualiza tu Token de Acceso.';
  }
  
  return errString;
};

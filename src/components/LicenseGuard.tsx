import { useEffect, useState } from 'react';
import { ipc } from '@/lib/ipc';
import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react';

export function LicenseGuard({ children }: { children: React.ReactNode }) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    const checkLicense = async () => {
      try {
        const status = await ipc.checkLicenseStatus();
        setIsValid(status.is_valid);
        setReason(status.reason);
      } catch (err) {
        console.error("Failed to check license status:", err);
        // Fallback to true if backend fails to respond, to avoid accidental lockouts
        setIsValid(true);
      }
    };
    
    checkLicense();
  }, []);

  if (isValid === null) {
    // Still checking, show a minimal loader or nothing to avoid flickering
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-pulse flex items-center gap-2 text-slate-400">
          <div className="w-2 h-2 rounded-full bg-slate-400" />
          <div className="w-2 h-2 rounded-full bg-slate-400 animation-delay-200" />
          <div className="w-2 h-2 rounded-full bg-slate-400 animation-delay-400" />
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 space-y-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto">
            {reason === 'SYSTEM_CLOCK_ALTERED' ? (
              <ShieldAlert className="w-8 h-8" />
            ) : (
              <Clock className="w-8 h-8" />
            )}
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {reason === 'SYSTEM_CLOCK_ALTERED' ? 'Sistema Bloqueado' : 'Período de Evaluación Finalizado'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {reason === 'SYSTEM_CLOCK_ALTERED' 
                ? 'Se ha detectado una alteración en el reloj de Windows. Por razones de seguridad y para prevenir viajes en el tiempo, la aplicación ha sido bloqueada. Por favor, sincroniza la hora de tu sistema con internet.'
                : 'El tiempo de prueba para esta versión beta ha llegado a su fin. Esperamos que la herramienta haya sido de gran utilidad.'}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-sm text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800 text-left space-y-2">
            <p><strong>¿Qué hacer ahora?</strong></p>
            {reason === 'SYSTEM_CLOCK_ALTERED' ? (
              <ul className="list-disc pl-5 space-y-1">
                <li>Ve a Configuración de Windows &gt; Hora e Idioma.</li>
                <li>Activa "Ajustar hora automáticamente".</li>
                <li>Reinicia la aplicación.</li>
              </ul>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                <li>Contacta al administrador o desarrollador del software.</li>
                <li>Solicita una extensión o actualización a la versión completa.</li>
              </ul>
            )}
          </div>

          <div className="pt-4 flex justify-center">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Protección activa del sistema</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

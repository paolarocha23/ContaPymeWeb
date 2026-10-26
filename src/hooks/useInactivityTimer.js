import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook para monitorear inactividad del usuario y cerrar sesión automáticamente
 * @param {boolean} isAuthenticated - Si hay un usuario con sesión activa
 * @param {function} onTimeout - Callback ejecutado al cumplirse el tiempo de inactividad
 * @param {number} timeoutMinutes - Minutos totales antes de expirar (por defecto 15)
 * @param {number} warningSeconds - Segundos antes de la expiración para mostrar la advertencia (por defecto 60)
 */
export function useInactivityTimer({
  isAuthenticated,
  onTimeout,
  timeoutMinutes = 15,
  warningSeconds = 60
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(timeoutMinutes * 60);
  const [showWarning, setShowWarning] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const timerIntervalRef = useRef(null);

  // Reiniciar temporizador de inactividad
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSecondsRemaining(timeoutMinutes * 60);
    setShowWarning(false);
  }, [timeoutMinutes]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setShowWarning(false);
      return;
    }

    resetTimer();

    // Eventos que indican actividad del usuario
    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ];

    const handleActivity = () => {
      // Solo reiniciar si no estamos en los últimos segundos críticos de advertencia
      // para que el usuario presione el botón explícito de continuar si lo desea
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const totalSec = timeoutMinutes * 60;
      if (totalSec - elapsed > warningSeconds) {
        lastActivityRef.current = Date.now();
      }
    };

    activityEvents.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));

    // Intervalo de chequeo cada segundo
    timerIntervalRef.current = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const totalSec = timeoutMinutes * 60;
      const left = Math.max(0, totalSec - elapsedSec);

      setSecondsRemaining(left);

      if (left <= warningSeconds && left > 0) {
        setShowWarning(true);
      } else if (left <= 0) {
        clearInterval(timerIntervalRef.current);
        setShowWarning(false);
        if (onTimeout) {
          onTimeout();
        }
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
    };
  }, [isAuthenticated, timeoutMinutes, warningSeconds, onTimeout, resetTimer]);

  return {
    secondsRemaining,
    showWarning,
    resetTimer
  };
}

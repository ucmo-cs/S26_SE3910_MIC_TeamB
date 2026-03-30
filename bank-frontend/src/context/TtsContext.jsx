import { useState, useEffect, useCallback, useRef } from 'react';
import i18n from '../i18n';
import { TtsContext } from './TtsContextValue';

const STORAGE_KEY = 'bank-app-tts-enabled';

export function TtsProvider({ children }) {
  const [enabled, setEnabledState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === null) return false;
      return stored === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      /* ignore */
    }
  }, [enabled]);

  const setEnabled = useCallback((value) => {
    setEnabledState((prev) =>
      typeof value === 'function' ? value(prev) : value
    );
  }, []);

  const synthRef = useRef(null);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current?.speaking) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (synthRef.current?.speaking) {
      synthRef.current.cancel();
    }
  }, []);

  const speak = useCallback(
    (text) => {
      if (!enabled) return;
      if (!text || typeof text !== 'string' || text.trim() === '') return;
      if (!('speechSynthesis' in window)) return;

      const synth = window.speechSynthesis;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = i18n.language === 'es' ? 'es-ES' : 'en-US';
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      synth.speak(utterance);
    },
    [enabled]
  );

  const value = {
    enabled,
    setEnabled,
    speak,
    cancel,
    isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
  };

  return (
    <TtsContext.Provider value={value}>{children}</TtsContext.Provider>
  );
}

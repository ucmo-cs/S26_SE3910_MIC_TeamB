import { useContext } from 'react';
import { TtsContext } from './TtsContextValue';

export function useTts() {
  const ctx = useContext(TtsContext);
  if (!ctx) {
    throw new Error('useTts must be used within TtsProvider');
  }
  return ctx;
}

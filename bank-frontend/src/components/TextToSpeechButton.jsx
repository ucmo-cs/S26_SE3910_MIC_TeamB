import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './TextToSpeechButton.css';

const TextToSpeechButton = ({ text, className = '' }) => {
  const { i18n } = useTranslation();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const synthRef = useRef(null);
  const utteranceRef = useRef(null);

  useEffect(() => {
    // Check if Web Speech API is supported
    setIsSupported('speechSynthesis' in window);
    synthRef.current = window.speechSynthesis;

    // Cleanup on unmount
    return () => {
      if (synthRef.current && synthRef.current.speaking) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const handleSpeak = () => {
    if (!isSupported || !text) return;

    // Cancel any ongoing speech
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      return;
    }

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = i18n.language === 'es' ? 'es-ES' : 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  if (!isSupported || !text || text.trim() === '') {
    return null; // Don't render if not supported or no text
  }

  return (
    <button
      type="button"
      className={`tts-button ${className} ${isSpeaking ? 'speaking' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        handleSpeak();
      }}
      aria-label={i18n.t('accessibility.readAloud')}
      title={i18n.t('accessibility.readAloud')}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {isSpeaking ? (
          // Pause icon (when speaking)
          <path
            d="M6 4H4V12H6V4ZM12 4H10V12H12V4Z"
            fill="currentColor"
          />
        ) : (
          // Speaker icon
          <path
            d="M8 2C7.4 2 6.9 2.2 6.5 2.5L4.3 4.7H2C1.4 4.7 1 5.1 1 5.7V10.3C1 10.9 1.4 11.3 2 11.3H4.3L6.5 13.5C6.9 13.8 7.4 14 8 14V2ZM11.5 8C11.5 9.4 10.7 10.5 9.5 11V5C10.7 5.5 11.5 6.6 11.5 8ZM9.5 2.2V2.8C11.8 3.4 13.5 5.5 13.5 8C13.5 10.5 11.8 12.6 9.5 13.2V13.8C12.4 13.1 14.5 10.8 14.5 8C14.5 5.2 12.4 2.9 9.5 2.2Z"
            fill="currentColor"
          />
        )}
      </svg>
    </button>
  );
};

export default TextToSpeechButton;

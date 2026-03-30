import { useTranslation } from 'react-i18next';
import { useTts } from '../context/useTts';

/**
 * When TTS is off or unsupported: renders children (or text) with no wrapper.
 * When TTS is on: clickable region that speaks `text`.
 */
const SpokenText = ({
  text,
  children,
  className = '',
  as: Component = 'span',
}) => {
  const { enabled, speak, isSupported } = useTts();
  const { t } = useTranslation();
  const display = children !== undefined && children !== null ? children : text;

  if (!enabled || !isSupported) {
    return <>{display}</>;
  }
  if (!text || String(text).trim() === '') {
    return <>{display}</>;
  }

  const handleActivate = (e) => {
    e.stopPropagation();
    speak(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      speak(text);
    }
  };

  return (
    <Component
      className={`tts-clickable ${className}`.trim()}
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      aria-label={t('accessibility.clickToHear')}
      {...(Component === 'button' ? { type: 'button' } : {})}
    >
      {display}
    </Component>
  );
};

export default SpokenText;

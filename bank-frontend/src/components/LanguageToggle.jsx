import { useTranslation } from 'react-i18next';
import './LanguageToggle.css';

const LanguageToggle = () => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' }
  ];

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <div className="language-toggle">
      <label className="language-toggle-label">
        {i18n.t('settings.language')}
      </label>
      <div className="language-options">
        {languages.map((lang) => (
          <button
            key={lang.code}
            type="button"
            className={`language-option ${i18n.language === lang.code ? 'active' : ''}`}
            onClick={() => handleLanguageChange(lang.code)}
            aria-label={`Switch to ${lang.name}`}
            aria-pressed={i18n.language === lang.code}
          >
            <span className="language-flag">{lang.flag}</span>
            <span className="language-name">{lang.name}</span>
            {i18n.language === lang.code && (
              <svg
                className="check-icon"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M13.5 4L6 11.5L2.5 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageToggle;

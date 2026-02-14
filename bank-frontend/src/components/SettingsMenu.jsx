import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageToggle from './LanguageToggle';
import './SettingsMenu.css';

const SettingsMenu = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleEscape = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="settings-menu-container">
      <button
        ref={buttonRef}
        type="button"
        className="settings-button"
        onClick={handleToggle}
        aria-label={t('settings.title')}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16.25 10C16.25 10.2062 16.2312 10.4094 16.1944 10.6083L15.1667 15.6083C15.0833 16.0083 14.7083 16.2917 14.3 16.2917H5.7C5.29167 16.2917 4.91667 16.0083 4.83333 15.6083L3.80556 10.6083C3.76875 10.4094 3.75 10.2062 3.75 10C3.75 9.79375 3.76875 9.59063 3.80556 9.39167L4.83333 4.39167C4.91667 3.99167 5.29167 3.70833 5.7 3.70833H14.3C14.7083 3.70833 15.0833 3.99167 15.1667 4.39167L16.1944 9.39167C16.2312 9.59063 16.25 9.79375 16.25 10Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="settings-dropdown"
          role="menu"
          aria-label={t('settings.title')}
        >
          <div className="settings-dropdown-header">
            <h3 className="settings-dropdown-title">{t('settings.title')}</h3>
          </div>
          <div className="settings-dropdown-content">
            <LanguageToggle />
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsMenu;

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TextToSpeechButton from './components/TextToSpeechButton';
import { loginApi, registerApi } from './api';
import './login.css';

const Login = ({ onLogin }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setError(t('login.errorEmpty'));
      return;
    }

    if (isRegistering && !displayName.trim()) {
      setError(t('login.errorEmpty'));
      return;
    }

    setLoading(true);
    try {
      let data;
      if (isRegistering) {
        data = await registerApi(trimmedEmail, trimmedPassword, displayName.trim());
      } else {
        data = await loginApi(trimmedEmail, trimmedPassword);
      }
      localStorage.setItem('bank-app-token', data.token);
      onLogin({ email: data.email, displayName: data.displayName });
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        setError(t('login.errorNetwork'));
      } else {
        setError(err.message || t('login.errorGeneric'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="8" fill="var(--color-primary)" />
              <path d="M12 20L18 26L28 14" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="login-logo-text">{t('header.logo')}</span>
          </div>
          <h1 className="login-title">
            {isRegistering ? t('login.titleRegister') : t('login.title')}
            <TextToSpeechButton text={isRegistering ? t('login.titleRegister') : t('login.title')} />
          </h1>
          <p className="login-description">
            {isRegistering ? t('login.descriptionRegister') : t('login.description')}
            <TextToSpeechButton text={isRegistering ? t('login.descriptionRegister') : t('login.description')} />
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          {isRegistering && (
            <div className="form-group">
              <label htmlFor="login-displayname">{t('login.displayName')} *</label>
              <input
                type="text"
                id="login-displayname"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('login.displayNamePlaceholder')}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="login-email">{t('login.email')} *</label>
            <input
              type="email"
              id="login-email"
              autoComplete="username email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.emailPlaceholder')}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">{t('login.password')} *</label>
            <input
              type="password"
              id="login-password"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
            {loading
              ? '...'
              : isRegistering
                ? t('login.submitRegister')
                : t('login.submit')}
          </button>
        </form>

        <p className="login-hint">
          <button
            type="button"
            className="login-switch-link"
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
          >
            {isRegistering ? t('login.switchToLogin') : t('login.switchToRegister')}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;

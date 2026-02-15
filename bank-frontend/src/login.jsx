import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TextToSpeechButton from './components/TextToSpeechButton';
import './login.css';

const Login = ({ onLogin }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setError(t('login.errorEmpty'));
      return;
    }
    onLogin({ email: trimmedEmail, displayName: trimmedEmail.split('@')[0] || trimmedEmail });
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
            {t('login.title')}
            <TextToSpeechButton text={t('login.title')} />
          </h1>
          <p className="login-description">
            {t('login.description')}
            <TextToSpeechButton text={t('login.description')} />
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}
          <div className="form-group">
            <label htmlFor="login-email">{t('login.email')} *</label>
            <input
              type="text"
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary login-submit">
            {t('login.submit')}
          </button>
        </form>

        <p className="login-hint">{t('login.hint')}</p>
      </div>
    </div>
  );
};

export default Login;

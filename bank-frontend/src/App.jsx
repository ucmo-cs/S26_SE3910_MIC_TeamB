import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SettingsMenu from './components/SettingsMenu';
import TextToSpeechButton from './components/TextToSpeechButton';
import Login from "./Login";
import './App.css';

// Topics will be translated in the component using i18n
const TOPICS_CONFIG = [
  { id: 1, key: 'checkingAccount' },
  { id: 2, key: 'savingsAccount' },
  { id: 3, key: 'cdsMoneyMarket' },
  { id: 4, key: 'studentBanking' },
  { id: 5, key: 'autoLoans' },
  { id: 6, key: 'homeEquity' },
  { id: 7, key: 'mortgage' },
  { id: 8, key: 'studentLoans' },
  { id: 9, key: 'retirement' },
  { id: 10, key: 'investmentAccount' },
  { id: 11, key: 'creditCard' },
  { id: 12, key: 'other' },
];

const BRANCHES = [
  { 
    id: 1, 
    name: 'Downtown Branch', 
    address: '123 Main St, Kansas City, MO',
    topics: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // Full service branch
    businessHours: { weekday: '9:00 AM - 5:00 PM', saturday: '9:00 AM - 1:00 PM' }
  },
  { 
    id: 2, 
    name: 'Westside Branch', 
    address: '456 Oak Ave, Kansas City, MO',
    topics: [1, 2, 3, 4, 11, 12], // Basic banking services
    businessHours: { weekday: '9:00 AM - 6:00 PM', saturday: '10:00 AM - 2:00 PM' }
  },
  { 
    id: 3, 
    name: 'Plaza Branch', 
    address: '789 Country Club Plaza, Kansas City, MO',
    topics: [1, 2, 3, 5, 6, 7, 9, 10, 11, 12], // Banking and investments
    businessHours: { weekday: '8:00 AM - 5:00 PM', saturday: 'Closed' }
  },
  { 
    id: 4, 
    name: 'Northland Branch', 
    address: '321 North St, Kansas City, MO',
    topics: [1, 2, 3, 4, 5, 7, 8, 11, 12], // Banking and loans
    businessHours: { weekday: '9:00 AM - 5:00 PM', saturday: '9:00 AM - 12:00 PM' }
  },
];

// Mock booked appointments - will come from database later
const BOOKED_SLOTS = [
  { branchId: 1, date: '2026-02-05', time: '10:00' },
  { branchId: 1, date: '2026-02-05', time: '14:00' },
  { branchId: 2, date: '2026-02-06', time: '11:00' },
];

function App() {
  const { t, i18n } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    topic: null,
    branch: null,
    date: '',
    time: '',
  });
  export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const storedLogin = localStorage.getItem("isLoggedIn");
    if (storedLogin === "true") {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="dashboard">
      <div className="card">
        <h1>Welcome 👋</h1>
        <p>You are logged in.</p>
        <button className="btn logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

  const steps = [
    t('steps.personalInfo'),
    t('steps.selectTopic'),
    t('steps.selectBranch'),
    t('steps.selectDateTime'),
    t('steps.confirmation')
  ];

  // Generate available time slots
  const generateTimeSlots = (selectedDate, selectedBranch) => {
    if (!selectedDate || !selectedBranch) return [];
    
    const date = new Date(selectedDate);
    const dayOfWeek = date.getDay();
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    
    if (isSunday) return [];
    
    const slots = [];
    const startHour = isSaturday ? 9 : 9;
    const endHour = isSaturday ? 13 : 17;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const isBooked = BOOKED_SLOTS.some(
          slot => slot.branchId === selectedBranch.id && 
                  slot.date === selectedDate && 
                  slot.time === time
        );
        if (!isBooked) {
          slots.push(time);
        }
      }
    }
    
    return slots;
  };

  // Filter branches based on selected topic
  const getAvailableBranches = () => {
    if (!formData.topic) return [];
    return BRANCHES.filter(branch => branch.topics.includes(formData.topic.id));
  };

  // Get minimum selectable date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Get maximum selectable date (30 days from now)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    // This will call the backend API later
    console.log('Booking appointment:', formData);
    handleNext();
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.firstName && formData.lastName && formData.email && formData.phone;
      case 1:
        return formData.topic !== null;
      case 2:
        return formData.branch !== null;
      case 3:
        return formData.date && formData.time;
      default:
        return false;
    }
  };

  const formatPhoneNumber = (value) => {
    const phone = value.replace(/\D/g, '');
    if (phone.length <= 3) return phone;
    if (phone.length <= 6) return `(${phone.slice(0, 3)}) ${phone.slice(3)}`;
    return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6, 10)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="8" fill="var(--color-primary)"/>
              <path d="M12 20L18 26L28 14" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="logo-text">{t('header.logo')}</span>
          </div>
          <div className="header-title">
            {t('header.title')}
            <TextToSpeechButton text={t('header.title')} />
          </div>
          <SettingsMenu />
        </div>
      </header>

      {/* Progress Bar */}
      {currentStep < steps.length - 1 && (
        <div className="progress-container">
          <div className="progress-steps">
            {steps.slice(0, -1).map((step, index) => (
              <div key={index} className={`progress-step ${index <= currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}>
                <div className="step-indicator">
                  {index < currentStep ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M5 10L8 13L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <div className="step-label">{step}</div>
              </div>
            ))}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(currentStep / (steps.length - 2)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        <div className="content-card">
          {/* Step 0: Personal Information */}
          {currentStep === 0 && (
            <div className="step-content fade-in">
              <h2 className="step-title">
                {t('step0.title')}
                <TextToSpeechButton text={t('step0.title')} />
              </h2>
              <p className="step-description">
                {t('step0.description')}
                <TextToSpeechButton text={t('step0.description')} />
              </p>
              
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="firstName">{t('step0.firstName')} *</label>
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder={t('step0.firstNamePlaceholder')}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="lastName">{t('step0.lastName')} *</label>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder={t('step0.lastNamePlaceholder')}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">{t('step0.email')} *</label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('step0.emailPlaceholder')}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">{t('step0.phone')} *</label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder={t('step0.phonePlaceholder')}
                  maxLength="14"
                  required
                />
              </div>
            </div>
          )}

          {/* Step 1: Select Topic */}
          {currentStep === 1 && (
            <div className="step-content fade-in">
              <h2 className="step-title">
                {t('step1.title')}
                <TextToSpeechButton text={t('step1.title')} />
              </h2>
              <p className="step-description">
                {t('step1.description')}
                <TextToSpeechButton text={t('step1.description')} />
              </p>
              
              <div className="topic-grid">
                {TOPICS_CONFIG.map((topicConfig) => {
                  const topic = {
                    id: topicConfig.id,
                    name: t(`topics.${topicConfig.key}`),
                    description: t(`topics.${topicConfig.key}Desc`)
                  };
                  return (
                    <div
                      key={topic.id}
                      className={`topic-card ${formData.topic?.id === topic.id ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, topic, branch: null })}
                    >
                      <div className="topic-icon">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                          <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2"/>
                          <path d="M12 16L15 19L20 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <h3 className="topic-name">
                        {topic.name}
                        <TextToSpeechButton text={topic.name} />
                      </h3>
                      <p className="topic-description">{topic.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Select Branch */}
          {currentStep === 2 && (
            <div className="step-content fade-in">
              <h2 className="step-title">
                {t('step2.title')}
                <TextToSpeechButton text={t('step2.title')} />
              </h2>
              <p className="step-description">
                {t('step2.description')} <strong>{formData.topic?.name}</strong> {t('step2.services')}
                <TextToSpeechButton text={`${t('step2.description')} ${formData.topic?.name} ${t('step2.services')}`} />
              </p>
              
              <div className="branch-list">
                {getAvailableBranches().map((branch) => (
                  <div
                    key={branch.id}
                    className={`branch-card ${formData.branch?.id === branch.id ? 'selected' : ''}`}
                    onClick={() => setFormData({ ...formData, branch, date: '', time: '' })}
                  >
                    <div className="branch-header">
                      <h3 className="branch-name">
                        {branch.name}
                        <TextToSpeechButton text={branch.name} />
                      </h3>
                      <div className={`branch-radio ${formData.branch?.id === branch.id ? 'checked' : ''}`}>
                        {formData.branch?.id === branch.id && <div className="radio-dot" />}
                      </div>
                    </div>
                    <p className="branch-address">{branch.address}</p>
                    <div className="branch-hours">
                      <div className="hours-row">
                        <span className="hours-label">{t('step2.weekday')}</span>
                        <span className="hours-value">{branch.businessHours.weekday}</span>
                      </div>
                      <div className="hours-row">
                        <span className="hours-label">{t('step2.saturday')}</span>
                        <span className="hours-value">{branch.businessHours.saturday}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Select Date & Time */}
          {currentStep === 3 && (
            <div className="step-content fade-in">
              <h2 className="step-title">
                {t('step3.title')}
                <TextToSpeechButton text={t('step3.title')} />
              </h2>
              <p className="step-description">
                {t('step3.description')} <strong>{formData.branch?.name}</strong>.
                <TextToSpeechButton text={`${t('step3.description')} ${formData.branch?.name}`} />
              </p>
              
              <div className="datetime-container">
                <div className="form-group">
                  <label htmlFor="date">{t('step3.dateLabel')} *</label>
                  <input
                    type="date"
                    id="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value, time: '' })}
                    min={getMinDate()}
                    max={getMaxDate()}
                    required
                  />
                  <p className="input-hint">{t('step3.dateHint')}</p>
                </div>

                {formData.date && (
                  <div className="time-slots-section">
                    <label>
                      {t('step3.timeLabel')} *
                      <TextToSpeechButton text={t('step3.timeLabel')} />
                    </label>
                    <div className="time-slots-grid">
                      {generateTimeSlots(formData.date, formData.branch).length > 0 ? (
                        generateTimeSlots(formData.date, formData.branch).map((time) => (
                          <button
                            key={time}
                            type="button"
                            className={`time-slot ${formData.time === time ? 'selected' : ''}`}
                            onClick={() => setFormData({ ...formData, time })}
                          >
                            {time}
                          </button>
                        ))
                      ) : (
                        <p className="no-slots">
                          {t('step3.noSlots')}
                          <TextToSpeechButton text={t('step3.noSlots')} />
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 4 && (
            <div className="step-content fade-in confirmation-content">
              <div className="success-icon">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="40" r="38" fill="var(--color-success)" fillOpacity="0.1"/>
                  <circle cx="40" cy="40" r="30" fill="var(--color-success)"/>
                  <path d="M28 40L36 48L52 32" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              <h2 className="confirmation-title">
                {t('step4.title')}
                <TextToSpeechButton text={t('step4.title')} />
              </h2>
              <p className="confirmation-message">
                {t('step4.message')} <strong>{formData.email}</strong>.
                <TextToSpeechButton text={`${t('step4.message')} ${formData.email}`} />
              </p>

              <div className="appointment-summary">
                <h3 className="summary-heading">
                  {t('step4.summaryHeading')}
                  <TextToSpeechButton text={t('step4.summaryHeading')} />
                </h3>
                
                <div className="summary-section">
                  <div className="summary-label">{t('step4.contactInfo')}</div>
                  <div className="summary-value">{formData.firstName} {formData.lastName}</div>
                  <div className="summary-value secondary">{formData.email}</div>
                  <div className="summary-value secondary">{formData.phone}</div>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-section">
                  <div className="summary-label">{t('step4.appointmentType')}</div>
                  <div className="summary-value">{formData.topic?.name}</div>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-section">
                  <div className="summary-label">{t('step4.location')}</div>
                  <div className="summary-value">{formData.branch?.name}</div>
                  <div className="summary-value secondary">{formData.branch?.address}</div>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-section">
                  <div className="summary-label">{t('step4.dateTime')}</div>
                  <div className="summary-value">
                    {new Date(formData.date + 'T00:00:00').toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="summary-value secondary">{formData.time}</div>
                </div>
              </div>

              <div className="confirmation-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setCurrentStep(0);
                    setFormData({
                      firstName: '',
                      lastName: '',
                      email: '',
                      phone: '',
                      topic: null,
                      branch: null,
                      date: '',
                      time: '',
                    });
                  }}
                >
                  {t('step4.bookAnother')}
                </button>
              </div>

              <p className="confirmation-note">
                {t('step4.note')}
                <TextToSpeechButton text={t('step4.note')} />
              </p>
            </div>
          )}

          {/* Navigation Buttons */}
          {currentStep < steps.length - 1 && (
            <div className="navigation-buttons">
              {currentStep > 0 && (
                <button 
                  className="btn btn-secondary"
                  onClick={handleBack}
                >
                  {t('buttons.back')}
                </button>
              )}
              
              <button 
                className="btn btn-primary"
                onClick={currentStep === 3 ? handleSubmit : handleNext}
                disabled={!canProceed()}
              >
                {currentStep === 3 ? t('buttons.confirm') : t('buttons.continue')}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>{t('footer.copyright')}</p>
        <p className="footer-note">{t('footer.help')}</p>
      </footer>
    </div>
  );
}

export default App;

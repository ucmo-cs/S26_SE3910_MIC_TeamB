import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import SettingsMenu from './components/SettingsMenu';
import SpokenText from './components/SpokenText';
import MyAppointments from './components/MyAppointments';
import BranchMap from './components/BranchMap';
import Login from './login';
import { fetchBranches, fetchTopics, bookAppointment, fetchAppointmentsByBranch } from './api';
import { useTts } from './context/useTts';

import './App.css';

const USER_STORAGE_KEY = 'bank-app-user';

function App() {
  const { t, i18n } = useTranslation();
  const { speak, enabled } = useTts();
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [branches, setBranches] = useState([]);
  const [topics, setTopics] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // View toggle: 'booking' or 'appointments'
  const [view, setView] = useState('booking');

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchBranches(), fetchTopics()])
      .then(([branchData, topicData]) => {
        setBranches(branchData);
        setTopics(topicData);
      })
      .catch((err) => console.error('Failed to load data:', err))
      .finally(() => setDataLoading(false));
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('bank-app-token');
    setUser(null);
  };

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
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Time-slot availability state
  const [bookedSlots, setBookedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Scroll to top when step or view changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep, view]);

  // Pre-fill email from user when user changes
  useEffect(() => {
    if (user?.email) {
      setFormData((prev) => ({ ...prev, email: user.email }));
    }
  }, [user]);

  const getAppointmentSummarySpeech = useCallback(() => {
    const locale = i18n.language === 'es' ? 'es-ES' : 'en-US';
    const dateStr = formData.date
      ? new Date(formData.date + 'T00:00:00').toLocaleDateString(locale, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';
    return [
      t('step4.contactInfo'),
      `${formData.firstName} ${formData.lastName}`,
      formData.email,
      formData.phone,
      t('step4.appointmentType'),
      formData.topic?.name,
      t('step4.location'),
      formData.branch?.name,
      formData.branch?.address,
      t('step4.dateTime'),
      dateStr,
      formData.time,
    ]
      .filter(Boolean)
      .join('. ');
  }, [formData, i18n.language, t]);

  if (!user) {
    return (
      <Login
        onLogin={(u) => {
          setDataLoading(true);
          setUser(u);
        }}
      />
    );
  }

  if (dataLoading) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>{t('loading', 'Loading...')}</p>
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

  // Generate available time slots using real backend data
  const generateTimeSlots = (selectedDate, selectedBranch) => {
    if (!selectedDate || !selectedBranch) return [];

    const date = new Date(selectedDate);
    const dayOfWeek = date.getDay();
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;

    if (isSunday) return [];

    const slots = [];
    const startHour = 9;
    const endHour = isSaturday ? 13 : 17;

    for (let hour = startHour; hour < endHour; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      const isBooked = bookedSlots.some(
        (slot) =>
          slot.status === 'SCHEDULED' &&
          slot.appointmentDateTime.startsWith(selectedDate) &&
          slot.appointmentDateTime.substring(11, 16) === time
      );
      if (!isBooked) {
        slots.push(time);
      }
    }

    return slots;
  };

  // Fetch booked slots from backend when date or branch changes
  const loadBookedSlots = async (branchId) => {
    if (!branchId) return;
    setSlotsLoading(true);
    try {
      const data = await fetchAppointmentsByBranch(branchId);
      setBookedSlots(data);
    } catch (err) {
      console.error('Failed to load booked slots:', err);
      setBookedSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  // Filter branches based on selected topic
  const getAvailableBranches = () => {
    if (!formData.topic) return [];
    return branches;
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

  const handleSubmit = async () => {
    setBookingLoading(true);
    setBookingError('');
    try {
      const dto = {
        customerName: `${formData.firstName} ${formData.lastName}`,
        customerEmail: formData.email,
        branchId: formData.branch.id,
        topicId: formData.topic.id,
        appointmentDateTime: `${formData.date}T${formData.time}:00`,
      };
      await bookAppointment(dto);
      handleNext();
    } catch (err) {
      setBookingError(err.message || 'Failed to book appointment. Please try again.');
    } finally {
      setBookingLoading(false);
    }
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

  // Convert 24h time string ("09:00") to 12h display ("9:00 AM")
  const formatTime12h = (time24) => {
    const [hourStr, minute] = time24.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    if (hour === 0) hour = 12;
    else if (hour > 12) hour -= 12;
    return `${hour}:${minute} ${ampm}`;
  };

  const resetForm = () => {
    setCurrentStep(0);
    setFormData({
      firstName: '',
      lastName: '',
      email: user?.email || '',
      phone: '',
      topic: null,
      branch: null,
      date: '',
      time: '',
    });
    setBookingError('');
    setBookedSlots([]);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="8" fill="var(--color-primary)" />
              <path d="M12 20L18 26L28 14" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="logo-text">{t('header.logo')}</span>
          </div>
          <div className="header-title">
            <SpokenText text={t('header.title')} />
          </div>
          <div className="header-right">
            <button
              className={`header-nav-btn ${view === 'booking' ? 'active' : ''}`}
              onClick={() => { setView('booking'); }}
            >
              Book Appointment
            </button>
            <button
              className={`header-nav-btn ${view === 'appointments' ? 'active' : ''}`}
              onClick={() => { setView('appointments'); }}
            >
              My Appointments
            </button>
            <span className="header-welcome">{t('login.welcome', { name: user.displayName })}</span>
            <SettingsMenu onLogout={handleLogout} />
          </div>
        </div>
      </header>

      {/* My Appointments View */}
      {view === 'appointments' && (
        <main className="main-content">
          <div className="content-card">
            <MyAppointments
              userEmail={user.email}
              branches={branches}
              topics={topics}
              onBackToBooking={() => { resetForm(); setView('booking'); }}
            />
          </div>
        </main>
      )}

      {/* Booking Flow */}
      {view === 'booking' && (
        <>
          {/* Progress Bar */}
          {currentStep < steps.length - 1 && (
            <div className="progress-container">
              <div className="progress-steps">
                {steps.slice(0, -1).map((step, index) => (
                  <div key={index} className={`progress-step ${index <= currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}>
                    <div className="step-indicator">
                      {index < currentStep ? (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M5 10L8 13L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <div className="step-label">
                      <SpokenText text={step} />
                    </div>
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
              {/* Booking error */}
              {bookingError && (
                <div className="booking-error">{bookingError}</div>
              )}

              {/* Step 0: Personal Information */}
              {currentStep === 0 && (
                <div className="step-content fade-in">
                  <h2 className="step-title">
                    <SpokenText text={t('step0.title')} />
                  </h2>
                  <p className="step-description">
                    <SpokenText text={t('step0.description')} />
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
                    <SpokenText text={t('step1.title')} />
                  </h2>
                  <p className="step-description">
                    <SpokenText text={t('step1.description')} />
                  </p>

                  <div className="topic-grid">
                    {topics.map((topicConfig) => {
                      const topic = {
                        id: topicConfig.id,
                        name: t(`topics.${topicConfig.key}`),
                        description: t(`topics.${topicConfig.key}Desc`)
                      };
                      return (
                        <div
                          key={topic.id}
                          className={`topic-card ${formData.topic?.id === topic.id ? 'selected' : ''}`}
                          onClick={() => {
                            setFormData({ ...formData, topic, branch: null });
                            speak(`${topic.name}. ${topic.description}`);
                          }}
                        >
                          <div className="topic-icon">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
                              <path d="M12 16L15 19L20 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          <h3 className="topic-name">{topic.name}</h3>
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
                    <SpokenText text={t('step2.title')} />
                  </h2>
                  <p className="step-description">
                    <SpokenText
                      text={`${t('step2.description')} ${formData.topic?.name} ${t('step2.services')}`}
                    >
                      {t('step2.description')} <strong>{formData.topic?.name}</strong> {t('step2.services')}
                    </SpokenText>
                  </p>

                  <BranchMap
                    branches={getAvailableBranches()}
                    selectedBranch={formData.branch}
                    onSelectBranch={(branch) => {
                      setFormData({ ...formData, branch, date: '', time: '' });
                      setBookedSlots([]);
                      loadBookedSlots(branch.id);
                      speak(`${branch.name}. ${branch.address}`);
                    }}
                  />
                </div>
              )}

              {/* Step 3: Select Date & Time */}
              {currentStep === 3 && (
                <div className="step-content fade-in">
                  <h2 className="step-title">
                    <SpokenText text={t('step3.title')} />
                  </h2>
                  <p className="step-description">
                    <SpokenText text={`${t('step3.description')} ${formData.branch?.name}`}>
                      {t('step3.description')} <strong>{formData.branch?.name}</strong>.
                    </SpokenText>
                  </p>

                  <div className="datetime-container">
                    <div className="form-group">
                      <label htmlFor="date">
                        <SpokenText text={t('step3.dateLabel')}>
                          {t('step3.dateLabel')} *
                        </SpokenText>
                      </label>
                      <input
                        type="date"
                        id="date"
                        value={formData.date}
                        onChange={(e) => {
                          setFormData({ ...formData, date: e.target.value, time: '' });
                          // Re-fetch booked slots for the branch when date changes
                          if (formData.branch) {
                            loadBookedSlots(formData.branch.id);
                          }
                        }}
                        min={getMinDate()}
                        max={getMaxDate()}
                        required
                      />
                      <p className="input-hint">
                        <SpokenText text={t('step3.dateHint')} />
                      </p>
                    </div>

                    {formData.date && (
                      <div className="time-slots-section">
                        <label>
                          <SpokenText text={t('step3.timeLabel')}>
                            {t('step3.timeLabel')} *
                          </SpokenText>
                        </label>
                        {slotsLoading ? (
                          <p className="no-slots">Loading available times...</p>
                        ) : (
                          <div className="time-slots-grid">
                            {generateTimeSlots(formData.date, formData.branch).length > 0 ? (
                              generateTimeSlots(formData.date, formData.branch).map((time) => (
                                <button
                                  key={time}
                                  type="button"
                                  className={`time-slot ${formData.time === time ? 'selected' : ''}`}
                                  title={time}
                                  onClick={() => {
                                    speak(time);
                                    setFormData({ ...formData, time });
                                  }}
                                >
                                  {formatTime12h(time)}
                                </button>
                              ))
                            ) : (
                              <p className="no-slots">
                                <SpokenText text={t('step3.noSlots')} />
                              </p>
                            )}
                          </div>
                        )}
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
                      <circle cx="40" cy="40" r="38" fill="var(--color-success)" fillOpacity="0.1" />
                      <circle cx="40" cy="40" r="30" fill="var(--color-success)" />
                      <path d="M28 40L36 48L52 32" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  <h2 className="confirmation-title">
                    <SpokenText text={t('step4.title')} />
                  </h2>
                  <p className="confirmation-message">
                    <SpokenText text={`${t('step4.message')} ${formData.email}`}>
                      {t('step4.message')} <strong>{formData.email}</strong>.
                    </SpokenText>
                  </p>

                  <div
                    className={`appointment-summary${enabled ? ' tts-clickable' : ''}`}
                    onClick={
                      enabled
                        ? (e) => {
                            e.stopPropagation();
                            speak(getAppointmentSummarySpeech());
                          }
                        : undefined
                    }
                    onKeyDown={
                      enabled
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              speak(getAppointmentSummarySpeech());
                            }
                          }
                        : undefined
                    }
                    role={enabled ? 'button' : undefined}
                    tabIndex={enabled ? 0 : undefined}
                    aria-label={enabled ? t('accessibility.clickToHear') : undefined}
                  >
                    <h3 className="summary-heading">{t('step4.summaryHeading')}</h3>

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
                      <div className="summary-value secondary">{formData.time ? formatTime12h(formData.time) : ''}</div>
                    </div>
                  </div>

                  <div className="confirmation-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        speak(t('step4.bookAnother'));
                        resetForm();
                      }}
                    >
                      {t('step4.bookAnother')}
                    </button>
                  </div>

                  <p className="confirmation-note">
                    <SpokenText text={t('step4.note')} />
                  </p>
                </div>
              )}

              {/* Navigation Buttons */}
              {currentStep < steps.length - 1 && (
                <div className="navigation-buttons">
                  {currentStep > 0 && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        speak(t('buttons.back'));
                        handleBack();
                      }}
                    >
                      {t('buttons.back')}
                    </button>
                  )}

                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (currentStep === 3) {
                        speak(t('buttons.confirm'));
                        handleSubmit();
                      } else {
                        speak(t('buttons.continue'));
                        handleNext();
                      }
                    }}
                    disabled={!canProceed() || bookingLoading}
                  >
                    {bookingLoading
                      ? 'Booking...'
                      : currentStep === 3
                        ? t('buttons.confirm')
                        : t('buttons.continue')}
                  </button>
                </div>
              )}
            </div>
          </main>
        </>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <p>
          <SpokenText text={t('footer.copyright')} />
        </p>
        <p className="footer-note">
          <SpokenText text={t('footer.help')} />
        </p>
      </footer>
    </div>
  );
}

export default App;

import { useState, useEffect } from 'react';
import './App.css';

// Mock data - will be replaced by API calls later
const TOPICS = [
  { id: 1, name: 'Checking Account', description: 'Open or manage checking accounts' },
  { id: 2, name: 'Savings Account', description: 'Open or manage savings accounts' },
  { id: 3, name: 'CDs/Money Market Accounts', description: 'Certificates of deposit and money market options' },
  { id: 4, name: 'Student Banking', description: 'Banking solutions for students' },
  { id: 5, name: 'Auto Loans', description: 'Vehicle financing and auto loans' },
  { id: 6, name: 'Home Equity', description: 'Home equity loans and lines of credit' },
  { id: 7, name: 'Mortgage', description: 'Home loans and mortgage services' },
  { id: 8, name: 'Student Loans', description: 'Education financing and student loans' },
  { id: 9, name: 'Saving for Retirement', description: 'Retirement planning and accounts' },
  { id: 10, name: 'Investment Account', description: 'Investment services and brokerage accounts' },
  { id: 11, name: 'Credit Card', description: 'Apply for or manage credit cards' },
  { id: 12, name: 'Other', description: 'General inquiries and other services' },
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

  const steps = [
    'Personal Information',
    'Select Topic',
    'Select Branch',
    'Select Date & Time',
    'Confirmation'
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
            <span className="logo-text">Commerce Bank</span>
          </div>
          <div className="header-title">Appointment Booking</div>
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
              <h2 className="step-title">Welcome! Let's get started.</h2>
              <p className="step-description">Please provide your contact information to book an appointment.</p>
              
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="firstName">First Name *</label>
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="lastName">Last Name *</label>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john.doe@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="(555) 123-4567"
                  maxLength="14"
                  required
                />
              </div>
            </div>
          )}

          {/* Step 1: Select Topic */}
          {currentStep === 1 && (
            <div className="step-content fade-in">
              <h2 className="step-title">What brings you in today?</h2>
              <p className="step-description">Select the reason for your appointment.</p>
              
              <div className="topic-grid">
                {TOPICS.map((topic) => (
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
                    <h3 className="topic-name">{topic.name}</h3>
                    <p className="topic-description">{topic.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Branch */}
          {currentStep === 2 && (
            <div className="step-content fade-in">
              <h2 className="step-title">Choose your preferred branch</h2>
              <p className="step-description">
                Showing branches that offer <strong>{formData.topic?.name}</strong> services.
              </p>
              
              <div className="branch-list">
                {getAvailableBranches().map((branch) => (
                  <div
                    key={branch.id}
                    className={`branch-card ${formData.branch?.id === branch.id ? 'selected' : ''}`}
                    onClick={() => setFormData({ ...formData, branch, date: '', time: '' })}
                  >
                    <div className="branch-header">
                      <h3 className="branch-name">{branch.name}</h3>
                      <div className={`branch-radio ${formData.branch?.id === branch.id ? 'checked' : ''}`}>
                        {formData.branch?.id === branch.id && <div className="radio-dot" />}
                      </div>
                    </div>
                    <p className="branch-address">{branch.address}</p>
                    <div className="branch-hours">
                      <div className="hours-row">
                        <span className="hours-label">Mon-Fri:</span>
                        <span className="hours-value">{branch.businessHours.weekday}</span>
                      </div>
                      <div className="hours-row">
                        <span className="hours-label">Saturday:</span>
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
              <h2 className="step-title">Pick your date and time</h2>
              <p className="step-description">
                Select an available appointment slot at <strong>{formData.branch?.name}</strong>.
              </p>
              
              <div className="datetime-container">
                <div className="form-group">
                  <label htmlFor="date">Appointment Date *</label>
                  <input
                    type="date"
                    id="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value, time: '' })}
                    min={getMinDate()}
                    max={getMaxDate()}
                    required
                  />
                  <p className="input-hint">Available Monday through Saturday</p>
                </div>

                {formData.date && (
                  <div className="time-slots-section">
                    <label>Available Time Slots (30 minutes each) *</label>
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
                        <p className="no-slots">No available slots for this date. Please select another date.</p>
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
              
              <h2 className="confirmation-title">Appointment Confirmed!</h2>
              <p className="confirmation-message">
                Your appointment has been successfully scheduled. A confirmation email has been sent to <strong>{formData.email}</strong>.
              </p>

              <div className="appointment-summary">
                <h3 className="summary-heading">Appointment Details</h3>
                
                <div className="summary-section">
                  <div className="summary-label">Contact Information</div>
                  <div className="summary-value">{formData.firstName} {formData.lastName}</div>
                  <div className="summary-value secondary">{formData.email}</div>
                  <div className="summary-value secondary">{formData.phone}</div>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-section">
                  <div className="summary-label">Appointment Type</div>
                  <div className="summary-value">{formData.topic?.name}</div>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-section">
                  <div className="summary-label">Location</div>
                  <div className="summary-value">{formData.branch?.name}</div>
                  <div className="summary-value secondary">{formData.branch?.address}</div>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-section">
                  <div className="summary-label">Date & Time</div>
                  <div className="summary-value">
                    {new Date(formData.date + 'T00:00:00').toLocaleDateString('en-US', {
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
                  Book Another Appointment
                </button>
              </div>

              <p className="confirmation-note">
                Please arrive 10 minutes early to your appointment. If you need to reschedule or cancel, 
                please contact us at least 24 hours in advance.
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
                  Back
                </button>
              )}
              
              <button 
                className="btn btn-primary"
                onClick={currentStep === 3 ? handleSubmit : handleNext}
                disabled={!canProceed()}
              >
                {currentStep === 3 ? 'Confirm Appointment' : 'Continue'}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>© 2026 Commerce Bank. All rights reserved.</p>
        <p className="footer-note">Need help? Contact us at (816) 234-2000</p>
      </footer>
    </div>
  );
}

export default App;
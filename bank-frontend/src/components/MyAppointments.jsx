import { useState, useEffect, useCallback } from 'react';
import {
  fetchAppointmentsByEmail,
  fetchAppointmentsByBranch,
  cancelAppointment as cancelAppointmentApi,
  rescheduleAppointment as rescheduleAppointmentApi,
} from '../api';
import './MyAppointments.css';

const MyAppointments = ({ userEmail, branches, topics, onBackToBooking }) => {
  // Convert 24h time string ("09:00") to 12h display ("9:00 AM")
  const formatTime12h = (time24) => {
    const [hourStr, minute] = time24.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    if (hour === 0) hour = 12;
    else if (hour > 12) hour -= 12;
    return `${hour}:${minute} ${ampm}`;
  };
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // appointment id being acted on
  const [rescheduleId, setRescheduleId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAppointmentsByEmail(userEmail);
      // Sort: SCHEDULED first, then by date desc
      data.sort((a, b) => {
        if (a.status === 'SCHEDULED' && b.status !== 'SCHEDULED') return -1;
        if (a.status !== 'SCHEDULED' && b.status === 'SCHEDULED') return 1;
        return new Date(b.appointmentDateTime) - new Date(a.appointmentDateTime);
      });
      setAppointments(data);
    } catch (err) {
      setError(err.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const getBranchName = (branchId) => {
    const branch = branches.find((b) => b.id === branchId);
    return branch?.name || `Branch #${branchId}`;
  };

  const getTopicName = (topicId) => {
    const topic = topics.find((t) => t.id === topicId);
    return topic?.name || topic?.key || `Topic #${topicId}`;
  };

  const formatDateTime = (dateTimeStr) => {
    const dt = new Date(dateTimeStr);
    return {
      date: dt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: dt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    };
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    setActionLoading(id);
    try {
      await cancelAppointmentApi(id);
      await loadAppointments();
    } catch (err) {
      alert(err.message || 'Failed to cancel appointment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenReschedule = (appt) => {
    setRescheduleId(appt.id);
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleSlots([]);
  };

  const handleCloseReschedule = () => {
    setRescheduleId(null);
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleSlots([]);
  };

  // Get min/max dates for reschedule
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  // Load available time slots when reschedule date changes
  const handleRescheduleDateChange = async (appt, dateValue) => {
    setRescheduleDate(dateValue);
    setRescheduleTime('');

    if (!dateValue) {
      setRescheduleSlots([]);
      return;
    }

    const date = new Date(dateValue);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) {
      // Sunday
      setRescheduleSlots([]);
      return;
    }

    setRescheduleSlotsLoading(true);
    try {
      const branchAppointments = await fetchAppointmentsByBranch(appt.branchId);
      const isSaturday = dayOfWeek === 6;
      const startHour = 9;
      const endHour = isSaturday ? 13 : 17;

      const bookedTimes = branchAppointments
        .filter(
          (a) =>
            a.status === 'SCHEDULED' &&
            a.appointmentDateTime.startsWith(dateValue) &&
            a.id !== appt.id
        )
        .map((a) => a.appointmentDateTime.substring(11, 16));

      const slots = [];
      for (let hour = startHour; hour < endHour; hour++) {
        const time = `${hour.toString().padStart(2, '0')}:00`;
        if (!bookedTimes.includes(time)) {
          slots.push(time);
        }
      }
      setRescheduleSlots(slots);
    } catch {
      setRescheduleSlots([]);
    } finally {
      setRescheduleSlotsLoading(false);
    }
  };

  const handleRescheduleSubmit = async (apptId) => {
    if (!rescheduleDate || !rescheduleTime) return;
    const newDateTime = `${rescheduleDate}T${rescheduleTime}:00`;
    setActionLoading(apptId);
    try {
      await rescheduleAppointmentApi(apptId, newDateTime);
      handleCloseReschedule();
      await loadAppointments();
    } catch (err) {
      alert(err.message || 'Failed to reschedule appointment');
    } finally {
      setActionLoading(null);
    }
  };

  const scheduledAppointments = appointments.filter((a) => a.status === 'SCHEDULED');
  const pastAppointments = appointments.filter((a) => a.status !== 'SCHEDULED');

  if (loading) {
    return (
      <div className="my-appointments">
        <div className="appointments-loading">Loading your appointments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-appointments">
        <div className="appointments-error">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadAppointments} style={{ marginTop: '1rem' }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-appointments">
      <div className="my-appointments-header">
        <div>
          <h2 className="my-appointments-title">My Appointments</h2>
          <p className="my-appointments-subtitle">
            View, reschedule, or cancel your upcoming appointments.
          </p>
        </div>
        <button className="btn btn-primary" onClick={onBackToBooking}>
          Book New Appointment
        </button>
      </div>

      {appointments.length === 0 ? (
        <div className="appointments-empty">
          <div className="appointments-empty-icon">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="38" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" />
              <path d="M28 40H52M40 28V52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h3>No appointments yet</h3>
          <p>You haven&apos;t booked any appointments. Get started by booking your first one.</p>
          <button className="btn btn-primary" onClick={onBackToBooking}>
            Book an Appointment
          </button>
        </div>
      ) : (
        <div className="appointments-list">
          {scheduledAppointments.length > 0 && (
            <>
              <div className="appointments-section-title">
                Upcoming ({scheduledAppointments.length})
              </div>
              {scheduledAppointments.map((appt) => {
                const { date, time } = formatDateTime(appt.appointmentDateTime);
                return (
                  <div key={appt.id} className={`appointment-card status-${appt.status}`}>
                    <div className="appointment-card-header">
                      <div className="appointment-card-info">
                        <div className="appointment-card-date">{date}</div>
                        <div className="appointment-card-time">{time}</div>
                      </div>
                      <span className={`status-badge ${appt.status}`}>{appt.status}</span>
                    </div>

                    <div className="appointment-card-details">
                      <div className="detail-item">
                        <span className="detail-label">Branch</span>
                        <span className="detail-value">{getBranchName(appt.branchId)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Topic</span>
                        <span className="detail-value">{getTopicName(appt.topicId)}</span>
                      </div>
                      {appt.notes && (
                        <div className="detail-item">
                          <span className="detail-label">Notes</span>
                          <span className="detail-value">{appt.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="appointment-card-actions">
                      <button
                        className="btn-reschedule"
                        onClick={() => handleOpenReschedule(appt)}
                        disabled={actionLoading === appt.id}
                      >
                        Reschedule
                      </button>
                      <button
                        className="btn-cancel"
                        onClick={() => handleCancel(appt.id)}
                        disabled={actionLoading === appt.id}
                      >
                        {actionLoading === appt.id ? 'Processing...' : 'Cancel'}
                      </button>
                    </div>

                    {/* Inline reschedule form */}
                    {rescheduleId === appt.id && (
                      <div className="reschedule-form">
                        <div className="reschedule-form-title">Choose a new date &amp; time</div>
                        <div className="reschedule-fields">
                          <div className="form-group">
                            <label>New Date</label>
                            <input
                              type="date"
                              value={rescheduleDate}
                              onChange={(e) => handleRescheduleDateChange(appt, e.target.value)}
                              min={getMinDate()}
                              max={getMaxDate()}
                            />
                          </div>
                        </div>

                        {rescheduleDate && (
                          <>
                            {rescheduleSlotsLoading ? (
                              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
                                Loading available times...
                              </p>
                            ) : rescheduleSlots.length > 0 ? (
                              <div className="reschedule-time-grid">
                                {rescheduleSlots.map((slot) => (
                                  <button
                                    key={slot}
                                    type="button"
                                    className={`reschedule-time-btn ${rescheduleTime === slot ? 'selected' : ''}`}
                                    onClick={() => setRescheduleTime(slot)}
                                  >
                                    {formatTime12h(slot)}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
                                No available slots for this date.
                              </p>
                            )}
                          </>
                        )}

                        <div className="reschedule-actions">
                          <button
                            className="btn btn-primary"
                            onClick={() => handleRescheduleSubmit(appt.id)}
                            disabled={!rescheduleDate || !rescheduleTime || actionLoading === appt.id}
                            style={{ fontSize: '0.875rem', padding: '0.5rem 1.5rem', minWidth: 'auto' }}
                          >
                            {actionLoading === appt.id ? 'Saving...' : 'Confirm Reschedule'}
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={handleCloseReschedule}
                            style={{ fontSize: '0.875rem', padding: '0.5rem 1.5rem', minWidth: 'auto' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {pastAppointments.length > 0 && (
            <>
              <div className="appointments-section-title">
                Past &amp; Cancelled ({pastAppointments.length})
              </div>
              {pastAppointments.map((appt) => {
                const { date, time } = formatDateTime(appt.appointmentDateTime);
                return (
                  <div key={appt.id} className={`appointment-card status-${appt.status}`}>
                    <div className="appointment-card-header">
                      <div className="appointment-card-info">
                        <div className="appointment-card-date">{date}</div>
                        <div className="appointment-card-time">{time}</div>
                      </div>
                      <span className={`status-badge ${appt.status}`}>{appt.status}</span>
                    </div>

                    <div className="appointment-card-details">
                      <div className="detail-item">
                        <span className="detail-label">Branch</span>
                        <span className="detail-value">{getBranchName(appt.branchId)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Topic</span>
                        <span className="detail-value">{getTopicName(appt.topicId)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MyAppointments;

import { useState, useEffect, useCallback } from 'react';
import {
  fetchAllAppointments,
  fetchAppointmentsByBranch,
  cancelAppointment as cancelAppointmentApi,
  rescheduleAppointment as rescheduleAppointmentApi,
} from '../api';
import './AdminDashboard.css';

const AdminDashboard = ({ branches, topics, user, onLogout }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [rescheduleId, setRescheduleId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);

  const formatTime12h = (time24) => {
    const [hourStr, minute] = time24.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    if (hour === 0) hour = 12;
    else if (hour > 12) hour -= 12;
    return `${hour}:${minute} ${ampm}`;
  };

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllAppointments();
      data.sort((a, b) => new Date(b.appointmentDateTime) - new Date(a.appointmentDateTime));
      setAppointments(data);
    } catch (err) {
      setError(err.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const getBranchName = (id) => branches.find((b) => b.id === id)?.name || `Branch #${id}`;
  const getTopicName = (id) => topics.find((t) => t.id === id)?.name || `Topic #${id}`;

  const formatDateTime = (dateTimeStr) => {
    const dt = new Date(dateTimeStr);
    return {
      date: dt.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
      time: dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
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

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    return maxDate.toISOString().split('T')[0];
  };

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
      setRescheduleSlots([]);
      return;
    }

    setRescheduleSlotsLoading(true);
    try {
      const branchAppointments = await fetchAppointmentsByBranch(appt.branchId);
      const isSaturday = dayOfWeek === 6;
      const endHour = isSaturday ? 13 : 17;

      const bookedTimes = branchAppointments
        .filter((a) => a.status === 'SCHEDULED' && a.appointmentDateTime.startsWith(dateValue) && a.id !== appt.id)
        .map((a) => a.appointmentDateTime.substring(11, 16));

      const slots = [];
      for (let hour = 9; hour < endHour; hour++) {
        const time = `${hour.toString().padStart(2, '0')}:00`;
        if (!bookedTimes.includes(time)) slots.push(time);
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

  const filtered = appointments.filter((a) => {
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.customerName.toLowerCase().includes(q) || a.customerEmail.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    total: appointments.length,
    scheduled: appointments.filter((a) => a.status === 'SCHEDULED').length,
    cancelled: appointments.filter((a) => a.status === 'CANCELLED').length,
    completed: appointments.filter((a) => a.status === 'COMPLETED').length,
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-logo">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="8" fill="var(--color-primary)" />
              <path d="M12 20L18 26L28 14" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="admin-logo-text-group">
              <span className="admin-logo-text">Commerce Bank</span>
              <span className="admin-badge">Admin</span>
            </div>
          </div>
          <div className="admin-header-right">
            <span className="admin-welcome">Signed in as {user.displayName}</span>
            <button className="btn btn-secondary" onClick={onLogout}>Sign Out</button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-page-header">
          <h1 className="admin-title">All Appointments</h1>
          <button className="btn btn-secondary" onClick={loadAppointments} style={{ fontSize: '0.875rem' }}>
            Refresh
          </button>
        </div>

        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-number">{counts.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card stat-scheduled">
            <div className="stat-number">{counts.scheduled}</div>
            <div className="stat-label">Scheduled</div>
          </div>
          <div className="stat-card stat-cancelled">
            <div className="stat-number">{counts.cancelled}</div>
            <div className="stat-label">Cancelled</div>
          </div>
          <div className="stat-card stat-completed">
            <div className="stat-number">{counts.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>

        <div className="admin-filters">
          <div className="status-filters">
            {[
              { key: 'ALL', label: 'All', count: counts.total },
              { key: 'SCHEDULED', label: 'Scheduled', count: counts.scheduled },
              { key: 'CANCELLED', label: 'Cancelled', count: counts.cancelled },
              { key: 'COMPLETED', label: 'Completed', count: counts.completed },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                className={`filter-btn ${statusFilter === key ? 'active' : ''} ${key !== 'ALL' ? key.toLowerCase() : ''}`}
                onClick={() => setStatusFilter(key)}
              >
                {label} ({count})
              </button>
            ))}
          </div>
          <input
            type="search"
            className="admin-search"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {error && <div className="admin-error">{error}</div>}

        {loading ? (
          <div className="admin-loading">Loading appointments...</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">No appointments found.</div>
        ) : (
          <div className="admin-appointments">
            {filtered.map((appt) => {
              const { date, time } = formatDateTime(appt.appointmentDateTime);
              const isRescheduling = rescheduleId === appt.id;
              return (
                <div key={appt.id} className={`admin-appt-card status-${appt.status}`}>
                  <div className="admin-appt-main">
                    <div className="admin-appt-customer">
                      <div className="admin-appt-name">{appt.customerName}</div>
                      <div className="admin-appt-email">{appt.customerEmail}</div>
                    </div>

                    <div className="admin-appt-details">
                      <div className="admin-appt-datetime">
                        <span className="admin-appt-date">{date}</span>
                        <span className="admin-appt-time">{time}</span>
                      </div>
                      <div className="admin-appt-meta">
                        <span>{getBranchName(appt.branchId)}</span>
                        <span className="meta-sep">·</span>
                        <span>{getTopicName(appt.topicId)}</span>
                      </div>
                    </div>

                    <div className="admin-appt-right">
                      <span className={`status-badge ${appt.status}`}>{appt.status}</span>
                      {appt.status === 'SCHEDULED' && (
                        <div className="admin-appt-actions">
                          <button
                            className="btn-reschedule"
                            onClick={() => (isRescheduling ? handleCloseReschedule() : handleOpenReschedule(appt))}
                            disabled={actionLoading === appt.id}
                          >
                            {isRescheduling ? 'Close' : 'Reschedule'}
                          </button>
                          <button
                            className="btn-cancel"
                            onClick={() => handleCancel(appt.id)}
                            disabled={actionLoading === appt.id}
                          >
                            {actionLoading === appt.id ? '...' : 'Cancel'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isRescheduling && (
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
                        rescheduleSlotsLoading ? (
                          <p className="slots-hint">Loading available times...</p>
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
                          <p className="slots-hint">No available slots for this date.</p>
                        )
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
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fetchAllAppointments,
  fetchAppointmentsByBranch,
  cancelAppointment as cancelAppointmentApi,
  rescheduleAppointment as rescheduleAppointmentApi,
  markComplete as markCompleteApi,
  markNoShow as markNoShowApi,
  fetchAnalyticsSummary,
} from '../api';
import { useTts } from '../context/useTts';
import SpokenText from './SpokenText';
import SettingsMenu from './SettingsMenu';
import './AdminDashboard.css';

const AdminDashboard = ({ branches, topics, user, onLogout }) => {
  const { t } = useTranslation();
  const { speak } = useTts();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
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
      setError(err.message || t('admin.loading'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      const data = await fetchAnalyticsSummary();
      setAnalytics(data);
    } catch (err) {
      setAnalyticsError(err.message || 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
    loadAnalytics();
  }, [loadAppointments, loadAnalytics]);

  const getBranchName = (id) => branches.find((b) => b.id === id)?.name || `Branch #${id}`;
  const getTopicName = (id) => topics.find((t) => t.id === id)?.name || `Topic #${id}`;

  const formatDateTime = (dateTimeStr) => {
    const dt = new Date(dateTimeStr);
    return {
      date: dt.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
      time: dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
  };

  const handleCancel = async (id) => {
    if (!window.confirm(t('admin.cancelConfirm'))) return;
    setActionLoading(id);
    try {
      await cancelAppointmentApi(id);
      await loadAppointments();
    } catch (err) {
      alert(err.message || t('admin.actions.cancel'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (id) => {
    setActionLoading(id);
    try {
      await markCompleteApi(id);
      await loadAppointments();
    } catch (err) {
      alert(err.message || t('admin.actions.complete'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleNoShow = async (id) => {
    if (!window.confirm(t('admin.noShowConfirm'))) return;
    setActionLoading(id);
    try {
      await markNoShowApi(id);
      await loadAppointments();
    } catch (err) {
      alert(err.message || t('admin.actions.noShow'));
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
      alert(err.message || t('admin.actions.confirmReschedule'));
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
    arrived: appointments.filter((a) => a.status === 'ARRIVED').length,
    cancelled: appointments.filter((a) => a.status === 'CANCELLED').length,
    completed: appointments.filter((a) => a.status === 'COMPLETED').length,
    noShow: appointments.filter((a) => a.status === 'NO_SHOW').length,
  };

  const filterOptions = [
    { key: 'ALL',       label: t('admin.stats.total'),     count: counts.total },
    { key: 'SCHEDULED', label: t('admin.stats.scheduled'), count: counts.scheduled },
    { key: 'ARRIVED',   label: t('admin.stats.arrived'),   count: counts.arrived },
    { key: 'CANCELLED', label: t('admin.stats.cancelled'), count: counts.cancelled },
    { key: 'COMPLETED', label: t('admin.stats.completed'), count: counts.completed },
    { key: 'NO_SHOW',   label: t('admin.stats.noShow'),    count: counts.noShow },
  ];

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
              <span className="admin-logo-text">{t('header.logo')}</span>
              <span className="admin-badge">{t('admin.badge')}</span>
            </div>
          </div>
          <div className="admin-header-right">
            <span className="admin-welcome">
              <SpokenText text={t('admin.signedInAs', { name: user.displayName })} />
            </span>
            <SettingsMenu onLogout={onLogout} />
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-page-header">
          <h1 className="admin-title">
            <SpokenText text={t('admin.title')} />
          </h1>
          <button
            className="btn btn-secondary"
            onClick={() => { speak(t('admin.refresh')); loadAppointments(); loadAnalytics(); }}
            style={{ fontSize: '0.875rem' }}
          >
            {t('admin.refresh')}
          </button>
        </div>

        <section className="admin-insights" aria-labelledby="insights-heading">
          <h2 id="insights-heading" className="admin-insights-title">
            <SpokenText text={t('admin.insights.title')} />
          </h2>

          {analyticsError && (
            <div className="admin-error" role="alert">{analyticsError}</div>
          )}

          {analyticsLoading && !analytics ? (
            <div className="admin-loading">{t('admin.insights.loading')}</div>
          ) : analytics ? (
            <>
              <div className="insights-stat-row">
                <div className="insights-stat-card">
                  <div className="stat-number">{analytics.totalAppointments}</div>
                  <div className="stat-label">{t('admin.insights.totalAppointments')}</div>
                </div>
                <div className="insights-stat-card">
                  <div className="stat-number">{(analytics.noShowRate * 100).toFixed(1)}%</div>
                  <div className="stat-label">{t('admin.insights.noShowRate')}</div>
                </div>
              </div>

              <div className="insights-grid">
                <div className="insights-list">
                  <h3 className="insights-list-title">{t('admin.insights.topTopics')}</h3>
                  {analytics.topTopics.length === 0 ? (
                    <p className="insights-empty">{t('admin.insights.empty')}</p>
                  ) : (
                    <ul>
                      {analytics.topTopics.map((entry) => (
                        <li key={entry.topic}>
                          <span className="insights-list-name">{entry.topic}</span>
                          <span className="insights-list-count">{entry.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="insights-list">
                  <h3 className="insights-list-title">{t('admin.insights.busiestBranches')}</h3>
                  {analytics.busiestBranches.length === 0 ? (
                    <p className="insights-empty">{t('admin.insights.empty')}</p>
                  ) : (
                    <ul>
                      {analytics.busiestBranches.map((entry) => (
                        <li key={entry.branch}>
                          <span className="insights-list-name">{entry.branch}</span>
                          <span className="insights-list-count">{entry.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="insights-chart">
                  <h3 className="insights-list-title">{t('admin.insights.peakHours')}</h3>
                  {analytics.peakHours.length === 0 ? (
                    <p className="insights-empty">{t('admin.insights.empty')}</p>
                  ) : (
                    (() => {
                      const max = Math.max(...analytics.peakHours.map((p) => p.count), 1);
                      return (
                        <div className="bar-chart">
                          {analytics.peakHours.map((p) => {
                            const display = p.hour === 0
                              ? '12 AM'
                              : p.hour < 12
                                ? `${p.hour} AM`
                                : p.hour === 12
                                  ? '12 PM'
                                  : `${p.hour - 12} PM`;
                            return (
                              <div key={p.hour} className="bar-row">
                                <span className="bar-label">{display}</span>
                                <div className="bar-track">
                                  <div
                                    className="bar-fill"
                                    style={{ width: `${(p.count / max) * 100}%` }}
                                  />
                                </div>
                                <span className="bar-count">{p.count}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            </>
          ) : null}
        </section>

        <div className="admin-stats">
          {[
            { key: 'total',     count: counts.total,     label: t('admin.stats.total') },
            { key: 'scheduled', count: counts.scheduled, label: t('admin.stats.scheduled'), cls: 'stat-scheduled' },
            { key: 'arrived',   count: counts.arrived,   label: t('admin.stats.arrived'),   cls: 'stat-arrived' },
            { key: 'completed', count: counts.completed, label: t('admin.stats.completed'), cls: 'stat-completed' },
            { key: 'cancelled', count: counts.cancelled, label: t('admin.stats.cancelled'), cls: 'stat-cancelled' },
            { key: 'noShow',    count: counts.noShow,    label: t('admin.stats.noShow'),    cls: 'stat-noshow' },
          ].map(({ key, count, label, cls = '' }) => (
            <div key={key} className={`stat-card ${cls}`}>
              <div className="stat-number">
                <SpokenText text={`${count} ${label}`}>{count}</SpokenText>
              </div>
              <div className="stat-label">
                <SpokenText text={label} />
              </div>
            </div>
          ))}
        </div>

        <div className="admin-filters">
          <div className="status-filters">
            {filterOptions.map(({ key, label, count }) => (
              <button
                key={key}
                className={`filter-btn ${statusFilter === key ? 'active' : ''} ${key !== 'ALL' ? key.toLowerCase() : ''}`}
                onClick={() => { speak(`${label} ${count}`); setStatusFilter(key); }}
              >
                {label} ({count})
              </button>
            ))}
          </div>
          <input
            type="search"
            className="admin-search"
            placeholder={t('admin.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t('admin.search')}
          />
        </div>

        {error && <div className="admin-error">{error}</div>}

        {loading ? (
          <div className="admin-loading">
            <SpokenText text={t('admin.loading')} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">
            <SpokenText text={t('admin.noResults')} />
          </div>
        ) : (
          <div className="admin-appointments">
            {filtered.map((appt) => {
              const { date, time } = formatDateTime(appt.appointmentDateTime);
              const isRescheduling = rescheduleId === appt.id;
              const branchName = getBranchName(appt.branchId);
              const topicName = getTopicName(appt.topicId);
              const cardSpeech = `${appt.customerName}, ${appt.customerEmail}. ${date} ${time}. ${branchName}. ${topicName}. ${appt.status}`;

              return (
                <div key={appt.id} className={`admin-appt-card status-${appt.status}`}>
                  <div className="admin-appt-main">
                    <div className="admin-appt-customer">
                      <div className="admin-appt-name">
                        <SpokenText text={appt.customerName} />
                      </div>
                      <div className="admin-appt-email">{appt.customerEmail}</div>
                    </div>

                    <div className="admin-appt-details">
                      <div className="admin-appt-datetime">
                        <span className="admin-appt-date">
                          <SpokenText text={`${date} ${time}`}>{date}</SpokenText>
                        </span>
                        <span className="admin-appt-time">{time}</span>
                      </div>
                      <div className="admin-appt-meta">
                        <SpokenText text={`${branchName} · ${topicName}`}>
                          <span>{branchName}</span>
                          <span className="meta-sep">·</span>
                          <span>{topicName}</span>
                        </SpokenText>
                      </div>
                      {appt.notes && (
                        <div className="admin-appt-notes">
                          <span className="admin-appt-notes-label">{t('admin.notesLabel')}</span>
                          <SpokenText text={appt.notes}>
                            <span className="admin-appt-notes-value">{appt.notes}</span>
                          </SpokenText>
                        </div>
                      )}
                    </div>

                    <div className="admin-appt-right">
                      <span
                        className={`status-badge ${appt.status}`}
                        onClick={() => speak(appt.status)}
                        style={{ cursor: 'default' }}
                      >
                        {appt.status}
                      </span>
                      {(appt.status === 'SCHEDULED' || appt.status === 'ARRIVED') && (
                        <div className="admin-appt-actions">
                          <button
                            className="btn-complete"
                            onClick={() => { speak(t('admin.actions.complete')); handleComplete(appt.id); }}
                            disabled={actionLoading === appt.id}
                          >
                            {actionLoading === appt.id ? '...' : t('admin.actions.complete')}
                          </button>
                          {appt.status === 'SCHEDULED' && (
                            <>
                              <button
                                className="btn-noshow"
                                onClick={() => { speak(t('admin.actions.noShow')); handleNoShow(appt.id); }}
                                disabled={actionLoading === appt.id}
                              >
                                {t('admin.actions.noShow')}
                              </button>
                              <button
                                className="btn-reschedule"
                                onClick={() => {
                                  speak(isRescheduling ? t('admin.actions.close') : t('admin.actions.reschedule'));
                                  isRescheduling ? handleCloseReschedule() : handleOpenReschedule(appt);
                                }}
                                disabled={actionLoading === appt.id}
                              >
                                {isRescheduling ? t('admin.actions.close') : t('admin.actions.reschedule')}
                              </button>
                            </>
                          )}
                          <button
                            className="btn-cancel"
                            onClick={() => { speak(t('admin.actions.cancel')); handleCancel(appt.id); }}
                            disabled={actionLoading === appt.id}
                          >
                            {actionLoading === appt.id ? '...' : t('admin.actions.cancel')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isRescheduling && (
                    <div className="reschedule-form">
                      <div className="reschedule-form-title">
                        <SpokenText text={t('admin.reschedule.title')} />
                      </div>
                      <div className="reschedule-fields">
                        <div className="form-group">
                          <label>{t('admin.reschedule.newDate')}</label>
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
                          <p className="slots-hint">
                            <SpokenText text={t('admin.reschedule.loadingSlots')} />
                          </p>
                        ) : rescheduleSlots.length > 0 ? (
                          <div className="reschedule-time-grid">
                            {rescheduleSlots.map((slot) => (
                              <button
                                key={slot}
                                type="button"
                                className={`reschedule-time-btn ${rescheduleTime === slot ? 'selected' : ''}`}
                                onClick={() => { speak(formatTime12h(slot)); setRescheduleTime(slot); }}
                              >
                                {formatTime12h(slot)}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="slots-hint">
                            <SpokenText text={t('admin.reschedule.noSlots')} />
                          </p>
                        )
                      )}

                      <div className="reschedule-actions">
                        <button
                          className="btn btn-primary"
                          onClick={() => { speak(t('admin.actions.confirmReschedule')); handleRescheduleSubmit(appt.id); }}
                          disabled={!rescheduleDate || !rescheduleTime || actionLoading === appt.id}
                          style={{ fontSize: '0.875rem', padding: '0.5rem 1.5rem', minWidth: 'auto' }}
                        >
                          {actionLoading === appt.id ? t('admin.actions.saving') : t('admin.actions.confirmReschedule')}
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => { speak(t('admin.actions.close')); handleCloseReschedule(); }}
                          style={{ fontSize: '0.875rem', padding: '0.5rem 1.5rem', minWidth: 'auto' }}
                        >
                          {t('admin.actions.close')}
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

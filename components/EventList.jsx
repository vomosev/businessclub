'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthProvider';
import { apiRequest } from '../lib/api';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'Europe/London',
});

function getStartDate(event) {
  return (
    event.starts_at ||
    event.start_time ||
    event.start_date ||
    event.event_date ||
    event.date ||
    null
  );
}

function getEndDate(event) {
  return event.ends_at || event.end_time || event.end_date || null;
}

function toDate(value) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatEventDate(value) {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : 'Date to be confirmed';
}

function isTruthyRegistration(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function isMemberRegistered(event) {
  return isTruthyRegistration(
    event.is_registered ??
      event.user_registered ??
      event.registered ??
      event.has_registration,
  );
}

function getRegistrationCount(event) {
  const value =
    event.registration_count ??
    event.registered_count ??
    event.attendee_count ??
    0;

  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function getCapacity(event) {
  const capacity = Number(event.capacity);
  return Number.isFinite(capacity) && capacity > 0 ? capacity : null;
}

function getAvailability(event) {
  const explicitAvailability =
    event.available_spaces ??
    event.spaces_remaining ??
    event.remaining_capacity;

  if (explicitAvailability !== undefined && explicitAvailability !== null) {
    const available = Number(explicitAvailability);
    if (Number.isFinite(available)) {
      return Math.max(0, available);
    }
  }

  const capacity = getCapacity(event);
  if (capacity === null) return null;

  return Math.max(0, capacity - getRegistrationCount(event));
}

function getVenue(event) {
  const parts = [
    event.venue,
    event.location,
    event.address,
    event.city,
    event.postcode,
  ]
    .filter((part) => typeof part === 'string' && part.trim())
    .map((part) => part.trim());

  return [...new Set(parts)].join(', ') || 'Venue to be confirmed';
}

function getErrorMessage(error, fallback) {
  if (error && typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export default function EventList() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [activeEventId, setActiveEventId] = useState(null);

  const loadEvents = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    setLoadError('');

    try {
      const response = await apiRequest('/events');
      const eventData = Array.isArray(response)
        ? response
        : Array.isArray(response?.events)
          ? response.events
          : [];

      setEvents(eventData);
    } catch (error) {
      setLoadError(
        getErrorMessage(
          error,
          'We could not load the events at the moment. Please try again.',
        ),
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      loadEvents();
    }
  }, [authLoading, loadEvents, user?.id]);

  const sortedEvents = useMemo(
    () =>
      [...events].sort((first, second) => {
        const firstDate = toDate(getStartDate(first));
        const secondDate = toDate(getStartDate(second));

        if (!firstDate && !secondDate) return 0;
        if (!firstDate) return 1;
        if (!secondDate) return -1;

        return firstDate.getTime() - secondDate.getTime();
      }),
    [events],
  );

  async function handleRegistration(event) {
    if (!user || activeEventId !== null) return;

    const eventId = event.id;
    const registered = isMemberRegistered(event);

    setActiveEventId(eventId);
    setActionError('');
    setFeedback('');

    try {
      await apiRequest(`/events/${encodeURIComponent(eventId)}/register`, {
        method: registered ? 'DELETE' : 'POST',
      });

      setFeedback(
        registered
          ? `Your registration for ${event.title} has been cancelled.`
          : `You are registered for ${event.title}.`,
      );

      await loadEvents(true);
    } catch (error) {
      setActionError(
        getErrorMessage(
          error,
          registered
            ? 'We could not cancel your registration. Please try again.'
            : 'We could not complete your registration. Please try again.',
        ),
      );
    } finally {
      setActiveEventId(null);
    }
  }

  if (authLoading || loading) {
    return (
      <section className="event-list" aria-busy="true" aria-live="polite">
        <p className="status-message">Loading club events…</p>
      </section>
    );
  }

  if (loadError && events.length === 0) {
    return (
      <section className="event-list">
        <div className="status-message error" role="alert">
          <p>{loadError}</p>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => loadEvents()}
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="event-list" aria-labelledby="club-events-heading">
      <div className="section-heading">
        <p className="eyebrow">Meet, connect and collaborate</p>
        <h2 id="club-events-heading">Upcoming club events</h2>
        <p>
          Explore professional networking opportunities hosted across the
          United Kingdom.
        </p>
      </div>

      {!user && (
        <div className="status-message info">
          <p>
            Already a member?{' '}
            <Link href="/login">Log in to reserve your place</Link>. New
            professionals can <Link href="/signup">apply for membership</Link>.
          </p>
        </div>
      )}

      {loadError && (
        <div className="status-message error" role="alert">
          {loadError}
        </div>
      )}

      {actionError && (
        <div className="status-message error" role="alert">
          {actionError}
        </div>
      )}

      {feedback && (
        <div className="status-message success" role="status">
          {feedback}
        </div>
      )}

      {sortedEvents.length === 0 ? (
        <div className="empty-state">
          <h3>No events are currently scheduled</h3>
          <p>Please check back soon for new UK Business Club events.</p>
        </div>
      ) : (
        <div className="events-grid">
          {sortedEvents.map((event) => {
            const startDate = getStartDate(event);
            const endDate = getEndDate(event);
            const registered = isMemberRegistered(event);
            const registrationCount = getRegistrationCount(event);
            const capacity = getCapacity(event);
            const availability = getAvailability(event);
            const start = toDate(startDate);
            const end = toDate(endDate);
            const hasEnded = end
              ? end.getTime() < Date.now()
              : start
                ? start.getTime() < Date.now()
                : false;
            const isFull = availability !== null && availability <= 0;
            const isUpdating = activeEventId === event.id;
            const actionDisabled =
              activeEventId !== null || hasEnded || (isFull && !registered);

            return (
              <article className="event-card" key={event.id}>
                <div className="event-card-header">
                  <div>
                    {event.category && (
                      <p className="eyebrow">{event.category}</p>
                    )}
                    <h3>{event.title || 'Business Club event'}</h3>
                  </div>

                  {registered && (
                    <span className="status-badge success">
                      Place reserved
                    </span>
                  )}
                </div>

                {event.description && (
                  <p className="event-description">{event.description}</p>
                )}

                <dl className="event-details">
                  <div>
                    <dt>Date and time</dt>
                    <dd>
                      <time dateTime={startDate || undefined}>
                        {formatEventDate(startDate)}
                      </time>
                      {endDate && (
                        <>
                          <span aria-hidden="true"> – </span>
                          <span className="sr-only"> until </span>
                          <time dateTime={endDate}>
                            {formatEventDate(endDate)}
                          </time>
                        </>
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>Venue</dt>
                    <dd>{getVenue(event)}</dd>
                  </div>

                  <div>
                    <dt>Capacity</dt>
                    <dd>
                      {capacity === null
                        ? 'Contact the club for availability'
                        : `${registrationCount} of ${capacity} places reserved`}
                    </dd>
                  </div>

                  <div>
                    <dt>Availability</dt>
                    <dd>
                      {hasEnded
                        ? 'Event ended'
                        : availability === null
                          ? 'Places available'
                          : availability === 0
                            ? 'Fully booked'
                            : `${availability} ${
                                availability === 1 ? 'place' : 'places'
                              } available`}
                    </dd>
                  </div>
                </dl>

                <div className="event-card-actions">
                  {user ? (
                    <button
                      className={
                        registered
                          ? 'button button-secondary'
                          : 'button button-primary'
                      }
                      type="button"
                      disabled={actionDisabled}
                      onClick={() => handleRegistration(event)}
                      aria-label={
                        registered
                          ? `Cancel registration for ${event.title}`
                          : `Register for ${event.title}`
                      }
                    >
                      {isUpdating
                        ? registered
                          ? 'Cancelling…'
                          : 'Registering…'
                        : hasEnded
                          ? 'Event ended'
                          : registered
                            ? 'Cancel registration'
                            : isFull
                              ? 'Fully booked'
                              : 'Reserve your place'}
                    </button>
                  ) : (
                    <Link className="button button-primary" href="/login">
                      Log in to register
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
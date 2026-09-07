"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import { apiRequest } from "../lib/api";

function getDisplayValue(value, fallback = "Not yet provided") {
  if (value === null || value === undefined || String(value).trim() === "") {
    return fallback;
  }

  return String(value).trim();
}

function formatLabel(value) {
  const text = getDisplayValue(value, "Not specified");

  return text
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getEventDetails(registration) {
  return registration?.event && typeof registration.event === "object"
    ? { ...registration, ...registration.event }
    : registration;
}

function getEventDate(event) {
  const value =
    event?.startDate ??
    event?.eventDate ??
    event?.startsAt ??
    event?.date ??
    event?.start_date ??
    event?.event_date ??
    event?.starts_at;

  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatEventDate(date) {
  if (!date) {
    return "Date to be confirmed";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(date);
}

function formatMemberSince(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(date);
}

function extractRegistrations(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.registrations)) {
    return response.registrations;
  }

  if (Array.isArray(response?.events)) {
    return response.events;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}

export default function DashboardView() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/dashboard");
    }
  }, [authLoading, router, user]);

  const loadRegistrations = useCallback(async (signal) => {
    setEventsLoading(true);
    setEventsError("");

    try {
      const response = await apiRequest("/events/my-registrations", { signal });

      if (!signal?.aborted) {
        setRegistrations(extractRegistrations(response));
      }
    } catch (error) {
      if (!signal?.aborted) {
        setRegistrations([]);
        setEventsError(
          error?.message ||
            "We could not load your registered events. Please try again."
        );
      }
    } finally {
      if (!signal?.aborted) {
        setEventsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const controller = new AbortController();
    loadRegistrations(controller.signal);

    return () => controller.abort();
  }, [loadRegistrations, user]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();

    return registrations
      .map((registration) => {
        const event = getEventDetails(registration);
        return {
          registration,
          event,
          date: getEventDate(event),
        };
      })
      .filter(({ registration, date }) => {
        const status = String(
          registration?.registrationStatus ?? registration?.status ?? ""
        ).toLowerCase();

        const isActive =
          status !== "cancelled" &&
          status !== "canceled" &&
          status !== "expired";

        return isActive && (!date || date.getTime() >= now);
      })
      .sort((first, second) => {
        if (!first.date) return 1;
        if (!second.date) return -1;
        return first.date.getTime() - second.date.getTime();
      });
  }, [registrations]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <section className="page-section" aria-labelledby="dashboard-loading">
        <div className="container">
          <div className="status-message" role="status" aria-live="polite">
            <h1 id="dashboard-loading">Loading your member dashboard</h1>
            <p>Please wait while we confirm your secure session.</p>
          </div>
        </div>
      </section>
    );
  }

  const name = getDisplayValue(
    user.name ?? user.fullName ?? user.full_name,
    "Member"
  );
  const company = getDisplayValue(user.company ?? user.companyName);
  const jobTitle = getDisplayValue(user.jobTitle ?? user.job_title);
  const sector = getDisplayValue(user.sector);
  const location = getDisplayValue(user.location);
  const membershipStatus = formatLabel(
    user.membershipStatus ?? user.membership_status ?? "active"
  );
  const membershipType = formatLabel(
    user.membershipType ?? user.membership_type ?? user.role ?? "member"
  );
  const memberSince = formatMemberSince(
    user.createdAt ?? user.created_at ?? user.memberSince
  );

  return (
    <section className="page-section dashboard-section" aria-labelledby="dashboard-title">
      <div className="container">
        <header className="page-header dashboard-header">
          <div>
            <p className="eyebrow">Member area</p>
            <h1 id="dashboard-title">Welcome back, {name}</h1>
            <p>
              Manage your UK Business Club membership, build connections and
              keep track of your upcoming networking events.
            </p>
          </div>
          <Link className="button button-primary" href="/profile">
            Update profile
          </Link>
        </header>

        <div className="dashboard-grid">
          <article className="card dashboard-card" aria-labelledby="membership-summary">
            <div className="card-header">
              <div>
                <p className="eyebrow">Your membership</p>
                <h2 id="membership-summary">Membership summary</h2>
              </div>
              <span className="status-badge status-active">
                {membershipStatus}
              </span>
            </div>

            <dl className="summary-list">
              <div>
                <dt>Member</dt>
                <dd>{name}</dd>
              </div>
              <div>
                <dt>Membership</dt>
                <dd>{membershipType}</dd>
              </div>
              <div>
                <dt>Member since</dt>
                <dd>{memberSince}</dd>
              </div>
            </dl>
          </article>

          <article className="card dashboard-card" aria-labelledby="business-summary">
            <div className="card-header">
              <div>
                <p className="eyebrow">Professional profile</p>
                <h2 id="business-summary">Business summary</h2>
              </div>
              <Link className="text-link" href="/profile">
                Edit details
              </Link>
            </div>

            <dl className="summary-list">
              <div>
                <dt>Company</dt>
                <dd>{company}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{jobTitle}</dd>
              </div>
              <div>
                <dt>Sector</dt>
                <dd>{sector}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{location}</dd>
              </div>
            </dl>
          </article>
        </div>

        <section className="dashboard-panel" aria-labelledby="upcoming-events-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Your schedule</p>
              <h2 id="upcoming-events-title">Upcoming registered events</h2>
              <p>Networking opportunities currently reserved for you.</p>
            </div>
            <Link className="button button-secondary" href="/events">
              Browse all events
            </Link>
          </div>

          {eventsLoading ? (
            <div className="status-message" role="status" aria-live="polite">
              Loading your event registrations…
            </div>
          ) : eventsError ? (
            <div className="status-message status-error" role="alert">
              <p>{eventsError}</p>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => loadRegistrations()}
              >
                Try again
              </button>
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="empty-state">
              <h3>No upcoming registrations</h3>
              <p>
                Explore the latest UK Business Club events and reserve your
                place at an upcoming session.
              </p>
              <Link className="button button-primary" href="/events">
                Find an event
              </Link>
            </div>
          ) : (
            <div className="event-list dashboard-event-list">
              {upcomingEvents.map(({ registration, event, date }, index) => {
                const eventId =
                  event?.id ??
                  event?.eventId ??
                  event?.event_id ??
                  registration?.eventId ??
                  registration?.event_id;
                const title = getDisplayValue(
                  event?.title ?? event?.name,
                  "UK Business Club event"
                );
                const venue = getDisplayValue(
                  event?.venue ?? event?.venueName ?? event?.venue_name,
                  "Venue to be confirmed"
                );
                const eventLocation = getDisplayValue(
                  event?.location ?? event?.city,
                  "Location to be confirmed"
                );

                return (
                  <article
                    className="card event-card"
                    key={
                      registration?.registrationId ??
                      registration?.registration_id ??
                      registration?.id ??
                      eventId ??
                      `${title}-${index}`
                    }
                  >
                    <div className="event-card-content">
                      <p className="event-date">
                        <time dateTime={date ? date.toISOString() : undefined}>
                          {formatEventDate(date)}
                        </time>
                      </p>
                      <h3>{title}</h3>
                      <p className="event-location">
                        <strong>{venue}</strong>
                        <span>{eventLocation}</span>
                      </p>
                    </div>
                    <Link className="button button-secondary" href="/events">
                      View event
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="dashboard-panel" aria-labelledby="dashboard-shortcuts">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Member tools</p>
              <h2 id="dashboard-shortcuts">Continue your club journey</h2>
            </div>
          </div>

          <div className="card-grid shortcut-grid">
            <Link className="card shortcut-card" href="/profile">
              <h3>Complete your profile</h3>
              <p>
                Keep your role, company, sector and contact profile up to date.
              </p>
              <span className="text-link" aria-hidden="true">
                Manage profile →
              </span>
            </Link>

            <Link className="card shortcut-card" href="/members">
              <h3>Discover members</h3>
              <p>
                Search the directory for professionals across UK sectors and
                regions.
              </p>
              <span className="text-link" aria-hidden="true">
                Open directory →
              </span>
            </Link>

            <Link className="card shortcut-card" href="/events">
              <h3>Grow your network</h3>
              <p>
                Browse upcoming networking, learning and business events.
              </p>
              <span className="text-link" aria-hidden="true">
                Explore events →
              </span>
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}
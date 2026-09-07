"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { ApiError, apiRequest } from "../lib/api";

const EMPTY_FORM = {
  name: "",
  company: "",
  jobTitle: "",
  sector: "",
  location: "",
  bio: "",
  website: "",
};

function getInitialForm(user) {
  return {
    name: user?.name ?? user?.fullName ?? user?.full_name ?? "",
    company: user?.company ?? "",
    jobTitle: user?.jobTitle ?? user?.job_title ?? "",
    sector: user?.sector ?? "",
    location: user?.location ?? "",
    bio: user?.bio ?? "",
    website: user?.website ?? "",
  };
}

function formatStatus(value) {
  if (!value) return "Active member";

  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function validateForm(values) {
  const errors = {};
  const name = values.name.trim();
  const company = values.company.trim();
  const jobTitle = values.jobTitle.trim();
  const sector = values.sector.trim();
  const location = values.location.trim();
  const bio = values.bio.trim();
  const website = values.website.trim();

  if (name.length < 2) {
    errors.name = "Enter your full name using at least 2 characters.";
  } else if (name.length > 100) {
    errors.name = "Your name must be 100 characters or fewer.";
  }

  if (company.length < 2) {
    errors.company = "Enter your business or organisation name.";
  } else if (company.length > 150) {
    errors.company = "The business name must be 150 characters or fewer.";
  }

  if (!jobTitle) {
    errors.jobTitle = "Enter your job title or professional role.";
  } else if (jobTitle.length > 120) {
    errors.jobTitle = "The job title must be 120 characters or fewer.";
  }

  if (sector.length > 100) {
    errors.sector = "The sector must be 100 characters or fewer.";
  }

  if (!location) {
    errors.location = "Enter your UK town, city, or region.";
  } else if (location.length > 120) {
    errors.location = "The location must be 120 characters or fewer.";
  }

  if (bio.length > 1000) {
    errors.bio = "Your biography must be 1,000 characters or fewer.";
  }

  if (website) {
    try {
      const parsedWebsite = new URL(website);

      if (!["http:", "https:"].includes(parsedWebsite.protocol)) {
        errors.website = "The website must use an http:// or https:// address.";
      }
    } catch {
      errors.website =
        "Enter a complete website address, including https://.";
    }

    if (website.length > 255) {
      errors.website = "The website address must be 255 characters or fewer.";
    }
  }

  return errors;
}

export default function ProfileForm() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();
  const initialisedUserRef = useRef(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;

    const userKey = user.id ?? user.email;

    if (initialisedUserRef.current !== userKey) {
      setForm(getInitialForm(user));
      setErrors({});
      setFeedback(null);
      initialisedUserRef.current = userKey;
    }
  }, [user]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => {
      if (!current[name]) return current;

      const nextErrors = { ...current };
      delete nextErrors[name];
      return nextErrors;
    });

    if (feedback) {
      setFeedback(null);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    setFeedback(null);

    if (Object.keys(validationErrors).length > 0) {
      setFeedback({
        type: "error",
        message: "Please correct the highlighted fields before saving.",
      });
      return;
    }

    const payload = {
      name: form.name.trim(),
      company: form.company.trim(),
      jobTitle: form.jobTitle.trim(),
      sector: form.sector.trim(),
      location: form.location.trim(),
      bio: form.bio.trim(),
      website: form.website.trim(),
    };

    setSubmitting(true);

    try {
      await apiRequest("/members/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setForm(payload);

      try {
        await refreshUser();
        setFeedback({
          type: "success",
          message: "Your membership profile has been updated successfully.",
        });
      } catch {
        setFeedback({
          type: "error",
          message:
            "Your profile was saved, but the refreshed account details could not be loaded. Please reload the page.",
        });
      }
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : "We could not update your profile. Please try again.";

      setFeedback({
        type: "error",
        message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || (!user && !loading)) {
    return (
      <section className="page-section" aria-live="polite">
        <div className="container">
          <div className="form-card">
            <p className="status-message">Loading your membership profile…</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="container">
        <div className="page-heading">
          <p className="eyebrow">Member profile</p>
          <h1>Manage your business profile</h1>
          <p>
            Keep your professional details current so fellow UK Business Club
            members can discover the right opportunities to connect with you.
          </p>
        </div>

        <div className="profile-layout">
          <aside className="profile-summary card" aria-label="Account summary">
            <h2>Account summary</h2>
            <dl>
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Membership</dt>
                <dd>
                  {formatStatus(
                    user.membershipStatus ?? user.membership_status
                  )}
                </dd>
              </div>
            </dl>
            <p className="form-help">
              Your email address is used to access your account and is not
              displayed in the member directory.
            </p>
          </aside>

          <form
            className="form-card profile-form"
            onSubmit={handleSubmit}
            noValidate
            aria-busy={submitting}
          >
            <div className="form-section">
              <div className="form-section-heading">
                <h2>Personal details</h2>
                <p>Tell members who you are and where you are based.</p>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="profile-name">Full name</label>
                  <input
                    id="profile-name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    autoComplete="name"
                    maxLength={100}
                    required
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "profile-name-error" : undefined}
                  />
                  {errors.name && (
                    <p
                      id="profile-name-error"
                      className="field-error"
                      role="alert"
                    >
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="profile-email">Email address</label>
                  <input
                    id="profile-email"
                    type="email"
                    value={user.email ?? ""}
                    autoComplete="email"
                    readOnly
                    disabled
                  />
                  <p className="form-help">Your sign-in email cannot be edited here.</p>
                </div>

                <div className="form-group">
                  <label htmlFor="profile-location">UK location</label>
                  <input
                    id="profile-location"
                    name="location"
                    type="text"
                    value={form.location}
                    onChange={handleChange}
                    autoComplete="address-level2"
                    maxLength={120}
                    placeholder="For example, Manchester"
                    required
                    aria-invalid={Boolean(errors.location)}
                    aria-describedby={
                      errors.location ? "profile-location-error" : undefined
                    }
                  />
                  {errors.location && (
                    <p
                      id="profile-location-error"
                      className="field-error"
                      role="alert"
                    >
                      {errors.location}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-heading">
                <h2>Business details</h2>
                <p>
                  These approved details may appear in the authenticated member
                  directory.
                </p>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="profile-company">
                    Business or organisation
                  </label>
                  <input
                    id="profile-company"
                    name="company"
                    type="text"
                    value={form.company}
                    onChange={handleChange}
                    autoComplete="organization"
                    maxLength={150}
                    required
                    aria-invalid={Boolean(errors.company)}
                    aria-describedby={
                      errors.company ? "profile-company-error" : undefined
                    }
                  />
                  {errors.company && (
                    <p
                      id="profile-company-error"
                      className="field-error"
                      role="alert"
                    >
                      {errors.company}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="profile-job-title">Job title</label>
                  <input
                    id="profile-job-title"
                    name="jobTitle"
                    type="text"
                    value={form.jobTitle}
                    onChange={handleChange}
                    autoComplete="organization-title"
                    maxLength={120}
                    required
                    aria-invalid={Boolean(errors.jobTitle)}
                    aria-describedby={
                      errors.jobTitle ? "profile-job-title-error" : undefined
                    }
                  />
                  {errors.jobTitle && (
                    <p
                      id="profile-job-title-error"
                      className="field-error"
                      role="alert"
                    >
                      {errors.jobTitle}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="profile-sector">Business sector</label>
                  <input
                    id="profile-sector"
                    name="sector"
                    type="text"
                    value={form.sector}
                    onChange={handleChange}
                    maxLength={100}
                    placeholder="For example, Professional Services"
                    aria-invalid={Boolean(errors.sector)}
                    aria-describedby={
                      errors.sector ? "profile-sector-error" : undefined
                    }
                  />
                  {errors.sector && (
                    <p
                      id="profile-sector-error"
                      className="field-error"
                      role="alert"
                    >
                      {errors.sector}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="profile-website">Website</label>
                  <input
                    id="profile-website"
                    name="website"
                    type="url"
                    value={form.website}
                    onChange={handleChange}
                    autoComplete="url"
                    inputMode="url"
                    maxLength={255}
                    placeholder="https://www.example.co.uk"
                    aria-invalid={Boolean(errors.website)}
                    aria-describedby={
                      errors.website
                        ? "profile-website-error"
                        : "profile-website-help"
                    }
                  />
                  {errors.website ? (
                    <p
                      id="profile-website-error"
                      className="field-error"
                      role="alert"
                    >
                      {errors.website}
                    </p>
                  ) : (
                    <p id="profile-website-help" className="form-help">
                      Include the full address beginning with https://.
                    </p>
                  )}
                </div>

                <div className="form-group form-group-full">
                  <label htmlFor="profile-bio">Professional biography</label>
                  <textarea
                    id="profile-bio"
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    rows={6}
                    maxLength={1000}
                    placeholder="Share your experience, expertise, and the connections you would like to make."
                    aria-invalid={Boolean(errors.bio)}
                    aria-describedby="profile-bio-help"
                  />
                  <div className="field-meta">
                    <p
                      id="profile-bio-help"
                      className={errors.bio ? "field-error" : "form-help"}
                    >
                      {errors.bio ??
                        "Do not include private contact or sensitive information."}
                    </p>
                    <span aria-live="polite">{form.bio.length}/1000</span>
                  </div>
                </div>
              </div>
            </div>

            {feedback && (
              <div
                className={`status-message ${feedback.type}`}
                role={feedback.type === "error" ? "alert" : "status"}
                aria-live="polite"
              >
                {feedback.message}
              </div>
            )}

            <div className="form-actions">
              <button
                className="button button-primary"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Saving changes…" : "Save profile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
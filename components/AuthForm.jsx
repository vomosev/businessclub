'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from './AuthProvider';

const INITIAL_FORM = {
  email: '',
  password: '',
  name: '',
  company: '',
  jobTitle: '',
  location: '',
};

function getErrorMessage(error) {
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  if (typeof error?.data?.error === 'string' && error.data.error.trim()) {
    return error.data.error;
  }

  return 'We could not complete your request. Please try again.';
}

export default function AuthForm({ mode }) {
  const router = useRouter();
  const { login, signup } = useAuth();
  const isSignup = mode === 'signup';

  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setFieldErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const next = { ...current };
      delete next[name];
      return next;
    });

    if (formError) {
      setFormError('');
    }
  }

  function validate() {
    const errors = {};
    const email = form.email.trim();

    if (!email) {
      errors.email = 'Enter your email address.';
    } else if (
      email.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      errors.email = 'Enter a valid email address.';
    }

    if (!form.password) {
      errors.password = 'Enter your password.';
    } else if (isSignup) {
      if (form.password.length < 8) {
        errors.password = 'Use at least 8 characters.';
      } else if (
        !/[a-z]/.test(form.password) ||
        !/[A-Z]/.test(form.password) ||
        !/\d/.test(form.password)
      ) {
        errors.password =
          'Include an uppercase letter, a lowercase letter and a number.';
      }
    }

    if (isSignup) {
      const name = form.name.trim();
      const company = form.company.trim();
      const jobTitle = form.jobTitle.trim();
      const location = form.location.trim();

      if (!name) {
        errors.name = 'Enter your full name.';
      } else if (name.length < 2 || name.length > 120) {
        errors.name = 'Your name must be between 2 and 120 characters.';
      }

      if (!company) {
        errors.company = 'Enter your company or organisation.';
      } else if (company.length > 150) {
        errors.company = 'Company must be 150 characters or fewer.';
      }

      if (!jobTitle) {
        errors.jobTitle = 'Enter your job title.';
      } else if (jobTitle.length > 120) {
        errors.jobTitle = 'Job title must be 120 characters or fewer.';
      }

      if (!location) {
        errors.location = 'Enter your UK location.';
      } else if (location.length > 120) {
        errors.location = 'Location must be 120 characters or fewer.';
      }
    }

    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const errors = validate();
    setFieldErrors(errors);
    setFormError('');

    const firstInvalidField = Object.keys(errors)[0];

    if (firstInvalidField) {
      setFormError('Please check the highlighted fields and try again.');
      requestAnimationFrame(() => {
        document.getElementById(firstInvalidField)?.focus();
      });
      return;
    }

    setSubmitting(true);

    try {
      const credentials = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      };

      if (isSignup) {
        await signup({
          ...credentials,
          name: form.name.trim(),
          company: form.company.trim(),
          jobTitle: form.jobTitle.trim(),
          location: form.location.trim(),
        });
      } else {
        await login(credentials);
      }

      router.replace('/dashboard');
      router.refresh();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-section" aria-labelledby="auth-title">
      <div className="auth-card">
        <div className="auth-heading">
          <p className="eyebrow">UK Business Club</p>
          <h1 id="auth-title">
            {isSignup ? 'Become a member' : 'Welcome back'}
          </h1>
          <p>
            {isSignup
              ? 'Create your account to connect with professionals and attend networking events across the UK.'
              : 'Sign in to access your member dashboard, directory and event registrations.'}
          </p>
        </div>

        {formError ? (
          <div className="status-message error" role="alert" aria-live="assertive">
            {formError}
          </div>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {isSignup ? (
            <>
              <div className="form-group">
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                  maxLength={120}
                  required
                  disabled={submitting}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                />
                {fieldErrors.name ? (
                  <p id="name-error" className="field-error">
                    {fieldErrors.name}
                  </p>
                ) : null}
              </div>

              <div className="form-group">
                <label htmlFor="company">Company or organisation</label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  value={form.company}
                  onChange={handleChange}
                  autoComplete="organization"
                  maxLength={150}
                  required
                  disabled={submitting}
                  aria-invalid={Boolean(fieldErrors.company)}
                  aria-describedby={
                    fieldErrors.company ? 'company-error' : undefined
                  }
                />
                {fieldErrors.company ? (
                  <p id="company-error" className="field-error">
                    {fieldErrors.company}
                  </p>
                ) : null}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="jobTitle">Job title</label>
                  <input
                    id="jobTitle"
                    name="jobTitle"
                    type="text"
                    value={form.jobTitle}
                    onChange={handleChange}
                    autoComplete="organization-title"
                    maxLength={120}
                    required
                    disabled={submitting}
                    aria-invalid={Boolean(fieldErrors.jobTitle)}
                    aria-describedby={
                      fieldErrors.jobTitle ? 'job-title-error' : undefined
                    }
                  />
                  {fieldErrors.jobTitle ? (
                    <p id="job-title-error" className="field-error">
                      {fieldErrors.jobTitle}
                    </p>
                  ) : null}
                </div>

                <div className="form-group">
                  <label htmlFor="location">UK location</label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={form.location}
                    onChange={handleChange}
                    autoComplete="address-level2"
                    maxLength={120}
                    placeholder="For example, Manchester"
                    required
                    disabled={submitting}
                    aria-invalid={Boolean(fieldErrors.location)}
                    aria-describedby={
                      fieldErrors.location ? 'location-error' : undefined
                    }
                  />
                  {fieldErrors.location ? (
                    <p id="location-error" className="field-error">
                      {fieldErrors.location}
                    </p>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="email"
              maxLength={255}
              required
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email ? (
              <p id="email-error" className="field-error">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                isSignup
                  ? `password-help${fieldErrors.password ? ' password-error' : ''}`
                  : fieldErrors.password
                    ? 'password-error'
                    : undefined
              }
            />
            {isSignup ? (
              <p id="password-help" className="field-help">
                Use at least 8 characters with uppercase, lowercase and a
                number.
              </p>
            ) : null}
            {fieldErrors.password ? (
              <p id="password-error" className="field-error">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>

          <button
            className="button button-primary button-full"
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting
              ? isSignup
                ? 'Creating your account…'
                : 'Signing you in…'
              : isSignup
                ? 'Create membership account'
                : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup ? 'Already a member? ' : 'Not yet a member? '}
          <Link href={isSignup ? '/login' : '/signup'}>
            {isSignup ? 'Sign in' : 'Join the club'}
          </Link>
        </p>
      </div>
    </section>
  );
}
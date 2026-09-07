'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { apiRequest } from '../lib/api';

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normaliseMember(member, index) {
  return {
    id: member.id ?? `member-${index}`,
    name: cleanText(member.name ?? member.fullName ?? member.full_name),
    company: cleanText(member.company ?? member.companyName ?? member.company_name),
    role: cleanText(
      member.jobTitle ??
        member.job_title ??
        member.professionalRole ??
        member.professional_role ??
        member.role
    ),
    sector: cleanText(member.sector),
    location: cleanText(member.location),
    bio: cleanText(member.bio),
    website: cleanText(member.website)
  };
}

function getSafeWebsite(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }

    return {
      href: url.toString(),
      label: url.hostname.replace(/^www\./i, '')
    };
  } catch {
    return null;
  }
}

function getInitials(name) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'BC';
}

function uniqueSortedValues(members, field) {
  return Array.from(
    new Set(members.map((member) => member[field]).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right, 'en-GB'));
}

export default function MemberDirectory() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sector, setSector] = useState('');
  const [location, setLocation] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState('');
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/members');
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    if (authLoading || !user) {
      setMembers([]);
      return undefined;
    }

    let active = true;

    async function loadMembers() {
      setLoadingMembers(true);
      setError('');

      try {
        const response = await apiRequest('/members');
        const result = Array.isArray(response) ? response : response?.members;

        if (!Array.isArray(result)) {
          throw new Error('The member directory response was not valid.');
        }

        if (active) {
          setMembers(result.map(normaliseMember));
        }
      } catch (requestError) {
        if (!active) {
          return;
        }

        if (
          requestError?.status === 401 ||
          requestError?.statusCode === 401
        ) {
          setMembers([]);
          router.replace('/login?next=/members');
          return;
        }

        setMembers([]);
        setError(
          requestError instanceof Error && requestError.message
            ? requestError.message
            : 'The member directory could not be loaded. Please try again.'
        );
      } finally {
        if (active) {
          setLoadingMembers(false);
        }
      }
    }

    loadMembers();

    return () => {
      active = false;
    };
  }, [authLoading, requestVersion, router, user]);

  const sectors = useMemo(
    () => uniqueSortedValues(members, 'sector'),
    [members]
  );

  const locations = useMemo(
    () => uniqueSortedValues(members, 'location'),
    [members]
  );

  const filteredMembers = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('en-GB');

    return members.filter((member) => {
      if (sector && member.sector !== sector) {
        return false;
      }

      if (location && member.location !== location) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        member.name,
        member.company,
        member.role,
        member.sector,
        member.location,
        member.bio,
        member.website
      ].some((value) => value.toLocaleLowerCase('en-GB').includes(query));
    });
  }, [location, members, searchTerm, sector]);

  const hasActiveFilters = Boolean(searchTerm.trim() || sector || location);

  function clearFilters() {
    setSearchTerm('');
    setSector('');
    setLocation('');
  }

  if (authLoading || (!user && !error)) {
    return (
      <section className="directory" aria-busy="true">
        <p className="status-message" role="status">
          Checking your membership session…
        </p>
      </section>
    );
  }

  return (
    <section className="directory" aria-labelledby="member-directory-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Member network</p>
          <h2 id="member-directory-title">Find fellow club members</h2>
          <p>
            Search the directory by member, business, sector, or UK location.
          </p>
        </div>
      </div>

      <form
        className="directory-controls"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="form-group directory-search">
          <label htmlFor="member-search">Search members</label>
          <input
            id="member-search"
            name="member-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Name, company, role, or keyword"
            autoComplete="off"
          />
        </div>

        <div className="form-group">
          <label htmlFor="member-sector">Sector</label>
          <select
            id="member-sector"
            name="member-sector"
            value={sector}
            onChange={(event) => setSector(event.target.value)}
          >
            <option value="">All sectors</option>
            {sectors.map((sectorName) => (
              <option key={sectorName} value={sectorName}>
                {sectorName}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="member-location">Location</label>
          <select
            id="member-location"
            name="member-location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          >
            <option value="">All locations</option>
            {locations.map((locationName) => (
              <option key={locationName} value={locationName}>
                {locationName}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            className="button button-secondary"
            type="button"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        )}
      </form>

      {loadingMembers && (
        <p className="status-message" role="status" aria-live="polite">
          Loading the member directory…
        </p>
      )}

      {!loadingMembers && error && (
        <div className="status-message error-message" role="alert">
          <p>{error}</p>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setRequestVersion((version) => version + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {!loadingMembers && !error && (
        <>
          <p className="directory-count" role="status" aria-live="polite">
            {filteredMembers.length === 1
              ? '1 member found'
              : `${filteredMembers.length} members found`}
          </p>

          {filteredMembers.length > 0 ? (
            <div className="member-grid">
              {filteredMembers.map((member, index) => {
                const headingId = `member-card-heading-${index}`;
                const website = getSafeWebsite(member.website);

                return (
                  <article
                    className="member-card"
                    key={String(member.id)}
                    aria-labelledby={headingId}
                  >
                    <header className="member-card-header">
                      <div className="member-avatar" aria-hidden="true">
                        {getInitials(member.name)}
                      </div>
                      <div>
                        <h3 id={headingId}>
                          {member.name || 'Business Club member'}
                        </h3>
                        {member.role && (
                          <p className="member-role">{member.role}</p>
                        )}
                        {member.company && (
                          <p className="member-company">{member.company}</p>
                        )}
                      </div>
                    </header>

                    {(member.sector || member.location) && (
                      <dl className="member-details">
                        {member.sector && (
                          <div>
                            <dt>Sector</dt>
                            <dd>{member.sector}</dd>
                          </div>
                        )}
                        {member.location && (
                          <div>
                            <dt>Location</dt>
                            <dd>{member.location}</dd>
                          </div>
                        )}
                      </dl>
                    )}

                    {member.bio && <p className="member-bio">{member.bio}</p>}

                    {website && (
                      <a
                        className="member-website"
                        href={website.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Visit ${member.name || member.company || 'member'} website (opens in a new tab)`}
                      >
                        {website.label}
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No members match your search</h3>
              <p>Try a broader search or remove one of the filters.</p>
              {hasActiveFilters && (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={clearFilters}
                >
                  Show all members
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
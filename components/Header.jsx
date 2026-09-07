'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';

const publicLinks = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Events' },
];

const memberLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/members', label: 'Members' },
  { href: '/events', label: 'Events' },
  { href: '/profile', label: 'Profile' },
];

export default function Header() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    setMenuOpen(false);
    setLogoutError('');
  }, [pathname]);

  const isCurrentPath = (href) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError('');

    try {
      await logout();
      setMenuOpen(false);
    } catch (error) {
      setLogoutError(error?.message || 'We could not log you out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  const memberName =
    user?.name || user?.fullName || user?.company || 'Club member';

  const links = user ? memberLinks : publicLinks;

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link
          href="/"
          className="site-brand"
          aria-label="UK Business Club home"
          onClick={() => setMenuOpen(false)}
        >
          <span className="brand-mark" aria-hidden="true">
            UK
          </span>
          <span className="brand-text">
            <strong>Business Club</strong>
            <small>Connect. Collaborate. Grow.</small>
          </span>
        </Link>

        <button
          type="button"
          className={`nav-toggle${menuOpen ? ' is-open' : ''}`}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>

        <nav
          id="primary-navigation"
          className={`main-navigation${menuOpen ? ' is-open' : ''}`}
          aria-label="Primary navigation"
        >
          <ul className="nav-links">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={isCurrentPath(link.href) ? 'active' : undefined}
                  aria-current={isCurrentPath(link.href) ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="nav-account">
            {loading ? (
              <span className="nav-loading" role="status" aria-live="polite">
                Checking membership…
              </span>
            ) : user ? (
              <>
                <Link
                  href="/profile"
                  className="member-greeting"
                  onClick={() => setMenuOpen(false)}
                  aria-label={`View profile for ${memberName}`}
                >
                  <span className="member-avatar" aria-hidden="true">
                    {memberName.trim().charAt(0).toUpperCase() || 'M'}
                  </span>
                  <span>
                    <small>Welcome back</small>
                    <strong>{memberName}</strong>
                  </span>
                </Link>

                <button
                  type="button"
                  className="button button-secondary logout-button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  {loggingOut ? 'Logging out…' : 'Log out'}
                </button>
              </>
            ) : (
              <div className="auth-links">
                <Link
                  href="/login"
                  className="button button-secondary"
                  onClick={() => setMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="button button-primary"
                  onClick={() => setMenuOpen(false)}
                >
                  Join the club
                </Link>
              </div>
            )}
          </div>

          {logoutError && (
            <p className="header-error" role="alert">
              {logoutError}
            </p>
          )}
        </nav>
      </div>
    </header>
  );
}
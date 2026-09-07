import Link from "next/link";

export const metadata = {
  title: "UK Business Club | Connect, Collaborate and Grow",
  description:
    "Join a professional UK business community, discover trusted members, build valuable connections and attend networking events across the country.",
};

const benefits = [
  {
    number: "01",
    title: "Build trusted connections",
    description:
      "Meet professionals, founders and business leaders who value meaningful introductions and long-term relationships.",
  },
  {
    number: "02",
    title: "Raise your business profile",
    description:
      "Create a member profile that showcases your expertise, organisation, sector and the opportunities you are looking for.",
  },
  {
    number: "03",
    title: "Discover new opportunities",
    description:
      "Use the member directory to find potential partners, suppliers, clients and collaborators throughout the UK.",
  },
  {
    number: "04",
    title: "Attend valuable events",
    description:
      "Register for curated networking sessions, business breakfasts, workshops and member meet-ups.",
  },
];

const eventHighlights = [
  "Professional networking in welcoming settings",
  "Events designed around useful business conversations",
  "Clear venue, date and availability information",
  "Simple online registration for club members",
];

export default function HomePage() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="container hero-grid">
          <div className="hero-content">
            <p className="eyebrow">A professional community for UK business</p>
            <h1 id="hero-heading">
              Better connections.
              <br />
              Stronger business.
            </h1>
            <p className="hero-lead">
              Join a trusted network of ambitious professionals, business owners
              and leaders. Build your profile, meet fellow members and create
              opportunities through purposeful networking.
            </p>

            <div className="hero-actions">
              <Link className="button button-primary" href="/signup">
                Become a member
              </Link>
              <Link className="button button-secondary" href="/login">
                Member login
              </Link>
            </div>

            <p className="hero-note">
              Designed for professionals and organisations across the United
              Kingdom.
            </p>
          </div>

          <div className="hero-panel" aria-label="Business Club membership">
            <div className="hero-panel-header">
              <span className="status-dot" aria-hidden="true" />
              <span>UK Business Club</span>
            </div>
            <div className="hero-panel-body">
              <p className="panel-label">Your membership opens the door to</p>
              <ul className="hero-feature-list">
                <li>
                  <span aria-hidden="true">01</span>
                  A searchable professional directory
                </li>
                <li>
                  <span aria-hidden="true">02</span>
                  Curated networking opportunities
                </li>
                <li>
                  <span aria-hidden="true">03</span>
                  Events for learning and collaboration
                </li>
                <li>
                  <span aria-hidden="true">04</span>
                  A platform for your business profile
                </li>
              </ul>
            </div>
            <div className="hero-panel-footer">
              Connect locally. Grow nationally.
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Club values">
        <div className="container trust-strip-inner">
          <p>Built for the UK business community</p>
          <ul>
            <li>Professional</li>
            <li>Collaborative</li>
            <li>Opportunity-led</li>
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="benefits-heading">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Membership with purpose</p>
              <h2 id="benefits-heading">
                Everything you need to make valuable business connections
              </h2>
            </div>
            <p>
              Business Club brings member discovery, professional profiles and
              event registration together in one focused community.
            </p>
          </div>

          <div className="card-grid benefits-grid">
            {benefits.map((benefit) => (
              <article className="feature-card" key={benefit.number}>
                <span className="feature-number" aria-hidden="true">
                  {benefit.number}
                </span>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="section section-contrast"
        aria-labelledby="network-heading"
      >
        <div className="container split-layout">
          <div className="split-content">
            <p className="eyebrow">Networking that moves business forward</p>
            <h2 id="network-heading">
              Find the right people, not simply more contacts
            </h2>
            <p>
              Explore a member directory built around useful professional
              information. Search by sector and location to discover expertise
              relevant to your organisation and goals.
            </p>
            <p>
              Whether you are seeking regional knowledge, a specialist supplier
              or a future collaborator, Business Club helps make the first
              introduction easier.
            </p>
            <Link className="text-link" href="/signup">
              Create your member profile
              <span aria-hidden="true"> →</span>
            </Link>
          </div>

          <div className="directory-preview" aria-label="Member discovery tools">
            <div className="preview-toolbar">
              <span>Member directory</span>
              <span className="preview-badge">Members only</span>
            </div>
            <div className="preview-search" aria-hidden="true">
              Search by name, company or expertise
            </div>
            <div className="preview-cards">
              <div className="preview-card">
                <span className="preview-avatar" aria-hidden="true">
                  UK
                </span>
                <div>
                  <strong>Discover expertise</strong>
                  <span>Across a range of UK sectors</span>
                </div>
              </div>
              <div className="preview-card">
                <span className="preview-avatar" aria-hidden="true">
                  GB
                </span>
                <div>
                  <strong>Connect by location</strong>
                  <span>Build local and national relationships</span>
                </div>
              </div>
              <div className="preview-card">
                <span className="preview-avatar" aria-hidden="true">
                  BC
                </span>
                <div>
                  <strong>Share your story</strong>
                  <span>Present your experience and business</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="events-heading">
        <div className="container events-feature">
          <div className="events-feature-content">
            <p className="eyebrow">Meet, learn and collaborate</p>
            <h2 id="events-heading">
              Business events created for genuine conversation
            </h2>
            <p>
              Browse upcoming club events and reserve your place as a member.
              From networking breakfasts to practical workshops, every event is
              an opportunity to exchange ideas and strengthen relationships.
            </p>

            <ul className="check-list">
              {eventHighlights.map((highlight) => (
                <li key={highlight}>
                  <span aria-hidden="true">✓</span>
                  {highlight}
                </li>
              ))}
            </ul>

            <div className="button-group">
              <Link className="button button-primary" href="/events">
                Explore club events
              </Link>
              <Link className="button button-secondary" href="/login">
                Sign in to register
              </Link>
            </div>
          </div>

          <aside className="event-callout" aria-label="Business Club events">
            <p className="event-callout-label">Connect across the UK</p>
            <h3>Make your next conversation count.</h3>
            <p>
              Meet professionals with fresh perspectives, complementary
              experience and a shared interest in responsible business growth.
            </p>
            <div className="event-callout-meta">
              <span>Networking</span>
              <span>Insights</span>
              <span>Community</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="section cta-section" aria-labelledby="cta-heading">
        <div className="container">
          <div className="cta-panel">
            <div>
              <p className="eyebrow">Your next opportunity starts here</p>
              <h2 id="cta-heading">Join the UK Business Club community</h2>
              <p>
                Create your account, introduce your business and start building
                connections with fellow professionals.
              </p>
            </div>
            <div className="cta-actions">
              <Link className="button button-primary" href="/signup">
                Join Business Club
              </Link>
              <Link className="button button-secondary" href="/login">
                Already a member? Log in
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
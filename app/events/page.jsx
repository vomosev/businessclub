import EventList from "../../components/EventList";

export const metadata = {
  title: "Networking Events | UK Business Club",
  description:
    "Discover upcoming UK Business Club networking events, meet fellow professionals, and manage your event registrations.",
};

export default function EventsPage() {
  return (
    <section className="page-section">
      <div className="container">
        <header className="page-header">
          <p className="eyebrow">Connect across the UK</p>
          <h1>Business networking events</h1>
          <p>
            Browse upcoming opportunities to exchange ideas, build trusted
            relationships, and meet fellow UK Business Club members.
            Authenticated members can register or cancel their attendance
            directly from this page.
          </p>
        </header>

        <EventList />
      </div>
    </section>
  );
}
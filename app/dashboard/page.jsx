import DashboardView from '../../components/DashboardView';

export const metadata = {
  title: 'Member Dashboard | UK Business Club',
  description:
    'Manage your UK Business Club membership, review your business profile, and view your upcoming networking events.',
};

export default function DashboardPage() {
  return (
    <section className="page-section">
      <div className="container">
        <header className="page-header">
          <p className="eyebrow">Member area</p>
          <h1>Your dashboard</h1>
          <p>
            Manage your membership, explore the business community, and keep
            track of your upcoming UK Business Club events.
          </p>
        </header>

        <DashboardView />
      </div>
    </section>
  );
}
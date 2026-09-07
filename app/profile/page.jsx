import ProfileForm from '../../components/ProfileForm';

export const metadata = {
  title: 'Manage Profile | UK Business Club',
  description:
    'Update your personal, business and membership directory details for the UK Business Club.',
};

export default function ProfilePage() {
  return (
    <section className="page-section">
      <div className="container">
        <header className="page-header">
          <p className="eyebrow">Member profile</p>
          <h1>Manage your profile</h1>
          <p>
            Keep your personal and business details current so fellow members
            can connect with you through the club directory.
          </p>
        </header>

        <ProfileForm />
      </div>
    </section>
  );
}
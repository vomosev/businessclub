import AuthForm from '../../components/AuthForm';

export const metadata = {
  title: 'Join the Club | UK Business Club',
  description:
    'Create your UK Business Club membership account and connect with professionals, businesses and networking events across the UK.',
};

export default function SignupPage() {
  return (
    <section className="auth-page" aria-labelledby="signup-heading">
      <div className="auth-container">
        <div className="auth-intro">
          <p className="eyebrow">Become a member</p>
          <h1 id="signup-heading">Join the UK Business Club</h1>
          <p>
            Create your membership profile to connect with fellow professionals,
            discover UK businesses and register for upcoming networking events.
          </p>
        </div>

        <AuthForm mode="signup" />
      </div>
    </section>
  );
}
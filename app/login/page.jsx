import AuthForm from "../../components/AuthForm";

export const metadata = {
  title: "Member Login | UK Business Club",
  description:
    "Log in to your UK Business Club account to manage your profile, discover fellow members, and register for networking events.",
};

export default function LoginPage() {
  return (
    <section className="auth-page" aria-labelledby="login-heading">
      <div className="auth-container">
        <header className="auth-header">
          <p className="eyebrow">Member access</p>
          <h1 id="login-heading">Welcome back</h1>
          <p>
            Log in to manage your membership, connect with UK professionals,
            and view your upcoming events.
          </p>
        </header>

        <AuthForm mode="login" />
      </div>
    </section>
  );
}
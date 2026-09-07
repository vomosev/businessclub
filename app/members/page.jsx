import MemberDirectory from "../../components/MemberDirectory";

export const metadata = {
  title: "Member Directory | UK Business Club",
  description:
    "Discover UK Business Club members, businesses, expertise and professional connections across the United Kingdom.",
};

export default function MembersPage() {
  return (
    <section className="page-section" aria-labelledby="member-directory-title">
      <div className="container">
        <header className="page-header">
          <p className="eyebrow">Member network</p>
          <h1 id="member-directory-title">UK Member Directory</h1>
          <p>
            Connect with fellow members, discover businesses and find
            professional expertise across the UK. Search the directory by name,
            company, sector or location to build valuable new relationships.
          </p>
        </header>

        <MemberDirectory />
      </div>
    </section>
  );
}
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-content">
        <div className="footer-brand">
          <strong>UK Business Club</strong>
          <p>
            Connecting professionals, entrepreneurs and business leaders across
            the United Kingdom.
          </p>
        </div>

        <div className="footer-details">
          <p>
            Official website:{" "}
            <a href="https://businessclub.geo-drops.com">
              businessclub.geo-drops.com
            </a>
          </p>
          <p>
            For membership, profile or event support, please contact your club
            administrator.
          </p>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>
          &copy; {currentYear} UK Business Club. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
import "./globals.css";

import AuthProvider from "../components/AuthProvider";
import Footer from "../components/Footer";
import Header from "../components/Header";

export const metadata = {
  metadataBase: new URL("https://businessclub.geo-drops.com"),
  title: {
    default: "UK Business Club",
    template: "%s | UK Business Club",
  },
  description:
    "Connect with UK professionals, grow your business network, discover fellow members and register for exclusive networking events.",
  alternates: {
    canonical: "https://businessclub.geo-drops.com",
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://businessclub.geo-drops.com",
    siteName: "UK Business Club",
    title: "UK Business Club",
    description:
      "A professional membership community for business networking, member discovery and events across the United Kingdom.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB">
      <body>
        <AuthProvider>
          <div className="site-shell">
            <Header />
            <main id="main-content" className="main-content">
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
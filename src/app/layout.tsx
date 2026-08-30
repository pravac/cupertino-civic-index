import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SiteFooter, SiteHeader } from "@/components/Chrome";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans-stack",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Care for Cupertino",
    template: "%s · Care for Cupertino",
  },
  description:
    "Meetings, agendas, elections and local news for Cupertino, California, collected in one place, sourced from the city's own public records.",
  openGraph: {
    title: "Care for Cupertino",
    description:
      "Meetings, agendas, elections and local news for Cupertino, California, in one place.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        {/* Aggregate page views only. No cookies, no cross-site identifiers,
            and nothing tying a visit to a person, which is the right default
            for a site about local government. */}
        <Analytics />
      </body>
    </html>
  );
}

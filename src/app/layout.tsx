import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteFooter, SiteHeader } from "@/components/Chrome";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans-stack",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Cupertino Civic Index",
    template: "%s · Cupertino Civic Index",
  },
  description:
    "Meetings, agendas, elections and local news for Cupertino, California — collected in one place, sourced from the city's own public records.",
  openGraph: {
    title: "Cupertino Civic Index",
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
      </body>
    </html>
  );
}

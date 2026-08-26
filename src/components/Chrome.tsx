import Link from "next/link";
import { CitySeal } from "./Emblems";
import { Container } from "./ui";

const NAV = [
  { href: "/meetings", label: "Meetings" },
  { href: "/council", label: "Council" },
  { href: "/election", label: "Election" },
  { href: "/news", label: "News" },
  { href: "/participate", label: "Participate" },
  { href: "/assistant", label: "Ask" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-ink">
            <CitySeal />
            <span>
              Cupertino <span className="text-ink-muted font-normal">Civic Index</span>
            </span>
          </Link>
          <nav aria-label="Primary">
            <ul className="flex items-center gap-1 text-sm">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="rounded-md px-2.5 py-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink sm:px-3"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Container>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-surface-2">
      <Container className="py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <p className="font-semibold text-ink">Cupertino Civic Index</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              An independent, open-source guide to local government in Cupertino, California.
              Meeting and agenda data comes directly from the city&rsquo;s own public records
              system. News headlines link to their original publishers.
            </p>
          </div>
          <div className="text-sm">
            <p className="font-medium text-ink">Official sources</p>
            <ul className="mt-2 space-y-1.5 text-ink-muted">
              <li>
                <a className="hover:text-ink hover:underline" href="https://www.cupertino.gov" target="_blank" rel="noreferrer">
                  cupertino.gov
                </a>
              </li>
              <li>
                <a className="hover:text-ink hover:underline" href="https://cupertino.legistar.com/Calendar.aspx" target="_blank" rel="noreferrer">
                  Meeting portal (Legistar)
                </a>
              </li>
              <li>
                <a className="hover:text-ink hover:underline" href="https://vote.santaclaracounty.gov/city-cupertino" target="_blank" rel="noreferrer">
                  County Registrar of Voters
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-8 border-t border-border pt-6 text-xs leading-relaxed text-ink-muted">
          Not affiliated with or endorsed by the City of Cupertino. This site is a resident-built
          reference; for official notice, records and legal deadlines, always consult the city
          directly.
        </p>
      </Container>
    </footer>
  );
}

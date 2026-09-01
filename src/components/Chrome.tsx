import Link from "next/link";
import { VisitCount } from "./VisitCount";
import { Container } from "./ui";

const NAV = [
  { href: "/meetings", label: "Meetings" },
  { href: "/council", label: "Council" },
  { href: "/election", label: "Election" },
  { href: "/news", label: "News" },
  { href: "/participate", label: "Participate" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur">
      <Container>
        {/* Two rows on a phone, one from sm up. Five links, a wordmark and a
            badge do not fit across 390px, and forcing them into one row made
            the header wider than the viewport, which dragged every page on the
            site sideways with it. */}
        <div className="flex flex-col gap-1 py-2.5 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-0">
          <div className="flex shrink-0 items-baseline gap-2 whitespace-nowrap">
            <Link href="/" className="font-semibold tracking-tight text-ink">
              <span>
                Cupertino <span className="text-ink-muted font-normal">Eye</span>
              </span>
            </Link>
            {/* Inverted rather than a fixed dark: a box that stays near-black
                in dark mode reads as a hole in the header. */}
            <span className="rounded bg-ink px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-bg">
              Beta
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-4">
            <VisitCount />
            {/* Scrolls rather than collapsing behind a menu button: five links
                stay one tap away, and nothing depends on JavaScript. */}
            <nav aria-label="Primary" className="-mx-1 min-w-0 overflow-x-auto px-1">
              <ul className="flex items-center gap-1 text-sm">
                {NAV.map((item) => (
                  <li key={item.href} className="shrink-0">
                    <Link
                      href={item.href}
                      className="block whitespace-nowrap rounded-md px-2.5 py-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink sm:px-3"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
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
            <p className="font-semibold text-ink">Cupertino Eye</p>
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

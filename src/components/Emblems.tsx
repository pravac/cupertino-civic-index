/* eslint-disable @next/next/no-img-element */
// Plain <img> rather than next/image: this is a static SVG in /public, and
// next/image would require enabling dangerouslyAllowSVG for no benefit.

/** The state flag, shown on its own. The city seal used to sit alongside it,
 *  but this is an independent site and the seal implied an official one. */
export function EmblemStrip({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/emblems/california-flag.svg"
        alt="Flag of the State of California"
        width={84}
        height={56}
        className="h-9 w-auto rounded-sm border border-border"
      />
    </div>
  );
}

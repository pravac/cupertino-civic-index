/* eslint-disable @next/next/no-img-element */
// Plain <img> rather than next/image: these are static SVGs in /public, and
// next/image would require enabling dangerouslyAllowSVG for no benefit.

/** The city seal and the state flag, shown together as a civic masthead. */
export function EmblemStrip({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-5 ${className}`}>
      <img
        src="/emblems/cupertino-seal.svg"
        alt="Seal of the City of Cupertino, California"
        width={56}
        height={56}
        className="h-14 w-auto"
      />
      <span className="h-10 w-px bg-border" aria-hidden />
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

export function CitySeal({ className = "size-7" }: { className?: string }) {
  return (
    <img
      src="/emblems/cupertino-seal.svg"
      alt=""
      width={28}
      height={28}
      className={`${className} shrink-0`}
      aria-hidden
    />
  );
}

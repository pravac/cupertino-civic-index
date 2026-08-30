import type { NextConfig } from "next";

/** Hosts the site used to answer on. They stay alive and send visitors to the
 *  current one, since links to a civic reference get pasted into newsletters
 *  and council emails that nobody goes back and edits. */
const FORMER_HOSTS = ["careforcupertino.vercel.app", "cupertino-civic.vercel.app"];

const nextConfig: NextConfig = {
  async redirects() {
    return FORMER_HOSTS.map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: `https://cupertinoeye.vercel.app/:path*`,
      permanent: true,
    }));
  },
};

export default nextConfig;

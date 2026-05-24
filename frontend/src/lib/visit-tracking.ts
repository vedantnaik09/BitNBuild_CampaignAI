export type VisitorDetails = {
  visitorId: string;
  method: string;
  path: string;
  queryString: string | null;
  referrer: string | null;
  userAgent: string | null;
  acceptLanguage: string | null;
  ipAddress: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  deviceType: string | null;
  secChUa: string | null;
  secChUaMobile: boolean | null;
  secChUaPlatform: string | null;
  metadata: Record<string, string | boolean | null>;
};

const browserPatterns = [
  { name: "Edge", pattern: /Edg\/([\d.]+)/ },
  { name: "Chrome", pattern: /Chrome\/([\d.]+)/ },
  { name: "Firefox", pattern: /Firefox\/([\d.]+)/ },
  { name: "Safari", pattern: /Version\/([\d.]+).*Safari/ },
  { name: "Opera", pattern: /OPR\/([\d.]+)/ },
];

const osPatterns = [
  { name: "Windows", pattern: /Windows NT ([\d.]+)/ },
  { name: "macOS", pattern: /Mac OS X ([\d_]+)/ },
  { name: "iOS", pattern: /iPhone OS ([\d_]+)/ },
  { name: "iPadOS", pattern: /CPU OS ([\d_]+)/ },
  { name: "Android", pattern: /Android ([\d.]+)/ },
  { name: "Linux", pattern: /Linux/ },
];

function isDebugEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.VISIT_TRACKING_DEBUG === "true";
}

export function parseUserAgent(userAgent: string | null) {
  if (!userAgent) {
    return {
      browser: null,
      browserVersion: null,
      os: null,
      osVersion: null,
      deviceType: null,
    };
  }

  const browserMatch = browserPatterns.find(({ pattern }) => pattern.test(userAgent));
  const osMatch = osPatterns.find(({ pattern }) => pattern.test(userAgent));

  const browserVersion = browserMatch?.pattern.exec(userAgent)?.[1] ?? null;
  const osVersion = osMatch?.pattern.exec(userAgent)?.[1]?.replaceAll("_", ".") ?? null;

  return {
    browser: browserMatch?.name ?? null,
    browserVersion,
    os: osMatch?.name ?? null,
    osVersion,
    deviceType: /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent) ? "mobile" : "desktop",
  };
}

export function buildVisitorDetails(input: {
  visitorId: string;
  method: string;
  path: string;
  queryString: string | null;
  referrer: string | null;
  userAgent: string | null;
  acceptLanguage: string | null;
  ipAddress: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  secChUa: string | null;
  secChUaMobile: boolean | null;
  secChUaPlatform: string | null;
}) {
  const parsedUserAgent = parseUserAgent(input.userAgent);

  const details = {
    visitorId: input.visitorId,
    method: input.method,
    path: input.path,
    queryString: input.queryString,
    referrer: input.referrer,
    userAgent: input.userAgent,
    acceptLanguage: input.acceptLanguage,
    ipAddress: input.ipAddress,
    country: input.country,
    region: input.region,
    city: input.city,
    timezone: input.timezone,
    browser: parsedUserAgent.browser,
    browserVersion: parsedUserAgent.browserVersion,
    os: parsedUserAgent.os,
    osVersion: parsedUserAgent.osVersion,
    deviceType: parsedUserAgent.deviceType,
    secChUa: input.secChUa,
    secChUaMobile: input.secChUaMobile,
    secChUaPlatform: input.secChUaPlatform,
    metadata: {
      pathname: input.path,
      queryString: input.queryString,
      referrer: input.referrer,
      ipAddress: input.ipAddress,
      country: input.country,
      region: input.region,
      city: input.city,
      timezone: input.timezone,
      acceptLanguage: input.acceptLanguage,
      secChUa: input.secChUa,
      secChUaMobile: input.secChUaMobile,
      secChUaPlatform: input.secChUaPlatform,
    },
  } satisfies VisitorDetails;

  if (isDebugEnabled()) {
    console.error("[visit-tracking] buildVisitorDetails payload", details);
  }

  return details;
}

export function getVisitorIdCookieName() {
  return "hs_visitor_id";
}

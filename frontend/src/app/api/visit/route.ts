import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import type { VisitorDetails } from "@/lib/visit-tracking";

const VISIT_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS website_visits (
    id BIGSERIAL PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    query_string TEXT,
    referrer TEXT,
    user_agent TEXT,
    accept_language TEXT,
    ip_address TEXT,
    country TEXT,
    region TEXT,
    city TEXT,
    timezone TEXT,
    browser TEXT,
    browser_version TEXT,
    os TEXT,
    os_version TEXT,
    device_type TEXT,
    sec_ch_ua TEXT,
    sec_ch_ua_mobile BOOLEAN,
    sec_ch_ua_platform TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB
  )
`;

const VISIT_INDEX_SQLS = [
  `CREATE INDEX IF NOT EXISTS website_visits_visited_at_idx ON website_visits (visited_at DESC)`,
  `CREATE INDEX IF NOT EXISTS website_visits_visitor_id_idx ON website_visits (visitor_id)`,
];

const databaseUrl = process.env.VISITOR_TRACKING_DATABASE_URL ?? process.env.DATABASE_URL;

let schemaReady: Promise<void> | null = null;

function isDebugEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.VISIT_TRACKING_DEBUG === "true";
}

function getSqlClient() {
  if (!databaseUrl) {
    return null;
  }

  return neon(databaseUrl);
}

async function ensureSchema() {
  if (!schemaReady) {
    const sql = getSqlClient();

    if (!sql) {
      throw new Error("VISITOR_TRACKING_DATABASE_URL is not configured");
    }

    schemaReady = (async () => {
      await sql(VISIT_TABLE_SQL);
      for (const indexSql of VISIT_INDEX_SQLS) {
        await sql(indexSql);
      }
    })();
  }

  return schemaReady;
}

export async function POST(request: Request) {
  const sql = getSqlClient();

  if (isDebugEnabled()) {
    console.error("[visit-tracking] api request", {
      method: request.method,
      url: request.url,
    });
  }

  if (!sql) {
    return NextResponse.json({ error: "Tracking database is not configured." }, { status: 503 });
  }

  let payload: VisitorDetails;

  try {
    payload = (await request.json()) as VisitorDetails;
  } catch {
    return NextResponse.json({ error: "Invalid visit payload." }, { status: 400 });
  }

  if (!payload.visitorId || !payload.method || !payload.path) {
    return NextResponse.json({ error: "Missing required visit data." }, { status: 400 });
  }

  try {
    await ensureSchema();

    await sql`
      INSERT INTO website_visits (
        visitor_id,
        method,
        path,
        query_string,
        referrer,
        user_agent,
        accept_language,
        ip_address,
        country,
        region,
        city,
        timezone,
        browser,
        browser_version,
        os,
        os_version,
        device_type,
        sec_ch_ua,
        sec_ch_ua_mobile,
        sec_ch_ua_platform,
        metadata
      ) VALUES (
        ${payload.visitorId},
        ${payload.method},
        ${payload.path},
        ${payload.queryString},
        ${payload.referrer},
        ${payload.userAgent},
        ${payload.acceptLanguage},
        ${payload.ipAddress},
        ${payload.country},
        ${payload.region},
        ${payload.city},
        ${payload.timezone},
        ${payload.browser},
        ${payload.browserVersion},
        ${payload.os},
        ${payload.osVersion},
        ${payload.deviceType},
        ${payload.secChUa},
        ${payload.secChUaMobile},
        ${payload.secChUaPlatform},
        ${JSON.stringify(payload.metadata)}::jsonb
      )
    `;

    if (isDebugEnabled()) {
      console.error("[visit-tracking] stored visit", {
        visitorId: payload.visitorId,
        path: payload.path,
        method: payload.method,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to store visit event", error);
    return NextResponse.json({ error: "Failed to store visit event." }, { status: 500 });
  }
}

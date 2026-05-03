export const runtime = "nodejs";

import {
  APIResponseError,
  Client,
  extractDatabaseId,
} from "@notionhq/client";
import { NextRequest, NextResponse } from "next/server";

function sanitizeEnvDatabaseId(raw: string | undefined): string | null {
  if (!raw) return null;

  const trimmed = raw.trim().replace(/^["']|["']$/g, "").trim();
  const fromUrlOrUuid = extractDatabaseId(trimmed);

  if (fromUrlOrUuid) return fromUrlOrUuid;

  const compact = trimmed.replace(/-/g, "").replace(/\s/g, "");

  if (/^[a-f0-9]{32}$/i.test(compact)) {
    return extractDatabaseId(compact);
  }

  return null;
}

function sanitizeIntegrationToken(raw: string | undefined): string | null {
  if (!raw) return null;
  const token = raw.trim().replace(/^["']|["']$/g, "").trim();
  return token || null;
}

async function resolveDataSourceId(
  notion: Client,
  rawId: string
): Promise<string> {
  try {
    await notion.dataSources.query({
      data_source_id: rawId,
      page_size: 1,
    });

    return rawId;
  } catch (error) {
    if (
      !APIResponseError.isAPIResponseError(error) ||
      !["object_not_found", "validation_error", "invalid_request_url"].includes(
        error.code
      )
    ) {
      throw error;
    }
  }

  const db = await notion.databases.retrieve({
    database_id: rawId,
  });

  const dsList = (db as { data_sources?: Array<{ id: string }> }).data_sources;
  const firstDataSourceId = dsList?.[0]?.id;

  if (!firstDataSourceId) {
    throw new Error("연결된 data_source를 찾을 수 없습니다.");
  }

  return firstDataSourceId;
}

export async function POST(req: NextRequest) {
  const notionToken = sanitizeIntegrationToken(process.env.NOTION_TOKEN);
  const databaseId = sanitizeEnvDatabaseId(process.env.NOTION_DATABASE_ID);

  if (!notionToken || !databaseId) {
    return NextResponse.json(
      { error: "NOTION_TOKEN 또는 NOTION_DATABASE_ID 오류" },
      { status: 500 }
    );
  }

  const notion = new Client({ auth: notionToken });

  try {
    const { title, author, cover } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "제목 없음" }, { status: 400 });
    }

    const resolvedDataSourceId = await resolveDataSourceId(notion, databaseId);

    const created = await notion.pages.create({
      parent: {
        data_source_id: resolvedDataSourceId,
      },
      properties: {
        제목: {
          title: [
            {
              type: "text",
              text: {
                content: title,
              },
            },
          ],
        },
        author: {
          rich_text: [
            {
              type: "text",
              text: {
                content: author || "",
              },
            },
          ],
        },
        cover: {
          files: cover
            ? [
                {
                  name: "cover",
                  type: "external",
                  external: {
                    url: cover,
                  },
                },
              ]
            : [],
        },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        id: created.id,
        url: (created as { url?: string }).url ?? null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("RIDI SAVE ERROR:", error);

    if (APIResponseError.isAPIResponseError(error)) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          status: error.status,
        },
        { status: 500 }
      );
    }

    const message =
      error instanceof Error ? error.message : "저장 실패";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
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

async function resolveDataSourceId(notion: Client, rawId: string): Promise<string> {
  try {
    await notion.dataSources.query({
      data_source_id: rawId,
      page_size: 1,
    });

    return rawId;
  } catch (error) {
    if (
      !APIResponseError.isAPIResponseError(error) ||
      !["object_not_found", "validation_error", "invalid_request_url"].includes(error.code)
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

async function uploadExternalImageToNotion(token: string, imageUrl: string, filename: string) {
  const createRes = await fetch("https://api.notion.com/v1/file_uploads", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2026-03-11",
    },
    body: JSON.stringify({
      mode: "external_url",
      external_url: imageUrl,
      filename,
    }),
  });

  const fileUpload = await createRes.json();

  if (!createRes.ok) {
    throw new Error(fileUpload.message || "Notion 파일 업로드 생성 실패");
  }

  for (let i = 0; i < 10; i++) {
    const checkRes = await fetch(`https://api.notion.com/v1/file_uploads/${fileUpload.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2026-03-11",
      },
    });

    const checked = await checkRes.json();

    if (!checkRes.ok) {
      throw new Error(checked.message || "Notion 파일 업로드 확인 실패");
    }

    if (checked.status === "uploaded") {
      return checked.id;
    }

    if (checked.status === "failed" || checked.status === "expired") {
      throw new Error("Notion 파일 업로드 실패");
    }

    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  throw new Error("Notion 파일 업로드 대기 시간 초과");
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

    let coverFiles: any[] = [];

    if (cover) {
      const safeTitle = String(title).replace(/[\\/:*?"<>|]/g, "").slice(0, 50);
      const fileUploadId = await uploadExternalImageToNotion(
        notionToken,
        cover,
        `${safeTitle || "cover"}.jpg`
      );

      coverFiles = [
        {
          name: `${safeTitle || "cover"}.jpg`,
          type: "file_upload",
          file_upload: {
            id: fileUploadId,
          },
        },
      ];
    }

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
          files: coverFiles,
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

    const message = error instanceof Error ? error.message : "저장 실패";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { title, author, cover, url } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "title 없음" }, { status: 400 });
    }

    const databaseId = process.env.NOTION_LIBRARY_DATABASE_ID;

    if (!databaseId) {
      return NextResponse.json(
        { error: "NOTION_LIBRARY_DATABASE_ID 없음" },
        { status: 500 }
      );
    }

    await notion.pages.create({
      parent: {
        database_id: databaseId,
      },
      cover: cover
        ? {
            type: "external",
            external: {
              url: cover,
            },
          }
        : undefined,
      properties: {
        제목: {
          title: [
            {
              text: {
                content: title,
              },
            },
          ],
        },
        author: {
          rich_text: [
            {
              text: {
                content: author || "",
              },
            },
          ],
        },
        cover: {
          url: cover || null,
        },
        RIDI: {
          url: url || null,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}
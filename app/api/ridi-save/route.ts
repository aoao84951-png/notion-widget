export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

export async function POST(req: NextRequest) {
  try {
    const { title, author, cover } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "제목 없음" }, { status: 400 });
    }

    await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_DATABASE_ID!,
      },
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

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("RIDI SAVE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          error?.body ||
          "저장 실패",
      },
      { status: 500 }
    );
  }
}
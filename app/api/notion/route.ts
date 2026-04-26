import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

type NotionProperty = {
  type?: string;
  rich_text?: Array<{ plain_text?: string }>;
  title?: Array<{ plain_text?: string }>;
  files?: Array<{
    type?: 'file' | 'external';
    file?: { url?: string };
    external?: { url?: string };
  }>;
};

function readText(nodes?: Array<{ plain_text?: string }>) {
  if (!Array.isArray(nodes)) return '';
  return nodes.map((node) => node?.plain_text ?? '').join('').trim();
}

function getTitle(properties: Record<string, NotionProperty>) {
  const titleProp = properties['제목'];
  let title = '';

  console.log('노션에서 온 제목 데이터:', JSON.stringify(titleProp, null, 2));

  if (titleProp && titleProp.rich_text && titleProp.rich_text.length > 0) {
    title = titleProp.rich_text[0]?.plain_text?.trim() ?? '';
  } else if (titleProp && titleProp.title && titleProp.title.length > 0) {
    title = titleProp.title[0]?.plain_text?.trim() ?? '';
  } else {
    title = '제목 없음(데이터 확인 필요)';
  }

  return title;
}

function getAuthor(properties: Record<string, NotionProperty>) {
  const authorProp = properties['author'];
  if (authorProp?.type === 'rich_text') {
    const author = readText(authorProp.rich_text);
    return author || null;
  }
  return null;
}

function getCoverImage(properties: Record<string, NotionProperty>) {
  const coverProp = properties['cover'];
  if (coverProp?.type !== 'files' || !Array.isArray(coverProp.files) || coverProp.files.length === 0) {
    return null;
  }

  const firstFile = coverProp.files[0];
  if (firstFile?.type === 'file') return firstFile.file?.url ?? null;
  if (firstFile?.type === 'external') return firstFile.external?.url ?? null;
  return null;
}

export async function GET() {
  const databaseId = process.env.NOTION_DATABASE_ID;
  const notionToken = process.env.NOTION_TOKEN;

  if (!notionToken || !databaseId) {
    return NextResponse.json(
      {
        error: 'NOTION_TOKEN 또는 NOTION_DATABASE_ID 환경 변수가 설정되지 않았습니다.',
      },
      { status: 500 }
    );
  }

  try {
    const response = await notion.dataSources.query({
      data_source_id: databaseId,
      filter: {
        property: '상태',
        status: {
          equals: '읽는 중',
        },
      },
    });

    const items = response.results.map((page: any) => {
      const properties = page.properties ?? {};
      const title = getTitle(properties);

      return {
        title,
        author: getAuthor(properties),
        coverImage: getCoverImage(properties),
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Notion 조회 중 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

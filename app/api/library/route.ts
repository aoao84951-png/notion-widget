import {
  Client,
  APIResponseError,
  extractDatabaseId,
  DEFAULT_BASE_URL,
} from '@notionhq/client';
import { NextResponse } from 'next/server';

const NOTION_API_V1 = `${DEFAULT_BASE_URL}/v1`;

/** 공백·따옴표·전체 URL·하이픈 형식 혼입 대비: 32자리 UUID만 추출 */
function sanitizeEnvDatabaseId(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^["']|["']$/g, '').trim();
  const fromUrlOrUuid = extractDatabaseId(trimmed);
  if (fromUrlOrUuid) return fromUrlOrUuid;
  const compact = trimmed.replace(/-/g, '').replace(/\s/g, '');
  if (/^[a-f0-9]{32}$/i.test(compact)) {
    return extractDatabaseId(compact);
  }
  return null;
}

function sanitizeIntegrationToken(raw: string | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim().replace(/^["']|["']$/g, '').trim();
  return t || null;
}

function logIdPeek(label: string, id: string) {
  if (id.length < 8) {
    console.log(`[api/library] ${label} (peek): <too short>`);
    return;
  }
  console.log(`[api/library] ${label} (peek): ${id.slice(0, 4)}…${id.slice(-4)}`);
}

function logOutgoingQueryUrl(idForPath: string, pageLabel: string) {
  const peek = `${idForPath.slice(0, 4)}…${idForPath.slice(-4)}`;
  console.log(
    `[api/library] ${pageLabel} POST ${NOTION_API_V1}/data_sources/${peek}/query`
  );
}

type NotionProperty = {
  type?: string;
  rich_text?: Array<{ plain_text?: string }>;
  title?: Array<{ plain_text?: string }>;
  files?: Array<{
    type?: 'file' | 'external';
    file?: { url?: string };
    external?: { url?: string };
  }>;
  status?: { name?: string } | null;
  select?: { name?: string } | null;
};

type QueryPageResult = {
  object?: string;
  properties?: Record<string, NotionProperty>;
  cover?: { type?: string; external?: { url?: string }; file?: { url?: string } } | null;
};

function readText(nodes?: Array<{ plain_text?: string }>) {
  if (!Array.isArray(nodes)) return '';
  return nodes.map((node) => node?.plain_text ?? '').join('').trim();
}

function getTitle(properties: Record<string, NotionProperty>) {
  const titleProp = properties['제목'];
  if (titleProp?.rich_text && titleProp.rich_text.length > 0) {
    return titleProp.rich_text[0]?.plain_text?.trim() ?? '';
  }
  if (titleProp?.title && titleProp.title.length > 0) {
    return titleProp.title[0]?.plain_text?.trim() ?? '';
  }
  return '제목 없음(데이터 확인 필요)';
}

function getAuthor(properties: Record<string, NotionProperty>) {
  const authorProp = properties['author'];
  if (authorProp?.type === 'rich_text') {
    const author = readText(authorProp.rich_text);
    return author || null;
  }
  return null;
}

function getCoverFromProperty(properties: Record<string, NotionProperty>) {
  const coverProp = properties['cover'];
  if (coverProp?.type !== 'files' || !Array.isArray(coverProp.files) || coverProp.files.length === 0) {
    return null;
  }
  const firstFile = coverProp.files[0];
  if (firstFile?.type === 'file') return firstFile.file?.url ?? null;
  if (firstFile?.type === 'external') return firstFile.external?.url ?? null;
  return null;
}

function getPageCoverUrl(page: QueryPageResult) {
  const c = page.cover;
  if (!c) return null;
  if (c.type === 'external' && c.external?.url) return c.external.url;
  if (c.type === 'file' && c.file?.url) return c.file.url;
  return null;
}

function getCoverImage(page: QueryPageResult, properties: Record<string, NotionProperty>) {
  return getCoverFromProperty(properties) ?? getPageCoverUrl(page);
}

function getStatusName(properties: Record<string, NotionProperty>) {
  const statusProp = properties['상태'];
  if (!statusProp) return null;
  if (statusProp.type === 'status' && statusProp.status?.name) {
    return statusProp.status.name;
  }
  if (statusProp.type === 'select' && statusProp.select?.name) {
    return statusProp.select.name;
  }
  return null;
}

async function queryPagesWithDataSource(notion: Client, dataSourceId: string): Promise<QueryPageResult[]> {
  const pages: QueryPageResult[] = [];
  let cursor: string | undefined;

  const queryOptions: any = {
    data_source_id: dataSourceId,
    sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
    page_size: 100,
  };

  for (let page = 0; ; page += 1) {
    logOutgoingQueryUrl(dataSourceId, page === 0 ? '요청 직전' : `페이지네이션 #${page + 1}`);

    const body: any = { ...queryOptions };
    if (cursor) body.start_cursor = cursor;

    const response = await notion.dataSources.query(body);

    for (const row of response.results) {
      if ((row as QueryPageResult).object === 'page') {
        pages.push(row as QueryPageResult);
      }
    }

    if (!response.has_more || !response.next_cursor) break;
    cursor = response.next_cursor;
  }

  return pages;
}

async function queryAllPages(notion: Client, sanitizedId: string): Promise<QueryPageResult[]> {
  const shouldRetryWithDatabase = (e: unknown) =>
    APIResponseError.isAPIResponseError(e) &&
    ['object_not_found', 'validation_error', 'invalid_request_url'].includes(e.code);

  try {
    return await queryPagesWithDataSource(notion, sanitizedId);
  } catch (firstError) {
    if (!shouldRetryWithDatabase(firstError)) throw firstError;

    console.warn(
      '[api/library] data_sources.query 실패 → databases.retrieve로 컨테이너 ID인지 확인 후 첫 data_source로 재시도:',
      firstError instanceof Error ? firstError.message : firstError
    );

    const db = await notion.databases.retrieve({ database_id: sanitizedId });
    const dsList = (db as { data_sources?: Array<{ id: string }> }).data_sources;
    const dataSourceId = dsList?.[0]?.id;
    if (!dataSourceId) {
      throw firstError;
    }

    logIdPeek('첫 번째 data_source_id', dataSourceId);
    return await queryPagesWithDataSource(notion, dataSourceId);
  }
}

export async function GET() {
  const notionToken = sanitizeIntegrationToken(process.env.NOTION_TOKEN);
  const sanitizedDatabaseId = sanitizeEnvDatabaseId(process.env.NOTION_DATABASE_ID);

  if (!notionToken || !sanitizedDatabaseId) {
    return NextResponse.json(
      {
        error:
          'NOTION_TOKEN 또는 NOTION_DATABASE_ID가 없거나, DATABASE_ID를 UUID로 파싱할 수 없습니다. (.env.local: NOTION_TOKEN, NOTION_DATABASE_ID)',
      },
      { status: 500 }
    );
  }

  const notion = new Client({ auth: notionToken });

  try {
    logIdPeek('요청 직전 ID', sanitizedDatabaseId);

    const results = await queryAllPages(notion, sanitizedDatabaseId);

    const items = results.map((page) => {
      const properties = page.properties ?? {};
      return {
        title: getTitle(properties),
        author: getAuthor(properties),
        coverImage: getCoverImage(page, properties),
        status: getStatusName(properties),
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    if (APIResponseError.isAPIResponseError(error)) {
      console.error('[api/library] Notion API error:', {
        code: error.code,
        status: error.status,
        message: error.message,
        request_id: error.request_id,
      });
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          status: error.status,
        },
        { status: 500 }
      );
    }

    const message = error instanceof Error ? error.message : 'Notion 조회 중 오류가 발생했습니다.';
    console.error('[api/library] Unexpected error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

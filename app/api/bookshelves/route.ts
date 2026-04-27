import {
    APIResponseError,
    Client,
    DEFAULT_BASE_URL,
    extractDatabaseId,
  } from '@notionhq/client';
  import { NextResponse } from 'next/server';
  
  const NOTION_API_V1 = `${DEFAULT_BASE_URL}/v1`;
  
  type TextNode = { plain_text?: string };
  
  type NotionProperty = {
    type?: string;
    title?: TextNode[];
    rich_text?: TextNode[];
    files?: Array<{
      type?: 'file' | 'external';
      file?: { url?: string };
      external?: { url?: string };
    }>;
    status?: { name?: string } | null;
    select?: { name?: string } | null;
    multi_select?: Array<{ name?: string }>;
    relation?: Array<{ id: string }>;
    formula?: {
      type?: 'number' | 'string' | 'boolean' | 'date';
      number?: number | null;
      string?: string | null;
    };
  };
  
  type QueryPageResult = {
    object?: string;
    properties?: Record<string, NotionProperty>;
  };
  
  type RelationItem = {
    id: string;
    title: string | null;
  };
  
  const CATEGORY_MAP: Record<string, string> = {
    BL: 'BL',
    비엘: 'BL',
  
    ROMANCE: '로맨스',
    로맨스: '로맨스',
  
    'RO-FAN': '로맨스판타지',
    ROFAN: '로맨스판타지',
    로판: '로맨스판타지',
    로맨스판타지: '로맨스판타지',
  
    LITERATURE: '일반서적',
    일반: '일반서적',
    일반서적: '일반서적',
  };
  
  function normalizeCategoryName(name: string | null | undefined) {
    if (!name) return null;
  
    const raw = name.trim();
    const compact = raw.replace(/\s+/g, '').replace(/_/g, '-').toUpperCase();
  
    return CATEGORY_MAP[compact] ?? CATEGORY_MAP[raw] ?? raw;
  }
  
  function sanitizeEnvDatabaseId(raw: string | undefined): string | null {
    if (!raw) return null;
    const trimmed = raw.trim().replace(/^["']|["']$/g, '').trim();
    const fromUrlOrUuid = extractDatabaseId(trimmed);
    if (fromUrlOrUuid) return fromUrlOrUuid;
    const compact = trimmed.replace(/-/g, '').replace(/\s/g, '');
    if (/^[a-f0-9]{32}$/i.test(compact)) return extractDatabaseId(compact);
    return null;
  }
  
  function sanitizeIntegrationToken(raw: string | undefined): string | null {
    if (!raw) return null;
    const token = raw.trim().replace(/^["']|["']$/g, '').trim();
    return token || null;
  }
  
  function logOutgoingQueryUrl(dataSourceId: string) {
    const peek = `${dataSourceId.slice(0, 4)}…${dataSourceId.slice(-4)}`;
    console.log(`[api/bookshelves] POST ${NOTION_API_V1}/data_sources/${peek}/query`);
  }
  
  function readText(nodes?: TextNode[]) {
    if (!Array.isArray(nodes)) return '';
    return nodes.map((node) => node?.plain_text ?? '').join('').trim();
  }
  
  function readTitleFromProperties(properties: Record<string, NotionProperty>) {
    const titleProp = properties['제목'];
  
    if (titleProp?.type === 'title') return readText(titleProp.title) || null;
    if (titleProp?.type === 'rich_text') return readText(titleProp.rich_text) || null;
  
    return null;
  }
  
  function getCoverUrl(properties: Record<string, NotionProperty>) {
    const coverProp = properties['cover'];
  
    if (
      coverProp?.type !== 'files' ||
      !Array.isArray(coverProp.files) ||
      coverProp.files.length === 0
    ) {
      return null;
    }
  
    const first = coverProp.files[0];
  
    if (first?.type === 'file') return first.file?.url ?? null;
    if (first?.type === 'external') return first.external?.url ?? null;
  
    return null;
  }
  
  function getAuthor(properties: Record<string, NotionProperty>) {
    const authorProp = properties['author'];
    if (authorProp?.type !== 'rich_text') return null;
  
    const author = readText(authorProp.rich_text);
    return author || null;
  }
  
  function getStatusName(properties: Record<string, NotionProperty>) {
    const statusProp = properties['상태'];
    if (statusProp?.type !== 'status') return null;
  
    return statusProp.status?.name ?? null;
  }
  
  function clampProgress(value: number) {
    if (Number.isNaN(value)) return null;
    if (value < 0) return 0;
    if (value > 100) return 100;
    return Math.round(value);
  }
  
  function parseProgressFormula(properties: Record<string, NotionProperty>) {
    const progressProp = properties['진행상태'];
  
    if (progressProp?.type !== 'formula' || !progressProp.formula) return null;
  
    const formula = progressProp.formula;
  
    if (formula.type === 'number' && typeof formula.number === 'number') {
      return clampProgress(formula.number);
    }
  
    if (formula.type === 'string' && typeof formula.string === 'string') {
      const matched = formula.string.trim().match(/-?\d+(\.\d+)?/);
      if (!matched) return null;
  
      return clampProgress(Number(matched[0]));
    }
  
    return null;
  }
  
  function getCategoryIds(properties: Record<string, NotionProperty>) {
    const categoryProp = properties['카테고리'];
  
    if (categoryProp?.type !== 'relation' || !Array.isArray(categoryProp.relation)) {
      return [];
    }
  
    return categoryProp.relation.map((item) => item.id).filter(Boolean);
  }
  
  function getDirectCategoryNames(properties: Record<string, NotionProperty>) {
    const categoryProp = properties['카테고리'];
  
    if (categoryProp?.type === 'select') {
      return categoryProp.select?.name ? [categoryProp.select.name] : [];
    }
  
    if (categoryProp?.type === 'multi_select') {
      return (categoryProp.multi_select ?? [])
        .map((item) => item.name)
        .filter(Boolean) as string[];
    }
  
    if (categoryProp?.type === 'status') {
      return categoryProp.status?.name ? [categoryProp.status.name] : [];
    }
  
    if (categoryProp?.type === 'rich_text') {
      const text = readText(categoryProp.rich_text);
      return text ? [text] : [];
    }
  
    if (categoryProp?.type === 'title') {
      const text = readText(categoryProp.title);
      return text ? [text] : [];
    }
  
    return [];
  }
  
  function extractPageTitleFromRetrievedPage(page: unknown): string | null {
    const p = page as { properties?: Record<string, NotionProperty> };
    const props = p.properties ?? {};
  
    for (const key of Object.keys(props)) {
      const property = props[key];
  
      if (property?.type === 'title') {
        const title = readText(property.title);
        if (title) return title;
      }
    }
  
    return null;
  }
  
  async function resolveCategoryRelations(
    notion: Client,
    relationIds: string[]
  ): Promise<RelationItem[]> {
    return Promise.all(
      relationIds.map(async (id) => {
        try {
          const page = await notion.pages.retrieve({ page_id: id });
  
          return {
            id,
            title: extractPageTitleFromRetrievedPage(page),
          };
        } catch {
          return { id, title: null };
        }
      })
    );
  }
  
  async function queryAllPages(notion: Client, dataSourceId: string): Promise<QueryPageResult[]> {
    const rows: QueryPageResult[] = [];
    let cursor: string | undefined;
  
    for (;;) {
      logOutgoingQueryUrl(dataSourceId);
  
      const response = await notion.dataSources.query({
        data_source_id: dataSourceId,
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      });
  
      for (const row of response.results) {
        if ((row as QueryPageResult).object === 'page') {
          rows.push(row as QueryPageResult);
        }
      }
  
      if (!response.has_more || !response.next_cursor) break;
      cursor = response.next_cursor;
    }
  
    return rows;
  }
  
  async function resolveDataSourceId(notion: Client, rawId: string): Promise<string> {
    try {
      await notion.dataSources.query({ data_source_id: rawId, page_size: 1 });
      return rawId;
    } catch (error) {
      if (
        !APIResponseError.isAPIResponseError(error) ||
        !['object_not_found', 'validation_error', 'invalid_request_url'].includes(error.code)
      ) {
        throw error;
      }
    }
  
    const db = await notion.databases.retrieve({ database_id: rawId });
    const dsList = (db as { data_sources?: Array<{ id: string }> }).data_sources;
    const firstDataSourceId = dsList?.[0]?.id;
  
    if (!firstDataSourceId) {
      throw new Error('연결된 data_source를 찾을 수 없습니다.');
    }
  
    return firstDataSourceId;
  }
  
  export async function GET() {
    const notionToken = sanitizeIntegrationToken(process.env.NOTION_TOKEN);
    const dataSourceId = sanitizeEnvDatabaseId(process.env.NOTION_DATABASE_ID);
  
    if (!notionToken || !dataSourceId) {
      return NextResponse.json(
        { error: 'NOTION_TOKEN 또는 NOTION_DATABASE_ID가 없거나 올바르지 않습니다.' },
        { status: 500 }
      );
    }
  
    const notion = new Client({ auth: notionToken });
  
    try {
      const resolvedDataSourceId = await resolveDataSourceId(notion, dataSourceId);
      const pages = await queryAllPages(notion, resolvedDataSourceId);
  
      const items = await Promise.all(
        pages.map(async (page) => {
          const properties = page.properties ?? {};
  
          const categoryIds = getCategoryIds(properties);
          const relationCategories = await resolveCategoryRelations(notion, categoryIds);
  
          const directCategories = getDirectCategoryNames(properties).map((title, index) => ({
            id: `direct-${index}-${title}`,
            title,
          }));
  
          const category = [...relationCategories, ...directCategories];
  
          const categoryNames = category
            .map((item) => normalizeCategoryName(item.title))
            .filter(Boolean) as string[];
  
          return {
            title: readTitleFromProperties(properties),
            cover: getCoverUrl(properties),
            author: getAuthor(properties),
            status: getStatusName(properties),
            category,
            categoryNames,
            progress: parseProgressFormula(properties),
          };
        })
      );
  
      return NextResponse.json({ items });
    } catch (error) {
      if (APIResponseError.isAPIResponseError(error)) {
        return NextResponse.json(
          { error: error.message, code: error.code, status: error.status },
          { status: 500 }
        );
      }
  
      const message =
        error instanceof Error ? error.message : '도서 데이터 조회 중 오류가 발생했습니다.';
  
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
  
  export async function POST() {
    const notionToken = sanitizeIntegrationToken(process.env.NOTION_TOKEN);
    const dataSourceId = sanitizeEnvDatabaseId(process.env.NOTION_DATABASE_ID);
  
    if (!notionToken || !dataSourceId) {
      return NextResponse.json(
        { error: 'NOTION_TOKEN 또는 NOTION_DATABASE_ID가 없거나 올바르지 않습니다.' },
        { status: 500 }
      );
    }
  
    const notion = new Client({ auth: notionToken });
  
    try {
      const resolvedDataSourceId = await resolveDataSourceId(notion, dataSourceId);
  
      const created = await notion.pages.create({
        parent: { data_source_id: resolvedDataSourceId },
        properties: {
          제목: {
            title: [{ type: 'text', text: { content: '새로운 도서 기록' } }],
          },
          상태: {
            status: { name: '책바구니' },
          },
        },
      });
  
      return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
    } catch (error) {
      if (APIResponseError.isAPIResponseError(error)) {
        return NextResponse.json(
          { error: error.message, code: error.code, status: error.status },
          { status: 500 }
        );
      }
  
      const message =
        error instanceof Error ? error.message : '새 도서 페이지 생성 중 오류가 발생했습니다.';
  
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
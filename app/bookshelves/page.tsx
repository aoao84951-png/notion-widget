'use client';

import { useEffect, useMemo, useState } from 'react';

type CategoryItem = {
  id: string;
  title: string | null;
};

type BookItem = {
  id?: string;
  url?: string | null;
  title: string | null;
  cover: string | null;
  author: string | null;
  status: string | null;
  category: CategoryItem[];
  categoryRelationIds?: string[];
  categoryRawTexts?: string[];
  categoryKeys?: string[];
  categoryLabels?: string[];
  primaryCategoryKey?: string | null;
  primaryCategoryLabel?: string | null;
  ratingText?: string | null;
  rating?: number | null;
};

const CATEGORY_TABS = [
  { label: '전체', key: 'ALL' },
  { label: 'BL', key: 'BL' },
  { label: '로맨스', key: 'ROMANCE' },
  { label: '로맨스판타지', key: 'RO-FAN' },
  { label: '일반서적', key: 'LITERATURE' },
] as const;

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  책바구니: { label: '읽고 싶어요', color: '#9CA3AF', bg: '#F3F4F6' },
  '읽기 전': { label: '읽기 전', color: '#22C55E', bg: '#ECFDF3' },
  '읽는 중': { label: '읽는 중', color: '#F5A623', bg: '#FFF7E6' },
  완독: { label: '완독', color: '#3B82F6', bg: '#EFF6FF' },
  하차: { label: '멈춘 책', color: '#F43F5E', bg: '#FFF1F3' },
};

const GENRE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  BL: { label: 'BL', color: '#3B82F6', bg: '#EAF3FF' },
  ROMANCE: { label: '로맨스', color: '#F472B6', bg: '#FDF2F8' },
  'RO-FAN': { label: '로맨스판타지', color: '#F59E0B', bg: '#FFF7E6' },
  LITERATURE: { label: '일반서적', color: '#8B5CF6', bg: '#F3EFFF' },
};

const PAGE_SIZE = 7;

function toCategoryKey(value: string | null | undefined) {
  if (!value) return null;

  const compact = value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, '')
    .replace(/_/g, '-')
    .replace(/[()]/g, '')
    .toUpperCase();

  if (compact === 'BL' || compact === '비엘') return 'BL';
  if (compact === 'ROMANCE' || compact === '로맨스') return 'ROMANCE';

  if (
    compact === 'RO-FAN' ||
    compact === 'ROFAN' ||
    compact === '로판' ||
    compact === '로맨스판타지'
  ) {
    return 'RO-FAN';
  }

  if (
    compact === 'LITERATURE' ||
    compact === '일반' ||
    compact === '일반서적' ||
    compact === '문학'
  ) {
    return 'LITERATURE';
  }

  return null;
}

function getBookCategoryKeys(book: BookItem) {
  const keys = new Set<string>();

  [
    ...(book.categoryRawTexts ?? []),
    ...(book.category ?? []).map((item) => item.title).filter(Boolean),
    ...(book.categoryLabels ?? []),
    ...(book.categoryKeys ?? []),
    book.primaryCategoryLabel,
    book.primaryCategoryKey,
  ].forEach((value) => {
    const normalized = toCategoryKey(value);
    if (normalized) keys.add(normalized);
  });

  return Array.from(keys);
}

function getPrimaryCategoryKey(book: BookItem) {
  return getBookCategoryKeys(book)[0] ?? null;
}

function getStatusInfo(status: string | null) {
  if (!status) return STATUS_STYLE['책바구니'];

  return (
    STATUS_STYLE[status] ?? {
      label: status,
      color: '#9CA3AF',
      bg: '#F3F4F6',
    }
  );
}

function getGenreInfo(categoryKey: string) {
  return (
    GENRE_STYLE[categoryKey] ?? {
      label: categoryKey,
      color: '#6B7280',
      bg: '#F3F4F6',
    }
  );
}

function StarRating({ rating }: { rating: number | null | undefined }) {
  const safeRating =
    typeof rating === 'number' && !Number.isNaN(rating)
      ? Math.max(0, Math.min(5, rating))
      : null;

  if (safeRating === null) return <span className="noRating">-</span>;

  return (
    <div className="starRating" aria-label={`${safeRating}점`}>
      {Array.from({ length: 5 }, (_, index) => {
        const active = index < safeRating;

        return (
          <span
            key={index}
            className={active ? 'starItem activeStar' : 'starItem inactiveStar'}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

export default function BookShelvesPage() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  async function loadBooks() {
    try {
      setLoading(true);
      setError('');

      const res = await fetch('/api/bookshelves?ts=' + Date.now(), {
        cache: 'no-store',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? '도서 목록을 불러오지 못했습니다.');
      }

      setBooks(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddBook() {
    try {
      setCreating(true);
      setError('');

      const res = await fetch('/api/bookshelves', {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? '새 책을 추가하지 못했습니다.');
      }

      await loadBooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeCategory, searchQuery]);

  const filteredBooks = useMemo(() => {
    let result = books;

    if (activeCategory !== 'ALL') {
      result = result.filter((book) => getBookCategoryKeys(book).includes(activeCategory));
    }

    const query = searchQuery.trim().toLowerCase();

    if (query) {
      result = result.filter((book) => {
        const categoryTexts = [
          ...(book.categoryRawTexts ?? []),
          ...(book.categoryLabels ?? []),
          ...(book.category ?? []).map((item) => item.title ?? ''),
        ].join(' ');

        return [book.title, book.author, book.status, categoryTexts, book.ratingText]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);
      });
    }

    return result;
  }, [books, activeCategory, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  const visibleBooks = filteredBooks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const footerLabel = searchQuery.trim()
    ? `${filteredBooks.length}개 검색됨 · 7개씩 표시`
    : `${filteredBooks.length}개 · 7개씩 표시`;

  return (
    <main className="page">
      <section className="widget">
        <header className="topBar">
          <div className="windowDots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>

          <h1>BOOK SHELVES</h1>

          <button
            type="button"
            className={`searchButton ${searchOpen ? 'on' : ''}`}
            onClick={() => setSearchOpen((prev) => !prev)}
            aria-label="도서 검색"
            title="도서 검색"
          >
            ⌕
          </button>

          <button
            type="button"
            className="addButton"
            onClick={handleAddBook}
            disabled={creating}
            aria-label="새 책 추가"
            title="새 책 추가"
          >
            +
          </button>

          {searchOpen && (
            <div className="searchPopover">
              <span className="searchIcon">⌕</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="책 제목, 저자 검색"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  className="clearSearch"
                  onClick={() => setSearchQuery('')}
                  aria-label="검색어 지우기"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </header>

        <nav className="tabs">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`tab ${activeCategory === tab.key ? 'active' : ''}`}
              onClick={() => setActiveCategory(tab.key)}
            >
              {tab.label}
              {activeCategory === tab.key && <span className="activeDot" />}
            </button>
          ))}
        </nav>

        <section className="tableCard">
          <div className="tableHeader">
            <span className="headStatus">상태</span>
            <span className="headTitle">책 제목</span>
            <span className="headAuthor">저자</span>
            <span className="headGenre">장르</span>
            <span className="headRating">평점</span>
          </div>

          <div className="tableBody">
            {loading ? (
              <div className="empty">불러오는 중...</div>
            ) : error ? (
              <div className="empty error">{error}</div>
            ) : visibleBooks.length === 0 ? (
              <div className="empty">
                {searchQuery ? '검색 결과가 없습니다.' : '표시할 책이 없습니다.'}
              </div>
            ) : (
              visibleBooks.map((book, index) => {
                const status = getStatusInfo(book.status);
                const categoryKey = getPrimaryCategoryKey(book);
                const genre = categoryKey ? getGenreInfo(categoryKey) : null;

                return (
                  <article className="tableRow" key={`${book.title}-${index}`}>
                    <div className="statusCell">
                      <span
                        className="statusDot"
                        style={{
                          backgroundColor: status.color,
                          boxShadow: `0 0 0 3px ${status.bg}`,
                        }}
                      />
                      <span>{status.label}</span>
                    </div>

                    <div className="coverCell">
                      <div className="coverBox">
                        {book.cover ? (
                          <img src={book.cover} alt="" className="cover" loading="lazy" />
                        ) : (
                          <div className="coverPlaceholder">BOOK</div>
                        )}
                      </div>
                    </div>

                    <div className="titleCell">
                      {book.url ? (
                        <a
                          className="bookTitle bookLink"
                          href={book.url}
                          target="_blank"
                          rel="noreferrer"
                          title={book.title ?? '제목 없음'}
                        >
                          {book.title ?? '제목 없음'}
                        </a>
                      ) : (
                        <span className="bookTitle">{book.title ?? '제목 없음'}</span>
                      )}
                    </div>

                    <div className="authorCell">{book.author ?? '-'}</div>

                    <div className="genreCell">
                      {genre ? (
                        <span
                          className="genrePill"
                          style={{
                            color: genre.color,
                            backgroundColor: genre.bg,
                          }}
                        >
                          {genre.label}
                        </span>
                      ) : (
                        <span className="noRating">-</span>
                      )}
                    </div>

                    <div className="ratingCell">
                      <StarRating rating={book.rating} />
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <footer className="footer">
          <p>{footerLabel}</p>

          <div className="pagination">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              aria-label="이전 페이지"
            >
              ‹
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (totalPages <= 5) return true;
                return p === 1 || p === totalPages || Math.abs(p - page) <= 1;
              })
              .map((p, idx, arr) => (
                <span key={p} className="pageGroup">
                  {idx > 0 && p - arr[idx - 1] > 1 && <span className="ellipsis">…</span>}

                  <button
                    type="button"
                    className={page === p ? 'current' : ''}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                </span>
              ))}

            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              aria-label="다음 페이지"
            >
              ›
            </button>
          </div>

          <button
            type="button"
            className="refreshButton"
            onClick={loadBooks}
            disabled={loading}
            aria-label="새로고침"
            title="새로고침"
          >
            ↻
          </button>
        </footer>
      </section>

      <style jsx>{`
        :global(html),
        :global(body) {
          margin: 0;
          padding: 0;
          background: transparent;
        }

        * {
          box-sizing: border-box;
        }

        .page {
          width: 100%;
          min-height: 100vh;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          overflow: visible;
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            'SF Pro Display',
            'Pretendard',
            'Apple SD Gothic Neo',
            sans-serif;
          color: var(--text-main);
        }

        .widget {
          --widget-bg: #f5f5f7;
          --card-bg: #ffffff;
          --text-main: #111827;
          --text-sub: #6b7280;
          --border: #dfe3ea;
          --soft-border: #eef0f4;
          --tab-bg: #f7f7f9;
          --shadow: rgba(17, 24, 39, 0.08);
          --track: #e5e7eb;

          width: 560px;
          height: 415px;
          flex: 0 0 560px;
          background: var(--widget-bg);
          border: 1px solid var(--border);
          border-radius: 18px;
          box-shadow:
            0 14px 38px var(--shadow),
            0 2px 6px rgba(17, 24, 39, 0.04);
          padding: 12px;
          display: flex;
          flex-direction: column;
          overflow: visible;
          position: relative;
        }

        @media (prefers-color-scheme: dark) {
          .widget {
            --widget-bg: #1f2024;
            --card-bg: #2a2b31;
            --text-main: #f3f4f6;
            --text-sub: #a1a1aa;
            --border: #3f4148;
            --soft-border: #3a3b42;
            --tab-bg: #24252a;
            --shadow: rgba(0, 0, 0, 0.35);
            --track: #4b5563;
          }
        }

        .topBar {
          position: relative;
          height: 30px;
          flex: 0 0 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }

        .windowDots {
          position: absolute;
          left: 0;
          top: 10px;
          display: flex;
          gap: 5px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          display: block;
        }

        .red {
          background: #ff5f57;
        }

        .yellow {
          background: #febc2e;
        }

        .green {
          background: #28c840;
        }

        h1 {
          margin: 0;
          color: var(--text-sub);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.42em;
        }

        .searchButton,
        .addButton {
          position: absolute;
          top: 2px;
          width: 26px;
          height: 26px;
          border-radius: 9px;
          border: 1px solid var(--border);
          background: var(--card-bg);
          color: var(--text-sub);
          font-size: 17px;
          line-height: 1;
          cursor: pointer;
          box-shadow:
            0 5px 12px var(--shadow),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .searchButton {
          right: 34px;
          font-size: 15px;
        }

        .searchButton.on {
          color: #3b82f6;
          background: #ffffff;
        }

        .addButton {
          right: 0;
        }

        .searchPopover {
          position: absolute;
          right: 34px;
          top: 34px;
          width: 178px;
          height: 30px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--card-bg);
          box-shadow: 0 10px 24px var(--shadow);
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 0 8px;
          z-index: 20;
        }

        .searchIcon {
          color: var(--text-sub);
          font-size: 12px;
          flex-shrink: 0;
        }

        .searchPopover input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: none;
          background: transparent;
          color: var(--text-main);
          font-size: 9px;
          font-weight: 600;
        }

        .searchPopover input::placeholder {
          color: var(--text-sub);
          opacity: 0.75;
        }

        .clearSearch {
          border: 0;
          background: transparent;
          color: var(--text-sub);
          cursor: pointer;
          font-size: 12px;
          line-height: 1;
          padding: 0;
        }

        .tabs {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
          margin: 10px 0 10px;
          flex: 0 0 auto;
        }

        .tab {
          height: 25px;
          min-width: 0;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--tab-bg);
          color: var(--text-main);
          font-size: 9px;
          font-weight: 650;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tab.active {
          background: var(--card-bg);
          box-shadow:
            0 5px 12px var(--shadow),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .activeDot {
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #3b82f6;
          flex-shrink: 0;
        }

        .tableCard {
          height: 293px;
          flex: 0 0 293px;
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 13px;
          overflow: hidden;
          box-shadow: 0 5px 14px var(--shadow);
        }

        .tableHeader,
        .tableRow {
          display: grid;
          grid-template-columns: 88px 30px minmax(0, 1.7fr) minmax(52px, 0.72fr) 58px 92px;
          align-items: center;
        }

        .tableHeader {
          height: 24px;
          padding: 0 10px;
          color: var(--text-sub);
          font-size: 8.5px;
          font-weight: 650;
          border-bottom: 1px solid var(--soft-border);
        }

        .headStatus {
          text-align: left;
          padding-left: 28px;
        }

        .headAuthor,
        .headGenre,
        .headRating {
          text-align: center;
        }

        .headTitle {
          grid-column: 2 / span 2;
          text-align: center;
        }

        .tableBody {
          height: 259px;
          overflow: hidden;
        }

        .tableRow {
          height: 37px;
          padding: 0 10px;
          border-bottom: 1px solid var(--soft-border);
          font-size: 9.3px;
          background: var(--card-bg);
        }

        .tableRow:last-child {
          border-bottom: 0;
        }

        .statusCell {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
          color: var(--text-main);
          font-weight: 650;
          min-width: 0;
          white-space: nowrap;
          padding-left: 8px;
        }

        .statusDot {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          flex-shrink: 0;
        }

        .coverCell {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .coverBox {
          width: 22px;
          height: 31px;
          border-radius: 5px;
          overflow: hidden;
          flex-shrink: 0;
          background: var(--track);
          box-shadow: 0 1px 4px var(--shadow);
        }

        .cover {
          width: 22px;
          height: 31px;
          display: block;
          object-fit: cover;
          object-position: center;
        }

        .coverPlaceholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4.5px;
          color: var(--text-sub);
        }

        .titleCell {
          min-width: 0;
          padding-left: 7px;
        }

        .bookTitle {
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--text-main);
          font-weight: 700;
          display: block;
        }

        .bookLink {
          text-decoration: none;
        }

        .bookLink:hover {
          color: #3b82f6;
        }

        .authorCell {
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
          text-align: center;
        }

        .genreCell {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .genrePill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          max-width: 54px;
          height: 16px;
          padding: 0 7px;
          border-radius: 999px;
          font-size: 8px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ratingCell {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 0;
        }

        :global(.starRating) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 1px;
          width: 66px;
          height: 18px;
          border-radius: 999px;
          background: rgba(245, 166, 35, 0.1);
          box-shadow:
            0 0 10px rgba(245, 166, 35, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
          overflow: hidden;
        }

        :global(.starItem) {
          font-size: 11px;
          line-height: 1;
          font-family: Arial, sans-serif;
          transform: scaleX(1.08);
        }

        :global(.activeStar) {
          color: #f5a623;
          text-shadow: 0 1px 4px rgba(245, 166, 35, 0.22);
        }

        :global(.inactiveStar) {
          color: #d7dbe3;
        }

        .noRating {
          color: var(--text-sub);
          font-weight: 650;
        }

        .empty {
          height: 259px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-sub);
          font-size: 10px;
        }

        .empty.error {
          color: #f43f5e;
        }

        .footer {
          height: 28px;
          flex: 0 0 28px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: 0 3px;
          color: var(--text-sub);
          font-size: 8.5px;
        }

        .footer p {
          margin: 0;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
        }

        .pagination button {
          width: 20px;
          height: 20px;
          border-radius: 7px;
          border: 0;
          background: transparent;
          color: var(--text-main);
          font-size: 9px;
          cursor: pointer;
        }

        .pagination button:disabled {
          opacity: 0.35;
          cursor: default;
        }

        .pagination .current {
          background: #e8f0ff;
          color: #1d4ed8;
          font-weight: 700;
        }

        .pageGroup {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .ellipsis {
          color: var(--text-sub);
          padding: 0 1px;
        }

        .refreshButton {
          justify-self: end;
          width: 21px;
          height: 21px;
          border-radius: 7px;
          border: 1px solid var(--border);
          background: var(--card-bg);
          color: var(--text-sub);
          font-size: 11px;
          cursor: pointer;
          box-shadow: 0 3px 8px var(--shadow);
        }

        .refreshButton:disabled {
          opacity: 0.45;
          cursor: default;
        }
      `}</style>
    </main>
  );
}
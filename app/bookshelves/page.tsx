'use client';

import { useEffect, useMemo, useState } from 'react';

type CategoryItem = {
  id: string;
  title: string | null;
};

type BookItem = {
  title: string | null;
  cover: string | null;
  author: string | null;
  status: string | null;
  category: CategoryItem[];
  categoryNames?: string[];
  progress: number | null;
};

const CATEGORY_TABS = ['전체', 'BL', '로맨스', '로맨스판타지', '일반서적'] as const;

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

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  책바구니: { label: '읽고 싶어요', color: '#9CA3AF', bg: '#F3F4F6' },
  '읽기 전': { label: '읽기 전', color: '#22C55E', bg: '#ECFDF3' },
  '읽는 중': { label: '읽는 중', color: '#F5A623', bg: '#FFF7E6' },
  완독: { label: '완독', color: '#3B82F6', bg: '#EFF6FF' },
  하차: { label: '멈춘 책', color: '#F43F5E', bg: '#FFF1F3' },
};

const GENRE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  BL: { label: 'BL', color: '#3B82F6', bg: '#EAF3FF' },
  로맨스: { label: '로맨스', color: '#F472B6', bg: '#FDF2F8' },
  로맨스판타지: { label: '로맨스판타지', color: '#F59E0B', bg: '#FFF7E6' },
  일반서적: { label: '일반서적', color: '#8B5CF6', bg: '#F3EFFF' },
};

const PAGE_SIZE = 10;

function normalizeCategoryName(name: string | null | undefined) {
  if (!name) return null;

  const raw = name.trim();
  const compact = raw.replace(/\s+/g, '').replace(/_/g, '-').toUpperCase();

  return CATEGORY_MAP[compact] ?? CATEGORY_MAP[raw] ?? raw;
}

function getBookCategoryNames(book: BookItem) {
  const fromServer = Array.isArray(book.categoryNames)
    ? book.categoryNames.map((name) => normalizeCategoryName(name)).filter(Boolean)
    : [];

  const fromRelation = Array.isArray(book.category)
    ? book.category.map((item) => normalizeCategoryName(item.title)).filter(Boolean)
    : [];

  return Array.from(new Set([...fromServer, ...fromRelation])) as string[];
}

function getPrimaryCategory(book: BookItem) {
  return getBookCategoryNames(book)[0] ?? '일반서적';
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

function getGenreInfo(category: string) {
  return (
    GENRE_STYLE[category] ?? {
      label: category,
      color: '#6B7280',
      bg: '#F3F4F6',
    }
  );
}

export default function BookShelvesPage() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [activeCategory, setActiveCategory] =
    useState<(typeof CATEGORY_TABS)[number]>('전체');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function loadBooks() {
    try {
      setLoading(true);
      setError('');

      const res = await fetch('/api/bookshelves', {
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
  }, [activeCategory]);

  const filteredBooks = useMemo(() => {
    if (activeCategory === '전체') return books;

    return books.filter((book) => {
      const categories = getBookCategoryNames(book);
      return categories.includes(activeCategory);
    });
  }, [books, activeCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));

  const visibleBooks = filteredBooks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
            className="addButton"
            onClick={handleAddBook}
            disabled={creating}
            aria-label="새 책 추가"
            title="새 책 추가"
          >
            +
          </button>
        </header>

        <nav className="tabs">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`tab ${activeCategory === tab ? 'active' : ''}`}
              onClick={() => setActiveCategory(tab)}
            >
              {tab}
              {activeCategory === tab && <span className="activeDot" />}
            </button>
          ))}
        </nav>

        <section className="tableCard">
          <div className="tableHeader">
            <span>상태</span>
            <span>책 제목</span>
            <span>저자</span>
            <span>장르</span>
            <span>진행률</span>
            <span />
          </div>

          <div className="tableBody">
            {loading ? (
              <div className="empty">불러오는 중...</div>
            ) : error ? (
              <div className="empty error">{error}</div>
            ) : visibleBooks.length === 0 ? (
              <div className="empty">표시할 책이 없습니다.</div>
            ) : (
              visibleBooks.map((book, index) => {
                const status = getStatusInfo(book.status);
                const category = getPrimaryCategory(book);
                const genre = getGenreInfo(category);
                const isCompleted = book.status === '완독';

                return (
                  <article className="tableRow" key={`${book.title}-${index}`}>
                    <div className="statusCell">
                      <span
                        className="statusDot"
                        style={{
                          backgroundColor: status.color,
                          boxShadow: `0 0 0 4px ${status.bg}`,
                        }}
                      />
                      <span>{status.label}</span>
                    </div>

                    <div className="titleCell">
                      <div className="coverBox">
                        {book.cover ? (
                          <img src={book.cover} alt="" className="cover" loading="lazy" />
                        ) : (
                          <div className="coverPlaceholder">BOOK</div>
                        )}
                      </div>

                      <span className="bookTitle">{book.title ?? '제목 없음'}</span>
                    </div>

                    <div className="authorCell">{book.author ?? '-'}</div>

                    <div>
                      <span
                        className="genrePill"
                        style={{
                          color: genre.color,
                          backgroundColor: genre.bg,
                        }}
                      >
                        {genre.label}
                      </span>
                    </div>

                    <div className="progressCell">
                      {isCompleted ? (
                        <div className="complete">
                          <span>완독</span>
                          <span className="check">✓</span>
                        </div>
                      ) : typeof book.progress === 'number' ? (
                        <div className="progressWrap">
                          <span className="progressText">{book.progress}%</span>
                          <div className="progressTrack">
                            <div
                              className="progressFill"
                              style={{ width: `${book.progress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="dash">-</span>
                      )}
                    </div>

                    <button type="button" className="moreButton" aria-label="더보기">
                      ...
                    </button>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <footer className="footer">
          <p>한 페이지에는 10개 목록만 표시됩니다.</p>

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
                  {idx > 0 && p - arr[idx - 1] > 1 && (
                    <span className="ellipsis">…</span>
                  )}

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
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            'SF Pro Display',
            'Pretendard',
            'Apple SD Gothic Neo',
            sans-serif;
          color: #111827;
        }

        .widget {
          width: 1040px;
          min-height: 900px;
          background: #f5f5f7;
          border: 1px solid #d8dbe3;
          border-radius: 24px;
          box-shadow:
            0 22px 60px rgba(17, 24, 39, 0.08),
            0 2px 8px rgba(17, 24, 39, 0.04);
          padding: 28px 28px 20px;
          display: flex;
          flex-direction: column;
          overflow: visible;
        }

        .topBar {
          position: relative;
          height: 58px;
          flex: 0 0 58px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .windowDots {
          position: absolute;
          left: 0;
          top: 16px;
          display: flex;
          gap: 10px;
        }

        .dot {
          width: 14px;
          height: 14px;
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
          color: #6b7280;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.42em;
        }

        .addButton {
          position: absolute;
          right: 0;
          top: 4px;
          width: 44px;
          height: 44px;
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #6b7280;
          font-size: 28px;
          line-height: 1;
          cursor: pointer;
          box-shadow:
            0 8px 20px rgba(17, 24, 39, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
        }

        .addButton:hover {
          transform: translateY(-1px);
          box-shadow:
            0 12px 24px rgba(17, 24, 39, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .addButton:disabled {
          opacity: 0.5;
          cursor: default;
        }

        .tabs {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 24px;
          margin: 18px 8px 22px;
          flex: 0 0 auto;
        }

        .tab {
          height: 46px;
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          background: #f7f7f9;
          color: #374151;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease,
            background 0.15s ease;
        }

        .tab.active {
          background: #ffffff;
          box-shadow:
            0 10px 22px rgba(17, 24, 39, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          transform: translateY(-1px);
        }

        .activeDot {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: #3b82f6;
        }

        .tableCard {
          height: 656px;
          flex: 0 0 656px;
          background: #ffffff;
          border: 1px solid #dfe3ea;
          border-radius: 20px;
          overflow: hidden;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            0 8px 24px rgba(17, 24, 39, 0.04);
        }

        .tableHeader,
        .tableRow {
          display: grid;
          grid-template-columns: 150px 340px 170px 140px 170px 36px;
          align-items: center;
          column-gap: 0;
        }

        .tableHeader {
          height: 56px;
          padding: 0 20px;
          color: #6b7280;
          font-size: 13px;
          font-weight: 600;
          border-bottom: 1px solid #eef0f4;
        }

        .tableBody {
          height: 600px;
          overflow: hidden;
        }

        .tableRow {
          height: 60px;
          padding: 0 20px;
          border-bottom: 1px solid #eef0f4;
          font-size: 14px;
          background: rgba(255, 255, 255, 0.72);
          transition: background 0.15s ease;
        }

        .tableRow:hover {
          background: #fafafa;
        }

        .statusCell {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #374151;
          font-weight: 600;
          min-width: 0;
        }

        .statusDot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          flex-shrink: 0;
        }

        .titleCell {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }

        .coverBox {
          width: 36px;
          height: 52px;
          border-radius: 6px;
          overflow: hidden;
          flex-shrink: 0;
          background: #eef0f4;
          box-shadow:
            0 2px 6px rgba(17, 24, 39, 0.12),
            inset 0 0 0 1px rgba(255, 255, 255, 0.6);
        }

        .cover {
          width: 36px;
          height: 52px;
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
          font-size: 7px;
          letter-spacing: 0.08em;
          color: #9ca3af;
        }

        .bookTitle {
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #111827;
          font-weight: 650;
        }

        .authorCell {
          color: #374151;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .genrePill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 58px;
          height: 24px;
          padding: 0 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }

        .progressCell {
          display: flex;
          align-items: center;
        }

        .progressWrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .progressText {
          width: 36px;
          text-align: right;
          font-weight: 650;
          color: #111827;
        }

        .progressTrack {
          position: relative;
          width: 86px;
          height: 6px;
          border-radius: 999px;
          background: #e5e7eb;
          overflow: hidden;
        }

        .progressFill {
          height: 100%;
          border-radius: 999px;
          background: #3b82f6;
        }

        .complete {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 650;
          color: #111827;
        }

        .check {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #3b82f6;
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
        }

        .dash {
          color: #6b7280;
          font-weight: 600;
        }

        .moreButton {
          border: 0;
          background: transparent;
          color: #6b7280;
          font-size: 17px;
          cursor: pointer;
          line-height: 1;
        }

        .empty {
          height: 600px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          font-size: 14px;
        }

        .empty.error {
          color: #f43f5e;
        }

        .footer {
          height: 64px;
          flex: 0 0 64px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: 0 16px;
          color: #8b95a5;
          font-size: 13px;
        }

        .footer p {
          margin: 0;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .pagination button {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          border: 0;
          background: transparent;
          color: #4b5563;
          font-size: 15px;
          cursor: pointer;
        }

        .pagination button:hover {
          background: #f3f4f6;
        }

        .pagination button:disabled {
          opacity: 0.35;
          cursor: default;
        }

        .pagination .current {
          background: #e8f0ff;
          color: #1d4ed8;
          font-weight: 700;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
        }

        .pageGroup {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ellipsis {
          color: #6b7280;
          padding: 0 4px;
        }

        .refreshButton {
          justify-self: end;
          width: 34px;
          height: 34px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #6b7280;
          font-size: 18px;
          cursor: pointer;
          box-shadow:
            0 6px 14px rgba(17, 24, 39, 0.07),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
        }

        .refreshButton:hover {
          transform: translateY(-1px);
          box-shadow:
            0 10px 20px rgba(17, 24, 39, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .refreshButton:disabled {
          opacity: 0.45;
          cursor: default;
        }

        @media (max-width: 1120px) {
          .page {
            align-items: flex-start;
            justify-content: flex-start;
            padding: 24px;
            overflow-x: auto;
          }

          .widget {
            flex-shrink: 0;
          }
        }
      `}</style>
    </main>
  );
}
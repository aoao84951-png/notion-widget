'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type CategoryItem = {
  id: string;
  title: string | null;
};

type BookItem = {
  id?: string;
  url?: string | null;
  createdTime?: string | null;
  title: string | null;
  cover: string | null;
  author: string | null;
  status: string | null;
  platform?: string | null;
  progressText?: string | null;
  progress?: number | null;
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

const BASE_WIDTH = 560;
const BASE_HEIGHT = 415;
const PAGE_SIZE = 7;

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
  return STATUS_STYLE[status] ?? { label: status, color: '#9CA3AF', bg: '#F3F4F6' };
}

function getGenreInfo(categoryKey: string) {
  return GENRE_STYLE[categoryKey] ?? { label: categoryKey, color: '#6B7280', bg: '#F3F4F6' };
}

function StarRating({ rating }: { rating: number | null | undefined }) {
  const safeRating =
    typeof rating === 'number' && !Number.isNaN(rating)
      ? Math.max(0, Math.min(5, rating))
      : null;

  if (safeRating === null) return <span className="noRating">-</span>;

  return (
    <div className="starRating" aria-label={`${safeRating}점`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={index < safeRating ? 'starItem activeStar' : 'starItem inactiveStar'}>
          ★
        </span>
      ))}
    </div>
  );
}

function formatProgress(book: BookItem | null) {
  if (!book) return '-';

  if (typeof book.progress === 'number' && !Number.isNaN(book.progress)) {
    const percent = book.progress <= 1 ? book.progress * 100 : book.progress;
    return `${Math.round(percent)}%`;
  }

  if (book.progressText) {
    const matched = book.progressText.match(/-?\d+(\.\d+)?/);
    if (!matched) return book.progressText;

    const parsed = Number(matched[0]);
    if (Number.isNaN(parsed)) return book.progressText;

    const percent = parsed <= 1 ? parsed * 100 : parsed;
    return `${Math.round(percent)}%`;
  }

  return '-';
}

export default function BookShelvesPage() {
  const wrapRef = useRef<HTMLElement | null>(null);
  const [scale, setScale] = useState(1);

  const [books, setBooks] = useState<BookItem[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      setScale(Math.min(1, width / BASE_WIDTH));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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

  async function createBookAndOpen() {
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

      setShowAddConfirm(false);
      await loadBooks();

      if (data?.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
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

        return [
          book.title,
          book.author,
          book.status,
          book.platform,
          book.progressText,
          categoryTexts,
          book.ratingText,
        ]
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

  const selectedStatus = selectedBook ? getStatusInfo(selectedBook.status) : null;
  const selectedCategoryKey = selectedBook ? getPrimaryCategoryKey(selectedBook) : null;
  const selectedGenre = selectedCategoryKey ? getGenreInfo(selectedCategoryKey) : null;

  return (
    <main className="page" ref={wrapRef}>
      <div
        className="scaleBox"
        style={{
          width: BASE_WIDTH * scale,
          height: BASE_HEIGHT * scale,
        }}
      >
        <section
          className="widget"
          style={{
            transform: `scale(${scale})`,
          }}
        >
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
              onClick={() => setShowAddConfirm(true)}
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
                        <button
                          type="button"
                          className="bookTitle bookButton"
                          onClick={() => setSelectedBook(book)}
                          title={book.title ?? '제목 없음'}
                        >
                          {book.title ?? '제목 없음'}
                        </button>
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

          {selectedBook && (
            <aside className="detailPanel">
              <button
                type="button"
                className="closeDetail"
                onClick={() => setSelectedBook(null)}
                aria-label="상세 닫기"
              >
                ×
              </button>

              <div className="detailCover">
                {selectedBook.cover ? (
                  <img src={selectedBook.cover} alt="" />
                ) : (
                  <div className="detailCoverPlaceholder">BOOK</div>
                )}
              </div>

              <h2>{selectedBook.title ?? '제목 없음'}</h2>
              <p className="detailAuthor">{selectedBook.author ?? '저자 미상'}</p>

              <div className="detailMeta">
                {selectedStatus && (
                  <span
                    className="detailStatus"
                    style={{
                      color: selectedStatus.color,
                      backgroundColor: selectedStatus.bg,
                    }}
                  >
                    {selectedStatus.label}
                  </span>
                )}

                {selectedGenre && (
                  <span
                    className="detailGenre"
                    style={{
                      color: selectedGenre.color,
                      backgroundColor: selectedGenre.bg,
                    }}
                  >
                    {selectedGenre.label}
                  </span>
                )}
              </div>

              <div className="detailInfoList">
                <div>
                  <span>플랫폼</span>
                  <strong>{selectedBook.platform ?? '-'}</strong>
                </div>
                <div>
                  <span>진행률</span>
                  <strong>{formatProgress(selectedBook)}</strong>
                </div>
                <div>
                  <span>평점</span>
                  <strong className="detailStarValue">
                    <StarRating rating={selectedBook.rating} />
                  </strong>
                </div>
              </div>

              {selectedBook.url && (
                <button
                  type="button"
                  className="openNotion"
                  onClick={() =>
                    window.open(selectedBook.url ?? '', '_blank', 'noopener,noreferrer')
                  }
                >
                  Notion에서 열기
                </button>
              )}
            </aside>
          )}

          {showAddConfirm && (
            <div className="confirmOverlay">
              <div className="confirmBox">
                <p>새 책을 추가할까요?</p>
                <span>도서관 DB에 새 페이지가 생성됩니다.</span>

                <div className="confirmButtons">
                  <button
                    type="button"
                    className="cancelAdd"
                    onClick={() => setShowAddConfirm(false)}
                    disabled={creating}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="confirmAdd"
                    onClick={createBookAndOpen}
                    disabled={creating}
                  >
                    {creating ? '추가 중...' : '추가하기'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        :global(html),
        :global(body) {
          margin: 0;
          padding: 0;
          background: #ffffff;
          overflow: hidden;
        }

        @media (prefers-color-scheme: dark) {
          :global(html),
          :global(body) {
            background: #191919;
          }
        }

        :global(#__next),
        :global(main) {
          background: transparent !important;
        }

        * {
          box-sizing: border-box;
        }

        .page {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          min-height: 0vh;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0px;
          overflow: hidden;
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            'SF Pro Display',
            'Pretendard',
            'Apple SD Gothic Neo',
            sans-serif;
          color: var(--text-main);
        }

        @media (prefers-color-scheme: dark) {
          .page {
              background: #191919;
          }
        }

        .scaleBox {
          position: relative;
          flex-shrink: 0;
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
          transform-origin: top left;
          background: var(--widget-bg);
          border: 1px solid var(--border);
          border-radius: 18px;
          box-shadow: none;
          padding: 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: absolute;
          top: 0;
          left: 0;
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

            box-shadow: none;
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
          box-shadow: none;
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
          padding-left: 22px;
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
          width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--text-main);
          font-weight: 700;
          display: block;
        }

        .bookButton {
          border: 0;
          background: transparent;
          padding: 0;
          text-align: left;
          cursor: pointer;
          font: inherit;
        }

        .bookButton:hover {
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

        .detailPanel {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 176px;
          height: calc(100% - 24px);
          border-radius: 15px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(18px);
          box-shadow: -8px 0 28px rgba(17, 24, 39, 0.14);
          z-index: 30;
          padding: 14px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: slideIn 0.18s ease-out;
        }

        @media (prefers-color-scheme: dark) {
          .detailPanel {
            background: rgba(42, 43, 49, 0.94);
          }
        }

        @keyframes slideIn {
          from {
            transform: translateX(12px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .closeDetail {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 20px;
          height: 20px;
          border: 0;
          border-radius: 999px;
          background: var(--tab-bg);
          color: var(--text-sub);
          cursor: pointer;
          font-size: 13px;
        }

        .detailCover {
          width: 48px;
          height: 68px;
          border-radius: 9px;
          overflow: hidden;
          background: var(--track);
          box-shadow: 0 6px 16px var(--shadow);
          margin-top: 8px;
        }

        .detailCover img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          object-position: center;
        }

        .detailCoverPlaceholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-sub);
          font-size: 8px;
          font-weight: 700;
        }

        .detailPanel h2 {
          width: 100%;
          margin: 10px 0 4px;
          color: var(--text-main);
          font-size: 11.5px;
          font-weight: 800;
          line-height: 1.32;
          text-align: center;
          word-break: keep-all;
        }

        .detailAuthor {
          margin: 0;
          color: var(--text-sub);
          font-size: 8.5px;
          font-weight: 650;
          text-align: center;
        }

        .detailMeta {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 5px;
          margin-top: 9px;
        }

        .detailStatus,
        .detailGenre {
          height: 17px;
          padding: 0 8px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          font-weight: 750;
        }

        .detailInfoList {
          width: 100%;
          margin-top: 10px;
          display: grid;
          gap: 5px;
        }

        .detailInfoList div {
          min-height: 22px;
          border-radius: 9px;
          background: var(--tab-bg);
          padding: 4px 7px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }

        .detailInfoList span {
          color: var(--text-sub);
          font-size: 7.5px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .detailInfoList strong {
          color: var(--text-main);
          font-size: 8px;
          font-weight: 800;
          text-align: right;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .detailStarValue {
          display: flex;
          justify-content: flex-end;
        }

        .openNotion {
          margin-top: auto;
          width: 100%;
          height: 27px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--card-bg);
          color: var(--text-main);
          font-size: 9px;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 5px 12px var(--shadow);
        }

        .confirmOverlay {
          position: absolute;
          inset: 0;
          z-index: 50;
          background: rgba(17, 24, 39, 0.16);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .confirmBox {
          width: 210px;
          border-radius: 17px;
          border: 1px solid var(--border);
          background: var(--card-bg);
          box-shadow: 0 16px 40px rgba(17, 24, 39, 0.18);
          padding: 16px;
          text-align: center;
        }

        .confirmBox p {
          margin: 0;
          color: var(--text-main);
          font-size: 13px;
          font-weight: 850;
        }

        .confirmBox span {
          display: block;
          margin-top: 6px;
          color: var(--text-sub);
          font-size: 9px;
          font-weight: 650;
        }

        .confirmButtons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
          margin-top: 14px;
        }

        .confirmButtons button {
          height: 28px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 9px;
          font-weight: 800;
        }

        .cancelAdd {
          border: 1px solid var(--border);
          background: var(--tab-bg);
          color: var(--text-sub);
        }

        .confirmAdd {
          border: 1px solid #bfdbfe;
          background: #e8f0ff;
          color: #1d4ed8;
        }

        .confirmButtons button:disabled {
          opacity: 0.55;
          cursor: default;
        }
      `}</style>
    </main>
  );
}
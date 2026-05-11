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

const DESKTOP_WIDTH = 560;
const MOBILE_WIDTH = 340;
const BASE_HEIGHT = 455;
const PAGE_SIZE = 8;

const CATEGORY_TABS = [
  { label: '전체', key: 'ALL' },
  { label: 'BL', key: 'BL' },
  { label: '로맨스', key: 'ROMANCE' },
  { label: '로맨스판타지', key: 'RO-FAN' },
  { label: '일반서적', key: 'LITERATURE' },
] as const;

const STATUS_TABS = [
  { label: '전체 상태', key: 'ALL' },
  { label: '읽고 싶어요', key: '책바구니' },
  { label: '읽기 전', key: '읽기 전' },
  { label: '읽는 중', key: '읽는 중' },
  { label: '완독', key: '완독' },
  { label: '멈춘 책', key: '하차' },
] as const;

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; ribbon: string }> = {
  책바구니: { label: '읽고 싶어요', color: '#8B8F97', bg: '#F3F4F6', ribbon: '#A7ADB5' },
  '읽기 전': { label: '읽기 전', color: '#8B8F97', bg: '#F3F4F6', ribbon: '#A7ADB5' },
  '읽는 중': { label: '읽는 중', color: '#A88435', bg: '#FFF7E6', ribbon: '#D6B56D' },
  완독: { label: '완독', color: '#5F7FA8', bg: '#EEF4FB', ribbon: '#8EA8C8' },
  하차: { label: '멈춘 책', color: '#B96B7D', bg: '#FFF1F3', ribbon: '#B98A94' },
};

const GENRE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  BL: { label: 'BL', color: '#5B8DEF', bg: '#EAF3FF' },
  ROMANCE: { label: '로맨스', color: '#F472B6', bg: '#FDF2F8' },
  'RO-FAN': { label: '로맨스판타지', color: '#D99A19', bg: '#FFF7E6' },
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

  return (
    STATUS_STYLE[status] ?? {
      label: status,
      color: '#8B8F97',
      bg: '#F3F4F6',
      ribbon: '#A7ADB5',
    }
  );
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
        <span
          key={index}
          className={index < safeRating ? 'starItem activeStar' : 'starItem inactiveStar'}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function BookShelvesPage() {
  const wrapRef = useRef<HTMLElement | null>(null);
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  const [books, setBooks] = useState<BookItem[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [activeStatus, setActiveStatus] = useState<string>('ALL');
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
      const height = entry.contentRect.height;
  
      const mobile = width <= 480;
      const designWidth = mobile ? MOBILE_WIDTH : DESKTOP_WIDTH;
  
      setIsMobile(mobile);
      setScale(Math.min(1, width / designWidth, height / BASE_HEIGHT));
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
  }, [activeCategory, activeStatus, searchQuery]);

  const filteredBooks = useMemo(() => {
    let result = books;

    if (activeCategory !== 'ALL') {
      result = result.filter((book) => getBookCategoryKeys(book).includes(activeCategory));
    }

    if (activeStatus !== 'ALL') {
      result = result.filter((book) => book.status === activeStatus);
    }

    const query = searchQuery.trim().toLowerCase();

    if (query) {
      result = result.filter((book) => {
        const categoryTexts = [
          ...(book.categoryRawTexts ?? []),
          ...(book.categoryLabels ?? []),
          ...(book.category ?? []).map((item) => item.title ?? ''),
        ].join(' ');

        return [book.title, book.author, book.status, book.platform, categoryTexts, book.ratingText]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);
      });
    }

    return result;
  }, [books, activeCategory, activeStatus, searchQuery]);

  const totalPages = isMobile
  ? Math.max(1, Math.ceil(filteredBooks.length / 5))
  : Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));

  const visibleBooks = isMobile
    ? filteredBooks.slice((page - 1) * 5, page * 5)
    : filteredBooks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectedStatus = selectedBook ? getStatusInfo(selectedBook.status) : null;
  const selectedCategoryKey = selectedBook ? getPrimaryCategoryKey(selectedBook) : null;
  const selectedGenre = selectedCategoryKey ? getGenreInfo(selectedCategoryKey) : null;

  return (
    <main className="page" ref={wrapRef}>
      <div
        className="scaleBox"
        style={{
          width: (isMobile ? MOBILE_WIDTH : DESKTOP_WIDTH) * scale,
          height: BASE_HEIGHT * scale,
        }}
      >
        <section
          className={`widget ${isMobile ? 'mobileWidget' : ''}`}
          style={{
            width: isMobile ? MOBILE_WIDTH : DESKTOP_WIDTH,
            transform: `scale(${scale})`,
          }}
        >
          <header className="topBar">
            <div className="windowDots">
              <span />
              <span />
              <span />
            </div>

            <div className="titleBox">
              <h1>MY BOOKSHELF</h1>
            </div>

            <div className="topActions">
              <button
                type="button"
                className={`iconButton ${searchOpen ? 'on' : ''}`}
                onClick={() => setSearchOpen((prev) => !prev)}
                aria-label="도서 검색"
                title="도서 검색"
              >
                ⌕
              </button>

              <button
                type="button"
                className="iconButton"
                onClick={() => setShowAddConfirm(true)}
                disabled={creating}
                aria-label="새 책 추가"
                title="새 책 추가"
              >
                +
              </button>
            </div>

            {searchOpen && (
              <div className="searchPopover">
                <span>⌕</span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="책 제목, 저자 검색"
                  autoFocus
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} aria-label="검색어 지우기">
                    ×
                  </button>
                )}
              </div>
            )}
          </header>

          <nav className="genreTabs">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`genreTab ${activeCategory === tab.key ? 'active' : ''}`}
                onClick={() => setActiveCategory(tab.key)}
              >
                {tab.label}
                {activeCategory === tab.key && <span />}
              </button>
            ))}
          </nav>

          <nav className="statusTabs">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`statusTab ${activeStatus === tab.key ? 'active' : ''}`}
                onClick={() => setActiveStatus(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <section className="booksArea">
            {loading ? (
              <div className="empty">불러오는 중...</div>
            ) : error ? (
              <div className="empty error">{error}</div>
            ) : visibleBooks.length === 0 ? (
              <div className="empty">
                {searchQuery ? '검색 결과가 없습니다.' : '표시할 책이 없습니다.'}
              </div>
            ) : (
              <div className="bookGrid">
                {visibleBooks.map((book, index) => {
                  const status = getStatusInfo(book.status);
                  const categoryKey = getPrimaryCategoryKey(book);
                  const genre = categoryKey ? getGenreInfo(categoryKey) : null;

                  return (
                    <article className="bookCard" key={`${book.id ?? book.title}-${index}`}>
                      <span className="statusRibbon" style={{ backgroundColor: status.ribbon }}>
                        {status.label}
                      </span>

                      <div className="coverWrap">
                        {book.cover ? (
                          <img src={book.cover} alt="" className="cover" loading="lazy" />
                        ) : (
                          <div className="coverPlaceholder">BOOK</div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="bookTitle"
                        onClick={() => setSelectedBook(book)}
                        title={book.title ?? '제목 없음'}
                      >
                        {book.title ?? '제목 없음'}
                      </button>

                      <p className="author">{book.author ?? '저자 미상'}</p>

                      <div className="bottomLine">
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
                          <span className="genrePill emptyGenre">-</span>
                        )}

                        <StarRating rating={book.rating} />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <footer className="footer">
          <p>
            {searchQuery.trim()
              ? `검색 결과 ${filteredBooks.length}개`
              : `총 ${filteredBooks.length}개`}
          </p>

            <div className="pagination">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                aria-label="이전 페이지"
              >
                ‹
              </button>

              <span>
                {page} / {totalPages}
              </span>

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
                  <span>장르</span>
                  <strong>{selectedGenre?.label ?? '-'}</strong>
                </div>

                <div>
                  <span>평점</span>
                  <strong>
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
                    onClick={() => setShowAddConfirm(false)}
                    disabled={creating}
                  >
                    취소
                  </button>
                  <button type="button" onClick={createBookAndOpen} disabled={creating}>
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

        * {
          box-sizing: border-box;
        }

        .page {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          overflow: hidden;
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            'SF Pro Display',
            'Pretendard',
            'Apple SD Gothic Neo',
            sans-serif;
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
          --widget-bg: #fcfcfd;
          --card-bg: #ffffff;
          --text-main: #4b5563;
          --text-sub: #98a2b3;
          --border: #e7ebf2;
          --shadow: rgba(148, 163, 184, 0.08);

          position: absolute;
          top: 0;
          left: 0;
          height: 455px;
          transform-origin: top left;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--widget-bg);
          color: var(--text-main);
          display: flex;
          flex-direction: column;
        }

        .topBar {
          position: relative;
          height: 45px;
          flex: 0 0 45px;

          border-bottom: 1px solid #edf1f6;

          display: flex;
          align-items: center;
          justify-content: center;

          background: rgba(255, 255, 255, 0.88);

          backdrop-filter: blur(12px);
        }

        .windowDots {
          position: absolute;
          left: 13px;
          top: 17px;
          display: flex;
          gap: 6px;
        }

        .windowDots span {
          width: 7px;
          height: 7px;
          border-radius: 999px;

          background: #c8d0dc;
        }

        .titleBox {
          text-align: center;
        }

        h1 {
          margin: 0;
          color: #4d5058;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.48em;
        }

        .titleBox p {
          margin: 2px 0 0;
          color: var(--text-sub);
          font-size: 9px;
          font-weight: 650;
          letter-spacing: 0.08em;
        }

        .topActions {
          position: absolute;
          right: 12px;
          top: 8px;
          display: flex;
          gap: 7px;
        }

        .iconButton {
          width: 29px;
          height: 29px;

          border-radius: 11px;

          border: 1px solid #e3e9f1;

          background: rgba(255, 255, 255, 0.96);

          color: #7d8796;

          font-size: 16px;

          line-height: 1;

          cursor: pointer;

          box-shadow:
            0 2px 8px rgba(148, 163, 184, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .iconButton.on {
          background: #fff;
          color: #5b8def;
        }

        .searchPopover {
          position: absolute;
          right: 78px;
          top: 8px;
          width: 170px;
          height: 29px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: #fff;
          box-shadow: 0 10px 24px var(--shadow);
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 9px;
          z-index: 20;
        }

        .searchPopover input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: none;
          background: transparent;
          font-size: 9px;
          font-weight: 650;
          color: var(--text-main);
        }

        .searchPopover button {
          border: 0;
          background: transparent;
          color: var(--text-sub);
          cursor: pointer;
          font-size: 12px;
          padding: 0;
        }

        .genreTabs {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
          padding: 8px 20px 5px;
        }

        .genreTab {
          height: 25px;
          min-width: 0;

          border-radius: 999px;
          border: 1px solid #e6ebf2;

          background: rgba(255, 255, 255, 0.92);

          color: #5f6b7a;

          font-size: 9px;
          font-weight: 750;

          cursor: pointer;

          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;

          transition: all 0.15s ease;
        }

        .genreTab.active {
          background: #f2f6fb;

          border-color: #d8e2ef;

          color: #53657d;

          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            0 4px 10px rgba(148, 163, 184, 0.08);
        }

        .genreTab span {
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #555861;
          flex-shrink: 0;
        }

        .statusTabs {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          align-items: center;
          padding: 3px 22px 10px;
          overflow: visible;
          flex: 0 0 auto;
        }

        .statusTabs::-webkit-scrollbar {
          display: none;
        }

        .statusTab {
          position: relative;
          height: 24px;
          padding: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          color: #98a2b3;
          font-size: 8.7px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .statusTab.active {
          color: #5b8def;
        }

        .statusTab.active::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: 1px;
          width: 22px;
          height: 2px;
          border-radius: 999px;
          background: #5b8def;
          transform: translateX(-50%);
        }

        .statusTab:not(:last-child)::before {
          content: '';
          position: absolute;
          right: 0;
          top: 7px;
          width: 1px;
          height: 10px;
          border-radius: 999px;
          background: #d7dce5;
          opacity: 0.75;
        }

        .booksArea {
          height: 300px;
          flex: 0 0 300px;
          padding: 0 14px;
          overflow: hidden;
        }

        .bookGrid {
          height: 100%;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-template-rows: repeat(2, 145px);
          gap: 10px 9px;
        }

        .bookCard {
          position: relative;

          height: 145px;

          border: 1px solid #e7ebf2;

          border-radius: 14px;

          background: rgba(255, 255, 255, 0.95);

          box-shadow:
            0 4px 12px rgba(148, 163, 184, 0.05),
            0 1px 2px rgba(148, 163, 184, 0.04);

          padding: 18px 9px 8px;

          overflow: hidden;

          display: flex;
          flex-direction: column;
        }

        .statusRibbon {
          position: absolute;
          left: 8px;
          top: 0;
          min-width: 36px;
          height: 21px;
          padding: 0 7px;
          border-radius: 0 0 4px 4px;
          color: #fff;
          font-size: 8.5px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
          z-index: 2;
        }

        .coverWrap {
          width: 50px;
          height: 70px;
          margin: 0 auto 8px;
          border-radius: 6px;
          overflow: hidden;
          background: #e8e8ea;
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.13);
        }

        .cover {
          width: 100%;
          height: 100%;
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
          color: var(--text-sub);
          font-size: 7px;
          font-weight: 800;
        }

        .bookTitle {
          display: block;
          width: 100%;
          border: 0;
          background: transparent;
          padding: 0;
          margin: 0 0 3px;
          text-align: left;
          color: var(--text-main);
          font-size: 9.5px;
          font-weight: 800;
          line-height: 1.3;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .bookTitle:hover {
          color: #5b8def;
        }

        .author {
          display: block;
          margin: 0 0 6px;
          color: var(--text-sub);
          font-size: 8.5px;
          font-weight: 650;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .bottomLine {
          margin-top: -2px;

          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4px;

          height: 16px;
        }

        .genrePill {
          max-width: 45px;
          height: 14px;
          padding: 0 6px;
          border-radius: 6px;
          font-size: 7.2px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex-shrink: 0;
        }

        .emptyGenre {
          color: var(--text-sub);
          background: #f3f4f6;
        }

        :global(.starRating) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 1px;
          min-width: 54px;
          height: 16px;
          border-radius: 999px;
          flex-shrink: 0;
        }

        :global(.starItem) {
          font-size: 10px;
          line-height: 1;
          font-family: Arial, sans-serif;
        }

        :global(.activeStar) {
          color: #f5a623;
          text-shadow: 0 1px 4px rgba(245, 166, 35, 0.22);
        }

        :global(.inactiveStar) {
          color: #d7dbe3;
        }

        .noRating {
          color: #b6bac3;
          font-size: 10px;
          font-weight: 750;
        }

        .empty {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-sub);
          font-size: 10px;
          font-weight: 700;
        }

        .empty.error {
          color: #f43f5e;
        }

        .footer {
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: 0 14px 10px;
          color: var(--text-sub);
          font-size: 9px;
          font-weight: 700;
          overflow: visible;
        }

        .footer p {
          margin: 0;
          height: 22px;
          line-height: 22px;
          display: flex;
          align-items: center;
          overflow: visible;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          height: 22px;
          line-height: 22px;
          overflow: visible;
        }

        .pagination span {
          height: 22px;
          line-height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
        }

        .pagination button,
        .refreshButton {
          width: 20px;
          height: 20px;
          border: 1px solid var(--border);
          border-radius: 7px;
          background: #fff;
          color: var(--text-sub);
          cursor: pointer;
          font-size: 10px;
          line-height: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .pagination button:disabled,
        .refreshButton:disabled {
          opacity: 0.4;
          cursor: default;
        }

        .refreshButton {
          justify-self: end;
        }

        .detailPanel {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 176px;
          height: calc(100% - 24px);
          border-radius: 16px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(18px);
          box-shadow: -8px 0 28px rgba(17, 24, 39, 0.14);
          z-index: 30;
          padding: 14px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .closeDetail {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 21px;
          height: 21px;
          border: 0;
          border-radius: 999px;
          background: #f3f4f6;
          color: #8b8f97;
          cursor: pointer;
          font-size: 13px;
        }

        .detailCover {
          width: 56px;
          height: 78px;
          margin-top: 8px;
          border-radius: 9px;
          overflow: hidden;
          background: #e8e8ea;
          box-shadow: 0 7px 16px rgba(0, 0, 0, 0.12);
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
          font-size: 8px;
          color: var(--text-sub);
          font-weight: 800;
        }

        .detailPanel h2 {
          width: 100%;
          margin: 10px 0 4px;
          text-align: center;
          color: var(--text-main);
          font-size: 11.5px;
          font-weight: 850;
          line-height: 1.3;
          word-break: keep-all;
        }

        .detailAuthor {
          margin: 0;
          color: var(--text-sub);
          font-size: 8.5px;
          font-weight: 700;
        }

        .detailMeta {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }

        .detailMeta span {
          height: 18px;
          padding: 0 8px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          font-weight: 800;
        }

        .detailInfoList {
          width: 100%;
          margin-top: 12px;
          display: grid;
          gap: 6px;
        }

        .detailInfoList div {
          min-height: 24px;
          border-radius: 8px;
          background: #f4f4f6;
          padding: 5px 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .detailInfoList span {
          color: var(--text-sub);
          font-size: 8px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .detailInfoList strong {
          min-width: 0;
          color: var(--text-main);
          font-size: 8.5px;
          font-weight: 850;
          text-align: right;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .openNotion {
          margin-top: auto;
          width: 100%;
          height: 30px;
          border-radius: 11px;
          border: 1px solid var(--border);
          background: #fff;
          color: var(--text-main);
          font-size: 9.5px;
          font-weight: 850;
          cursor: pointer;
          box-shadow: 0 5px 12px rgba(17, 24, 39, 0.08);
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
          background: #fff;
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
          border: 1px solid var(--border);
          background: #f7f7f8;
          color: var(--text-main);
        }

        .confirmButtons button:last-child {
          background: #eaf3ff;
          color: #5b8def;
        }

        .confirmButtons button:disabled {
          opacity: 0.55;
          cursor: default;
        }

        .mobileWidget .topBar {
          height: 43px;
          flex: 0 0 43px;
        }

        .mobileWidget h1 {
          font-size: 9.5px;
          letter-spacing: 0.38em;
        }

        .mobileWidget .topActions {
          right: 10px;
          top: 8px;
        }

        .mobileWidget .iconButton {
          width: 27px;
          height: 27px;
        }

        .mobileWidget .genreTabs {
          display: flex;
          gap: 7px;
          padding: 8px 12px 5px;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: none;
        }

        .mobileWidget .genreTabs::-webkit-scrollbar {
          display: none;
        }

        .mobileWidget .genreTab {
          flex: 0 0 auto;
          width: auto;
          min-width: 68px;
          padding: 0 13px;
        }

        .mobileWidget .statusTabs {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          align-items: center;
          gap: 0;
          padding: 3px 10px 10px;
          overflow: visible;
        }

        .mobileWidget .statusTabs::-webkit-scrollbar {
          display: none;
        }

        .mobileWidget .statusTab {
          position: relative;
          width: 100%;
          height: 24px;
          padding: 0;
          border: 0;
          background: transparent;
          color: #98a2b3;
          font-size: 8.3px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          text-align: center;
        }

        .mobileWidget .statusTab:not(:last-child)::before {
          content: '';
          position: absolute;
          right: 0;
          top: 7px;
          width: 1px;
          height: 10px;
          border-radius: 999px;
          background: #d7dce5;
          opacity: 0.75;
          display: block;
        }

        .mobileWidget .statusTab.active {
          color: #5b8def;
        }

        .mobileWidget .statusTab.active::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: 1px;
          width: 22px;
          height: 2px;
          border-radius: 999px;
          background: #5b8def;
          transform: translateX(-50%);
        }

        .mobileWidget .booksArea {
          height: 308px;
          flex: 0 0 308px;
          padding: 0 12px;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none;
        }

        .mobileWidget .booksArea::-webkit-scrollbar {
          display: none;
        }

        .mobileWidget .bookGrid {
          display: flex;
          flex-direction: column;
          gap: 9px;
          height: auto;
          padding-bottom: 8px;
        }

        .mobileWidget .bookCard {
          height: 82px;
          min-height: 82px;
          border-radius: 14px;
          padding: 9px 10px 9px 76px;
          display: block;
        }

        .mobileWidget .statusRibbon {
          left: 8px;
          top: 0;
          height: 19px;
          min-width: 34px;
          font-size: 7.8px;
        }

        .mobileWidget .coverWrap {
          position: absolute;
          left: 18px;
          top: 16px;
          width: 42px;
          height: 58px;
          margin: 0;
        }

        .mobileWidget .bookTitle {
          margin: 7px 0 3px;
          font-size: 10px;
          line-height: 1.25;
        }

        .mobileWidget .author {
          margin: 0 0 6px;
          font-size: 8.5px;
          line-height: 1.2;
        }

        .mobileWidget .bottomLine {
          margin-top: 0;
          height: 16px;
        }

        .mobileWidget .footer {
          height: 30px;
          flex: 0 0 30px;
          padding: 0 12px;
        }

        .mobileWidget .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }
      `}</style>
    </main>
  );
}
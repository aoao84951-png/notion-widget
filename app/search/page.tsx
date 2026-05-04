"use client";

import { useEffect, useState } from "react";

type Book = {
  title: string;
  author: string;
  cover: string;
  url: string;
};

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7.4V12L15.1 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g transform="translate(0 2.5)">
        <circle cx="10.5" cy="10.5" r="6.1" stroke="currentColor" strokeWidth="2.3" />
        <path
          d="M15.2 15.2L19.3 19.3"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 4.5H17.5C18.3 4.5 19 5.2 19 6V20.5H7.2C6.1 20.5 5 19.7 5 18.4V6.2C5 5.3 5.5 4.5 6 4.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M7.2 17.5H19" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export default function SearchPage() {
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeText = now.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const dateText = now
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();

  const handleSearch = async (value: string) => {
    setQuery(value);
    setMessage("");

    if (!value.trim()) {
      setBooks([]);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/ridi-search?q=${encodeURIComponent(value)}`);
      const data = await res.json();
      setBooks(data.books || []);
    } catch {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (book: Book) => {
    setMessage("Saving...");

    try {
      const res = await fetch("/api/ridi-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(book),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "저장 실패");
        return;
      }

      setMessage("✓ Saved!");
      setTimeout(() => setMessage(""), 1600);
    } catch {
      setMessage("저장 실패");
    }
  };

  return (
    <main className="page">
      <div className="widget">
        <div className="topbar">
          <div className="title">
            {isSearchMode ? <BookIcon /> : <ClockIcon />}
            <span>{isSearchMode ? "Search" : "RIDI SEARCH"}</span>
          </div>

          <div className="dots">
            <span />
            <span />
          </div>
        </div>

        {!isSearchMode ? (
          <section className="home">
            <div className="time">{timeText}</div>
            <div className="date">{dateText}</div>

            <button
              className="searchButton"
              onClick={() => setIsSearchMode(true)}
              aria-label="Click to search books"
            >
              <SearchIcon />
              <span>search</span>
            </button>
          </section>
        ) : (
          <section className="searchPage">
            <div className="searchHeader">
              <button
                className="back"
                onClick={() => {
                  setIsSearchMode(false);
                  setQuery("");
                  setBooks([]);
                  setMessage("");
                }}
                aria-label="back"
              >
                ←
              </button>

              <input
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search..."
                autoFocus
              />
            </div>

            <div className="resultArea">
              {message && <div className="message">{message}</div>}

              {!query && !message && (
                <div className="empty">
                  <div className="cloud">☁️</div>
                  <div>Search...</div>
                </div>
              )}

              {query && loading && <div className="empty">Searching...</div>}

              {query && !loading && books.length === 0 && (
                <div className="empty">검색 결과 없음</div>
              )}

              {!loading &&
                books.map((book, index) => (
                  <button
                    className="bookItem"
                    key={`${book.title}-${index}`}
                    onClick={() => handleSave(book)}
                  >
                    {book.cover ? (
                      <img src={book.cover} alt={book.title} />
                    ) : (
                      <div className="noCover" />
                    )}

                    <div className="bookInfo">
                      <div className="bookTitle">{book.title}</div>
                      <div className="author">{book.author}</div>
                    </div>
                  </button>
                ))}
            </div>
          </section>
        )}
      </div>

      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: #ffffff;
        }

        @media (prefers-color-scheme: dark) {
          html,
          body {
            background: #191919;
          }
        }

        #__next,
        main {
          background: transparent !important;
        }
      `}</style>

      <style jsx>{`
        .page {
          width: 100vw;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #ffffff;
          overflow: hidden;
          box-sizing: border-box;
        }

        @media (prefers-color-scheme: dark) {
          .page {
            background: #191919;
          }
        }

        .widget {
          width: 200px;
          height: 180px;
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          background: var(--bg);
          color: var(--text);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
          box-shadow: none;
          box-sizing: border-box;
        }

        .topbar {
          height: 26px;
          background: var(--topbar);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 10px;
          box-sizing: border-box;
        }

        .title {
          display: flex;
          gap: 5px;
          align-items: center;
          font-size: 9px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.02em;
          white-space: nowrap;
        }

        .title svg {
          width: 12px;
          height: 12px;
          flex-shrink: 0;
          color: var(--text);
        }

        .dots {
          display: flex;
          gap: 5px;
        }

        .dots span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--dot);
        }

        .home {
          height: 154px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding-top: 0px;
          box-sizing: border-box;
        }

        .time {
          font-size: 34px;
          line-height: 1;
          font-weight: 600;
          color: var(--time);
          margin-bottom: 7px;
          letter-spacing: -0.055em;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif;
        }

        .date {
          font-size: 11px;
          letter-spacing: 1.7px;
          color: var(--muted);
          font-weight: 600;
          margin-bottom: 35px;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
        }

        .searchButton {
          border: none;
          background: transparent;
          color: var(--text);
          font-size: 11px;
          font-weight: 400;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          line-height: 1;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
        }

        .searchButton svg {
          width: 12px;
          height: 12px;
          display: block;
        }

        .searchButton span {
          display: block;
        }

        .searchButton:hover,
        .searchButton:focus-visible {
          background: var(--button-hover);
          outline: none;
        }

        .searchPage {
          height: 154px;
          display: flex;
          flex-direction: column;
        }

        .searchHeader {
          height: 38px;
          border-bottom: 1px solid var(--line);
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 11px;
          box-sizing: border-box;
          flex-shrink: 0;
        }

        .back {
          width: 18px;
          min-width: 18px;
          border: none;
          background: transparent;
          font-size: 24px;
          color: var(--back);
          cursor: pointer;
          padding: 0;
          line-height: 1;
          transform: translateY(-1px);
        }

        input {
          flex: 1;
          height: 27px;
          border: 1px solid var(--input-border);
          border-radius: 5px;
          padding: 0 10px;
          font-size: 11px;
          color: var(--text);
          background: var(--input-bg);
          outline: none;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
        }

        input::placeholder {
          color: var(--placeholder);
        }

        input:focus {
          border-color: var(--input-border);
          box-shadow: none;
        }

        .resultArea {
          flex: 1;
          overflow-y: auto;
          padding: 9px 11px;
          box-sizing: border-box;
        }

        .resultArea::-webkit-scrollbar {
          width: 4px;
        }

        .resultArea::-webkit-scrollbar-thumb {
          background: var(--scroll);
          border-radius: 999px;
        }

        .message {
          text-align: center;
          font-size: 11px;
          color: var(--text);
          margin-bottom: 8px;
        }

        .empty {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-size: 12px;
          color: var(--text);
          gap: 6px;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
        }

        .cloud {
          font-size: 16px;
          line-height: 1;
          opacity: 0.9;
        }

        .bookItem {
          width: 100%;
          display: flex;
          gap: 9px;
          align-items: center;
          margin-bottom: 10px;
          cursor: pointer;
          border: none;
          background: transparent;
          text-align: left;
          padding: 0;
        }

        .bookItem img,
        .noCover {
          width: 34px;
          height: 47px;
          border-radius: 3px;
          object-fit: cover;
          background: var(--no-cover);
          flex-shrink: 0;
        }

        .bookInfo {
          min-width: 0;
          padding-top: 1px;
        }

        .bookTitle {
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .author {
          font-size: 11px;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        :global(:root) {
          --bg: #ffffff;
          --topbar: #eeeeee;
          --border: #dedede;
          --line: #eeeeee;
          --input-bg: #ffffff;
          --input-border: #e5e5e5;
          --placeholder: #c8c8c8;
          --text: #777777;
          --muted: #aaaaaa;
          --time: #858585;
          --dot: #c7c7c7;
          --back: #a8a8a8;
          --no-cover: #eaeaea;
          --scroll: #d6d6d6;
          --button-hover: #f0f0f0;
        }

        @media (prefers-color-scheme: dark) {
          :global(:root) {
            --bg: #191919;
            --topbar: #2f2f2f;
            --border: #3a3a3a;
            --line: #303030;
            --input-bg: #191919;
            --input-border: #3a3a3a;
            --placeholder: #777777;
            --text: #b8b8b8;
            --muted: #8e8e8e;
            --time: #a8a8a8;
            --dot: #777777;
            --back: #8e8e8e;
            --no-cover: #2f2f2f;
            --scroll: #555555;
            --button-hover: #2a2a2a;
          }
        }
      `}</style>
    </main>
  );
}
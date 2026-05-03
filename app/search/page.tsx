"use client";

import { useEffect, useState } from "react";

type Book = {
  title: string;
  author: string;
  cover: string;
  url: string;
};

export default function SearchPage() {
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
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

  const dateText = now.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const handleSearch = async (value: string) => {
    setQuery(value);
    setSaved(false);
    setError("");

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
    setSaved(false);
    setError("");

    try {
      const res = await fetch("/api/ridi-save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(book),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "저장 실패");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } catch {
      setError("저장 실패");
    }
  };

  return (
    <main className="page">
      <div className="widget">
        <div className="topbar">
          <div className="title">
            <span className="icon">{isSearchMode ? "▣" : "◷"}</span>
            <span>{isSearchMode ? "Lib" : "RIDI SEARCH"}</span>
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

            <button className="searchButton" onClick={() => setIsSearchMode(true)}>
              <span>⌕</span>
              search
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
                  setSaved(false);
                  setError("");
                }}
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
              {saved && <div className="saved">✓ Saved!</div>}
              {error && <div className="error">{error}</div>}

              {!query && (
                <div className="empty">
                  <div className="cloud">☁️</div>
                  <div>Search...</div>
                </div>
              )}

              {query && loading && (
                <div className="empty">
                  <div className="cloud">☁️</div>
                  <div>Searching...</div>
                </div>
              )}

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
          background: transparent;
        }
      `}</style>

      <style jsx>{`
        .page {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          background: transparent;
          overflow: hidden;
          padding-top: 8px;
          box-sizing: border-box;
        }

        .widget {
          width: 400px;
          height: 360px;
          min-width: 400px;
          max-width: 400px;
          min-height: 360px;
          max-height: 360px;
          border: 1px solid var(--border);
          border-radius: 20px;
          overflow: hidden;
          background: var(--bg);
          color: var(--text);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          box-shadow: none;
        }

        .topbar {
          height: 50px;
          background: var(--topbar);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 18px;
          box-sizing: border-box;
        }

        .title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
        }

        .dots {
          display: flex;
          gap: 8px;
        }

        .dots span {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--dot);
        }

        .home {
          height: 310px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .time {
          font-size: 66px;
          line-height: 1;
          font-weight: 700;
          color: var(--time);
          margin-bottom: 14px;
        }

        .date {
          font-size: 20px;
          letter-spacing: 3px;
          color: var(--muted);
          font-weight: 600;
          margin-bottom: 55px;
        }

        .searchButton {
          border: none;
          background: transparent;
          color: var(--text);
          font-size: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .searchPage {
          height: 310px;
          display: flex;
          flex-direction: column;
        }

        .searchHeader {
          height: 82px;
          border-bottom: 1px solid var(--line);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 24px;
          box-sizing: border-box;
          flex-shrink: 0;
        }

        .back {
          width: 34px;
          min-width: 34px;
          border: none;
          background: transparent;
          font-size: 34px;
          color: var(--back);
          cursor: pointer;
          line-height: 1;
          padding: 0;
        }

        input {
          width: 270px;
          height: 50px;
          border: 1px solid var(--input-border);
          border-radius: 8px;
          padding: 0 16px;
          font-size: 20px;
          color: var(--text);
          background: var(--input-bg);
          outline: none;
          box-sizing: border-box;
        }

        input::placeholder {
          color: var(--muted);
        }

        .resultArea {
          flex: 1;
          overflow-y: auto;
          padding: 18px 28px;
          box-sizing: border-box;
        }

        .saved,
        .error {
          text-align: center;
          font-size: 18px;
          color: var(--text);
          margin: 4px 0 18px;
        }

        .error {
          color: #d66;
        }

        .empty {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          font-size: 18px;
          color: var(--text);
        }

        .bookItem {
          width: 100%;
          display: flex;
          gap: 14px;
          align-items: center;
          margin-bottom: 18px;
          cursor: pointer;
          border: none;
          background: transparent;
          text-align: left;
          padding: 0;
        }

        .bookItem img,
        .noCover {
          width: 44px;
          height: 62px;
          border-radius: 4px;
          object-fit: cover;
          background: var(--no-cover);
          flex-shrink: 0;
        }

        .bookInfo {
          min-width: 0;
        }

        .bookTitle {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .author {
          font-size: 15px;
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
          --text: #777777;
          --muted: #aaaaaa;
          --time: #858585;
          --dot: #c7c7c7;
          --back: #b4b4b4;
          --no-cover: #eaeaea;
        }

        @media (prefers-color-scheme: dark) {
          :global(:root) {
            --bg: #191919;
            --topbar: #2f2f2f;
            --border: #3a3a3a;
            --line: #303030;
            --input-bg: #191919;
            --input-border: #3a3a3a;
            --text: #b8b8b8;
            --muted: #8e8e8e;
            --time: #a8a8a8;
            --dot: #777777;
            --back: #8e8e8e;
            --no-cover: #2f2f2f;
          }
        }
      `}</style>
    </main>
  );
}
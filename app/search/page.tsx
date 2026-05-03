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

  const dateText = now.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(book),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "저장 실패");
        return;
      }

      setMessage("✓ Saved!");
      setTimeout(() => setMessage(""), 1800);
    } catch {
      setMessage("저장 실패");
    }
  };

  return (
    <main className="page">
      <div className="widget">
        <div className="topbar">
          <div className="title">
            <span>{isSearchMode ? "▣" : "◷"}</span>
            <span>{isSearchMode ? "Lib" : "SOMLUTION"}</span>
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
              ⌕ search
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

              {!query && !message && <div className="empty">☁️<br />Search...</div>}
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
          background: transparent;
        }
      `}</style>

      <style jsx>{`
        .page {
            width: 100vw;
            height: 100vh;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: transparent;
            padding: 0;
            overflow: hidden;
            box-sizing: border-box;
          }

        .widget {
          width: 300px;
          height: 270px;
          min-width: 300px;
          max-width: 300px;
          min-height: 270px;
          max-height: 270px;
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          background: var(--bg);
          color: var(--text);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          box-shadow: none;
        }

        .topbar {
          height: 38px;
          background: var(--topbar);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 14px;
          box-sizing: border-box;
        }

        .title {
          display: flex;
          gap: 7px;
          align-items: center;
          font-size: 13px;
          font-weight: 700;
        }

        .dots {
          display: flex;
          gap: 7px;
        }

        .dots span {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--dot);
        }

        .home {
          height: 232px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .time {
          font-size: 48px;
          line-height: 1;
          font-weight: 700;
          color: var(--time);
          margin-bottom: 10px;
        }

        .date {
          font-size: 15px;
          letter-spacing: 3px;
          color: var(--muted);
          font-weight: 600;
          margin-bottom: 42px;
        }

        .searchButton {
          border: none;
          background: transparent;
          color: var(--text);
          font-size: 16px;
          cursor: pointer;
        }

        .searchPage {
          height: 232px;
          display: flex;
          flex-direction: column;
        }

        .searchHeader {
          height: 62px;
          border-bottom: 1px solid var(--line);
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          box-sizing: border-box;
          flex-shrink: 0;
        }

        .back {
          width: 28px;
          min-width: 28px;
          border: none;
          background: transparent;
          font-size: 28px;
          color: var(--back);
          cursor: pointer;
          padding: 0;
        }

        input {
          width: 220px;
          height: 40px;
          border: 1px solid var(--input-border);
          border-radius: 8px;
          padding: 0 12px;
          font-size: 16px;
          color: var(--text);
          background: var(--input-bg);
          outline: none;
          box-sizing: border-box;
        }

        .resultArea {
          flex: 1;
          overflow-y: auto;
          padding: 14px 18px;
          box-sizing: border-box;
        }

        .message {
          text-align: center;
          font-size: 15px;
          color: var(--text);
          margin-bottom: 12px;
        }

        .empty {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-size: 15px;
          color: var(--text);
        }

        .bookItem {
          width: 100%;
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 14px;
          cursor: pointer;
          border: none;
          background: transparent;
          text-align: left;
          padding: 0;
        }

        .bookItem img,
        .noCover {
          width: 42px;
          height: 58px;
          border-radius: 4px;
          object-fit: cover;
          background: var(--no-cover);
          flex-shrink: 0;
        }

        .bookInfo {
          min-width: 0;
        }

        .bookTitle {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .author {
          font-size: 14px;
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
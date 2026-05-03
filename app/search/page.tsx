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
          display: flex;
          justify-content: center;
          align-items: center;
          background: transparent;
        }

        /* 🔥 여기 핵심 (크기 변경) */
        .widget {
          width: 320px;
          height: 260px;
          border: 1px solid var(--border);
          border-radius: 13px;
          overflow: hidden;
          background: var(--bg);
          color: var(--text);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .topbar {
          height: 34px;
          background: var(--topbar);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
        }

        .title {
          display: flex;
          gap: 6px;
          align-items: center;
          font-size: 12px;
          font-weight: 700;
        }

        .dots {
          display: flex;
          gap: 6px;
        }

        .dots span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--dot);
        }

        .home {
          height: 226px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .time {
          font-size: 42px;
          font-weight: 700;
          margin-bottom: 10px;
        }

        .date {
          font-size: 13px;
          letter-spacing: 2px;
          margin-bottom: 36px;
        }

        .searchButton {
          font-size: 15px;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .searchPage {
          height: 226px;
          display: flex;
          flex-direction: column;
        }

        .searchHeader {
          height: 52px;
          border-bottom: 1px solid var(--line);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
        }

        .back {
          font-size: 22px;
          border: none;
          background: transparent;
          cursor: pointer;
        }

        input {
          width: 240px;
          height: 34px;
          border-radius: 7px;
          padding: 0 10px;
        }

        .resultArea {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .empty {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bookItem {
          display: flex;
          gap: 10px;
          margin-bottom: 12px;
          border: none;
          background: transparent;
          cursor: pointer;
        }

        .bookItem img,
        .noCover {
          width: 36px;
          height: 50px;
          border-radius: 4px;
        }

        .bookTitle {
          font-size: 13px;
          font-weight: 700;
        }

        .author {
          font-size: 11px;
        }

        :global(:root) {
          --bg: #ffffff;
          --topbar: #eeeeee;
          --border: #dedede;
          --line: #eeeeee;
          --text: #777777;
          --dot: #c7c7c7;
        }
      `}</style>
    </main>
  );
}
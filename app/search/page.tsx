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

    const res = await fetch("/api/ridi-save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(book),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
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

      <style jsx>{`
        html,
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }

        .page {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          overflow: hidden;
        }

        .widget {
          width: min(400px, calc(100vw - 8px));
          height: min(360px, calc(100vh - 8px));
          border: 1px solid #dedede;
          border-radius: 20px;
          overflow: hidden;
          background: #fff;
          color: #777;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
        }

        .topbar {
          height: 50px;
          background: #eeeeee;
          border-bottom: 1px solid #d9d9d9;
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
          color: #777;
        }

        .dots {
          display: flex;
          gap: 8px;
        }

        .dots span {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #c7c7c7;
        }

        .home {
          height: calc(100% - 50px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .time {
          font-size: clamp(48px, 13vw, 66px);
          line-height: 1;
          font-weight: 700;
          color: #858585;
          margin-bottom: 14px;
        }

        .date {
          font-size: clamp(16px, 4vw, 20px);
          letter-spacing: 3px;
          color: #aaa;
          font-weight: 600;
          margin-bottom: 55px;
        }

        .searchButton {
          border: none;
          background: transparent;
          color: #777;
          font-size: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .searchPage {
          height: calc(100% - 50px);
          display: flex;
          flex-direction: column;
        }

        .searchHeader {
          height: 82px;
          border-bottom: 1px solid #eeeeee;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 18px;
          box-sizing: border-box;
          flex-shrink: 0;
        }

        .back {
          width: 34px;
          min-width: 34px;
          border: none;
          background: transparent;
          font-size: 34px;
          color: #b4b4b4;
          cursor: pointer;
          line-height: 1;
          padding: 0;
        }

        input {
          width: 100%;
          height: 50px;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          padding: 0 16px;
          font-size: 20px;
          color: #777;
          outline: none;
          box-sizing: border-box;
          min-width: 0;
        }

        input::placeholder {
          color: #c8c8c8;
        }

        .resultArea {
          flex: 1;
          overflow-y: auto;
          padding: 18px 24px;
          box-sizing: border-box;
        }

        .saved {
          text-align: center;
          font-size: 18px;
          color: #777;
          margin: 4px 0 18px;
        }

        .empty {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          font-size: 18px;
          color: #777;
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
          background: #eaeaea;
          flex-shrink: 0;
        }

        .bookInfo {
          min-width: 0;
        }

        .bookTitle {
          font-size: 18px;
          font-weight: 700;
          color: #777;
          margin-bottom: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .author {
          font-size: 15px;
          color: #999;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";

type Book = {
  title: string;
  author: string;
  cover: string;
};

export default function SearchPage() {
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

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

  return (
    <main className="page">
      <div className="widget">
        <div className="topbar">
          <div className="title">
            <span className="icon">▣</span>
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
              <button className="back" onClick={() => setIsSearchMode(false)}>
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
                <div className="empty">
                  <div>검색 결과 없음</div>
                </div>
              )}

              {!loading &&
                books.map((book, index) => (
                  <div className="bookItem" key={`${book.title}-${index}`}>
                    {book.cover ? (
                      <img src={book.cover} alt={book.title} />
                    ) : (
                      <div className="noCover" />
                    )}

                    <div className="bookInfo">
                      <div className="bookTitle">{book.title}</div>
                      <div className="author">{book.author}</div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>

      <style jsx>{`
        .page {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
        }

        .widget {
          width: 400px;
          height: 360px;
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
          color: #858585;
          margin-bottom: 14px;
        }

        .date {
          font-size: 20px;
          letter-spacing: 3px;
          color: #aaa;
          font-weight: 600;
          margin-bottom: 60px;
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
          height: 310px;
          display: flex;
          flex-direction: column;
        }

        .searchHeader {
          height: 82px;
          border-bottom: 1px solid #eeeeee;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 0 24px;
          box-sizing: border-box;
        }

        .back {
          border: none;
          background: transparent;
          font-size: 34px;
          color: #b4b4b4;
          cursor: pointer;
          line-height: 1;
        }

        input {
          width: 270px;
          height: 50px;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          padding: 0 16px;
          font-size: 20px;
          color: #777;
          outline: none;
          box-sizing: border-box;
        }

        input::placeholder {
          color: #c8c8c8;
        }

        .resultArea {
          flex: 1;
          overflow-y: auto;
          padding: 18px 28px;
          box-sizing: border-box;
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
          display: flex;
          gap: 14px;
          align-items: center;
          margin-bottom: 18px;
          cursor: pointer;
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

        .bookTitle {
          font-size: 18px;
          font-weight: 700;
          color: #777;
          margin-bottom: 6px;
        }

        .author {
          font-size: 15px;
          color: #999;
        }
      `}</style>
    </main>
  );
}
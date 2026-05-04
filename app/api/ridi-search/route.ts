export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

type Book = {
  title: string;
  author: string;
  cover: string;
  url: string;
  totalCount?: string;
  bookType?: string;
  category?: string;
};

function makeCoverUrl(id: string) {
  if (!id) return "";
  return `https://img.ridicdn.net/cover/${id}/xxlarge?dpi=xxhdpi`;
}

function classifyCategory(item: any) {
  const text = [
    item.parent_category_name,
    item.parent_category_name2,
    item.category_name,
  ]
    .filter(Boolean)
    .join(" ");

  if (/BL|비엘/i.test(text)) return "BL";
  if (/로맨스판타지|로판/i.test(text)) return "RO-FAN";
  if (/로맨스/i.test(text)) return "ROMANCE";

  return "LITERATURE";
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");

  if (!query) {
    return NextResponse.json({ books: [] });
  }

  try {
    const ridiUrl = `https://ridibooks.com/apps/search/search?keyword=${encodeURIComponent(
      query
    )}&adult_exclude=n`;

    const res = await fetch(ridiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json, text/plain, */*",
        Referer: "https://ridibooks.com/",
      },
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("RIDI ERROR:", res.status, text.slice(0, 500));
      return NextResponse.json({ books: [] }, { status: 500 });
    }

    let data: any;

    try {
      data = JSON.parse(text);
    } catch {
      console.error("JSON 아님:", text.slice(0, 500));
      return NextResponse.json({ books: [] }, { status: 500 });
    }

    const rawItems = data?.books || [];

    const books: Book[] = rawItems.map((item: any) => {
      const id = item.b_id || item.book_id || item.id || "";

      return {
        title: item.title || item.web_title || "",
        category: classifyCategory(item),
        author: item.author || item.author2 || "",
        cover:
          item.cover ||
          item.cover_url ||
          item.thumbnail ||
          item.thumbnail_url ||
          item.image ||
          item.image_url ||
          makeCoverUrl(id),
        url: id ? `https://ridibooks.com/books/${id}` : "",
        totalCount: String(
          item.series_prices_info?.[0]?.book_count ||
            item.total_count ||
            item.book_count ||
            item.series_count ||
            item.series?.total_count ||
            ""
        ),
        bookType: Number(item.is_serial) === 1 ? "연재" : "이북",
      };
    });

    return NextResponse.json({
      books: books.filter((book) => book.title),
    });
  } catch (error) {
    console.error("RIDI SEARCH ERROR:", error);
    return NextResponse.json({ books: [] }, { status: 500 });
  }
}
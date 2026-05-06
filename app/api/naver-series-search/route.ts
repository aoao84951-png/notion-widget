export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

function decodeHtml(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(text: string) {
  return decodeHtml(text.replace(/<[^>]*>/g, ""));
}

function classifyCategory() {
  return "LITERATURE";
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");

  if (!query) {
    return NextResponse.json({ books: [] });
  }

  try {
    const url = `https://series.naver.com/search/search.series?t=all&fs=novel&q=${encodeURIComponent(
      query
    )}`;

    const res = await fetch(url, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
          Referer: "https://series.naver.com/novel/home.series",
          Cookie: process.env.NAVER_SERIES_COOKIE || "",
        },
      });

    const html = await res.text();

    if (!res.ok) {
      console.error("NAVER SERIES ERROR:", res.status, html.slice(0, 500));
      return NextResponse.json({ books: [] }, { status: 500 });
    }

    const liMatches = [...html.matchAll(/<li>[\s\S]*?<\/li>/g)];

    const books = liMatches
      .map((match) => {
        const li = match[0];

        const titleMatch = li.match(
          /<a[^>]+href="([^"]*detail\.series\?productNo=[^"]+)"[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/a>/
        );

        if (!titleMatch) return null;

        const detailPath = decodeHtml(titleMatch[1]);
        const rawTitle = stripTags(titleMatch[2]);

        const coverMatch = li.match(/<img[^>]+src="([^"]+)"/);
        const authorMatch = li.match(/<span class="author">([\s\S]*?)<\/span>/);
        const totalMatch = rawTitle.match(/\(총\s*([0-9]+)\s*(화|권)/);

        const cleanTitle = rawTitle.replace(/\s*\(총\s*[0-9]+(?:화|권)\/[^)]*\)\s*/g, "").trim();

        return {
          title: cleanTitle,
          author: authorMatch ? stripTags(authorMatch[1]) : "",
          cover: coverMatch ? decodeHtml(coverMatch[1]) : "",
          url: `https://series.naver.com${detailPath}`,
          totalCount: totalMatch ? totalMatch[1] : "",
          bookType: li.includes("N=a:com.title")
            ? rawTitle.includes("화")
              ? "웹툰"
              : "만화"
            : li.includes("N=a:nov.title")
            ? "웹소설"
            : li.includes("N=a:book.title")
            ? "이북"
            : "네이버시리즈",
          category: classifyCategory(),
          platform: "네이버시리즈",
        };
      })
      .filter(Boolean);

    return NextResponse.json({ books });
  } catch (error) {
    console.error("NAVER SERIES SEARCH ERROR:", error);
    return NextResponse.json({ books: [] }, { status: 500 });
  }
}
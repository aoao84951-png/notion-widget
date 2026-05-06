export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

function makeKakaoCoverUrl(thumbnail: string) {
  if (!thumbnail) return "";
  return `https://dn-img-page.kakao.com/download/resource?kid=${thumbnail}`;
}

function classifyCategory(item: any) {
  const text = [item.sub_category, item.category].filter(Boolean).join(" ");

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
    const kakaoUrl = `https://bff-page.kakao.com/api/gateway/api/v1/search/series?keyword=${encodeURIComponent(
        query
      )}&category_uid=0&is_complete=false&sort_type=ACCURACY&page=0&size=25`;

    const res = await fetch(kakaoUrl, {
        method: "GET",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          Origin: "https://page.kakao.com",
          Referer: `https://page.kakao.com/search/result?keyword=${encodeURIComponent(query)}`,
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
          "Sec-Fetch-Site": "same-site",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Dest": "empty",
        },
      });

    const text = await res.text();

    if (!res.ok) {
      console.error("KAKAO ERROR STATUS:", res.status);
      console.error("KAKAO ERROR TEXT:", text.slice(0, 500));
      return NextResponse.json({ books: [] }, { status: 500 });
    }

    if (!text.trim()) {
      console.error("KAKAO EMPTY RESPONSE");
      return NextResponse.json({ books: [] });
    }

    const data = JSON.parse(text);

    const rawItems = data?.result?.list || [];

    const books = rawItems.map((item: any) => ({
      title: item.title || "",
      author: item.authors || "",
      cover: makeKakaoCoverUrl(item.thumbnail || ""),
      url: item.series_id ? `https://page.kakao.com/content/${item.series_id}` : "",
      totalCount: item.free_slide_count ? String(item.free_slide_count) : "",
      bookType: item.category || "카카오페이지",
      category: classifyCategory(item),
      platform: "카카오페이지",
    }));

    return NextResponse.json({
      books: books.filter((book: any) => book.title),
    });
  } catch (error) {
    console.error("KAKAO SEARCH ERROR:", error);
    return NextResponse.json({ books: [] }, { status: 500 });
  }
}
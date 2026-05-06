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

async function getKakaoTotalCount(seriesId: number) {
  try {
    const url = `https://bff-page.kakao.com/api/gateway/api/v2/content/product/list?series_id=${seriesId}&cursor_index=0&cursor_direction=ANCHOR&window_size=6`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: `https://page.kakao.com/content/${seriesId}`,
        Accept: "application/json",
      },
    });

    const text = await res.text();

    console.log("카카오 상세 API 상태:", {
      seriesId,
      status: res.status,
      text: text.slice(0, 300),
    });

    const data = JSON.parse(text);

    return (
      data?.result?.total_count ||
      data?.result?.series_item?.on_sale_count ||
      ""
    );
  } catch (error) {
    console.log("카카오 총권수 가져오기 실패:", seriesId, error);
    return "";
  }
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

    console.log(JSON.stringify(rawItems[0], null, 2));

    const books = await Promise.all(
      rawItems.map(async (item: any) => {
        const totalCount = item.series_id
          ? await getKakaoTotalCount(item.series_id)
          : "";

        console.log("카카오 총권수 확인:", {
          title: item.title,
          series_id: item.series_id,
          totalCount,
        });
    
        return {
          title: item.title || "",
          author: item.authors || "",
          cover: makeKakaoCoverUrl(item.thumbnail || ""),
          url: item.series_id ? `https://page.kakao.com/content/${item.series_id}` : "",
          totalCount: totalCount ? String(totalCount) : "",
          bookType: item.category || "카카오페이지",
          category: classifyCategory(item),
          platform: "카카오페이지",
        };
      })
    );

    return NextResponse.json({
      books: books.filter((book: any) => book.title),
    });
  } catch (error) {
    console.error("KAKAO SEARCH ERROR:", error);
    return NextResponse.json({ books: [] }, { status: 500 });
  }
}
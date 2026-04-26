'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

type ReadingItem = {
  title: string;
  author: string | null;
  coverImage: string | null;
};

const THEME_COLOR_MAP: Record<string, string> = {
  sky: '#6C9AC4', pastel: '#8DB4CF', pink: '#DC4B84', dark: '#3A4458',
  wide: '#2E3D6F', purple: '#7B58D3', green: '#44A67B', yellow: '#F0B11D',
};

function pickThemeColor(input: string | null) {
  if (!input) return '#6C9AC4';
  const lower = input.toLowerCase();
  return THEME_COLOR_MAP[lower] || (input.startsWith('#') ? input : '#6C9AC4');
}

function HomeContent() {
  const searchParams = useSearchParams();
  const themeColor = searchParams.get('themeColor');
  
  const [items, setItems] = useState<ReadingItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const pointColor = useMemo(() => pickThemeColor(themeColor), [themeColor]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/notion');
        const data = await response.json();
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [items]);

  const data = items[currentIndex] ?? { title: '', author: '', coverImage: null };

  return (
    /* 핵심: bg-transparent로 배경을 완전히 날리고, min-h-screen을 제거하여 높이를 가변으로 만듭니다. */
    <main className="flex min-h-fit w-full items-center justify-center bg-transparent p-4">
      {/* 위젯 본체: 여기서만 하얀색 배경(bg-white/95)을 줍니다. */}
      <div className="flex w-[320px] flex-col items-center rounded-[35px] border border-white/50 bg-white/95 p-6 shadow-2xl backdrop-blur-md">
        
        {/* 상단바 */}
        <div className="mb-6 flex w-full items-center justify-between px-1">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
            <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
            <div className="h-3 w-3 rounded-full bg-[#28C840] opacity-30" />
          </div>
          <span className="text-[10px] font-black tracking-[0.2em] text-gray-400">MINIPLAY</span>
          <div className="w-8" />
        </div>

        {/* 커버 이미지 */}
        <div className="relative mb-6 aspect-square w-full rounded-[40px] overflow-hidden shadow-xl bg-gray-100/50">
          {data.coverImage ? (
            <div className="relative h-full w-full">
              <img src={data.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-40 scale-110" />
              <div className="relative h-full w-full p-4 flex items-center justify-center">
                <img src={data.coverImage} alt={data.title} className="h-full w-auto rounded-[20px] object-contain shadow-2xl" />
              </div>
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
              {loading ? 'LOADING...' : 'NO COVER'}
            </div>
          )}
        </div>

        {/* 재생 바 */}
        <div className="mb-5 w-full px-2">
          <div className="mb-2 flex justify-between text-[10px] font-medium text-gray-400">
            <span>02:50</span>
            <span>-01:25</span>
          </div>
          <div className="relative h-[3px] w-full rounded-full bg-gray-200">
            <div className="absolute h-full w-[70%] rounded-full" style={{ backgroundColor: pointColor }} />
          </div>
        </div>

        {/* 제목 및 정보 */}
        <div className="mb-8 text-center">
          <h2 className="text-sm font-bold text-gray-800 line-clamp-1">{data.title || '제목 없음'}</h2>
          <p className="mt-1 text-[11px] text-gray-500">{data.author || '저자 미상'}</p>
        </div>

        {/* 컨트롤 버튼 */}
        <div className="mb-8 flex items-center gap-8 text-gray-400">
          <SkipBack size={24} className="fill-current" />
          <Pause size={32} style={{ color: pointColor, fill: pointColor }} />
          <SkipForward size={24} className="fill-current" />
        </div>

        {/* 볼륨 바 */}
        <div className="flex w-full items-center gap-3 px-4">
          <VolumeX size={12} className="text-gray-400" />
          <div className="relative h-[3px] flex-grow rounded-full bg-gray-200">
            <div className="absolute h-full w-[40%] rounded-full" style={{ backgroundColor: pointColor }} />
          </div>
          <Volume2 size={12} className="text-gray-400" />
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
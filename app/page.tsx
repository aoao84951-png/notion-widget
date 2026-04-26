'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

type ReadingItem = {
  title: string; author: string | null; coverImage: string | null;
};

const THEME_COLOR_MAP: Record<string, string> = {
  sky: '#6C9AC4', pastel: '#8DB4CF', pink: '#DC4B84', dark: '#3A4458',
  wide: '#2E3D6F', purple: '#7B58D3', green: '#44A67B', yellow: '#F0B11D',
};

function HomeContent() {
  const searchParams = useSearchParams();
  const themeColor = searchParams.get('themeColor');
  const [items, setItems] = useState<ReadingItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const pointColor = useMemo(() => {
    if (!themeColor) return '#6C9AC4';
    return THEME_COLOR_MAP[themeColor.toLowerCase()] || (themeColor.startsWith('#') ? themeColor : '#6C9AC4');
  }, [themeColor]);

  useEffect(() => {
    fetch('/api/notion').then(res => res.json()).then(data => {
      setItems(Array.isArray(data?.items) ? data.items : []);
    });
  }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => setCurrentIndex(prev => (prev + 1) % items.length), 5000);
    return () => clearInterval(timer);
  }, [items]);

  const data = items[currentIndex] ?? { title: '', author: '', coverImage: null };

  return (
    /* [핵심] bg-transparent와 함께 opacity-0을 활용해 배경 이질감을 완전히 제거합니다. */
    <main className="fixed inset-0 flex h-full w-full items-center justify-center bg-transparent p-0 overflow-hidden !shadow-none">
      {/* 위젯 본체: shadow를 아예 제거하고 테두리만 남겨 다크모드에서도 깔끔하게 만듭니다. */}
      <div className="flex w-[320px] flex-col items-center rounded-[35px] border border-gray-100/50 bg-white p-6 shadow-none">
        
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
        <div className="relative mb-6 aspect-square w-full rounded-[40px] overflow-hidden bg-gray-50">
          {data.coverImage && (
            <div className="relative h-full w-full">
              <img src={data.coverImage} className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-20 scale-110" alt="" />
              <div className="relative h-full w-full p-4 flex items-center justify-center">
                <img src={data.coverImage} className="h-full w-auto rounded-[20px] object-contain" alt={data.title} />
              </div>
            </div>
          )}
        </div>

        {/* 정보 및 컨트롤 */}
        <div className="w-full">
          <div className="mb-5 w-full px-2">
            <div className="mb-2 flex justify-between text-[10px] font-medium text-gray-400">
              <span>02:50</span>
              <span>-01:25</span>
            </div>
            <div className="relative h-[3px] w-full rounded-full bg-gray-100">
              <div className="absolute h-full w-[70%] rounded-full" style={{ backgroundColor: pointColor }} />
            </div>
          </div>

          <div className="mb-8 text-center px-2">
            <h2 className="text-sm font-bold text-gray-800 line-clamp-1">{data.title || '로딩 중...'}</h2>
            <p className="mt-1 text-[11px] text-gray-500">{data.author}</p>
          </div>

          <div className="mb-8 flex items-center justify-center gap-8 text-gray-400">
            <SkipBack size={24} className="fill-current" />
            <Pause size={32} style={{ color: pointColor, fill: pointColor }} />
            <SkipForward size={24} className="fill-current" />
          </div>

          <div className="flex w-full items-center gap-3 px-4 pb-2">
            <VolumeX size={12} className="text-gray-400" />
            <div className="relative h-[3px] flex-grow rounded-full bg-gray-100">
              <div className="absolute h-full w-[40%] rounded-full" style={{ backgroundColor: pointColor }} />
            </div>
            <Volume2 size={12} className="text-gray-400" />
          </div>
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
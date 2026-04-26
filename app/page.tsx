'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

type ReadingItem = {
  title: string; author: string | null; coverImage: string | null;
};

// 포인트 컬러 맵은 유지합니다.
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
  // bgColor 관련 서치팜은 이제 무시합니다.
  const themeColor = searchParams.get('themeColor');
  
  const [items, setItems] = useState<ReadingItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const pointColor = useMemo(() => pickThemeColor(themeColor), [themeColor]);

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
    /* [수정 1] 배경색 변수를 다 지우고 bg-transparent로 고정합니다. */
    <main className="fixed inset-0 flex items-center justify-center bg-transparent p-0 overflow-hidden !shadow-none">
      {/* [수정 2] 위젯 본체: 하얀색 유리 느낌(bg-white/95 + backdrop-blur)을 고정으로 줍니다. 
                 다크 모드에서도 본체는 밝게 보입니다. */}
      <div className="flex w-[320px] flex-col items-center rounded-[35px] border border-white/20 bg-white/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl">
        
        <div className="mb-6 flex w-full items-center justify-between px-1">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
            <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
            <div className="h-3 w-3 rounded-full bg-[#28C840] opacity-30" />
          </div>
          <span className="text-[10px] font-black tracking-[0.2em] text-gray-400">MINIPLAY</span>
          <div className="w-8" />
        </div>

        <div className="relative mb-6 aspect-square w-full rounded-[40px] overflow-hidden bg-gray-50/50">
          {data.coverImage && (
            <div className="relative h-full w-full">
              <img src={data.coverImage} className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-40 scale-110" alt="" />
              <div className="relative h-full w-full p-4 flex items-center justify-center">
                <img src={data.coverImage} className="h-full w-auto rounded-[20px] object-contain shadow-2xl" alt={data.title} />
              </div>
            </div>
          )}
        </div>

        <div className="mb-5 w-full px-2">
          <div className="mb-2 flex justify-between text-[10px] font-medium text-gray-400">
            <span>02:50</span>
            <span>-01:25</span>
          </div>
          <div className="relative h-[3px] w-full rounded-full bg-gray-200">
            <div className="absolute h-full w-[70%] rounded-full" style={{ backgroundColor: pointColor }} />
          </div>
        </div>

        <div className="mb-8 text-center px-2">
          <h2 className="text-sm font-bold text-gray-800 line-clamp-1">{data.title || '로딩 중...'}</h2>
          <p className="mt-1 text-[11px] text-gray-500">{data.author}</p>
        </div>

        <div className="mb-8 flex items-center gap-8 text-gray-400">
          <SkipBack size={24} className="fill-current" />
          <Pause size={32} style={{ color: pointColor, fill: pointColor }} />
          <SkipForward size={24} className="fill-current" />
        </div>

        <div className="flex w-full items-center gap-3 px-4 pb-2">
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
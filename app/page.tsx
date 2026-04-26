'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { Pause, SkipBack, SkipForward, Volume2, RotateCw } from 'lucide-react';
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pointColor = useMemo(() => {
    if (!themeColor) return '#6C9AC4';
    return THEME_COLOR_MAP[themeColor.toLowerCase()] || (themeColor.startsWith('#') ? themeColor : '#6C9AC4');
  }, [themeColor]);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/notion', { cache: 'no-store' });
      const data = await response.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) { console.error(err); } 
    finally { setTimeout(() => setIsRefreshing(false), 500); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => setCurrentIndex(prev => (prev + 1) % items.length), 5000);
    return () => clearInterval(timer);
  }, [items]);

  const data = items[currentIndex] ?? { title: '', author: '', coverImage: null };
  const totalItems = items.length;
  const currentNumber = totalItems > 0 ? currentIndex + 1 : 0;

  return (
    <main className="fixed inset-0 flex h-full w-full items-center justify-center bg-white dark:bg-[#191919] p-0 overflow-hidden !shadow-none transition-colors duration-300">
      
      <div className="relative flex w-[230px] flex-col items-center rounded-[15px] bg-[#F8F8F8] p-3 border border-black/[0.06] overflow-hidden shadow-none">
        
        {/* 상단바 */}
        <div className="mb-2.5 flex w-full items-center justify-between px-0.5 relative">
          <div className="flex gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[#FF5F57] shadow-inner" />
            <div className="h-2 w-2 rounded-full bg-[#FEBC2E] shadow-inner" />
            <div className="h-2 w-2 rounded-full bg-[#28C840] opacity-15" />
          </div>
          <span className="text-[8px] font-black tracking-[0.1em] text-gray-400 absolute left-1/2 -translate-x-1/2 uppercase">MINIPLAY</span>
          
          <button onClick={fetchData} className="p-0.5 rounded-full hover:bg-black/5 active:scale-90">
            <RotateCw size={10} className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* 정사각형 커버 이미지 */}
        <div className="relative mb-4 aspect-square w-full rounded-[8px] overflow-hidden bg-white border border-black/[0.03] shadow-sm">
          {data.coverImage && (
            <img src={data.coverImage} className="h-full w-full object-cover" alt={data.title} />
          )}
        </div>

        <div className="w-full flex flex-col items-center">
          
          {/* 진행바 영역 */}
          <div className="mb-3.5 w-full">
            <div className="flex justify-between text-[7px] font-medium text-gray-400 mb-1 px-0.5">
              <span>02:50</span>
              <span>-01:25</span>
            </div>
            <div className="relative h-[2.5px] w-full rounded-full bg-black/[0.1]">
              <div className="absolute h-full rounded-full bg-[#666]" style={{ width: '70%' }} />
              <div className="absolute top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-white border border-black/[0.1] left-[70%] z-10 -translate-x-1/2 shadow-sm flex items-center justify-center">
                <div className="h-1 w-1 rounded-full" style={{ backgroundColor: pointColor }} />
              </div>
            </div>
          </div>

          {/* 정보 영역 */}
          <div className="mb-3.5 text-center px-1 w-full">
            <h2 className="text-[12px] font-bold text-[#222] leading-tight break-words whitespace-normal mb-0.5">
              {data.title || '로딩 중...'}
            </h2>
            <p className="text-[10px] text-[#666] font-medium leading-tight mb-0.5">
              {data.author || 'Unknown Author'}
            </p>
            {totalItems > 0 && (
              <p className="text-[9px] text-[#999] font-bold">
                ({currentNumber} / {totalItems})
              </p>
            )}
          </div>

          {/* [수정] 컨트롤 버튼 영역: 색상을 #aaa에서 더 진한 #666으로 변경 */}
          <div className="mb-4 flex items-center justify-center gap-7 text-[#666]">
            <SkipBack size={18} className="fill-current" />
            <Pause size={28} className="fill-current" />
            <SkipForward size={18} className="fill-current" />
          </div>

          {/* [수정] 볼륨 영역: 아이콘과 바 색상을 더 선명하게 조정 */}
          <div className="flex w-full items-center gap-1.5 px-0.5 pb-0.5">
            <Volume2 size={10} className="text-[#666]" />
            <div className="relative h-[2px] flex-grow rounded-full bg-black/[0.1]">
              <div className="absolute h-full rounded-full bg-[#666]" style={{ width: '40%' }} />
              <div className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-white border border-black/[0.1] left-[40%] z-10 -translate-x-1/2 shadow-sm" />
            </div>
            <Volume2 size={10} className="text-[#666] opacity-40" />
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
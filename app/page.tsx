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
    /* [배경색 최적화] 
       - bg-white: 라이트 모드 (노션 기본 흰색 배경과 일치)
       - dark:bg-[#191919]: 다크 모드 (노션 다크 모드 배경색과 완벽 일치)
       - !shadow-none: 배경 자체에 생길 수 있는 모든 그림자 강제 제거
    */
    <main className="fixed inset-0 flex h-full w-full items-center justify-center bg-white dark:bg-[#191919] p-0 overflow-hidden !shadow-none transition-colors duration-300">
      
      {/* [위젯 본체] 
          - shadow 관련 코드를 모두 삭제하여 그림자를 완전히 없앴습니다. 
          - border-black/10: 아주 연한 테두리만 남겨 라이트 모드에서 경계를 구분합니다.
      */}
      <div className="relative flex w-[230px] flex-col items-center rounded-[10px] bg-[#F2F2F2] p-3 border border-black/10 overflow-hidden shadow-none">
        
        {/* 상단바 */}
        <div className="mb-2.5 flex w-full items-center justify-between px-0.5 relative">
          <div className="flex gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[#FF5F57]" />
            <div className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
            <div className="h-2 w-2 rounded-full bg-[#28C840] opacity-20" />
          </div>
          <span className="text-[8px] font-black tracking-[0.1em] text-gray-400 absolute left-1/2 -translate-x-1/2 uppercase">MINIPLAY</span>
          
          <button onClick={fetchData} className="p-0.5 rounded-full hover:bg-black/5 active:scale-90">
            <RotateCw size={10} className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* 커버 이미지 */}
        <div className="relative mb-3 aspect-square w-full rounded-[6px] overflow-hidden bg-white border border-black/5">
          {data.coverImage && (
            <img src={data.coverImage} className="h-full w-full object-cover" alt={data.title} />
          )}
        </div>

        <div className="w-full flex flex-col items-center">
          
          {/* 프로그레스 바 영역 */}
          <div className="mb-3 w-full">
            <div className="flex justify-between text-[7px] font-medium text-gray-400 mb-0.5 px-0.5">
              <span>02:50</span>
              <span>-01:25</span>
            </div>
            <div className="relative h-[2px] w-full rounded-full bg-gray-300/60 overflow-hidden">
              <div className="absolute h-full rounded-full bg-[#555]" style={{ width: '70%' }} />
              <div className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-white border border-black/5 left-[70%] z-10 -translate-x-1/2" style={{ backgroundColor: pointColor }} />
            </div>
          </div>

          {/* 제목 및 저자 정보 (줄바꿈 적용) */}
          <div className="mb-3 text-center px-1 w-full">
            <h2 className="text-[11px] font-bold text-[#333] leading-tight break-words whitespace-normal mb-0.5">
              {data.title || '로딩 중...'}
            </h2>
            <p className="text-[9px] text-[#888] font-medium leading-tight">
              {data.author || 'Unknown Author'}
            </p>
            {totalItems > 0 && (
              <p className="text-[8px] text-[#aaa] font-bold mt-0.5">
                ({currentNumber} / {totalItems})
              </p>
            )}
          </div>

          {/* 컨트롤 영역 */}
          <div className="mb-3 flex items-center justify-center gap-7 text-[#555]">
            <SkipBack size={16} className="fill-current" />
            <Pause size={24} className="fill-current" />
            <SkipForward size={16} className="fill-current" />
          </div>

          {/* 볼륨 영역 */}
          <div className="flex w-full items-center gap-1.5 px-0.5 pb-0.5">
            <Volume2 size={10} className="text-[#888]" />
            <div className="relative h-[2px] flex-grow rounded-full bg-gray-300/60 overflow-hidden">
              <div className="absolute h-full rounded-full bg-[#555]" style={{ width: '40%' }} />
              <div className="absolute top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-white border border-black/5 left-[40%] z-10 -translate-x-1/2" style={{ backgroundColor: pointColor }} />
            </div>
            <Volume2 size={10} className="text-[#888] opacity-50" />
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
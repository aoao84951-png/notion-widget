'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { Pause, SkipBack, SkipForward, Volume2, VolumeX, RotateCw } from 'lucide-react';
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
    const lower = themeColor.toLowerCase();
    return THEME_COLOR_MAP[lower] || (themeColor.startsWith('#') ? themeColor : '#6C9AC4');
  }, [themeColor]);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/notion', { cache: 'no-store' });
      const data = await response.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => setCurrentIndex(prev => (prev + 1) % items.length), 5000);
    return () => clearInterval(timer);
  }, [items]);

  const data = items[currentIndex] ?? { title: '', author: '', coverImage: null };
  const totalItems = items.length;
  const currentNumber = totalItems > 0 ? currentIndex + 1 : 0;

  return (
    /* [핵심 수정] 
       - bg-white: 기본 라이트 모드 배경 (하얀색)
       - dark:bg-[#191919]: 다크 모드일 때만 노션 배경색으로 자동 전환
    */
    <main className="fixed inset-0 flex h-full w-full items-center justify-center bg-white dark:bg-[#191919] p-0 overflow-hidden shadow-none transition-colors duration-300">
      
      {/* 위젯 본체 */}
      <div className="relative flex w-[320px] flex-col items-center rounded-[35px] border-2 border-gray-200 bg-white p-6 shadow-none overflow-hidden">
        
        <div className="mb-6 flex w-full items-center justify-between px-1">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
            <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
            <div className="h-3 w-3 rounded-full bg-[#28C840] opacity-30" />
          </div>
          <span className="text-[10px] font-black tracking-[0.2em] text-gray-400">MINIPLAY</span>
          
          <button 
            onClick={fetchData}
            className="p-1 rounded-full hover:bg-gray-100 transition-all active:scale-95"
            title="새로고침"
          >
            <RotateCw size={14} className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="relative mb-6 aspect-square w-full rounded-[40px] overflow-hidden bg-gray-50 shadow-inner">
          {data.coverImage && (
            <div className="relative h-full w-full">
              <img src={data.coverImage} className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-40 scale-110" alt="" />
              <div className="relative h-full w-full p-4 flex items-center justify-center">
                <img src={data.coverImage} className="h-full w-auto rounded-[20px] object-contain shadow-2xl" alt={data.title} />
              </div>
            </div>
          )}
        </div>

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
            <h2 className="text-sm font-bold text-gray-800 break-words whitespace-normal leading-tight">
              {data.title || '로딩 중...'}
            </h2>
            <p className="mt-1 text-[11px] text-gray-500">{data.author || '저자 미상'}</p>
            {totalItems > 0 && (
              <p className="mt-1 text-[10px] font-medium text-gray-400">
                ({currentNumber} / {totalItems})
              </p>
            )}
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
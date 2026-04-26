'use client';

import { useEffect, useMemo, useState, Suspense } from 'react'; // 1. Suspense 추가
import { Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

type ReadingItem = {
  title: string;
  author: string | null;
  coverImage: string | null;
};

const THEME_COLOR_MAP: Record<string, string> = {
  sky: '#6C9AC4',
  pastel: '#8DB4CF',
  pink: '#DC4B84',
  dark: '#3A4458',
  wide: '#2E3D6F',
  purple: '#7B58D3',
  green: '#44A67B',
  yellow: '#F0B11D',
};

const DEFAULT_THEME_COLOR = '#6C9AC4';

function pickThemeColor(input: string | null) {
  if (!input) return DEFAULT_THEME_COLOR;
  const lower = input.toLowerCase();
  if (THEME_COLOR_MAP[lower]) return THEME_COLOR_MAP[lower];
  if (/^#([0-9a-fA-F]{6})$/.test(input)) return input;
  return DEFAULT_THEME_COLOR;
}

// 2. 기존 Home의 내용을 HomeContent라는 이름으로 옮겼습니다.
function HomeContent() {
  const searchParams = useSearchParams();

  const themeColor = searchParams.get('themeColor');
  const darkMode = searchParams.get('darkMode') === 'true';

  const [items, setItems] = useState<ReadingItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pointColor = useMemo(() => pickThemeColor(themeColor), [themeColor]);
  const backgroundColor = darkMode ? '#191919' : '#E5E7EB';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/notion');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || '데이터를 불러오지 못했어요.');
        }

        setItems(Array.isArray(data?.items) ? data.items : []);
        setCurrentIndex(0);
      } catch (err) {
        setItems([]);
        setError(err instanceof Error ? err.message : '노션 조회 중 오류가 발생했어요.');
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

  const currentItem = items[currentIndex] ?? {
    title: '',
    author: '',
    coverImage: null,
  };
  const data = currentItem;

  return (
    <main className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor }}>
      <div className="flex w-[320px] flex-col items-center rounded-[35px] border border-white/50 bg-white/80 p-6 shadow-2xl backdrop-blur-md">
        {/* 상단 윈도우 컨트롤 & 제목 */}
        <div className="mb-6 flex w-full items-center justify-between px-1">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
            <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
            <div className="h-3 w-3 rounded-full bg-[#28C840] opacity-30" />
          </div>
          <span className="relative left-[-15px] text-[10px] font-black tracking-[0.2em] text-gray-400">MINIPLAY</span>
          <div className="w-8" />
        </div>

        {/* 중앙 이미지 박스 */}
        <div 
          className="relative mb-6 aspect-square w-full max-w-[280px] mx-auto rounded-[40px] border border-white/20 shadow-2xl bg-transparent"
          style={{ 
            overflow: 'hidden', 
            isolation: 'isolate',
            WebkitMaskImage: '-webkit-radial-gradient(white, black)'
          }}
        >
          {data?.coverImage ? (
            <div className="relative flex h-full w-full items-center justify-center">
              <img
                src={data.coverImage}
                alt=""
                className="absolute inset-0 h-full w-full object-cover blur-3xl opacity-60 scale-110"
              />
              <div className="relative flex h-full w-full items-center justify-center p-3">
                <img
                  src={data.coverImage}
                  alt={`${data.title} cover`}
                  className="h-full w-auto max-w-none rounded-[25px] object-contain drop-shadow-2xl border border-white/15"
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-[40px] text-xs font-semibold text-gray-500 bg-gray-200/20">
              {loading ? '로딩 중...' : 'COVER IMAGE'}
            </div>
          )}
        </div>

        {/* 곡 정보/재생바/버튼 등 하단 영역 */}
        <div className="mb-5 w-full px-2">
          <div className="mb-2 flex justify-between text-[10px] font-medium text-gray-400">
            <span>02:50</span>
            <span>-01:25</span>
          </div>
          <div className="relative h-[3px] w-full rounded-full bg-gray-200">
            <div className="absolute left-0 top-0 h-full w-[70%] rounded-full" style={{ backgroundColor: pointColor }} />
            <div className="absolute left-[70%] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-gray-200 bg-white shadow-sm" />
          </div>
        </div>

        <div className="mb-8 text-center">
          <h2 className="flex items-center justify-center gap-1 text-sm font-semibold text-gray-700">
            {data?.title}
          </h2>
          <p className="mt-1 text-[11px] text-gray-500">{data?.author || '로딩 중...'}</p>
          {items.length > 1 && <p className="mt-1 text-[10px] text-gray-400">({currentIndex + 1} / {items.length})</p>}
          {error && <p className="mt-2 max-w-[250px] text-[11px] text-[#D9534F]">{error}</p>}
        </div>

        <div className="mb-8 flex items-center gap-8">
          <SkipBack size={24} className="fill-gray-400 text-gray-400" />
          <Pause size={32} style={{ color: pointColor, fill: pointColor }} />
          <SkipForward size={24} className="fill-gray-400 text-gray-400" />
        </div>

        <div className="flex w-full items-center gap-3 px-4">
          <VolumeX size={12} className="text-gray-400" />
          <div className="relative h-[3px] flex-grow rounded-full bg-gray-200">
            <div className="absolute left-0 top-0 h-full w-[40%] rounded-full" style={{ backgroundColor: pointColor }} />
            <div className="absolute left-[40%] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-gray-200 bg-white shadow-sm" />
          </div>
          <Volume2 size={12} className="text-gray-400" />
        </div>
      </div>
    </main>
  );
}

// 3. 마지막에 Suspense로 감싼 진짜 Home을 내보냅니다.
export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
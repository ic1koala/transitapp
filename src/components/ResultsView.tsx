import React, { useState } from 'react';
import { Train, Bus, Compass, ChevronDown, ChevronUp } from 'lucide-react';
import { DarkMap } from './DarkMap';

interface Leg {
  kind: 'transit' | 'walk';
  routeName?: string;
  mode?: string;
  color?: string;
  headsign?: string;
  from: {
    id: string;
    name: string;
    platformCode?: string;
  };
  to: {
    id: string;
    name: string;
    platformCode?: string;
  };
  departureSecs: number;
  arrivalSecs: number;
}

interface Option {
  id: string;
  rank: number;
  recommended: boolean;
  selectedFor?: string;
  metrics: {
    durationSecs: number;
    transitSecs: number;
    walkSecs: number;
    waitSecs: number;
    transferCount: number;
    fare?: {
      currency: string;
      ticket: number;
      ic?: number;
    };
  };
  journey: {
    departureSecs: number;
    arrivalSecs: number;
    durationSecs: number;
    transferCount: number;
    legs: Leg[];
  };
  map: {
    bounds: {
      minLat: number;
      minLon: number;
      maxLat: number;
      maxLon: number;
    };
    points: {
      id: string;
      name: string;
      lat: number;
      lon: number;
      role: 'origin' | 'destination' | 'stop' | 'transfer';
    }[];
    segments: {
      kind: 'walk' | 'transit';
      fromPointId: string;
      toPointId: string;
      routeName?: string;
      color?: string;
      polyline: { lat: number; lon: number; }[];
    }[];
  };
}

interface ResultsViewProps {
  options: Option[];
  fromName: string;
  toName: string;
  onBack: () => void;
}

const formatTime = (seconds: number): string => {
  const isNegative = seconds < 0;
  const absSeconds = Math.abs(seconds);
  const totalMinutes = Math.floor(absSeconds / 60);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  
  const formattedHours = isNegative ? `-${hours}` : String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  return `${formattedHours}:${formattedMinutes}`;
};

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}時間${remainingMinutes}分`;
  }
  return `${minutes}分`;
};

export const ResultsView: React.FC<ResultsViewProps> = ({ options, fromName, toName, onBack }) => {
  const [activeOptionId, setActiveOptionId] = useState<string>(options[0]?.id || '');

  const activeOption = options.find(opt => opt.id === activeOptionId);

  const getModeIcon = (mode?: string, size = 16) => {
    switch (mode?.toLowerCase()) {
      case 'bus':
      case 'trolleybus':
        return <Bus size={size} />;
      case 'walk':
        return <Compass size={size} className="text-gray-400" />;
      default:
        return <Train size={size} />;
    }
  };

  // Yahoo乗換案内風の「早」「安」「楽」ラベルのレンダリング
  const renderYahooBadges = (option: Option) => {
    const badges = [];

    // 早 (最速)
    if (option.selectedFor === 'fastest') {
      badges.push(
        <span
          key="fast"
          className="text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center text-white"
          style={{ backgroundColor: '#f3727f' }} // Negative Red
          title="早い"
        >
          早
        </span>
      );
    }
    
    // 安 (最安)
    if (option.selectedFor === 'lowestFare') {
      badges.push(
        <span
          key="cheap"
          className="text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center text-white"
          style={{ backgroundColor: '#ffa42b' }} // Warning Orange
          title="安い"
        >
          安
        </span>
      );
    }
    
    // 楽 (乗換最少)
    if (option.selectedFor === 'fewestTransfers') {
      badges.push(
        <span
          key="easy"
          className="text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center text-white"
          style={{ backgroundColor: '#539df5' }} // Announcement Blue
          title="楽"
        >
          楽
        </span>
      );
    }

    // おすすめ
    if (option.recommended) {
      badges.push(
        <span
          key="rec"
          className="text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 text-black"
          style={{ backgroundColor: 'var(--accent)' }} // Spotify Green
        >
          おすすめ
        </span>
      );
    }

    return badges.length > 0 ? (
      <div className="flex gap-1.5 items-center">{badges}</div>
    ) : null;
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ height: '100%' }}>
      {/* ヘッダー */}
      <div className="header-container border-b border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="header-title" style={{ fontSize: '20px' }}>経路検索結果</h2>
          <p className="header-subtitle">{fromName} ➔ {toName}</p>
        </div>
        <button className="btn-pill" onClick={onBack}>
          検索に戻る
        </button>
      </div>

      {/* メインスクロールビュー */}
      <div className="flex-1 overflow-y-auto px-4 py-2" style={{ paddingBottom: '100px' }}>
        {/* マップ */}
        {activeOption && (
          <DarkMap
            points={activeOption.map.points}
            segments={activeOption.map.segments}
            bounds={activeOption.map.bounds}
          />
        )}

        {/* 経路リスト (Yahoo風) */}
        <div className="mt-4 space-y-3">
          {options.map((option) => {
            const isActive = option.id === activeOptionId;
            const startTime = formatTime(option.journey.departureSecs);
            const endTime = formatTime(option.journey.arrivalSecs);
            const duration = formatDuration(option.metrics.durationSecs);
            const ticketFare = option.metrics.fare?.ticket;

            return (
              <div
                key={option.id}
                className="rounded-lg p-4 cursor-pointer transition-all"
                style={{
                  backgroundColor: isActive ? 'var(--bg-card)' : 'var(--bg-surface)',
                  border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
                  boxShadow: 'var(--shadow-medium)'
                }}
                onClick={() => setActiveOptionId(option.id)}
              >
                {/* 経路カードヘッダー (Yahoo風アイコンと時間・運賃) */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    {/* 早安楽バッジ */}
                    {renderYahooBadges(option)}
                    
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xl font-black text-white">{startTime} ➔ {endTime}</span>
                      <span className="text-xs text-accent font-bold" style={{ color: 'var(--accent)' }}>{duration}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {ticketFare !== undefined && (
                      <span className="text-lg font-black text-white">{ticketFare.toLocaleString()}円</span>
                    )}
                    <div className="text-xs text-gray-400 mt-1">乗換 {option.metrics.transferCount}回</div>
                  </div>
                </div>

                {/* 路線アイコンのタイムライン概要 */}
                <div className="flex items-center gap-1.5 mt-3 overflow-x-auto py-1 text-xs">
                  {option.journey.legs.map((leg, lIdx) => (
                    <React.Fragment key={lIdx}>
                      {lIdx > 0 && <span className="text-gray-600 text-[10px]">▶</span>}
                      <div
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold"
                        style={{
                          backgroundColor: leg.kind === 'walk' ? 'transparent' : (leg.color || '#333333'),
                          color: leg.kind === 'walk' ? 'var(--text-muted)' : '#ffffff',
                          border: leg.kind === 'walk' ? '1px dashed var(--border-gray)' : 'none'
                        }}
                      >
                        {getModeIcon(leg.mode, 11)}
                        <span className="text-[10px]">{leg.kind === 'walk' ? '徒歩' : leg.routeName}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                {/* アコーディオンタイムライン詳細 (Yahoo乗換案内の路線タイムラインを再現) */}
                {isActive && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-4">経路詳細タイムライン</h4>
                    
                    <div className="relative pl-8 space-y-0">
                      {option.journey.legs.map((leg, lIdx) => {
                        const isLastLeg = lIdx === option.journey.legs.length - 1;
                        const legDuration = formatDuration(leg.arrivalSecs - leg.departureSecs);
                        
                        // 路線カラーの設定
                        const lineCol = leg.kind === 'walk' ? 'dashed' : (leg.color || 'var(--border-gray)');

                        // 乗車駅と路線・移動のレンダリング
                        return (
                          <div key={lIdx} className="relative">
                            
                            {/* 1. 乗車駅の描画 */}
                            <div className="flex items-start justify-between min-h-[40px]">
                              {/* タイムライン縦ライン（次の駅へつなぐ） */}
                              <div
                                className="absolute left-[-24px] top-[10px] bottom-[-30px] w-[6px]"
                                style={{
                                  borderLeft: leg.kind === 'walk' ? '3px dashed var(--border-gray)' : `6px solid ${lineCol}`,
                                  borderRadius: '3px',
                                  zIndex: 1
                                }}
                              />

                              {/* 駅ドット */}
                              <div
                                className="absolute left-[-29px] top-[4px] w-[16px] h-[16px] rounded-full bg-var-bg-base border-4 z-10"
                                style={{
                                  borderColor: leg.kind === 'walk' ? 'var(--border-gray)' : (leg.color || 'var(--accent)'),
                                  backgroundColor: 'var(--bg-base)'
                                }}
                              />

                              <div>
                                <div className="text-sm font-black text-white flex items-center gap-2">
                                  <span>{leg.from.name}</span>
                                  {leg.from.platformCode && (
                                    <span className="text-[10px] bg-gray-800 text-gray-400 px-1 rounded">{leg.from.platformCode}番線発</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs font-black text-white">{formatTime(leg.departureSecs)}</div>
                            </div>

                            {/* 2. 移動手段・路線の描画 */}
                            <div className="pl-2 py-4 min-h-[50px] flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-1 rounded bg-[#2c2c2c] text-white">
                                  {getModeIcon(leg.mode, 14)}
                                </div>
                                <div className="text-xs">
                                  <div className="font-black text-white">
                                    {leg.kind === 'walk' ? '徒歩' : `${leg.routeName} ${leg.headsign ? `(${leg.headsign}行)` : ''}`}
                                  </div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">所要時間: {legDuration}</div>
                                </div>
                              </div>
                            </div>

                            {/* 3. 降車駅（最後のレグ、または乗り換え駅の描画） */}
                            {isLastLeg && (
                              <div className="relative flex items-start justify-between min-h-[40px] pt-2">
                                {/* 駅ドット */}
                                <div
                                  className="absolute left-[-29px] top-[10px] w-[16px] h-[16px] rounded-full bg-var-bg-base border-4 z-10"
                                  style={{
                                    borderColor: 'var(--accent)',
                                    backgroundColor: 'var(--bg-base)'
                                  }}
                                />
                                <div>
                                  <div className="text-sm font-black text-white flex items-center gap-2">
                                    <span>{leg.to.name}</span>
                                    {leg.to.platformCode && (
                                      <span className="text-[10px] bg-gray-800 text-gray-400 px-1 rounded">{leg.to.platformCode}番線着</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs font-black text-white">{formatTime(leg.arrivalSecs)}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* 展開矢印 */}
                <div className="flex justify-center mt-2 text-gray-600">
                  {isActive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

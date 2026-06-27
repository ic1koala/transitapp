import React, { useState } from 'react';
import { Train, Bus, Compass, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
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
  searchTimeLabel: string;
  onBack: () => void;
  onOffsetSearch: (offsetMinutes: number) => void;
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

export const ResultsView: React.FC<ResultsViewProps> = ({
  options,
  fromName,
  toName,
  searchTimeLabel,
  onBack,
  onOffsetSearch
}) => {
  const [activeOptionId, setActiveOptionId] = useState<string>(options[0]?.id || '');
  const [sortStrategy, setSortStrategy] = useState<'duration' | 'transfers' | 'fare'>('duration');

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

  // 表示オプションをソート (Yahoo乗換案内のソートロジック)
  const sortedOptions = [...options].sort((a, b) => {
    if (sortStrategy === 'duration') {
      return a.metrics.durationSecs - b.metrics.durationSecs;
    } else if (sortStrategy === 'transfers') {
      return a.metrics.transferCount - b.metrics.transferCount;
    } else if (sortStrategy === 'fare') {
      const fareA = a.metrics.fare?.ticket ?? 999999;
      const fareB = b.metrics.fare?.ticket ?? 999999;
      return fareA - fareB;
    }
    return 0;
  });

  const activeOption = sortedOptions.find(opt => opt.id === activeOptionId) || sortedOptions[0];

  const renderYahooBadges = (option: Option) => {
    const badges = [];

    if (option.selectedFor === 'fastest') {
      badges.push(
        <span
          key="fast"
          className="text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center text-white"
          style={{ backgroundColor: '#f3727f', width: '20px', height: '20px', borderRadius: '50%' }}
        >
          早
        </span>
      );
    }
    
    if (option.selectedFor === 'lowestFare') {
      badges.push(
        <span
          key="cheap"
          className="text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center text-white"
          style={{ backgroundColor: '#ffa42b', width: '20px', height: '20px', borderRadius: '50%' }}
        >
          安
        </span>
      );
    }
    
    if (option.selectedFor === 'fewestTransfers') {
      badges.push(
        <span
          key="easy"
          className="text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center text-white"
          style={{ backgroundColor: '#539df5', width: '20px', height: '20px', borderRadius: '50%' }}
        >
          楽
        </span>
      );
    }

    if (option.recommended) {
      badges.push(
        <span
          key="rec"
          className="text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 text-black"
          style={{ backgroundColor: 'var(--accent)', borderRadius: '999px', padding: '2px 8px' }}
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
      <div className="header-container border-b border-gray-800 flex items-center justify-between" style={{ padding: '16px', borderBottom: '1px solid var(--border-gray)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="header-title" style={{ fontSize: '18px', fontWeight: 'bold' }}>検索結果</h2>
          <p className="header-subtitle" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{fromName} ➔ {toName}</p>
        </div>
        <button
          className="btn-pill"
          style={{
            background: 'var(--bg-interactive)',
            color: '#ffffff',
            border: '1px solid var(--border-gray)',
            borderRadius: '9999px',
            padding: '6px 14px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
          onClick={onBack}
        >
          検索に戻る
        </button>
      </div>

      {/* 1本前・1本後ナビゲーション (Yahoo乗換案内の上部UIを再現) */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-850" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #202020', backgroundColor: '#151515' }}>
        <button
          className="flex items-center gap-1 text-xs font-bold text-white px-3 py-1.5 rounded-lg"
          style={{
            backgroundColor: '#ffa42b', // Yahoo風オレンジ
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center'
          }}
          onClick={() => onOffsetSearch(-30)}
        >
          <ChevronLeft size={14} />
          <span>1本前</span>
        </button>
        
        <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
          📅 {searchTimeLabel}
        </span>

        <button
          className="flex items-center gap-1 text-xs font-bold text-white px-3 py-1.5 rounded-lg"
          style={{
            backgroundColor: '#ffa42b', // Yahoo風オレンジ
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center'
          }}
          onClick={() => onOffsetSearch(30)}
        >
          <span>1本後</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* ソート切り替えタブ (Yahoo風: 早・楽・安) */}
      <div className="flex border-b border-gray-800 text-xs text-center" style={{ display: 'flex', borderBottom: '1px solid var(--border-gray)' }}>
        <button
          className="flex-1 py-3 font-bold relative"
          style={{
            background: 'transparent',
            border: 'none',
            color: sortStrategy === 'duration' ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: sortStrategy === 'duration' ? '2px solid var(--accent)' : 'none',
            cursor: 'pointer'
          }}
          onClick={() => setSortStrategy('duration')}
        >
          時間順 (早)
        </button>
        <button
          className="flex-1 py-3 font-bold relative"
          style={{
            background: 'transparent',
            border: 'none',
            color: sortStrategy === 'transfers' ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: sortStrategy === 'transfers' ? '2px solid var(--accent)' : 'none',
            cursor: 'pointer'
          }}
          onClick={() => setSortStrategy('transfers')}
        >
          回数順 (楽)
        </button>
        <button
          className="flex-1 py-3 font-bold relative"
          style={{
            background: 'transparent',
            border: 'none',
            color: sortStrategy === 'fare' ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: sortStrategy === 'fare' ? '2px solid var(--accent)' : 'none',
            cursor: 'pointer'
          }}
          onClick={() => setSortStrategy('fare')}
        >
          料金順 (安)
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

        {/* 経路リスト */}
        <div className="mt-4 space-y-3">
          {sortedOptions.map((option) => {
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
                  boxShadow: 'var(--shadow-medium)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '12px'
                }}
                onClick={() => setActiveOptionId(option.id)}
              >
                {/* カードヘッダー */}
                <div className="flex justify-between items-start" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="space-y-1">
                    {renderYahooBadges(option)}
                    <div className="flex items-center gap-2 mt-1" style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="text-xl font-black text-white" style={{ fontSize: '20px', fontWeight: '900' }}>{startTime} ➔ {endTime}</span>
                      <span className="text-xs text-accent font-bold" style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '12px', marginLeft: '8px' }}>{duration}</span>
                    </div>
                  </div>
                  
                  <div className="text-right" style={{ textAlign: 'right' }}>
                    {ticketFare !== undefined && (
                      <span className="text-lg font-black text-white" style={{ fontSize: '18px', fontWeight: '900' }}>{ticketFare.toLocaleString()}円</span>
                    )}
                    <div className="text-xs text-gray-400 mt-1" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>乗換 {option.metrics.transferCount}回</div>
                  </div>
                </div>

                {/* 路線アイコンのタイムライン概要 */}
                <div className="flex items-center gap-1.5 mt-3 overflow-x-auto py-1 text-xs" style={{ display: 'flex', alignItems: 'center', marginTop: '12px', overflowX: 'auto' }}>
                  {option.journey.legs.map((leg, lIdx) => (
                    <React.Fragment key={lIdx}>
                      {lIdx > 0 && <span className="text-gray-600 text-[10px]" style={{ margin: '0 4px', fontSize: '10px' }}>▶</span>}
                      <div
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold"
                        style={{
                          backgroundColor: leg.kind === 'walk' ? 'transparent' : (leg.color || '#333333'),
                          color: leg.kind === 'walk' ? 'var(--text-muted)' : '#ffffff',
                          border: leg.kind === 'walk' ? '1px dashed var(--border-gray)' : 'none',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {getModeIcon(leg.mode, 11)}
                        <span className="text-[10px]" style={{ fontSize: '10px', marginLeft: '4px' }}>{leg.kind === 'walk' ? '徒歩' : leg.routeName}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                {/* 詳細アコーディオンタイムライン */}
                {isActive && (
                  <div className="mt-4 pt-4 border-t border-gray-800" style={{ borderTop: '1px solid var(--border-gray)', marginTop: '16px', paddingTop: '16px' }}>
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-4" style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '900', marginBottom: '16px' }}>経路詳細タイムライン</h4>
                    
                    <div className="relative pl-8 space-y-0" style={{ position: 'relative', paddingLeft: '32px' }}>
                      {option.journey.legs.map((leg, lIdx) => {
                        const isLastLeg = lIdx === option.journey.legs.length - 1;
                        const legDuration = formatDuration(leg.arrivalSecs - leg.departureSecs);
                        const lineCol = leg.kind === 'walk' ? 'dashed' : (leg.color || 'var(--border-gray)');

                        return (
                          <div key={lIdx} className="relative" style={{ position: 'relative' }}>
                            
                            {/* 乗車駅 */}
                            <div className="flex items-start justify-between min-h-[40px]" style={{ display: 'flex', justifyContent: 'space-between', minHeight: '40px' }}>
                              {/* タイムライン縦ライン */}
                              <div
                                className="absolute left-[-24px] top-[10px] bottom-[-30px] w-[6px]"
                                style={{
                                  position: 'absolute',
                                  left: '-24px',
                                  top: '10px',
                                  bottom: '-30px',
                                  width: '6px',
                                  borderLeft: leg.kind === 'walk' ? '3px dashed var(--border-gray)' : `6px solid ${lineCol}`,
                                  borderRadius: '3px',
                                  zIndex: 1
                                }}
                              />

                              {/* 駅ドット */}
                              <div
                                className="absolute left-[-29px] top-[4px] w-[16px] h-[16px] rounded-full bg-var-bg-base border-4 z-10"
                                style={{
                                  position: 'absolute',
                                  left: '-29px',
                                  top: '4px',
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  border: '4px solid',
                                  borderColor: leg.kind === 'walk' ? 'var(--border-gray)' : (leg.color || 'var(--accent)'),
                                  backgroundColor: 'var(--bg-base)',
                                  zIndex: 10
                                }}
                              />

                              <div>
                                <div className="text-sm font-black text-white flex items-center gap-2" style={{ display: 'flex', alignItems: 'center' }}>
                                  <span style={{ fontSize: '14px', fontWeight: '900' }}>{leg.from.name}</span>
                                  {leg.from.platformCode && (
                                    <span className="text-[10px]" style={{ fontSize: '10px', backgroundColor: '#2a2a2a', color: '#b3b3b3', padding: '1px 4px', borderRadius: '3px', marginLeft: '6px' }}>{leg.from.platformCode}番線発</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs font-black text-white" style={{ fontSize: '12px', fontWeight: '900' }}>{formatTime(leg.departureSecs)}</div>
                            </div>

                            {/* 移動手段・路線 */}
                            <div className="pl-2 py-4 min-h-[50px] flex items-center justify-between" style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px', paddingTop: '16px', paddingBottom: '16px', minHeight: '50px' }}>
                              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center' }}>
                                <div className="p-1 rounded bg-[#2c2c2c] text-white" style={{ padding: '4px', backgroundColor: '#2c2c2c', borderRadius: '4px', display: 'flex' }}>
                                  {getModeIcon(leg.mode, 14)}
                                </div>
                                <div className="text-xs" style={{ marginLeft: '8px' }}>
                                  <div className="font-black text-white" style={{ fontSize: '12px', fontWeight: '900' }}>
                                    {leg.kind === 'walk' ? '徒歩' : `${leg.routeName} ${leg.headsign ? `(${leg.headsign}行)` : ''}`}
                                  </div>
                                  <div className="text-[10px] text-gray-500 mt-0.5" style={{ fontSize: '10px', color: '#7f7f7f' }}>所要時間: {legDuration}</div>
                                </div>
                              </div>
                            </div>

                            {/* 降車駅（最終レグのみ） */}
                            {isLastLeg && (
                              <div className="relative flex items-start justify-between min-h-[40px] pt-2" style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', minHeight: '40px', paddingTop: '8px' }}>
                                <div
                                  className="absolute left-[-29px] top-[10px] w-[16px] h-[16px] rounded-full bg-var-bg-base border-4 z-10"
                                  style={{
                                    position: 'absolute',
                                    left: '-29px',
                                    top: '10px',
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    border: '4px solid var(--accent)',
                                    backgroundColor: 'var(--bg-base)',
                                    zIndex: 10
                                  }}
                                />
                                <div>
                                  <div className="text-sm font-black text-white flex items-center gap-2" style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '900' }}>{leg.to.name}</span>
                                    {leg.to.platformCode && (
                                      <span className="text-[10px]" style={{ fontSize: '10px', backgroundColor: '#2a2a2a', color: '#b3b3b3', padding: '1px 4px', borderRadius: '3px', marginLeft: '6px' }}>{leg.to.platformCode}番線着</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs font-black text-white" style={{ fontSize: '12px', fontWeight: '900' }}>{formatTime(leg.arrivalSecs)}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* 矢印 */}
                <div className="flex justify-center mt-2 text-gray-600" style={{ display: 'flex', justifyContent: 'center', marginTop: '8px', color: '#4d4d4d' }}>
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

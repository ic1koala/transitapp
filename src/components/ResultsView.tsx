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

// 時刻のフォーマット（秒数 -> HH:MM）
const formatTime = (seconds: number): string => {
  const isNegative = seconds < 0;
  const absSeconds = Math.abs(seconds);
  const totalMinutes = Math.floor(absSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  // マイナス値や24時超の対応
  const formattedHours = isNegative ? `-${hours}` : String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  return `${formattedHours}:${formattedMinutes}`;
};

// 所要時間のフォーマット（秒数 -> X時間X分 または X分）
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

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ height: '100%' }}>
      {/* ヘッダー */}
      <div className="header-container border-b border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="header-title" style={{ fontSize: '20px' }}>経路候補</h2>
          <p className="header-subtitle">{fromName} ➔ {toName}</p>
        </div>
        <button className="btn-pill" onClick={onBack}>
          再検索
        </button>
      </div>

      {/* スクロールコンテンツ */}
      <div className="flex-1 overflow-y-auto px-4 py-2" style={{ paddingBottom: '100px' }}>
        {/* マップ表示 */}
        {activeOption && (
          <DarkMap
            points={activeOption.map.points}
            segments={activeOption.map.segments}
            bounds={activeOption.map.bounds}
          />
        )}

        {/* 経路リスト */}
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
                {/* 経路概要 */}
                <div className="flex justify-between items-start">
                  <div>
                    {option.recommended && (
                      <span
                        className="text-[10px] uppercase font-bold tracking-wider rounded px-1.5 py-0.5 mr-2"
                        style={{ backgroundColor: 'var(--accent)', color: '#000000' }}
                      >
                        おすすめ
                      </span>
                    )}
                    {option.selectedFor && option.selectedFor !== 'balanced' && (
                      <span
                        className="text-[10px] uppercase font-bold tracking-wider rounded px-1.5 py-0.5 mr-2 bg-blue-500 text-white"
                      >
                        {option.selectedFor === 'fastest' ? '最速' : option.selectedFor === 'fewestTransfers' ? '乗換少' : '安価'}
                      </span>
                    )}
                    
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-lg font-bold text-white">{startTime} ➔ {endTime}</span>
                      <span className="text-xs text-gray-400">({duration})</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {ticketFare !== undefined && (
                      <span className="text-base font-bold text-white">{ticketFare.toLocaleString()}円</span>
                    )}
                    <div className="text-xs text-gray-400 mt-1">乗換 {option.metrics.transferCount}回</div>
                  </div>
                </div>

                {/* 主要路線アイコンの並び */}
                <div className="flex items-center gap-2 mt-3 overflow-x-auto py-1">
                  {option.journey.legs.map((leg, lIdx) => (
                    <React.Fragment key={lIdx}>
                      {lIdx > 0 && <span className="text-[10px] text-gray-600">▶</span>}
                      <div
                        className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: leg.kind === 'walk' ? 'transparent' : (leg.color || '#333333'),
                          color: leg.kind === 'walk' ? 'var(--text-muted)' : '#ffffff',
                          border: leg.kind === 'walk' ? '1px dashed var(--border-gray)' : 'none'
                        }}
                      >
                        {getModeIcon(leg.mode, 12)}
                        <span>{leg.kind === 'walk' ? '徒歩' : leg.routeName}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                {/* 詳細アコーディオン */}
                {isActive && (
                  <div className="mt-4 pt-4 border-t border-gray-800 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">経路詳細</h4>
                    <div className="timeline-container">
                      {option.journey.legs.map((leg, lIdx) => {
                        const legDuration = formatDuration(leg.arrivalSecs - leg.departureSecs);
                        const isLast = lIdx === option.journey.legs.length - 1;
                        
                        return (
                          <React.Fragment key={lIdx}>
                            {/* 出発駅 */}
                            <div className="timeline-item">
                              <div className="timeline-dot active" />
                              <div className="timeline-time">{formatTime(leg.departureSecs)}</div>
                              <div className="timeline-title">{leg.from.name}</div>
                              {leg.from.platformCode && (
                                <div className="timeline-info">{leg.from.platformCode}番線発</div>
                              )}
                            </div>

                            {/* 移動区間 */}
                            <div className={`timeline-item ${leg.kind === 'walk' ? 'walk' : ''}`}>
                              <div className="timeline-dot" style={{ borderStyle: 'dashed' }} />
                              <div className="timeline-title text-gray-400 font-normal">
                                {leg.kind === 'walk' ? (
                                  <span>徒歩移動 ({legDuration})</span>
                                ) : (
                                  <span className="flex items-center gap-1 text-white font-semibold">
                                    {getModeIcon(leg.mode, 14)} {leg.routeName} {leg.headsign ? `(${leg.headsign}行)` : ''}
                                    <span className="text-xs font-normal text-gray-400">乗車: {legDuration}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* 到着駅（最後の区間のみ） */}
                            {isLast && (
                              <div className="timeline-item last">
                                <div className="timeline-dot active" />
                                <div className="timeline-time">{formatTime(leg.arrivalSecs)}</div>
                                <div className="timeline-title">{leg.to.name}</div>
                                {leg.to.platformCode && (
                                  <div className="timeline-info">{leg.to.platformCode}番線着</div>
                                )}
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* 展開インジケータ */}
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

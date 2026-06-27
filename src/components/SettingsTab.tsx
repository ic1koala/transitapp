import React from 'react';
import { Info, MapPin, Check } from 'lucide-react';

interface SettingsTabProps {
  avoidModes: string[];
  onChangeAvoidModes: (modes: string[]) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ avoidModes, onChangeAvoidModes }) => {
  
  const toggleMode = (mode: string) => {
    if (avoidModes.includes(mode)) {
      onChangeAvoidModes(avoidModes.filter(m => m !== mode));
    } else {
      onChangeAvoidModes([...avoidModes, mode]);
    }
  };

  const handleTestGeolocation = () => {
    if (!navigator.geolocation) {
      alert('お使いのブラウザは現在地取得に対応していません。');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        alert(`現在地の取得に成功しました:\n緯度: ${pos.coords.latitude}\n経度: ${pos.coords.longitude}`);
      },
      (err) => {
        alert(`現在地の取得に失敗しました: ${err.message}`);
      }
    );
  };

  return (
    <div className="flex flex-col flex-1" style={{ height: '100%' }}>
      {/* ヘッダー */}
      <div className="header-container border-b border-gray-800">
        <h2 className="header-title">設定</h2>
        <p className="header-subtitle">検索フィルターとアプリ情報</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-6" style={{ paddingBottom: '100px' }}>
        {/* ルート優先設定 */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">回避する交通手段</h3>
          <div className="rounded-lg bg-var-bg-surface overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
            
            {/* バス */}
            <button
              className="w-full flex items-center justify-between p-4 border-b border-gray-850 hover:bg-var-bg-card-hover transition"
              onClick={() => toggleMode('bus')}
            >
              <span className="text-sm font-bold text-white">路線バスを除外</span>
              <div
                className="w-5 h-5 rounded-full border border-gray-600 flex items-center justify-center transition-all"
                style={{
                  backgroundColor: avoidModes.includes('bus') ? 'var(--accent)' : 'transparent',
                  borderColor: avoidModes.includes('bus') ? 'var(--accent)' : 'var(--border-gray)'
                }}
              >
                {avoidModes.includes('bus') && <Check size={12} className="text-black font-bold" />}
              </div>
            </button>

            {/* 飛行機 */}
            <button
              className="w-full flex items-center justify-between p-4 border-b border-gray-850 hover:bg-var-bg-card-hover transition"
              onClick={() => toggleMode('air')}
            >
              <span className="text-sm font-bold text-white">飛行機 (空路) を除外</span>
              <div
                className="w-5 h-5 rounded-full border border-gray-600 flex items-center justify-center transition-all"
                style={{
                  backgroundColor: avoidModes.includes('air') ? 'var(--accent)' : 'transparent',
                  borderColor: avoidModes.includes('air') ? 'var(--accent)' : 'var(--border-gray)'
                }}
              >
                {avoidModes.includes('air') && <Check size={12} className="text-black font-bold" />}
              </div>
            </button>

            {/* フェリー */}
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-var-bg-card-hover transition"
              onClick={() => toggleMode('ferry')}
            >
              <span className="text-sm font-bold text-white">フェリー (航路) を除外</span>
              <div
                className="w-5 h-5 rounded-full border border-gray-600 flex items-center justify-center transition-all"
                style={{
                  backgroundColor: avoidModes.includes('ferry') ? 'var(--accent)' : 'transparent',
                  borderColor: avoidModes.includes('ferry') ? 'var(--accent)' : 'var(--border-gray)'
                }}
              >
                {avoidModes.includes('ferry') && <Check size={12} className="text-black font-bold" />}
              </div>
            </button>

          </div>
        </div>

        {/* システムテスト */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">システムテスト</h3>
          <button
            className="w-full btn-pill justify-start p-4 hover:bg-var-bg-card-hover transition rounded-lg"
            style={{ display: 'flex', width: '100%', backgroundColor: 'var(--bg-surface)', border: 'none' }}
            onClick={handleTestGeolocation}
          >
            <MapPin size={18} className="text-accent mr-3" style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-bold text-white">GPS (現在地) 取得テスト</span>
          </button>
        </div>

        {/* アプリ情報 */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">アプリについて</h3>
          <div className="p-4 rounded-lg bg-var-bg-surface space-y-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="flex items-center gap-3">
              <Info size={18} className="text-gray-400" />
              <div>
                <div className="text-sm font-bold text-white">Transit 乗換案内 v1.0.0</div>
                <div className="text-xs text-gray-500">Spotify UI Inspired Edition</div>
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-800 pt-3">
              本アプリは、日本の公共交通オープンデータ（GTFS / ODPT）を利用した個人用途の乗換検索ウェブアプリです。
              地図データは CartoDB のダークスタイルを使用しています。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

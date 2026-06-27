import React, { useState, useEffect } from 'react';
import { Star, Clock, Trash2, Heart, Plus } from 'lucide-react';

interface Favorite {
  name: string;
  endpoint: string;
}

interface FavoriteRoute {
  from: { name: string; endpoint: string };
  to: { name: string; endpoint: string };
}

interface LibraryTabProps {
  onSelectStation: (station: { name: string; endpoint: string }) => void;
  onSelectRoute: (from: { name: string; endpoint: string }, to: { name: string; endpoint: string }) => void;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({ onSelectStation, onSelectRoute }) => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoriteRoutes, setFavoriteRoutes] = useState<FavoriteRoute[]>([]);
  const [history, setHistory] = useState<{ from: { name: string; endpoint: string }; to: { name: string; endpoint: string } }[]>([]);
  const [newStationName, setNewStationName] = useState('');
  const [newStationEndpoint, setNewStationEndpoint] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const favs = localStorage.getItem('transit_favorites');
    if (favs) setFavorites(JSON.parse(favs));

    const routes = localStorage.getItem('transit_favorite_routes');
    if (routes) setFavoriteRoutes(JSON.parse(routes));

    const hist = localStorage.getItem('transit_history');
    if (hist) setHistory(JSON.parse(hist));
  };

  // お気に入り駅の追加
  const handleAddFavorite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStationName || !newStationEndpoint) return;

    const newFav = { name: newStationName, endpoint: newStationEndpoint };
    const updated = [...favorites, newFav];
    setFavorites(updated);
    localStorage.setItem('transit_favorites', JSON.stringify(updated));

    setNewStationName('');
    setNewStationEndpoint('');
    setShowAddForm(false);
  };

  // お気に入り駅の削除
  const handleDeleteFavorite = (endpoint: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = favorites.filter(f => f.endpoint !== endpoint);
    setFavorites(updated);
    localStorage.setItem('transit_favorites', JSON.stringify(updated));
  };

  // お気に入りルートの追加（履歴から追加する簡易機能）
  const handleAddRouteToFavorite = (route: { from: { name: string; endpoint: string }; to: { name: string; endpoint: string } }) => {
    const isAlreadyFav = favoriteRoutes.some(r => r.from.endpoint === route.from.endpoint && r.to.endpoint === route.to.endpoint);
    if (isAlreadyFav) return;

    const updated = [route, ...favoriteRoutes];
    setFavoriteRoutes(updated);
    localStorage.setItem('transit_favorite_routes', JSON.stringify(updated));
  };

  // お気に入りルートの削除
  const handleDeleteRoute = (fromEndpoint: string, toEndpoint: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = favoriteRoutes.filter(r => r.from.endpoint !== fromEndpoint || r.to.endpoint !== toEndpoint);
    setFavoriteRoutes(updated);
    localStorage.setItem('transit_favorite_routes', JSON.stringify(updated));
  };

  // 履歴の全削除
  const handleClearHistory = () => {
    localStorage.removeItem('transit_history');
    setHistory([]);
  };

  return (
    <div className="flex flex-col flex-1" style={{ height: '100%' }}>
      {/* ヘッダー */}
      <div className="header-container border-b border-gray-800 flex justify-between items-center">
        <div>
          <h2 className="header-title">マイライブラリ</h2>
          <p className="header-subtitle">お気に入りや最近の検索履歴</p>
        </div>
        <button
          className="btn-circle"
          style={{ width: '36px', height: '36px' }}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-6" style={{ paddingBottom: '100px' }}>
        {/* お気に入り駅の追加フォーム */}
        {showAddForm && (
          <form onSubmit={handleAddFavorite} className="p-4 rounded-lg bg-var-bg-surface space-y-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <h3 className="text-sm font-bold text-white">駅・場所をお気に入りに追加</h3>
            <input
              type="text"
              className="input-pill"
              style={{ paddingLeft: '16px' }}
              placeholder="表示名 (例: 自宅の最寄り駅)"
              value={newStationName}
              onChange={(e) => setNewStationName(e.target.value)}
              required
            />
            <input
              type="text"
              className="input-pill"
              style={{ paddingLeft: '16px' }}
              placeholder="駅名またはgeo:lat,lon"
              value={newStationEndpoint}
              onChange={(e) => setNewStationEndpoint(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <button type="submit" className="btn-pill btn-pill-primary flex-1">保存</button>
              <button type="button" className="btn-pill flex-1" onClick={() => setShowAddForm(false)}>キャンセル</button>
            </div>
          </form>
        )}

        {/* お気に入りルート */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">お気に入りルート</h3>
          {favoriteRoutes.length === 0 ? (
            <div className="text-xs text-gray-500 py-4 text-center bg-var-bg-surface rounded-lg" style={{ backgroundColor: 'var(--bg-surface)' }}>
              履歴リストの「♥」アイコンから、よく使うルートをお気に入り登録できます。
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {favoriteRoutes.map((route, idx) => (
                <div
                  key={idx}
                  className="card-item relative group"
                  onClick={() => onSelectRoute(route.from, route.to)}
                >
                  <Heart size={20} className="card-icon" style={{ color: 'var(--accent)' }} />
                  <div className="card-title truncate">{route.from.name} ➔ {route.to.name}</div>
                  <div className="card-desc">お気に入りルート</div>
                  <button
                    className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400"
                    onClick={(e) => handleDeleteRoute(route.from.endpoint, route.to.endpoint, e)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* お気に入り駅 */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">お気に入り駅・場所</h3>
          {favorites.length === 0 ? (
            <div className="text-xs text-gray-500 py-4 text-center bg-var-bg-surface rounded-lg" style={{ backgroundColor: 'var(--bg-surface)' }}>
              お気に入りの駅や場所はありません。
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {favorites.map((fav, idx) => (
                <div
                  key={idx}
                  className="card-item relative"
                  onClick={() => onSelectStation(fav)}
                >
                  <Star size={20} className="card-icon" style={{ color: '#ffa42b' }} />
                  <div className="card-title truncate">{fav.name}</div>
                  <div className="card-desc truncate">{fav.endpoint}</div>
                  <button
                    className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400"
                    onClick={(e) => handleDeleteFavorite(fav.endpoint, e)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 最近の履歴 */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">最近の履歴</h3>
            {history.length > 0 && (
              <button onClick={handleClearHistory} className="text-xs text-gray-500 hover:text-white transition">
                履歴をクリア
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="text-xs text-gray-500 py-4 text-center bg-var-bg-surface rounded-lg" style={{ backgroundColor: 'var(--bg-surface)' }}>
              履歴はありません。
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-var-bg-surface hover:bg-var-bg-card-hover transition cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-surface)' }}
                  onClick={() => onSelectRoute(item.from, item.to)}
                >
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-gray-500" />
                    <div>
                      <div className="text-sm font-bold text-white">{item.from.name} ➔ {item.to.name}</div>
                      <div className="text-xs text-gray-400">乗換案内ルート</div>
                    </div>
                  </div>
                  <button
                    className="p-2 text-gray-500 hover:text-accent transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddRouteToFavorite(item);
                    }}
                    title="お気に入りルートに追加"
                  >
                    <Heart size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

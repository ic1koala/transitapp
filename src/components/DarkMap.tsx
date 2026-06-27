import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Point {
  id: string;
  name: string;
  lat: number;
  lon: number;
  role: 'origin' | 'destination' | 'stop' | 'transfer';
}

interface Segment {
  kind: 'walk' | 'transit';
  fromPointId: string;
  toPointId: string;
  routeName?: string;
  color?: string;
  polyline: { lat: number; lon: number; }[];
}

interface DarkMapProps {
  points?: Point[];
  segments?: Segment[];
  bounds?: {
    minLat: number;
    minLon: number;
    maxLat: number;
    maxLon: number;
  };
}

export const DarkMap: React.FC<DarkMapProps> = ({ points = [], segments = [], bounds }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // マップの初期化
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json', // カルトDBのダークテーマ（キー不要）
      center: [139.767, 35.681], // 東京駅周辺をデフォルトに
      zoom: 12,
      attributionControl: false
    });

    mapRef.current = map;

    // ナビゲーションコントロールの追加
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      drawRoute();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ポイントやセグメントが更新された場合に描画し直す
  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      drawRoute();
    }
  }, [points, segments, bounds]);

  const drawRoute = () => {
    const map = mapRef.current;
    if (!map) return;

    // 既存のレイヤーとソース、マーカーのクリーンアップ
    // マーカーのクリーンアップはDOM要素経由で行うか、MapLibreのMarkerクラスを保持しておく必要があるが、
    // ここでは簡単に既存のマーカーDOMクラス（.maplibregl-marker）を全削除する
    document.querySelectorAll('.maplibregl-marker').forEach(el => el.remove());

    // ソースとレイヤーの削除
    if (map.getLayer('route-line')) map.removeLayer('route-line');
    if (map.getSource('route-source')) map.removeSource('route-source');

    if (points.length === 0 && segments.length === 0) return;

    // 1. ルートのポリラインを描画
    const coordinates: [number, number][] = [];
    
    // すべてのセグメントの座標を結合してLineStringを作る
    segments.forEach((seg) => {
      seg.polyline.forEach((p) => {
        coordinates.push([p.lon, p.lat]);
      });
    });

    if (coordinates.length > 0) {
      map.addSource('route-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          }
        }
      });

      // Spotify Greenでラインを描画
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#1ed760', // Spotify Green
          'line-width': 5,
          'line-opacity': 0.85
        }
      });
    }

    // 2. ピン（マーカー）の配置
    points.forEach((pt) => {
      const el = document.createElement('div');
      el.className = 'maplibregl-marker';
      el.style.width = pt.role === 'origin' || pt.role === 'destination' ? '20px' : '12px';
      el.style.height = pt.role === 'origin' || pt.role === 'destination' ? '20px' : '12px';
      el.style.borderRadius = '50%';
      
      // ロールに応じたマーカーのカラーリング
      if (pt.role === 'origin') {
        el.style.backgroundColor = '#1ed760'; // 出発地: Spotify Green
        el.style.border = '3px solid #ffffff';
      } else if (pt.role === 'destination') {
        el.style.backgroundColor = '#f3727f'; // 目的地: Negative Red
        el.style.border = '3px solid #ffffff';
      } else {
        el.style.backgroundColor = '#ffffff'; // 経由地: 白
        el.style.border = '2px solid #121212';
      }
      
      el.style.boxShadow = 'rgba(0,0,0,0.5) 0px 4px 10px';

      // ポップアップの追加
      const popup = new maplibregl.Popup({ offset: pt.role === 'origin' || pt.role === 'destination' ? 15 : 10 })
        .setHTML(`<div style="color: #121212; font-family: sans-serif; font-size: 12px; font-weight: bold; padding: 2px 4px;">${pt.name}</div>`);

      new maplibregl.Marker({ element: el })
        .setLngLat([pt.lon, pt.lat])
        .setPopup(popup)
        .addTo(map);
    });

    // 3. バウンディングボックスにフィット
    if (bounds) {
      map.fitBounds(
        [bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat],
        { padding: 40, duration: 1000 }
      );
    } else if (coordinates.length > 0) {
      // 座標リストからバウンディングボックスを計算してフィット
      const lons = coordinates.map(c => c[0]);
      const lats = coordinates.map(c => c[1]);
      map.fitBounds(
        [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)],
        { padding: 40, duration: 1000 }
      );
    }
  };

  return (
    <div className="map-container">
      <div ref={mapContainerRef} className="map-element" />
    </div>
  );
};

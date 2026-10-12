'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const BASE = 'https://unpkg.com/leaflet@1.9.4/dist/images/';
const icone = L.icon({
  iconUrl: BASE + 'marker-icon.png',
  iconRetinaUrl: BASE + 'marker-icon-2x.png',
  shadowUrl: BASE + 'marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function popup(r) {
  const end = [r.logradouro, r.numero].filter(Boolean).join(', ');
  const cid = [r.bairro, r.cidade + '/' + r.uf].filter(Boolean).join(' - ');
  let h = '<strong>' + esc(r.nome) + '</strong><br>' + esc(end) + '<br>' + esc(cid);
  if (r.whatsapp) h += '<br>WhatsApp: ' + esc(r.whatsapp);
  return h;
}

export default function Mapa({ revendas, selecionada, aoSelecionar, rascunho }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const camadaRef = useRef(null);
  const marcadoresRef = useRef({});
  const rascunhoRef = useRef(null);
  const ajustouRef = useRef(false);
  const cbRef = useRef(aoSelecionar);
  cbRef.current = aoSelecionar;

  useEffect(() => {
    const map = L.map(elRef.current).setView([-14.2, -51.9], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    camadaRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      camadaRef.current = null;
      ajustouRef.current = false;
    };
  }, []);

  useEffect(() => {
    const camada = camadaRef.current;
    if (!camada) return;
    camada.clearLayers();
    marcadoresRef.current = {};
    const pts = [];
    revendas.forEach((r) => {
      if (r.latitude == null || r.longitude == null) return;
      const m = L.marker([r.latitude, r.longitude], { icon: icone, title: r.nome }).bindPopup(popup(r));
      m.on('click', () => cbRef.current && cbRef.current(r.id));
      m.addTo(camada);
      marcadoresRef.current[r.id] = m;
      pts.push([r.latitude, r.longitude]);
    });
    if (pts.length && !ajustouRef.current && mapRef.current) {
      ajustouRef.current = true;
      mapRef.current.fitBounds(pts, { padding: [40, 40], maxZoom: 12 });
    }
  }, [revendas]);

  useEffect(() => {
    const m = selecionada && marcadoresRef.current[selecionada];
    if (m && mapRef.current) {
      mapRef.current.flyTo(m.getLatLng(), 14);
      m.openPopup();
    }
  }, [selecionada, revendas]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (rascunhoRef.current) {
      rascunhoRef.current.remove();
      rascunhoRef.current = null;
    }
    if (rascunho && rascunho.lat != null && rascunho.lng != null) {
      rascunhoRef.current = L.circleMarker([rascunho.lat, rascunho.lng], {
        radius: 11,
        color: '#dc2626',
        fillColor: '#ef4444',
        fillOpacity: 0.6,
      })
        .addTo(map)
        .bindTooltip('Nova revenda', { permanent: true, direction: 'top' });
      map.flyTo([rascunho.lat, rascunho.lng], 14);
    }
  }, [rascunho]);

  return <div ref={elRef} />;
}

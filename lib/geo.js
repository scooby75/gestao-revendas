export function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Revendas já cadastradas na mesma cidade/UF do alvo, ordenadas pela distância (km)
export function infoCidade(revendas, alvo) {
  if (!alvo || !alvo.cidade || !alvo.uf) return [];
  const tem = alvo.latitude != null && alvo.longitude != null;
  return revendas
    .filter(
      (r) =>
        r.id !== alvo.id &&
        String(r.uf).toUpperCase() === String(alvo.uf).toUpperCase() &&
        norm(r.cidade) === norm(alvo.cidade)
    )
    .map((r) => ({
      ...r,
      distancia_km:
        tem && r.latitude != null && r.longitude != null
          ? distanciaKm(alvo.latitude, alvo.longitude, r.latitude, r.longitude)
          : null,
    }))
    .sort((a, b) => (a.distancia_km == null) - (b.distancia_km == null) || (a.distancia_km || 0) - (b.distancia_km || 0));
}

export function fmtKm(km) {
  if (km == null) return 'distância indisponível';
  if (km < 1) return Math.round(km * 1000) + ' m';
  return km.toFixed(1).replace('.', ',') + ' km';
}

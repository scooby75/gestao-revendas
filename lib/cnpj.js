export function soDigitos(v) {
  return String(v || '').replace(/[^0-9]/g, '');
}

export function formatCnpj(v) {
  const d = soDigitos(v).slice(0, 14);
  let s = d;
  if (d.length > 12) s = d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5, 8) + '/' + d.slice(8, 12) + '-' + d.slice(12);
  else if (d.length > 8) s = d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5, 8) + '/' + d.slice(8);
  else if (d.length > 5) s = d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5);
  else if (d.length > 2) s = d.slice(0, 2) + '.' + d.slice(2);
  return s;
}

export function validarCnpj(v) {
  const c = soDigitos(v);
  if (c.length !== 14) return false;
  if (c.split('').every((x) => x === c[0])) return false;
  const dv = (base) => {
    const pesos = base === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < base; i++) soma += Number(c[i]) * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(c[12]) && dv(13) === Number(c[13]);
}

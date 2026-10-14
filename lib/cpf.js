import { soDigitos } from './cnpj';

export function formatCpf(v) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length > 9) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9);
  if (d.length > 6) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6);
  if (d.length > 3) return d.slice(0, 3) + '.' + d.slice(3);
  return d;
}

export function validarCpf(v) {
  const c = soDigitos(v);
  if (c.length !== 11) return false;
  if (c.split('').every((x) => x === c[0])) return false;
  const dv = (n) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}

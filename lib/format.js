export const brl = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);

export const dataBr = (s) => {
  if (!s) return '';
  const [a, m, d] = String(s).split('-');
  return d + '/' + m + '/' + a;
};

export const hoje = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

// Aceita "1.234,56", "1234,56", "1234.56" e "1.500" (milhar)
export function lerValor(txt) {
  let t = String(txt).replace(/[^0-9.,]/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^[0-9]{1,3}(\.[0-9]{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = parseFloat(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

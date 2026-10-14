'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { brl, dataBr, hoje, lerValor } from '../lib/format';

export default function Negocios({ revendaId }) {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [data, setData] = useState(hoje());
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const { data: d, error } = await supabase
      .from('negocios_provaveis')
      .select('*')
      .eq('revenda_id', revendaId)
      .order('data_negocio', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) setErro(error.message);
    else {
      setErro('');
      setLista(d || []);
    }
    setCarregando(false);
  }, [revendaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function adicionar(e) {
    e.preventDefault();
    setErro('');
    const v = lerValor(valor);
    if (!data) return setErro('Informe a data.');
    if (v == null || v <= 0) return setErro('Informe um valor válido em R$.');
    setSalvando(true);
    const { error } = await supabase
      .from('negocios_provaveis')
      .insert({ revenda_id: revendaId, data_negocio: data, valor: v });
    setSalvando(false);
    if (error) return setErro(error.message);
    setValor('');
    await carregar();
  }

  async function excluir(n) {
    if (!window.confirm('Excluir o negócio de ' + dataBr(n.data_negocio) + ' (' + brl(n.valor) + ')?')) return;
    const { error } = await supabase.from('negocios_provaveis').delete().eq('id', n.id);
    if (error) setErro(error.message);
    else await carregar();
  }

  const total = lista.reduce((s, n) => s + Number(n.valor), 0);

  return (
    <div>
      <form className="form" onSubmit={adicionar}>
        <div className="linha">
          <label>
            Data
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </label>
          <label>
            Valor (R$)
            <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" />
          </label>
        </div>
        <button type="submit" className="btn" disabled={salvando}>
          {salvando ? 'Adicionando…' : '+ Adicionar negócio provável'}
        </button>
      </form>

      {erro && <div className="caixa erro" style={{ marginTop: 10 }}>{erro}</div>}

      <h3 style={{ margin: '18px 0 8px', fontSize: 15 }}>Negócios prováveis</h3>
      {carregando ? (
        <p className="muted">Carregando…</p>
      ) : lista.length === 0 ? (
        <p className="muted">Nenhum negócio provável lançado para esta revenda.</p>
      ) : (
        <>
          {lista.map((n) => (
            <div key={n.id} className="pedido">
              <strong>{dataBr(n.data_negocio)}</strong>
              <div className="pedido-dir">
                <span>{brl(n.valor)}</span>
                <button type="button" className="btn perigo pequeno" onClick={() => excluir(n)}>Excluir</button>
              </div>
            </div>
          ))}
          <div className="caixa info" style={{ marginTop: 8 }}>
            {lista.length} negócio(s) · Total: <strong>{brl(total)}</strong>
          </div>
        </>
      )}
    </div>
  );
}

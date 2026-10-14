'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { brl, dataBr, hoje, lerValor } from '../lib/format';
import { ROTULO_FORMA } from '../lib/config';

const FORMAS = [
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'cartao_credito', rotulo: 'Cartão de Crédito' },
];

export default function Pedidos({ revendaId }) {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [data, setData] = useState(hoje());
  const [envio, setEnvio] = useState('');
  const [forma, setForma] = useState('pix');
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const { data: d, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('revenda_id', revendaId)
      .order('data_pedido', { ascending: false })
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
    if (!data) return setErro('Informe a data do pedido.');
    if (envio && envio < data) return setErro('A data prevista de envio não pode ser anterior à data do pedido.');
    if (v == null || v <= 0) return setErro('Informe um valor válido em R$.');
    setSalvando(true);
    const { error } = await supabase.from('pedidos').insert({
      revenda_id: revendaId,
      data_pedido: data,
      data_prevista_envio: envio || null,
      forma_pagamento: forma,
      valor: v,
    });
    setSalvando(false);
    if (error) return setErro(error.message);
    setValor('');
    setEnvio('');
    await carregar();
  }

  async function excluir(p) {
    if (!window.confirm('Excluir o pedido de ' + dataBr(p.data_pedido) + ' (' + brl(p.valor) + ')?')) return;
    const { error } = await supabase.from('pedidos').delete().eq('id', p.id);
    if (error) setErro(error.message);
    else await carregar();
  }

  const total = lista.reduce((s, p) => s + Number(p.valor), 0);

  return (
    <div>
      <form className="form" onSubmit={adicionar}>
        <div className="linha">
          <label>
            Data do pedido
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </label>
          <label>
            Data prevista de envio
            <input type="date" value={envio} onChange={(e) => setEnvio(e.target.value)} />
          </label>
        </div>
        <div className="linha">
          <label>
            Forma de pagamento
            <select value={forma} onChange={(e) => setForma(e.target.value)}>
              {FORMAS.map((f) => (
                <option key={f.valor} value={f.valor}>{f.rotulo}</option>
              ))}
            </select>
          </label>
          <label>
            Valor (R$)
            <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" />
          </label>
        </div>
        <button type="submit" className="btn" disabled={salvando}>
          {salvando ? 'Adicionando…' : '+ Adicionar pedido'}
        </button>
      </form>

      {erro && <div className="caixa erro" style={{ marginTop: 10 }}>{erro}</div>}

      <h3 style={{ margin: '18px 0 8px', fontSize: 15 }}>Pedidos lançados</h3>
      {carregando ? (
        <p className="muted">Carregando…</p>
      ) : lista.length === 0 ? (
        <p className="muted">Nenhum pedido lançado para esta revenda.</p>
      ) : (
        <>
          {lista.map((p) => (
            <div key={p.id} className="pedido">
              <div>
                <strong>{dataBr(p.data_pedido)}</strong>
                <small className="muted" style={{ display: 'block' }}>
                  {ROTULO_FORMA[p.forma_pagamento] || p.forma_pagamento}
                  {p.data_prevista_envio ? ' · Envio previsto: ' + dataBr(p.data_prevista_envio) : ''}
                </small>
              </div>
              <div className="pedido-dir">
                <span>{brl(p.valor)}</span>
                <button type="button" className="btn perigo pequeno" onClick={() => excluir(p)}>Excluir</button>
              </div>
            </div>
          ))}
          <div className="caixa info" style={{ marginTop: 8 }}>
            {lista.length} pedido(s) · Total: <strong>{brl(total)}</strong>
          </div>
        </>
      )}
    </div>
  );
}

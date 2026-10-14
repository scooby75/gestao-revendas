'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { brl, dataBr } from '../lib/format';
import { norm } from '../lib/geo';
import { ROTULO_FORMA } from '../lib/config';

// Visão geral de todos os pedidos (tipo="pedidos") ou negócios prováveis (tipo="negocios")
export default function Lancamentos({ tipo, meuId, aoAbrir }) {
  const ehPedido = tipo === 'pedidos';
  const tabela = ehPedido ? 'pedidos' : 'negocios_provaveis';
  const colData = ehPedido ? 'data_pedido' : 'data_negocio';

  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    supabase
      .from(tabela)
      .select('*, revendas(id, nome, cidade, uf, user_id)')
      .order(colData, { ascending: false })
      .limit(1000)
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error) setErro(error.message);
        else {
          setErro('');
          setLinhas(data || []);
        }
        setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, [tabela, colData]);

  const termo = norm(busca);
  const filtradas = useMemo(
    () =>
      linhas.filter((l) => {
        const r = l.revendas || {};
        if (termo && !norm([r.nome, r.cidade, r.uf].join(' ')).includes(termo)) return false;
        if (de && l[colData] < de) return false;
        if (ate && l[colData] > ate) return false;
        return true;
      }),
    [linhas, termo, de, ate, colData]
  );
  const total = filtradas.reduce((s, l) => s + Number(l.valor), 0);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{ehPedido ? 'Pedidos lançados' : 'Negócios prováveis'}</h2>
      <div className="filtros">
        <label className="rotulo-filtro">
          Buscar loja ou cidade
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, cidade ou UF" />
        </label>
        <label className="rotulo-filtro">
          De
          <input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        </label>
        <label className="rotulo-filtro">
          Até
          <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </label>
      </div>

      {erro && <div className="caixa erro" style={{ marginBottom: 10 }}>{erro}</div>}

      {carregando ? (
        <p className="muted">Carregando…</p>
      ) : filtradas.length === 0 ? (
        <p className="muted">Nenhum lançamento encontrado.</p>
      ) : (
        <>
          {filtradas.map((l) => {
            const r = l.revendas || {};
            const meu = r.user_id === meuId;
            return (
              <div
                key={l.id}
                className={'pedido' + (meu ? ' clicavel' : '')}
                onClick={() => meu && aoAbrir && aoAbrir(l.revenda_id, tipo)}
              >
                <div>
                  <strong>{r.nome || 'Loja'}</strong>
                  <small className="muted" style={{ display: 'block' }}>
                    {r.cidade ? r.cidade + '/' + r.uf + ' · ' : ''}
                    {dataBr(l[colData])}
                    {ehPedido ? ' · ' + (ROTULO_FORMA[l.forma_pagamento] || l.forma_pagamento) : ''}
                    {ehPedido && l.data_prevista_envio ? ' · Envio previsto: ' + dataBr(l.data_prevista_envio) : ''}
                  </small>
                </div>
                <div className="pedido-dir">
                  <span>{brl(l.valor)}</span>
                </div>
              </div>
            );
          })}
          <div className="caixa info" style={{ marginTop: 8 }}>
            {filtradas.length} lançamento(s) · Total: <strong>{brl(total)}</strong>
          </div>
        </>
      )}
    </div>
  );
}

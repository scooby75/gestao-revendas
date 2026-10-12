'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { infoCidade, fmtKm, norm } from '../lib/geo';
import { formatCnpj } from '../lib/cnpj';
import RevendaForm from '../components/RevendaForm';

const Mapa = dynamic(() => import('../components/Mapa'), {
  ssr: false,
  loading: () => <div className="carregando">Carregando mapa…</div>,
});

const urlSite = (s) => (/^https?:\/\//i.test(s) ? s : 'https://' + s);
const urlInsta = (s) =>
  'https://instagram.com/' + s.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '');
const urlZap = (s) => {
  const d = s.replace(/[^0-9]/g, '');
  return 'https://wa.me/' + (d.length <= 11 ? '55' + d : d);
};

export default function Home() {
  const [session, setSession] = useState(null);
  const [pronto, setPronto] = useState(false);
  const [revendas, setRevendas] = useState([]);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(null);
  const [selecionada, setSelecionada] = useState(null);
  const [rascunho, setRascunho] = useState(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setPronto(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('revendas').select('*').order('nome');
    if (error) setErro(error.message);
    else {
      setErro('');
      setRevendas(data || []);
    }
  }, []);

  useEffect(() => {
    if (session) carregar();
    else setRevendas([]);
  }, [session, carregar]);

  const infos = useMemo(() => new Map(revendas.map((r) => [r.id, infoCidade(revendas, r)])), [revendas]);

  async function entrar() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setErro(error.message);
  }

  async function salvar(payload, id) {
    const q = id ? supabase.from('revendas').update(payload).eq('id', id) : supabase.from('revendas').insert(payload);
    const { error } = await q;
    if (error) {
      return error.code === '23505' ? 'Já existe uma revenda cadastrada com este CNPJ.' : error.message;
    }
    setEditando(null);
    setRascunho(null);
    await carregar();
    return null;
  }

  async function excluir(r) {
    if (!window.confirm('Excluir a revenda ' + r.nome + '?')) return;
    const { error } = await supabase.from('revendas').delete().eq('id', r.id);
    if (error) setErro(error.message);
    else {
      if (selecionada === r.id) setSelecionada(null);
      await carregar();
    }
  }

  if (!pronto) return <div className="carregando" style={{ height: '100vh' }}>Carregando…</div>;

  if (!session) {
    return (
      <div className="login">
        <div className="card">
          <h1>Gestão Revendas</h1>
          <p>Cadastre e acompanhe suas lojas revendedoras no mapa.</p>
          <button className="btn google" onClick={entrar}>Entrar com Google</button>
          {erro && <div className="caixa erro" style={{ marginTop: 16 }}>{erro}</div>}
        </div>
      </div>
    );
  }

  const termo = norm(busca);
  const filtradas = revendas.filter(
    (r) => !termo || norm([r.nome, r.cidade, r.uf, r.cnpj].join(' ')).includes(termo)
  );
  const meuId = session.user.id;

  return (
    <div className="app">
      <header className="topo">
        <h1>📍 Gestão Revendas</h1>
        <div className="user">
          <span>{session.user.email}</span>
          <button className="btn sec pequeno" onClick={() => supabase.auth.signOut()}>Sair</button>
        </div>
      </header>
      <div className="corpo">
        <aside className="lateral">
          {editando ? (
            <>
              <h2 style={{ marginTop: 0 }}>{editando.id ? 'Editar revenda' : 'Nova revenda'}</h2>
              <RevendaForm
                key={editando.id || 'nova'}
                inicial={editando}
                revendas={revendas}
                aoSalvar={salvar}
                aoCancelar={() => {
                  setEditando(null);
                  setRascunho(null);
                }}
                aoLocalizar={setRascunho}
              />
            </>
          ) : (
            <>
              <div className="barra">
                <input placeholder="Buscar por nome, cidade ou CNPJ" value={busca} onChange={(e) => setBusca(e.target.value)} />
                <button className="btn" onClick={() => setEditando({})}>+ Nova</button>
              </div>
              {erro && <div className="caixa erro" style={{ marginBottom: 10 }}>{erro}</div>}
              <p className="muted">{revendas.length} revenda(s) cadastrada(s)</p>
              {filtradas.map((r) => {
                const outras = infos.get(r.id) || [];
                const minha = r.user_id === meuId;
                return (
                  <div key={r.id} className={'item' + (selecionada === r.id ? ' sel' : '')} onClick={() => setSelecionada(r.id)}>
                    <h3>{r.nome}</h3>
                    <small>{formatCnpj(r.cnpj)}</small>
                    <small>
                      {[r.logradouro, r.numero].filter(Boolean).join(', ')}
                      {r.bairro ? ' - ' + r.bairro : ''}
                    </small>
                    <small>{r.cidade}/{r.uf}{r.latitude == null ? ' · sem pin no mapa' : ''}</small>
                    <span className={'tag ' + (outras.length ? 'sim' : 'nao')}>
                      {outras.length
                        ? outras.length + ' outra(s) na cidade · mais próxima: ' + fmtKm(outras[0].distancia_km)
                        : 'Única revenda na cidade'}
                    </span>
                    {(r.site || r.instagram || r.whatsapp) && (
                      <div style={{ marginTop: 8 }}>
                        {r.site && <a href={urlSite(r.site)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Site</a>}
                        {r.instagram && <a href={urlInsta(r.instagram)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Instagram</a>}
                        {r.whatsapp && <a href={urlZap(r.whatsapp)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>WhatsApp</a>}
                      </div>
                    )}
                    {minha && (
                      <div className="acoes">
                        <button className="btn sec pequeno" onClick={(e) => { e.stopPropagation(); setEditando(r); }}>Editar</button>
                        <button className="btn perigo pequeno" onClick={(e) => { e.stopPropagation(); excluir(r); }}>Excluir</button>
                      </div>
                    )}
                  </div>
                );
              })}
              {filtradas.length === 0 && <p className="muted">Nenhuma revenda encontrada.</p>}
            </>
          )}
        </aside>
        <main className="mapa-area">
          <Mapa revendas={revendas} selecionada={selecionada} aoSelecionar={setSelecionada} rascunho={rascunho} />
        </main>
      </div>
    </div>
  );
}

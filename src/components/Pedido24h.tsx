import React, { useState, ChangeEvent, DragEvent } from 'react';
import * as Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Pedido24h.css';

// --- Types ---
interface Lote { lote: string; val: string; qtd: number; days: number | null; }
interface Item {
  cod: string; desc: string; unid: string; media: number;
  saldo_hosp: number; saldo_dankia: number; saldo_wl: number; lotes: Lote[];
}

// --- Demo Data ---
const ITEMS_DEMO: Item[] = [
  {cod:"365", desc:"BACLOFENO 10MG COMP UNIAO QUIMICA", unid:"COMP C/10MG", media:3, saldo_hosp:26, saldo_dankia:26, saldo_wl:27, lotes:[{lote:"2429591",val:"31/08/2026",qtd:1,days:173},{lote:"2535842",val:"31/08/2027",qtd:7,days:538},{lote:"2535841",val:"31/08/2027",qtd:18,days:538}]},
  {cod:"534", desc:"PULMICORT 0,5MG/ML-2ML FR INAL-BUDESONIDA", unid:"FRASC C/2ML", media:2, saldo_hosp:24, saldo_dankia:24, saldo_wl:34, lotes:[{lote:"PFFV",val:"31/12/2026",qtd:4,days:295},{lote:"PFHF",val:"31/01/2027",qtd:9,days:326},{lote:"PFHK",val:"31/01/2027",qtd:6,days:326},{lote:"PFMS",val:"31/05/2027",qtd:5,days:446}]},
  {cod:"919", desc:"CLORETO POTASSIO 100MG/ML(10%)-10ML AMP EV", unid:"AMP C/10ML", media:3, saldo_hosp:50, saldo_dankia:50, saldo_wl:50, lotes:[{lote:"4090290",val:"24/09/2026",qtd:2,days:197},{lote:"5120073",val:"05/12/2027",qtd:48,days:634}]},
  {cod:"951", desc:"CLORETO SODIO 200MG/ML(20%)-10ML AMP EV", unid:"AMP C/10ML", media:5, saldo_hosp:66, saldo_dankia:66, saldo_wl:66, lotes:[]},
  {cod:"1168", desc:"BEPANTOL 50MG/G-30G BG POM TOP-DEXPANTENOL", unid:"BISN C/30G", media:3, saldo_hosp:22, saldo_dankia:18, saldo_wl:23, lotes:[]},
  {cod:"1798", desc:"GLICOSE 5%-500ML SF PVC EV BAXTER", unid:"FRASC C/500ML", media:2, saldo_hosp:6, saldo_dankia:6, saldo_wl:6, lotes:[]},
  {cod:"8441", desc:"COLETOR URINA N/ESTERIL SEGMED 2000ML", unid:"UNIDADE", media:24, saldo_hosp:158, saldo_dankia:158, saldo_wl:159, lotes:[]},
  {cod:"8457", desc:"COMPRESSA GAZE ESTERIL CREMER 7,5X7,5CM", unid:"UNIDADE", media:3, saldo_hosp:53, saldo_dankia:53, saldo_wl:49, lotes:[]},
  {cod:"8576", desc:"CURATIVO FILME TRANSPAR TEGADERM IV 5X5,7CM", unid:"UNIDADE", media:5, saldo_hosp:37, saldo_dankia:37, saldo_wl:37, lotes:[]},
  {cod:"8644", desc:"ELETRODO DESCART MONIT CARDIACA NEO/PED", unid:"UNIDADE", media:27, saldo_hosp:166, saldo_dankia:166, saldo_wl:72, lotes:[]},
  {cod:"9276", desc:"SERINGA DESCART S/AGULHA LUERLOCK 10ML", unid:"UNIDADE", media:56, saldo_hosp:374, saldo_dankia:374, saldo_wl:344, lotes:[]},
  {cod:"9280", desc:"SERINGA DESCART 20ML LUER SLIP S/AGULHA", unid:"UNIDADE", media:3, saldo_hosp:302, saldo_dankia:302, saldo_wl:176, lotes:[]},
];

// --- Parsers ---
const detectDelimiter = (text: string) => text.split('\n')[0].includes(';') ? ';' : ',';
const parseCSVRows = (text: string, delimiter?: string) => Papa.parse(text, { delimiter: delimiter || detectDelimiter(text), skipEmptyLines: true }).data as string[][];
const toNum = (s: string) => parseFloat((s || '').replace(/"/g, '').replace(',', '.')) || 0;
const valDays = (valStr: string) => {
  if (!valStr || !valStr.includes('/')) return null;
  const p = valStr.split('/');
  if (p.length !== 3) return null;
  const d = new Date(+p[2], +p[1] - 1, +p[0]);
  const today = new Date(2026, 2, 11);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
};

const parsePac = (text: string) => {
  const rows = parseCSVRows(text, ',');
  const items: any[] = [];
  for (const r of rows) {
    if (!r[0] || !r[0].match(/^\d+$/)) continue;
    items.push({ cod: r[0].trim(), desc: (r[1] || '').replace(/^"|"$/g, '').trim(), unid: (r[2] || '').trim(), media: toNum(r[6]) });
  }
  return items;
};

const parseLote = (text: string) => {
  const rows = parseCSVRows(text, ',');
  const map: Record<string, { saldo_hosp: number; lotes: any[] }> = {};
  let curCod: string | null = null;
  for (const r of rows) {
    if (!r || r.length < 7) continue;
    if (r[1] && r[1].trim().match(/^\d+$/)) {
      curCod = r[1].trim();
      map[curCod] = { saldo_hosp: toNum(r[6]), lotes: [] };
    }
    if (curCod && map[curCod]) {
      const lote = (r[8] || '').trim(), val = (r[10] || '').trim(), qtd = toNum(r[18]);
      if (lote) map[curCod].lotes.push({ lote, val, qtd, days: valDays(val) });
    }
  }
  return map;
};

const parseDisp = (text: string) => {
  const rows = parseCSVRows(text, ';');
  const map: Record<string, { saldo_wl: number; saldo_dankia: number }> = {};
  for (const r of rows) {
    if (!r[5] || !r[5].trim().match(/^\d+$/)) continue;
    const cod = r[5].trim(), wl = toNum(r[7]), dankia = toNum(r[9]);
    if (!map[cod] || wl > (map[cod].saldo_wl || 0)) map[cod] = { saldo_wl: wl, saldo_dankia: dankia };
  }
  return map;
};

const buildItems = (pac: any[], lote: any, disp: any): Item[] => {
  return pac.map((p) => {
    const l = lote[p.cod] || { saldo_hosp: 0, lotes: [] };
    const d = disp[p.cod] || { saldo_wl: 0, saldo_dankia: 0 };
    return { ...p, saldo_hosp: l.saldo_hosp, saldo_dankia: d.saldo_dankia, saldo_wl: d.saldo_wl, lotes: l.lotes };
  });
};

export default function Pedido24h() {
  const [step, setStep] = useState<number>(0);
  const [items, setItems] = useState<Item[]>([]);
  
  // Upload State
  const [uploaded, setUploaded] = useState<{ pac: string | null; lote: string | null; disp: string | null }>({ pac: null, lote: null, disp: null });
  const [dragged, setDragged] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  // Filter State
  const [filter1, setFilter1] = useState('all');
  const [search1, setSearch1] = useState('');

  // Selection & Form
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [includedIds, setIncludedIds] = useState<Set<string>>(new Set());
  const [qtds, setQtds] = useState<Record<string, number>>({});
  const [obs, setObs] = useState<Record<string, string>>({});
  
  const [analista, setAnalista] = useState('');
  const [prioridade, setPrioridade] = useState('ALTA');
  const [observacaoGeral, setObservacaoGeral] = useState('');
  const [protocolo, setProtocolo] = useState('');

  // Logic Helpers
  const sugerido = (it: Item) => it.media;
  const diasCobertura = (it: Item) => (!it.media ? 999 : it.saldo_hosp / it.media);
  const statusOf = (it: Item) => {
    if (!it.media) return 'ok';
    const d = it.saldo_hosp / it.media;
    return d < 3 ? 'critical' : d < 7 ? 'atencao' : d < 15 ? 'watch' : 'ok';
  };

  const statusBadge = (it: Item) => {
    const s = statusOf(it);
    const d = diasCobertura(it);
    const label = d >= 999 ? '∞' : d.toFixed(1) + 'd';
    if (s==='critical') return <span className="badge bd-r">● CRÍTICO {label}</span>;
    if (s==='atencao')  return <span className="badge bd-a">▲ ATENÇÃO {label}</span>;
    if (s==='watch')    return <span className="badge bd-x">◆ {label}</span>;
    return <span className="badge bd-g">✓ OK {label}</span>;
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>, key: keyof typeof uploaded) => {
    const file = e.target.files?.[0];
    if (file) readFile(file, key);
  };
  const readFile = (file: File, key: keyof typeof uploaded) => {
    const reader = new FileReader();
    reader.onload = (e) => setUploaded(p => ({ ...p, [key]: e.target?.result as string }));
    reader.readAsText(file, 'ISO-8859-1');
  };

  const handleStart = () => {
    try {
      if (!uploaded.pac || !uploaded.lote || !uploaded.disp) return;
      const pac = parsePac(uploaded.pac);
      if (!pac.length) throw new Error('Arquivo de Consumo por Paciente inválido.');
      initData(buildItems(pac, parseLote(uploaded.lote), parseDisp(uploaded.disp)));
    } catch (e: any) { setUploadErr(e.message); }
  };
  
  const loadDemo = () => initData(ITEMS_DEMO);

  const initData = (data: Item[]) => {
    setItems(data);
    setSelectedIds(new Set(data.map(i => i.cod)));
    const q: Record<string, number> = {}, o: Record<string, string> = {};
    data.forEach(it => { q[it.cod] = sugerido(it); o[it.cod] = ''; });
    setQtds(q); setObs(o); setIncludedIds(new Set(data.map(i => i.cod)));
    setStep(1); window.scrollTo(0,0);
  };

  const renderUpload = () => (
    <div className="upload-screen">
      <div className="upload-logo">Dispensário 347 · UTI 5 Pediátrico</div>
      <div className="upload-title">Pedido de Reposição 24h</div>
      <div className="upload-sub">Faça o upload dos 3 arquivos para iniciar</div>

      {uploadErr && <div className="upload-err-box" style={{display:'block'}}>{uploadErr}</div>}

      <div className="upload-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        {[{id:'pac', ico:'🧑‍⚕️', t:'Consumo por Paciente', s:'R_LIST_CONS_PAC_txt.csv'},
          {id:'lote', ico:'🏥', t:'Saldo Hospital / Lotes', s:'R_CONF_LOTE.csv'},
          {id:'disp', ico:'⚖️', t:'Comparação de Saldos', s:'ExportStockComparison*.CSV'}].map(u => {
            const ok = !!uploaded[u.id as keyof typeof uploaded];
            return (
              <label key={u.id} className={`upload-card ${ok?'loaded':''} ${dragged===u.id?'dragover':''}`}
                onDragOver={e=>{e.preventDefault(); setDragged(u.id);}} onDragLeave={()=>setDragged(null)}
                onDrop={e=>{e.preventDefault(); setDragged(null); const f=e.dataTransfer.files[0]; if(f) readFile(f, u.id as any);}}>
                <input type="file" onChange={e=>handleFile(e, u.id as any)} accept=".csv,.CSV,.txt" />
                <div className="uc-icon">{u.ico}</div>
                <div className="uc-name">{u.t}</div>
                <div className="uc-hint">{u.s}</div>
                <div className={`uc-status ${ok?'ok':'pending'}`}>{ok ? '✓ Carregado' : '⊙ Aguardando'}</div>
              </label>
            );
        })}
      </div>
      <button className="upload-start" disabled={!uploaded.pac || !uploaded.lote || !uploaded.disp} onClick={handleStart}>
        Carregar e Iniciar →
      </button>
      <button className="upload-demo" onClick={loadDemo}>ou usar dados de demonstração</button>
    </div>
  );

  const getFilteredItems = () => {
    let list = items.filter(it => {
      const s = statusOf(it);
      const matchF = filter1 === 'all' || s === filter1 || (filter1 === 'atencao' && (s === 'atencao' || s === 'watch'));
      const matchS = !search1 || it.desc.toLowerCase().includes(search1.toLowerCase()) || it.cod.includes(search1);
      return matchF && matchS;
    });
    const order = {critical:0, atencao:1, watch:2, ok:3};
    return list.sort((a,b) => order[statusOf(a) as keyof typeof order] - order[statusOf(b) as keyof typeof order]);
  };

  const totalS3 = items.filter(it => includedIds.has(it.cod) && selectedIds.has(it.cod));
  
  const exportCSV = () => {
    const header = ['Código', 'Descrição', 'Unidade', 'Cons. 24h', 'Saldo Hosp.', 'Saldo Dankia', 'Saldo WL', 'Cobertura (d)', 'Qtd. Pedido', 'Observação'];
    const rows = [header, ...totalS3.map(it => {
      const dias = diasCobertura(it);
      return [
        it.cod, it.desc, it.unid, it.media,
        it.saldo_hosp, it.saldo_dankia, it.saldo_wl,
        dias >= 999 ? '∞' : dias.toFixed(1),
        qtds[it.cod] || 0, obs[it.cod] || ''
      ];
    })];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\\n');
    const blob = new Blob(['\\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pedido_disp347_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(14);
    doc.text('Pedido de Reposição 24h - Dispensário 347', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);
    doc.text(`Analista: ${analista || 'Não informado'}`, 14, 34);
    doc.text(`Prioridade: ${prioridade}`, 100, 34);
    
    if (observacaoGeral) {
      doc.text(`Obs: ${observacaoGeral}`, 14, 40);
    }

    const header = ['Cód', 'Descrição', 'Unid', 'S.Hosp', 'S.DK', 'S.WL', 'Sug.24h', 'Ped.', 'Obs'];
    const rows = totalS3.map(it => [
      it.cod, it.desc.substring(0, 30), it.unid,
      it.saldo_hosp, it.saldo_dankia, it.saldo_wl,
      it.media, (qtds[it.cod] || 0), (obs[it.cod] || '')
    ]);

    autoTable(doc, {
      startY: observacaoGeral ? 45 : 40,
      head: [header],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [9, 105, 218] },
      columnStyles: { 1: { cellWidth: 50 }, 8: { cellWidth: 'auto' } }
    });

    doc.save(`pedido_disp347_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="pedido-wrapper">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');`}</style>
      {step === 0 && renderUpload()}
      
      {step > 0 && (
        <>
          <nav className="stepper">
            {[1,2,3,4,5].map(n => (
              <div key={n} className={`step-item ${step===n?'active': step>n?'done':''}`} onClick={()=>setStep(n)}>
                <div className="step-num">{step>n ? '✓' : n}</div>
                <div className="step-label">{['Consumo', 'Comparar Saldos', 'Montar Pedido', 'Conf. Lotes', 'Enviar'][n-1]}</div>
              </div>
            ))}
          </nav>
          
          <div className="p24-main">
            {step === 1 && (
              <div className="screen active">
                <div className="page-hd">
                  <h2>Consumo do Dispensário</h2>
                  <p>Consumo das últimas 24h (média diária) · base para o pedido de reposição à farmácia central</p>
                  <div className="meta">
                    <span className="chip b">347 — UTI 5 PEDIÁTRICO</span>
                    <span className="chip">Referência: média 10 dias</span>
                    <span className="chip">{items.length} produtos ativos</span>
                    <span className="chip r">Pedido = consumo 24h</span>
                  </div>
                </div>
                
                <div className="filter-bar">
                  <input className="search-box" type="text" placeholder="Buscar produto..." value={search1} onChange={e=>setSearch1(e.target.value)} />
                  {['all','critical','atencao','ok'].map(f => (
                    <button key={f} className={`filter-btn ${filter1===f?'on':''}`} onClick={()=>setFilter1(f)}>
                      {f==='all'?'Todos':f==='critical'?'🔴 Crítico':f==='atencao'?'🟡 Atenção':'🟢 OK'}
                    </button>
                  ))}
                </div>

                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr><th>Código</th><th>Descrição</th><th className="r">Cons. 24h</th><th className="r">Saldo Hosp.</th><th className="r">Saldo Dankia</th><th className="r">Saldo WL</th><th>Cobertura</th><th className="c">Status</th><th className="c">Sel.</th></tr>
                    </thead>
                    <tbody>
                      {getFilteredItems().map(it => {
                        const maxBar = Math.max(...items.map(x=>x.saldo_hosp), 1);
                        const pct = Math.min(100, it.saldo_hosp / maxBar * 100);
                        const dias = diasCobertura(it);
                        const barC = dias<3 ? 'var(--red)' : dias<7 ? 'var(--amber)' : dias<15 ? 'var(--blue)' : 'var(--green)';
                        const s = selectedIds.has(it.cod);
                        return (
                          <tr key={it.cod}>
                            <td className="mono">{it.cod}</td>
                            <td className="desc-cell"><div className="d1">{it.desc}</div><div className="d2">{it.unid}</div></td>
                            <td className="r"><strong>{it.media}</strong></td>
                            <td className="r">{it.saldo_hosp}</td>
                            <td className="r" style={{color:'var(--purple)'}}>{it.saldo_dankia}</td>
                            <td className="r" style={{color:'var(--green)'}}>{it.saldo_wl}</td>
                            <td>
                              <div className="proj-wrap">
                                <div className="proj-bar"><div className="proj-fill" style={{width:pct+'%',background:barC}}/></div>
                                <div className="proj-num" style={{color:barC}}>{dias>=999?'∞':dias.toFixed(1)+'d'}</div>
                              </div>
                            </td>
                            <td className="c">{statusBadge(it)}</td>
                            <td className="c">
                              <input type="checkbox" checked={s} style={{width:16,height:16,cursor:'pointer',accentColor:'var(--blue)'}}
                                onChange={()=>{const ns=new Set(selectedIds); s?ns.delete(it.cod):ns.add(it.cod); setSelectedIds(ns);}}/>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="action-bar">
                  <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--txt2)',alignSelf:'center'}}>{selectedIds.size} selecionados</span>
                  <button className="btn btn-secondary" onClick={()=>setSelectedIds(new Set(items.map(i=>i.cod)))}>Selecionar todos</button>
                  <button className="btn btn-primary" onClick={()=>{window.scrollTo(0,0); setStep(2);}}>Próximo: Comparar Saldos →</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="screen active">
                <div className="page-hd"><h2>Comparação de Saldos</h2><p>Dankia · WebLogis · Hospital — compare os saldos</p></div>
                <div className="legend">
                  <div className="legend-item"><div className="legend-dot" style={{background:'var(--blue)'}}/>Saldo Hosp</div>
                  <div className="legend-item"><div className="legend-dot" style={{background:'var(--purple)'}}/>Saldo Dankia</div>
                  <div className="legend-item"><div className="legend-dot" style={{background:'var(--green)'}}/>Saldo WL</div>
                </div>
                <div className="tbl-wrap">
                  <table>
                    <thead><tr><th>Código</th><th>Descrição</th><th className="r">Cons. 24h</th><th className="r">Saldo Hosp.</th><th className="r">Saldo Dankia</th><th className="r">Saldo WL</th><th className="c">Divergência</th><th>Cobertura</th><th className="c">Status</th></tr></thead>
                    <tbody>
                      {items.filter(it=>selectedIds.has(it.cod)).map(it=>{
                        const diff = it.saldo_hosp - it.saldo_wl;
                        const dias = diasCobertura(it);
                        const barC = dias<3?'var(--red)':dias<7?'var(--amber)':'var(--green)';
                        return (
                          <tr key={it.cod}>
                            <td className="mono">{it.cod}</td>
                            <td className="desc-cell"><div className="d1">{it.desc}</div><div className="d2">{it.unid}</div></td>
                            <td className="r"><strong>{it.media}</strong></td>
                            <td><div className="saldo-cell"><span className="saldo-val" style={{color:'var(--blue)'}}>{it.saldo_hosp}</span><span className="saldo-src">HOSP</span></div></td>
                            <td><div className="saldo-cell"><span className="saldo-val" style={{color:'var(--purple)'}}>{it.saldo_dankia}</span><span className="saldo-src">DANKIA</span></div></td>
                            <td><div className="saldo-cell"><span className="saldo-val" style={{color:'var(--green)'}}>{it.saldo_wl}</span><span className="saldo-src">WEBLOGIS</span></div></td>
                            <td className="c">{diff!==0 ? <span className="badge bd-r">Δ {diff>0?'+':''}{diff}</span> : <span className="badge bd-g">OK</span>}</td>
                            <td><div className="proj-wrap"><div className="proj-bar"><div className="proj-fill" style={{width:Math.min(100,dias/30*100)+'%',background:barC}}/></div><div className="proj-num" style={{color:barC}}>{dias>=999?'∞':dias.toFixed(1)+'d'}</div></div></td>
                            <td className="c">{statusBadge(it)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="action-bar"><button className="btn btn-secondary" onClick={()=>setStep(1)}>← Voltar</button><button className="btn btn-primary" onClick={()=>setStep(3)}>Próximo: Montar Pedido →</button></div>
              </div>
            )}

            {step === 3 && (
              <div className="screen active">
                <div className="page-hd"><h2>Montar Pedido</h2><p>Quantidade pedida = consumo de 24h (média diária)</p></div>
                <div className="sum-grid">
                  <div className="sum-card b"><div className="n">{totalS3.length}</div><div className="l">Itens no pedido</div></div>
                  <div className="sum-card p"><div className="n">{totalS3.reduce((a,i)=>a+(qtds[i.cod]||0),0)}</div><div className="l">Unidades (24h)</div></div>
                  <div className="sum-card r"><div className="n">{totalS3.filter(i=>statusOf(i)==='critical').length}</div><div className="l">Críticos</div></div>
                </div>
                <div className="tbl-wrap">
                  <table>
                    <thead><tr><th>Cód</th><th>Descrição</th><th className="r">S.Hosp</th><th className="r">S.Dankia</th><th className="r">S.WL</th><th className="r">Sug.24h</th><th className="r">Qtd</th><th>Obs</th><th className="c">Inc.</th></tr></thead>
                    <tbody>
                      {items.filter(it=>selectedIds.has(it.cod)).map(it=>(
                        <tr key={it.cod}>
                          <td className="mono">{it.cod}</td>
                          <td className="desc-cell"><div className="d1">{it.desc}</div></td>
                          <td className="r mono">{it.saldo_hosp}</td><td className="r mono">{it.saldo_dankia}</td><td className="r mono">{it.saldo_wl}</td>
                          <td className="r" style={{color:'var(--blue)',fontWeight:700}}>{sugerido(it)}</td>
                          <td className="r"><input type="number" className={`qty-input ${qtds[it.cod]!==sugerido(it)?'edited':''}`} value={qtds[it.cod]||''} onChange={e=>setQtds(p=>({...p,[it.cod]:parseInt(e.target.value)||0}))}/></td>
                          <td><input className="obs-input" type="text" value={obs[it.cod]||''} onChange={e=>setObs(p=>({...p,[it.cod]:e.target.value}))}/></td>
                          <td className="c"><input type="checkbox" checked={includedIds.has(it.cod)} style={{width:16,height:16,cursor:'pointer',accentColor:'var(--green)'}} onChange={()=>{const ns=new Set(includedIds); includedIds.has(it.cod)?ns.delete(it.cod):ns.add(it.cod); setIncludedIds(ns);}}/></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="action-bar"><button className="btn btn-secondary" onClick={()=>setStep(2)}>← Voltar</button><button className="btn btn-primary" onClick={()=>setStep(4)}>Próximo: Conf. Lotes →</button></div>
              </div>
            )}

            {step === 4 && (
              <div className="screen active">
                 <div className="page-hd"><h2>Conferência de Lotes</h2></div>
                 <div className="tbl-wrap">
                  <table>
                    <thead><tr><th>Cód</th><th>Descrição</th><th className="r">S.Hosp</th><th className="r">Ped.</th><th>Lotes (R_CONF_LOTE)</th></tr></thead>
                    <tbody>
                      {totalS3.map(it=>(
                        <tr key={it.cod}>
                          <td className="mono">{it.cod}</td>
                          <td className="desc-cell"><div className="d1">{it.desc}</div></td>
                          <td className="r font-bold">{it.saldo_hosp}</td>
                          <td className="r font-bold text-blue-500">{qtds[it.cod]}</td>
                          <td>
                            <div className="lote-pills">
                              {it.lotes.length===0?<span style={{fontSize:11,color:'var(--txt3)'}}>Sem lote</span> : it.lotes.map((l,i)=><span key={i} className={`lote-pill ${(l.days??0)<0?'venc':(l.days??0)<90?'near':'ok'}`}>{l.lote} · {l.val} · {(l.days??0)}d · {l.qtd}un</span>)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="action-bar"><button className="btn btn-secondary" onClick={()=>setStep(3)}>← Voltar</button><button className="btn btn-primary" onClick={()=>setStep(5)}>Próximo: Revisar →</button></div>
              </div>
            )}

            {step === 5 && (
              <div className="screen active">
                <div className="page-hd"><h2>Revisão e Envio</h2></div>
                <div className="form-grid">
                  <div className="form-field"><label>Analista / Solicitante</label><input type="text" value={analista} onChange={e=>setAnalista(e.target.value)} /></div>
                  <div className="form-field"><label>Prioridade</label><select value={prioridade} onChange={e=>setPrioridade(e.target.value)}><option>URGENTE</option><option>ALTA</option><option>NORMAL</option></select></div>
                  <div className="form-field" style={{gridColumn:'1/-1'}}><label>Observações</label><textarea value={observacaoGeral} onChange={e=>setObservacaoGeral(e.target.value)} /></div>
                </div>
                <div className="action-bar">
                  <button className="btn btn-secondary" onClick={()=>setStep(4)}>← Voltar</button>
                  <button className="btn btn-secondary no-print" onClick={exportCSV}>⬇ Exportar CSV</button>
                  <button className="btn btn-secondary no-print" onClick={exportPDF}>📄 Exportar PDF</button>
                  <button className="btn btn-green" onClick={()=>{if(!analista){alert('Informe o analista');return;} setProtocolo('PED-347-'+Math.floor(Math.random()*9000)); setStep(6);}}>✓ Enviar à Farmácia</button>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="screen active">
                <div className="success-screen">
                  <div className="success-icon">✅</div><div className="success-title">Pedido enviado!</div>
                  <div className="success-sub">O pedido foi encaminhado à Farmácia Central.</div>
                  <div className="protocol-box">{protocolo}</div><br/>
                  <div style={{display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap'}}>
                    <button className="btn btn-secondary" onClick={exportCSV}>⬇ Baixar CSV</button>
                    <button className="btn btn-secondary" onClick={exportPDF}>📄 Baixar PDF</button>
                    <button className="btn btn-primary" onClick={()=>{setUploaded({pac:null,lote:null,disp:null}); setStep(0);}}>+ Novo Pedido</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

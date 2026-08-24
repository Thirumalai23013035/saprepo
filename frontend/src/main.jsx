import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertTriangle, ArrowUpRight, Bot, Check, ChevronRight, CircleDollarSign, ClipboardCheck, FileWarning, Filter, Inbox, LayoutDashboard, Menu, RefreshCw, Search, Settings2, ShieldCheck, Sparkles, X } from 'lucide-react';
import './styles.css';

const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').trim().replace(/\/+$/, '');
const API_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

const demoExceptions = [
  { id: '66f000000000000000000001', invoiceNumber: 'INV-24091', supplier: { name: 'Northstar Industrial', supplierCode: 'NORTH-01' }, total: 18420.5, currency: 'USD', decision: 'BLOCK', riskScore: 91, matchedAt: '2026-08-23T09:20:00Z', discrepancies: [{ type: 'QUANTITY_MISMATCH', message: 'Billed quantity exceeds received quantity by 24 units.', severity: 'CRITICAL' }, { type: 'PRICE_MISMATCH', message: 'Unit price is 8.4% above the PO price.', severity: 'HIGH' }], recommendations: ['Hold payment until receipt quantity covers the invoice.', 'Request a corrected invoice or approved price variance.'], invoice: { invoiceDate: '2026-08-21', lines: [{ poLineNumber: 1, sku: 'VALVE-440', invoicedQuantity: 124, unitPrice: 148.55 }] }, purchaseOrder: { poNumber: 'PO-78114', lines: [{ lineNumber: 1, sku: 'VALVE-440', orderedQuantity: 100, unitPrice: 137 }] } },
  { id: '66f000000000000000000002', invoiceNumber: 'INV-24088', supplier: { name: 'Verdant Office Co.', supplierCode: 'VERD-08' }, total: 2360, currency: 'USD', decision: 'REVIEW', riskScore: 56, matchedAt: '2026-08-22T15:42:00Z', discrepancies: [{ type: 'MISSING_RECEIPT', message: 'No posted goods receipt exists for this purchase order.', severity: 'HIGH' }], recommendations: ['Confirm delivery with the receiving team and post the goods receipt before approval.'], invoice: { invoiceDate: '2026-08-22', lines: [{ poLineNumber: 1, sku: 'CHAIR-204', invoicedQuantity: 20, unitPrice: 118 }] }, purchaseOrder: { poNumber: 'PO-78092', lines: [{ lineNumber: 1, sku: 'CHAIR-204', orderedQuantity: 20, unitPrice: 118 }] } },
  { id: '66f000000000000000000003', invoiceNumber: 'INV-24084', supplier: { name: 'Apex Safety Systems', supplierCode: 'APEX-03' }, total: 890, currency: 'USD', decision: 'REVIEW', riskScore: 44, matchedAt: '2026-08-22T11:05:00Z', discrepancies: [{ type: 'SKU_MISMATCH', message: 'SKU on invoice does not match the purchase order line.', severity: 'HIGH' }], recommendations: ['Confirm whether the supplier substituted an approved item.'], invoice: { invoiceDate: '2026-08-20', lines: [{ poLineNumber: 2, sku: 'GLOVE-882', invoicedQuantity: 100, unitPrice: 8.9 }] }, purchaseOrder: { poNumber: 'PO-78041', lines: [{ lineNumber: 2, sku: 'GLOVE-880', orderedQuantity: 100, unitPrice: 8.9 }] } }
];

const fallbackDashboard = { status: [{ _id: 'MISMATCHED', count: 18, totalValue: 67240 }, { _id: 'APPROVED', count: 124, totalValue: 493080 }, { _id: 'RECEIVED', count: 31, totalValue: 89540 }], decisions: [{ _id: 'BLOCK', count: 6 }, { _id: 'REVIEW', count: 12 }, { _id: 'PASS', count: 124 }], risk: { averageRiskScore: 38, averageConfidence: 0.86 }, topDiscrepancies: [{ _id: 'QUANTITY_MISMATCH', count: 9 }, { _id: 'MISSING_RECEIPT', count: 7 }, { _id: 'PRICE_MISMATCH', count: 5 }], valueAtRisk: { invoiceCount: 18, amount: 67240 } };

function money(value) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value); }
function formatDate(date) { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date)); }
function label(value) { return value.toLowerCase().replaceAll('_', ' '); }

async function fetchJson(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${API_URL}${cleanPath}`);
  if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);
  return response.json();
}

function App() {
  const [dashboard, setDashboard] = useState(fallbackDashboard);
  const [exceptions, setExceptions] = useState(demoExceptions);
  const [selected, setSelected] = useState(demoExceptions[0]);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showResolution, setShowResolution] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('Demo data loaded');

  async function loadData() {
    setLoading(true);
    try {
      const [nextDashboard, nextExceptions] = await Promise.all([fetchJson('/analytics/dashboard'), fetchJson('/analytics/exceptions')]);
      setDashboard(nextDashboard); setExceptions(nextExceptions); setSelected(nextExceptions[0] || null); setNotice('Live data connected');
    } catch (err) {
      console.error('API load error:', err);
      setNotice('Demo data loaded · connect the API to see live records');
    }
    finally { setLoading(false); }
  }
  useEffect(() => { loadData(); }, []);

  const visible = exceptions.filter(item => (filter === 'ALL' || item.decision === filter) && `${item.invoiceNumber} ${item.supplier?.name}`.toLowerCase().includes(search.toLowerCase()));
  const blocked = dashboard.decisions?.find(item => item._id === 'BLOCK')?.count || 0;
  const review = dashboard.decisions?.find(item => item._id === 'REVIEW')?.count || 0;

  async function resolve() {
    if (!selected || !note.trim()) return;
    try { await fetch(`${API_URL}/invoices/${selected.invoice?._id || selected.invoice}/resolve`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note }) }); } catch { }
    setExceptions(current => current.filter(item => item.id !== selected.id && item._id !== selected._id));
    setSelected(null); setShowResolution(false); setNote(''); setNotice('Exception marked resolved');
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">M</div><div><strong>matchwell</strong><span>AP control room</span></div></div>
      <nav><a className="active"><LayoutDashboard size={17} /> Overview</a><a><Inbox size={17} /> Invoice queue <b>{blocked + review}</b></a><a><ClipboardCheck size={17} /> Purchase orders</a><a><ShieldCheck size={17} /> Audit trail</a></nav>
      <div className="sidebar-bottom"><div className="ai-mini"><Sparkles size={16} /><div><strong>Match intelligence</strong><span>Learning from 1,284 reviews</span></div><ChevronRight size={15} /></div><a><Settings2 size={17} /> Settings</a><div className="user"><div className="avatar">JD</div><div><strong>Jamie Doyle</strong><span>Accounts payable</span></div><ChevronRight size={15} /></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="icon-button mobile-menu"><Menu size={20} /></button><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>Overview</strong></div><div className="top-actions"><span className="live-dot"><i /> Live monitoring</span><button className="icon-button"><AlertTriangle size={18} /></button><div className="avatar small">JD</div></div></header>
      <section className="content">
        <div className="headline"><div><p className="eyebrow">Monday, August 24, 2026</p><h1>Good morning, Jamie.</h1><p className="subtitle">Here is the payment risk across your invoice queue.</p></div><button className="refresh" onClick={loadData}><RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh queue</button></div>
        <div className="metric-grid"><Metric icon={<CircleDollarSign />} label="Value at risk" value={money(dashboard.valueAtRisk?.amount || 67240)} detail={`${dashboard.valueAtRisk?.invoiceCount || 18} invoices need attention`} tone="red" /><Metric icon={<FileWarning />} label="Exceptions to resolve" value={blocked + review} detail={`${blocked} blocked · ${review} in review`} tone="amber" /><Metric icon={<ShieldCheck />} label="Match confidence" value={`${Math.round((dashboard.risk?.averageConfidence || .86) * 100)}%`} detail="Across processed invoices" tone="green" /><Metric icon={<Bot />} label="Auto-approved" value="74.2%" detail="+8.6% vs last month" tone="blue" /></div>
        <div className="section-heading"><div><h2>Exception queue</h2><p>Prioritized by payment risk and mismatch severity.</p></div><div className="queue-count">{visible.length} open items <span>·</span> Updated just now</div></div>
        <div className="toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search invoice or supplier" /></div><div className="filters"><Filter size={15} /><button className={filter === 'ALL' ? 'selected' : ''} onClick={() => setFilter('ALL')}>All</button><button className={filter === 'BLOCK' ? 'selected' : ''} onClick={() => setFilter('BLOCK')}>Blocked</button><button className={filter === 'REVIEW' ? 'selected' : ''} onClick={() => setFilter('REVIEW')}>Review</button></div></div>
        <div className="queue-layout"><div className="exception-list">{visible.map(item => <ExceptionRow key={item.id || item._id} item={item} selected={selected?.id === item.id || selected?._id === item._id} onClick={() => setSelected(item)} />)}{!visible.length && <div className="empty">No exceptions match this view.</div>}</div><Insights dashboard={dashboard} /></div>
      </section>
    </main>
    {selected && <DetailPanel item={selected} onClose={() => setSelected(null)} onResolve={() => setShowResolution(true)} />}
    {showResolution && <div className="modal-backdrop"><div className="modal"><button className="close-modal" onClick={() => setShowResolution(false)}><X size={18} /></button><p className="eyebrow">Resolve exception</p><h2>What changed?</h2><p className="modal-copy">Add a short note for the audit trail before this invoice leaves the exception queue.</p><textarea value={note} onChange={event => setNote(event.target.value)} placeholder="e.g. Receipt posted by warehouse team; quantity verified against delivery note." /><button className="primary wide" disabled={!note.trim()} onClick={resolve}><Check size={16} /> Mark as resolved</button></div></div>}
    <div className="toast"><span className="toast-dot" /> {notice}</div>
  </div>;
}

function Metric({ icon, label: metricLabel, value, detail, tone }) { return <div className={`metric ${tone}`}><div className="metric-top"><span>{icon}</span><small>{metricLabel}</small></div><strong>{value}</strong><p>{detail}</p></div>; }
function ExceptionRow({ item, selected, onClick }) { return <button className={`exception-row ${selected ? 'is-selected' : ''}`} onClick={onClick}><div className={`severity ${item.decision.toLowerCase()}`}><span>{item.decision === 'BLOCK' ? '!' : '!'}</span></div><div className="exception-main"><div className="row-title"><strong>{item.invoiceNumber}</strong><span className={`pill ${item.decision.toLowerCase()}`}>{item.decision === 'BLOCK' ? 'Payment blocked' : 'Needs review'}</span></div><p>{item.supplier?.name || 'Unknown supplier'}</p><div className="reason"><span /> {item.discrepancies?.[0] ? label(item.discrepancies[0].type) : 'Mismatch detected'}</div></div><div className="row-value"><strong>{money(item.total)}</strong><span>{formatDate(item.matchedAt || item.invoiceDate)}</span></div><ChevronRight className="row-arrow" size={18} /></button>; }
function Insights({ dashboard }) { return <aside className="insights"><div className="insights-title"><div><p className="eyebrow">AI analyst</p><h3>What needs your attention</h3></div><div className="spark"><Sparkles size={16} /></div></div><p className="insight-copy">Quantity mismatches are driving most of the risk this week. Reviewing receiving workflows could prevent <strong>{money(18400)}</strong> in potential overpayments.</p><div className="bar-label"><span>Risk by mismatch</span><span>Last 30 days</span></div><div className="bars">{(dashboard.topDiscrepancies || fallbackDashboard.topDiscrepancies).slice(0, 3).map((item, index) => <div className="bar-row" key={item._id}><span>{label(item._id)}</span><div className="bar-track"><i style={{ width: `${Math.max(28, 100 - index * 24)}%` }} /></div><b>{item.count}</b></div>)}</div><div className="insight-footer"><Bot size={17} /><span>Suggested action</span><button>View playbook <ArrowUpRight size={14} /></button></div></aside>; }
function DetailPanel({ item, onClose, onResolve }) { const invoiceLine = item.invoice?.lines?.[0]; const poLine = item.purchaseOrder?.lines?.[0]; return <aside className="detail-panel"><div className="detail-header"><div><p className="eyebrow">Exception detail</p><h2>{item.invoiceNumber}</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><div className="detail-scroll"><div className="detail-status"><span className={`pill ${item.decision.toLowerCase()}`}>{item.decision === 'BLOCK' ? 'Payment blocked' : 'Needs review'}</span><strong>{money(item.total)}</strong></div><div className="supplier-line"><div className="supplier-logo">{(item.supplier?.name || 'S').slice(0, 1)}</div><div><strong>{item.supplier?.name}</strong><span>{item.supplier?.supplierCode} · {item.purchaseOrder?.poNumber || 'No PO'}</span></div></div><div className="match-score"><div><span>Match risk score</span><strong>{item.riskScore}<small>/100</small></strong></div><div className="score-ring" style={{ '--score': `${item.riskScore * 3.6}deg` }}><span>{item.riskScore}</span></div></div><div className="comparison"><h3>Three-way comparison</h3><div className="compare-head"><span>Line item</span><span>Invoice</span><span>PO</span><span>Receipt</span></div><div className="compare-row"><strong>{invoiceLine?.sku || 'Line item'}</strong><span>{invoiceLine?.invoicedQuantity ?? '—'} units<br /><b>{money(invoiceLine?.unitPrice || 0)}</b></span><span>{poLine?.orderedQuantity ?? '—'} units<br /><b>{money(poLine?.unitPrice || 0)}</b></span><span className="missing">—</span></div></div><div className="discrepancies"><h3>Detected discrepancies <span>{item.discrepancies?.length || 0}</span></h3>{item.discrepancies?.map((entry, index) => <div className="discrepancy" key={`${entry.type}-${index}`}><div className="disc-icon"><AlertTriangle size={14} /></div><div><strong>{label(entry.type)}</strong><p>{entry.message}</p></div></div>)}</div><div className="recommendation"><div className="rec-icon"><Sparkles size={15} /></div><div><strong>Recommended next step</strong><p>{item.recommendations?.[0] || 'Route to AP exception review before approval.'}</p></div></div></div><div className="detail-actions"><button className="secondary" onClick={onClose}>Keep open</button><button className="primary" onClick={onResolve}><Check size={16} /> Resolve exception</button></div></aside>; }

createRoot(document.getElementById('root')).render(<App />);

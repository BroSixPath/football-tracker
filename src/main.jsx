import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import LEAGUE_DATA from './data/football-leagues.json';

const KEY = 'kickoff-tracker-v1';
const initial = { settings: { starting: 200, illustrativeOdds: 1.5, savingsRate: 50, rounds: 13 }, entries: [], customMarkets: [] };
const MARKET_OPTIONS = ['Match result (1X2)', 'Double chance', 'Draw no bet', 'Both teams to score', 'Over/under goals', 'Asian handicap', 'Correct score', 'Half-time/full-time', 'Corners', 'Cards', 'Team to score', 'Goalscorer'];
const TEAM_OPTIONS = ["Argentina","Australia","Austria","Belgium","Brazil","Cameroon","Canada","Chile","China","Colombia","Croatia","Czechia","Denmark","Egypt","England","France","Germany","Ghana","Greece","India","Iran","Ireland","Italy","Ivory Coast","Japan","Mexico","Morocco","Netherlands","New Zealand","Nigeria","Northern Ireland","Norway","Peru","Poland","Portugal","Romania","Scotland","Senegal","Serbia","South Africa","South Korea","Spain","Sweden","Switzerland","Tunisia","Turkey","Ukraine","United States","Uruguay","Wales","Al Ahly","Al Nassr","Al Hilal","Ajax","Arsenal","Aston Villa","Atalanta","Athletic Club","Atletico Madrid","Barcelona","Bayern Munich","Benfica","Boca Juniors","Borussia Dortmund","Bournemouth","Brentford","Brighton & Hove Albion","Celtic","Chelsea","Club America","Crystal Palace","Everton","Fenerbahce","Feyenoord","Flamengo","Fulham","Galatasaray","Inter Milan","Juventus","Leeds United","Leicester City","Liverpool","Manchester City","Manchester United","Marseille","Monaco","Napoli","Newcastle United","Nottingham Forest","Paris Saint-Germain","Porto","PSV Eindhoven","Rangers","Real Madrid","Roma","Sao Paulo","Sevilla","Sporting CP","Tottenham Hotspur","West Ham United","Wolverhampton Wanderers"];
const createId = () => globalThis.crypto?.randomUUID?.() ?? 'entry-' + Date.now() + '-' + Math.random().toString(36).slice(2);
const createFixture = () => ({ id: createId(), homeCountry: '', homeLeague: '', homeTeam: '', awayCountry: '', awayLeague: '', awayTeam: '', market: '' });
const fixtureName = ({ homeTeam, awayTeam }) => homeTeam && awayTeam ? `${homeTeam} vs ${awayTeam}` : homeTeam || awayTeam || 'Fixture not added';
const money = (amount) => new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount) || 0);
const parseNumber = (value) => value === '' || value == null ? null : Number(value);
const blankEntry = (round) => ({ id: createId(), round, fixture: '', market: '', fixtures: [createFixture()], odds: '', stake: '', result: 'Pending', date: new Date().toISOString().slice(0, 10), notes: '' });
function ClubTeamField({ label, fixture, side, onUpdate }) {
  const countryKey = side + 'Country';
  const leagueKey = side + 'League';
  const teamKey = side + 'Team';
  const country = fixture[countryKey] || '';
  const leagues = LEAGUE_DATA.leagues.filter((league) => league.country === country);
  const selectedLeague = leagues.find((league) => league.name + ' (' + league.season + ')' === fixture[leagueKey]);
  const teams = [...new Set([...TEAM_OPTIONS, ...(selectedLeague?.teams || [])])].sort((a, b) => a.localeCompare(b));
  const listId = 'teams-' + fixture.id + '-' + side;
  return <section className="team-selector">
    <h4>{label} team</h4>
    <label className="field"><span>Country</span><select value={country} onChange={(event) => onUpdate({ [countryKey]: event.target.value, [leagueKey]: '', [teamKey]: '' })}><option value="">Choose a country</option>{LEAGUE_DATA.countries.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    <label className="field"><span>League</span><select value={fixture[leagueKey] || ''} disabled={!country} onChange={(event) => onUpdate({ [leagueKey]: event.target.value, [teamKey]: '' })}><option value="">Choose a league</option>{leagues.map((league) => { const value = league.name + ' (' + league.season + ')'; return <option key={value} value={value}>{league.name} - {league.season}</option>; })}</select></label>
    <label className="field"><span>Club</span><input list={listId} value={fixture[teamKey] || ''} onChange={(event) => onUpdate({ [teamKey]: event.target.value })} placeholder={selectedLeague ? 'Search or type a club' : 'Choose a league or type a team'} /><datalist id={listId}>{teams.map((team) => <option key={team} value={team} />)}</datalist></label>
  </section>;
}

function App() {
  const [data, setData] = useState(() => {
    try { return { ...initial, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch { return initial; }
  });
  const [editing, setEditing] = useState(null);
  const [customMarketFixtureId, setCustomMarketFixtureId] = useState(null);
  const [newMarketName, setNewMarketName] = useState('');
  const [newMarketFixtureId, setNewMarketFixtureId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('tracker');

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 3000); return () => clearTimeout(timer); }, [notice]);

  const ordered = useMemo(() => [...data.entries].sort((a, b) => a.round - b.round || a.date.localeCompare(b.date)), [data.entries]);
  let bankroll = Number(data.settings.starting) || 0;
  let stopped = false;
  const rows = ordered.map((entry) => {
    if (stopped) return { ...entry, profit: null, savings: null, balance: bankroll, status: 'Stopped after loss' };
    const stake = parseNumber(entry.stake), odds = parseNumber(entry.odds);
    let profit = null, savings = null, status = entry.result;
    if (entry.result === 'Win' && stake !== null && odds !== null) {
      profit = stake * (odds - 1);
      savings = Math.max(0, profit) * Number(data.settings.savingsRate) / 100;
      bankroll += profit - savings;
    } else if (entry.result === 'Loss' && stake !== null) {
      profit = -stake;
      bankroll -= stake;
      stopped = true;
    }
    return { ...entry, profit, savings, balance: bankroll, status };
  });
  const currentBankroll = rows.length ? rows.at(-1).balance : Number(data.settings.starting) || 0;
  const wins = data.entries.filter((e) => e.result === 'Win').length;
  const losses = data.entries.filter((e) => e.result === 'Loss').length;
  const totalProfit = rows.reduce((sum, e) => sum + (e.profit || 0), 0);
  const saved = rows.reduce((sum, e) => sum + (e.savings || 0), 0);
  const projection = useMemo(() => {
    const output = []; let balance = Number(data.settings.starting) || 0, savedTotal = 0;
    for (let i = 1; i <= Number(data.settings.rounds); i++) {
      const profit = balance * (Number(data.settings.illustrativeOdds) - 1);
      const savings = profit * Number(data.settings.savingsRate) / 100;
      balance += profit - savings; savedTotal += savings;
      output.push({ round: i, opening: balance - profit + savings, odds: Number(data.settings.illustrativeOdds), profit, savings, balance, savedTotal });
    }
    return { output, balance, savedTotal };
  }, [data.settings]);

  const addEntry = () => { setEditing(blankEntry(Math.min(Number(data.settings.rounds), Math.max(1, rows.length + 1)))); setCustomMarketFixtureId(null); setNewMarketName(''); setNewMarketFixtureId(null); setTab('tracker'); };
  const editEntry = (entry) => {
    const fixtures = Array.isArray(entry.fixtures) && entry.fixtures.length ? entry.fixtures.map((fixture) => ({ ...createFixture(), ...fixture })) : [{ ...createFixture(), homeTeam: entry.fixture || '', market: entry.market || '' }];
    setEditing({ ...entry, fixtures });
    setCustomMarketFixtureId(null); setNewMarketName(''); setNewMarketFixtureId(null);
  };
  const marketOptions = [...new Set([...MARKET_OPTIONS, ...(data.customMarkets || []), ...data.entries.flatMap((entry) => Array.isArray(entry.fixtures) ? entry.fixtures.map((fixture) => fixture.market) : [entry.market]), ...(editing?.fixtures || []).map((fixture) => fixture.market)].filter(Boolean))];
  const updateFixture = (fixtureId, key, value) => setEditing((old) => ({ ...old, fixtures: old.fixtures.map((fixture) => fixture.id === fixtureId ? { ...fixture, [key]: value } : fixture) }));
  const updateFixtureTeam = (fixtureId, changes) => setEditing((old) => ({ ...old, fixtures: old.fixtures.map((fixture) => fixture.id === fixtureId ? { ...fixture, ...changes } : fixture) }));
  const addFixture = () => setEditing((old) => ({ ...old, fixtures: [...old.fixtures, createFixture()] }));
  const removeFixture = (fixtureId) => setEditing((old) => ({ ...old, fixtures: old.fixtures.length > 1 ? old.fixtures.filter((fixture) => fixture.id !== fixtureId) : old.fixtures }));
  const addCustomMarket = () => {
    const market = newMarketName.trim();
    if (!market || !newMarketFixtureId) return;
    const existing = marketOptions.find((option) => option.toLowerCase() === market.toLowerCase());
    const selectedMarket = existing || market;
    if (!existing) setData((old) => ({ ...old, customMarkets: [...(old.customMarkets || []), market] }));
    updateFixture(newMarketFixtureId, 'market', selectedMarket);
    setNewMarketName('');
    setCustomMarketFixtureId(null);
    setNewMarketFixtureId(null);
  };
  const updateEntry = (event) => {
    event.preventDefault();
    const savedEntry = { ...editing, fixture: editing.fixtures.map(fixtureName).filter((name) => name !== 'Fixture not added').join(' | '), market: editing.fixtures.map((fixture) => fixture.market).filter(Boolean).join(' | ') };
    setData((old) => ({ ...old, entries: [...old.entries.filter((x) => x.id !== savedEntry.id), savedEntry] }));
    setEditing(null); setCustomMarketFixtureId(null); setNotice('Entry saved on this device.');
  };
  const removeEntry = (id) => { if (confirm('Delete this entry?')) setData((old) => ({ ...old, entries: old.entries.filter((x) => x.id !== id) })); };
  const updateSetting = (key, value) => setData((old) => ({ ...old, settings: { ...old.settings, [key]: Number(value) } }));
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'kickoff-tracker-backup.json'; link.click(); URL.revokeObjectURL(link.href);
  };
  const importData = (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { const imported = JSON.parse(reader.result); if (!imported.settings || !Array.isArray(imported.entries)) throw new Error(); setData(imported); setNotice('Backup restored.'); } catch { setNotice('That backup file could not be read.'); } };
    reader.readAsText(file); event.target.value = '';
  };
  const reset = () => { if (confirm('Clear all saved entries and restore the default settings? This cannot be undone unless you exported a backup.')) { setData(initial); setNotice('Tracker reset.'); } };
  const field = (key, label, type = 'text', props = {}) => <label className="field" key={key}><span>{label}</span><input type={type} value={editing[key] ?? ''} onChange={(e) => setEditing({ ...editing, [key]: e.target.value })} {...props} /></label>;

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#"><span className="brand-mark">K</span><span>kickoff<span className="brand-dot">.</span><small>CHALLENGE TRACKER</small></span></a>
      <div className="side-label">WORKSPACE</div>
      <button className={`nav-item ${tab === 'tracker' ? 'active' : ''}`} onClick={() => setTab('tracker')}><span>▦</span> Bet tracker</button>
      <button className={`nav-item ${tab === 'projection' ? 'active' : ''}`} onClick={() => setTab('projection')}><span>◒</span> Win scenario</button>
      <div className="side-bottom">
        <div className="private-card"><span className="lock">◈</span><b>Your data stays here</b><p>Entries are saved on this browser. Export a backup to move them to another device.</p></div>
        <button className="nav-item" onClick={() => setShowSettings(true)}><span>⚙</span> Challenge settings</button>
      </div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div><span className="crumb">MY CHALLENGE</span><span className="crumb-sep">/</span><strong>{tab === 'tracker' ? 'Bet tracker' : 'Win scenario'}</strong></div><div className="top-actions"><button className="button button-quiet" onClick={exportData}>↧ <span>Export backup</span></button><label className="button button-quiet import-button">↥ <span>Import backup</span><input type="file" accept="application/json,.json" onChange={importData} /></label><button className="avatar" title="Local tracker">K</button></div></header>
      <div className="content-wrap">
        {tab === 'tracker' ? <>
          <div className="page-heading"><div><div className="eyebrow">YOUR SEASON, YOUR RECORD</div><h1>Bet tracker</h1><p>Keep every pick, result and balance in one place.</p></div><button className="button button-primary" onClick={addEntry}><span className="plus">＋</span> Add entry</button></div>
          <div className="banner"><span className="banner-icon">!</span><p><b>A note before kickoff</b><span>Verify odds before each bet. <b>NO BET is always allowed.</b> A loss ends the full-rollover sequence. This tracker records outcomes; it cannot predict them.</span></p><button onClick={(e) => e.currentTarget.parentElement.remove()} aria-label="Dismiss">×</button></div>
          <div className="stats-grid">
            <Stat label="AVAILABLE BANKROLL" value={money(currentBankroll)} icon="◉" tone="blue" detail="After recorded bets and savings" />
            <Stat label="NET PROFIT / LOSS" value={`${totalProfit >= 0 ? '+' : '−'}${money(Math.abs(totalProfit))}`} icon="↗" tone={totalProfit < 0 ? 'red' : 'green'} detail="Across recorded results" />
            <Stat label="SAVED FROM WINS" value={money(saved)} icon="▣" tone="gold" detail={`${data.settings.savingsRate}% of winning net profit`} />
            <Stat label="RECORD" value={<>{wins}<span className="record-divider">—</span><span className="loss-number">{losses}</span></>} icon="◎" tone="violet" detail="Wins · losses" />
          </div>
          <div className="table-card"><div className="section-head"><div><h2>Challenge rounds</h2><p>{rows.length} {rows.length === 1 ? 'entry' : 'entries'} saved · target {data.settings.rounds} rounds</p></div><button className="button button-small" onClick={() => setShowSettings(true)}>⚙ <span>Settings</span></button></div>
            {rows.length === 0 ? <div className="empty-state"><div className="empty-ball">◉</div><h3>Your tracker starts here</h3><p>Add a fixture and enter the odds you verified. You can mark a pick Pending, Win, Loss, Void or NO BET.</p><button className="button button-primary" onClick={addEntry}>＋ Add first entry</button></div> : <div className="table-scroll"><table><thead><tr><th>ROUND</th><th>FIXTURE / MARKET</th><th>DATE</th><th>VERIFIED ODDS</th><th>STAKE</th><th>RESULT</th><th>PROFIT / LOSS</th><th>SAVED</th><th>BANKROLL AFTER</th><th></th></tr></thead><tbody>{rows.map((entry) => <tr key={entry.id}><td><span className="round-pill">{String(entry.round).padStart(2, '0')}</span></td><td>{Array.isArray(entry.fixtures) ? entry.fixtures.map((fixture) => <div className="fixture-summary" key={fixture.id}><b>{fixtureName(fixture)}</b><small>{fixture.market || 'Market not added'}</small></div>) : <><b>{entry.fixture || 'Untitled fixture'}</b><small>{entry.market || 'Market not added'}</small></>}{entry.notes && <small className="notes-text">{entry.notes}</small>}</td><td className="muted-cell">{entry.date || '—'}</td><td>{entry.odds || '—'}</td><td>{entry.stake ? money(entry.stake) : '—'}</td><td><span className={`result-pill ${entry.result.toLowerCase().replaceAll(' ', '-')}`}>{entry.status === 'Stopped after loss' ? 'Stopped' : entry.result}</span></td><td className={entry.profit < 0 ? 'negative' : entry.profit > 0 ? 'positive' : 'muted-cell'}>{entry.profit == null ? '—' : `${entry.profit > 0 ? '+' : ''}${money(entry.profit)}`}</td><td>{entry.savings == null ? '—' : money(entry.savings)}</td><td><b>{money(entry.balance)}</b></td><td><div className="row-actions"><button title="Edit" onClick={() => editEntry(entry)}>✎</button><button title="Delete" onClick={() => removeEntry(entry.id)}>×</button></div></td></tr>)}</tbody></table></div>}
          </div>
          <div className="bottom-grid"><div className="check-card"><div className="mini-icon">✓</div><div><b>Make the call with care</b><p>Check the price, market rules, team news and your own stake limit. If the case is unclear, pass.</p></div><a href="#checklist" onClick={(e) => {e.preventDefault(); setShowSettings(true);}}>View checklist <span>→</span></a></div><div className="rollover-card"><div><span className="eyebrow">NEXT ROUND</span><h3>{losses ? 'Sequence ended' : `Round ${Math.min(rows.length + 1, Number(data.settings.rounds))} of ${data.settings.rounds}`}</h3><p>{losses ? 'A loss was recorded. Later rounds are stopped.' : `Available balance ${money(currentBankroll)} · Enter a stake only if you choose to bet.`}</p></div><div className="rollover-orb">{losses ? '×' : '↗'}</div></div></div>
        </> : <>
          <div className="page-heading"><div><div className="eyebrow">JUST THE MATHS</div><h1>Win scenario</h1><p>A hypothetical illustration using your current settings.</p></div><button className="button button-quiet" onClick={() => setShowSettings(true)}>⚙ Challenge settings</button></div>
          <div className="scenario-warning"><b>HYPOTHETICAL — NOT A FORECAST</b><p>This assumes every round wins at the illustrative odds shown below. Actual results can differ; verify odds before each bet and remember NO BET is allowed.</p></div>
          <div className="scenario-summary"><div><span>ENDING AVAILABLE BANKROLL</span><strong>{money(projection.balance)}</strong></div><div><span>CUMULATIVE SAVINGS</span><strong>{money(projection.savedTotal)}</strong></div><div><span>ASSUMED WINS</span><strong>{data.settings.rounds} / {data.settings.rounds}</strong></div></div>
          <div className="table-card"><div className="section-head"><div><h2>All-win projection</h2><p>Each round saves {data.settings.savingsRate}% of its net profit before the next rollover.</p></div></div><div className="table-scroll"><table><thead><tr><th>ROUND</th><th>OPENING STAKE</th><th>ILLUSTRATIVE ODDS</th><th>NET PROFIT</th><th>SAVINGS</th><th>CLOSING BANKROLL</th><th>CUMULATIVE SAVINGS</th></tr></thead><tbody>{projection.output.map((row) => <tr key={row.round}><td><span className="round-pill">{String(row.round).padStart(2, '0')}</span></td><td>{money(row.opening)}</td><td>{row.odds.toFixed(2)}</td><td className="positive">+{money(row.profit)}</td><td>{money(row.savings)}</td><td><b>{money(row.balance)}</b></td><td>{money(row.savedTotal)}</td></tr>)}</tbody></table></div></div>
        </>}
        <footer className="footer"><span>Kickoff Tracker <i>·</i> ZMW</span><span>For recordkeeping only. Bet responsibly.</span></footer>
      </div>
    </main>
    {editing && <div className="modal-backdrop" onMouseDown={(e) => {if (e.target === e.currentTarget) setEditing(null);}}><form className="modal" onSubmit={updateEntry}><datalist id="team-suggestions">{TEAM_OPTIONS.map((team) => <option key={team} value={team} />)}</datalist><div className="modal-head"><div><span className="eyebrow">ROUND {editing.round}</span><h2>{data.entries.some((x) => x.id === editing.id) ? 'Edit entry' : 'Add entry'}</h2></div><button type="button" className="icon-button" onClick={() => setEditing(null)}>×</button></div><div className="form-grid"><section className="fixture-builder full"><div className="fixture-builder-head"><div><h3>Fixtures in this selection</h3><p>Choose each team from a country and league. The roster season is shown; you can type a team if it is missing.</p></div><button type="button" className="button button-small" onClick={addFixture}>Add fixture</button></div>{editing.fixtures.map((fixture, index) => <div className="fixture-editor" key={fixture.id}><div className="fixture-editor-head"><b>Fixture {index + 1}</b>{editing.fixtures.length > 1 && <button type="button" className="remove-fixture" onClick={() => removeFixture(fixture.id)}>Remove</button>}</div><div className="fixture-fields"><div className="team-pickers"><ClubTeamField label="Home" fixture={fixture} side="home" onUpdate={(changes) => updateFixtureTeam(fixture.id, changes)} /><ClubTeamField label="Away" fixture={fixture} side="away" onUpdate={(changes) => updateFixtureTeam(fixture.id, changes)} /></div><label className="field market-field"><span>Market</span><select value={fixture.market || ''} onChange={(e) => { if (e.target.value === '__add_market__') { setCustomMarketFixtureId(fixture.id); setNewMarketFixtureId(fixture.id); return; } updateFixture(fixture.id, 'market', e.target.value); setCustomMarketFixtureId(null); setNewMarketFixtureId(null); }}><option value="">Select a market</option>{marketOptions.map((market) => <option key={market} value={market}>{market}</option>)}<option value="__add_market__">Add a custom market...</option></select>{customMarketFixtureId === fixture.id && <div className="custom-market-control"><input aria-label="New market name" value={newMarketName} onChange={(e) => setNewMarketName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomMarket(); } }} placeholder="Enter a market name" /><button className="button button-small" type="button" disabled={!newMarketName.trim()} onClick={addCustomMarket}>Add market</button></div>}</label></div></div>)}</section><section className="slip-details full"><h3>Combined selection details</h3><p>Enter the overall odds and total stake for the whole bet slip.</p></section>{field('date','Date','date')}{field('odds','Verified odds','number',{min:'1',step:'0.01',placeholder:'e.g. 1.50'})}{field('stake','Stake (ZMW)','number',{min:'0',step:'0.01',placeholder:'e.g. 200'})}<label className="field"><span>Result</span><select value={editing.result} onChange={(e) => setEditing({...editing,result:e.target.value})}>{['Pending','Win','Loss','Void','NO BET'].map((x) => <option key={x}>{x}</option>)}</select></label><label className="field full"><span>Notes <i>optional</i></span><textarea rows="3" value={editing.notes} onChange={(e) => setEditing({...editing,notes:e.target.value})} placeholder="Add a note about the pick or outcome" /></label></div><div className="modal-foot"><button type="button" className="button button-quiet" onClick={() => setEditing(null)}>Cancel</button><button className="button button-primary" type="submit">Save entry</button></div></form></div>}
    {showSettings && <div className="modal-backdrop" onMouseDown={(e) => {if(e.target===e.currentTarget)setShowSettings(false);}}><div className="modal settings-modal"><div className="modal-head"><div><span className="eyebrow">PERSONALISE YOUR TRACKER</span><h2>Challenge settings</h2></div><button className="icon-button" onClick={() => setShowSettings(false)}>×</button></div><div className="form-grid">{[['starting','Starting bankroll (ZMW)',0.01],['illustrativeOdds','Illustrative odds',0.01],['savingsRate','Save from net profit (%)',1],['rounds','Challenge rounds',1]].map(([key,label,step])=><label className="field" key={key}><span>{label}</span><input type="number" min="0" step={step} value={data.settings[key]} onChange={(e)=>updateSetting(key,e.target.value)} /></label>)}</div><div className="setting-note">Changes are saved automatically in this browser. Existing entries remain in your tracker.</div><div className="settings-actions"><button className="button button-quiet" onClick={exportData}>Export backup</button><label className="button button-quiet import-button">Import backup<input type="file" accept="application/json,.json" onChange={importData} /></label><button className="button button-danger" onClick={reset}>Reset tracker</button></div><div className="checklist-box" id="checklist"><b>Before you place a bet</b><ul><li>Verify odds and settlement rules immediately before betting.</li><li>Review team news and confirm the market is clear.</li><li>Only use an affordable, pre-set stake. Never chase losses.</li><li>If you’re uncertain or don’t want the risk, choose NO BET.</li></ul></div></div></div>}
    {notice && <div className="toast">✓ &nbsp;{notice}</div>}
  </div>;
}
function Stat({ label, value, icon, tone, detail }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><small>{detail}</small></div>; }

createRoot(document.getElementById('root')).render(<App />);

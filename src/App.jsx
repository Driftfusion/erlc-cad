import React, { useEffect, useMemo, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { supabase } from "./supabaseClient"; // must export a configured supabase client

/*
  Single-page App.jsx for ERLC CAD (mobile-first)
  - Shows Units, Groups and Dispatch (calls) in one responsive layout
  - Uses Supabase realtime for sync if `supabase` is configured
  - Falls back to localStorage when supabase client isn't available
  - Drag units or groups onto calls to assign
*/

const STORAGE_KEY = "erlc_cad_full_v2_v1";
const ItemTypes = { UNIT: "unit", GROUP: "group" };

const UNIT_STATUSES = ["Available", "Busy", "On Scene", "Unavailable", "Off Duty"];
const CALL_ORIGINS = ["Caller", "Radio", "Dispatch", "Alarms"];
const TEN_CODES = { "10-1": "Frequency Change", "10-2": "Radio Check", "10-3": "Stop Transmitting" };

function genId(prefix = "") {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
}

function usePersistentState(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState];
}

/* ---------- draggable components ---------- */
function UnitCard({ unit, onDelete, onChangeStatus }) {
  const [{ isDragging }, drag] = useDrag(() => ({ type: ItemTypes.UNIT, item: { id: unit.id }, collect: (m) => ({ isDragging: m.isDragging() }) }), [unit.id]);
  return (
    <div ref={drag} className={`p-2 rounded border flex justify-between items-center ${isDragging ? "opacity-40" : ""}`} style={{ background: "#071018", borderColor: "#1f2937" }}>
      <div>
        <div className="font-medium text-white">{unit.name}</div>
        <div className="text-xs text-gray-300">{unit.type || "UNIT"} • {unit.status}</div>
      </div>
      <div className="flex flex-col gap-1">
        <select value={unit.status} onChange={(e) => onChangeStatus(unit.id, e.target.value)} className="text-xs rounded px-1 py-0.5 bg-black text-white">
          {UNIT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => onDelete(unit.id)} className="text-xs px-2 py-1 rounded bg-red-600">Delete</button>
      </div>
    </div>
  );
}

function GroupCard({ group, units, onDelete }) {
  const [{ isDragging }, drag] = useDrag(() => ({ type: ItemTypes.GROUP, item: { id: group.id }, collect: (m) => ({ isDragging: m.isDragging() }) }), [group.id]);
  return (
    <div ref={drag} className="p-3 rounded border flex flex-col gap-2" style={{ background: "#071018", borderColor: "#1f2937" }}>
      <div className="flex justify-between items-center">
        <div className="font-medium text-white">{group.name}</div>
        <div className="text-xs text-gray-300">{group.unitIds.length} units <button onClick={() => onDelete(group.id)} className="ml-2 px-2 py-1 rounded bg-red-600 text-xs">Del</button></div>
      </div>
      <div className="text-xs text-gray-300">{group.unitIds.map(uid => (units.find(u => u.id === uid) || { name: 'Unknown' }).name).join(', ')}</div>
    </div>
  );
}

function CallCard({ call, units, onDropUnit, onDropGroup, onRemoveAssigned, onToggleActive, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(call);
  useEffect(() => setLocal(call), [call]);

  const [, drop] = useDrop(() => ({
    accept: [ItemTypes.UNIT, ItemTypes.GROUP],
    drop: (item, monitor) => {
      const type = monitor.getItemType();
      if (type === ItemTypes.UNIT) onDropUnit(item.id, call.id);
      if (type === ItemTypes.GROUP) onDropGroup(item.id, call.id);
    }
  }), [call.id, onDropUnit, onDropGroup]);

  return (
    <div ref={drop} className="p-3 rounded border space-y-2" style={{ background: "#071018", borderColor: "#1f2937" }}>
      <div className="flex justify-between">
        <div>
          <div className="font-semibold text-white">{call.title || '(untitled)'}</div>
          <div className="text-xs text-gray-300">{call.address || ''} {call.postal ? `• ${call.postal}` : ''}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-300">{call.active ? 'Active' : 'Inactive'}</div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => onToggleActive(call.id)} className="px-2 py-1 rounded bg-sky-600 text-xs">Toggle</button>
            <button onClick={() => { if (editing) { onEdit(call.id, local); setEditing(false);} else setEditing(true); }} className="px-2 py-1 rounded bg-green-600 text-xs">{editing ? 'Save':'Edit'}</button>
          </div>
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <input value={local.title||''} onChange={(e)=>setLocal({...local,title:e.target.value})} className="w-full p-1 rounded bg-black border text-white" />
          <input value={local.address||''} onChange={(e)=>setLocal({...local,address:e.target.value})} className="w-full p-1 rounded bg-black border text-white" />
        </div>
      ) : (
        <>
          <div className="text-xs text-gray-300">Priority: {call.priority || '2'} • Origin: {call.origin || 'Dispatch'}</div>
          {call.notes && <div className="text-sm text-gray-400 italic">{call.notes}</div>}
        </>
      )}

      <div>
        <div className="text-xs font-medium text-gray-300 mt-2">Assigned Units</div>
        <div className="mt-2 flex gap-2 flex-wrap">
          {call.assigned.map(uid => (
            <div key={uid} className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: '#0b1115', border: '1px solid #1f2937' }}>
              <div className="text-sm text-gray-200">{(units.find(u=>u.id===uid)||{name:'Unknown'}).name}</div>
              <button onClick={()=>onRemoveAssigned(uid, call.id)} className="text-xs px-1 py-0.5 rounded bg-red-600">X</button>
            </div>
          ))}
          {call.assigned.length===0 && <div className="text-xs text-gray-500">Drop units/groups here</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- main app component ---------- */
export default function App() {
  // shared data stored either in Supabase or localStorage
  const [data, setData] = usePersistentState(STORAGE_KEY, { units: [], groups: [], calls: [], bolos: [] });

  // MARK: Supabase: we try to use it if present
  const haveSupabase = typeof supabase !== 'undefined' && supabase;

  // --- load from supabase on mount ---
  useEffect(() => {
    if (!haveSupabase) return;
    let channels = [];

    async function loadAll() {
      try {
        const u = await supabase.from('units').select('*').order('id', { ascending: true });
        const g = await supabase.from('groups').select('*').order('id', { ascending: true });
        const c = await supabase.from('calls').select('*').order('created_at', { ascending: false });
        const bol = await supabase.from('bolos').select('*').order('created_at', { ascending: false });

        setData({ units: u.data || [], groups: g.data || [], calls: (c.data || []).map(normalizeCallFromDB), bolos: bol.data || [] });
      } catch (e) { console.warn('Supabase load failed', e); }
    }

    function normalizeCallFromDB(row){
      // ensure assigned is array
      return { ...row, assigned: row.assigned || [] };
    }

    loadAll();

    // realtime subscriptions for insert/update/delete on each table
    ['units','groups','calls','bolos'].forEach(tbl => {
      const ch = supabase.channel(`${tbl}-changes`).on('postgres_changes', { event: '*', schema: 'public', table: tbl }, payload => {
        // simply reload everything for simplicity (small dataset)
        loadAll();
      }).subscribe();
      channels.push(ch);
    });

    return () => {
      // cleanup channels
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, []);

  /* ---------- helper that writes either to Supabase or localStorage ---------- */
  async function writeUpdate(nextData) {
    // always update local copy (so UI updates instantly)
    setData(nextData);

    if (!haveSupabase) return;
    // when using Supabase you should implement granular writes per table.
    // For simplicity this function does not auto-sync complex diffs.
  }

  /* ---------- Units API ---------- */
  async function addUnit({ name, type='UNIT', status='Available' } = {}){
    const u = { id: genId('u_'), name, type, status };
    const next = { ...data, units: [...data.units, u] };
    setData(next);
    if (haveSupabase) await supabase.from('units').insert([{ id: u.id, name: u.name, type: u.type, status: u.status }]);
  }

  async function deleteUnit(id){
    const next = { ...data, units: data.units.filter(u=>u.id!==id), groups: data.groups.map(g=>({...g, unitIds: g.unitIds.filter(x=>x!==id)})), calls: data.calls.map(c=>({...c, assigned: c.assigned.filter(x=>x!==id)})) };
    setData(next);
    if (haveSupabase) await supabase.from('units').delete().eq('id', id);
  }

  async function changeUnitStatus(id, status){
    const next = { ...data, units: data.units.map(u=>u.id===id?{...u,status}:u) };
    setData(next);
    if (haveSupabase) await supabase.from('units').update({ status }).eq('id', id);
  }

  /* ---------- Groups ---------- */
  async function addGroup({ name, unitIds=[] }){
    const g = { id: genId('g_'), name, unitIds };
    const next = { ...data, groups: [...data.groups, g] };
    setData(next);
    if (haveSupabase) await supabase.from('groups').insert([{ id: g.id, name: g.name, unitIds: g.unitIds }]);
  }
  async function deleteGroup(id){
    const next = { ...data, groups: data.groups.filter(g=>g.id!==id) };
    setData(next);
    if (haveSupabase) await supabase.from('groups').delete().eq('id', id);
  }

  /* ---------- Calls ---------- */
  async function addCall({ title='Call', address='', postal='', priority='2', origin='Dispatch' }={}){
    const c = { id: genId('c_'), title, address, postal, priority, origin, active: true, assigned: [], notes: '' };
    const next = { ...data, calls: [c, ...data.calls] };
    setData(next);
    if (haveSupabase) await supabase.from('calls').insert([{ ...c }]);
  }

  async function toggleCallActive(id){
    const next = { ...data, calls: data.calls.map(c=>c.id===id?{...c,active:!c.active}:c) };
    setData(next);
    if (haveSupabase) await supabase.from('calls').update({ active: next.calls.find(c=>c.id===id).active }).eq('id', id);
  }

  function assignUnitToCall(uid, cid){
    const next = { ...data, calls: data.calls.map(c => c.id===cid?{...c, assigned: Array.from(new Set([...c.assigned, uid]))}:c) };
    setData(next);
    if (haveSupabase) supabase.from('calls').update({ assigned: next.calls.find(c=>c.id===cid).assigned }).eq('id', cid);
  }

  function assignGroupToCall(gid, cid){
    const grp = data.groups.find(g=>g.id===gid);
    if (!grp) return;
    const next = { ...data, calls: data.calls.map(c => c.id===cid?{...c, assigned: Array.from(new Set([...c.assigned, ...grp.unitIds]))}:c) };
    setData(next);
    if (haveSupabase) supabase.from('calls').update({ assigned: next.calls.find(c=>c.id===cid).assigned }).eq('id', cid);
  }

  function removeAssigned(uid, cid){
    const next = { ...data, calls: data.calls.map(c => c.id===cid?{...c, assigned: c.assigned.filter(x=>x!==uid)}:c) };
    setData(next);
    if (haveSupabase) supabase.from('calls').update({ assigned: next.calls.find(c=>c.id===cid).assigned }).eq('id', cid);
  }

  function editCall(id, updated){
    const next = { ...data, calls: data.calls.map(c=>c.id===id?{...c,...updated}:c) };
    setData(next);
    if (haveSupabase) supabase.from('calls').update(updated).eq('id', id);
  }

  /* ---------- BOLOs (simple) ---------- */
  function addBolo({ title, plate, note }){
    const b = { id: genId('b_'), title, plate, note, active: true, createdAt: new Date().toISOString() };
    const next = { ...data, bolos: [b, ...data.bolos] };
    setData(next);
    if (haveSupabase) supabase.from('bolos').insert([b]);
  }
  function deleteBolo(id){ const next={...data, bolos: data.bolos.filter(b=>b.id!==id)}; setData(next); if (haveSupabase) supabase.from('bolos').delete().eq('id',id); }

  /* ---------- UI form state ---------- */
  const [unitForm, setUnitForm] = useState({ name: '' });
  const [groupName, setGroupName] = useState('');
  const [groupSelected, setGroupSelected] = useState([]);
  const [callForm, setCallForm] = useState({ title: '', address: '' });
  const [boloForm, setBoloForm] = useState({ title: '', plate: '', note: '' });

  const toggleGroupSelect = (uid) => setGroupSelected(s => s.includes(uid) ? s.filter(x=>x!==uid) : [...s,uid]);

  /* ---------- memoized side bar ---------- */
  const sidebar = useMemo(() => (
    <aside className="p-3" style={{ background: 'linear-gradient(180deg,#040506,#071018)' }}>
      <h2 className="text-white font-semibold">Units</h2>
      <div className="mt-3 space-y-2 max-h-48 overflow-auto">
        {data.units.length ? data.units.map(u => <UnitCard key={u.id} unit={u} onDelete={deleteUnit} onChangeStatus={changeUnitStatus} />) : <div className="text-xs text-gray-400">No units</div>}
      </div>

      <div className="mt-3 p-2 rounded" style={{ background: '#071018', border: '1px solid #1f2937' }}>
        <input placeholder="Unit name" value={unitForm.name} onChange={e=>setUnitForm({...unitForm,name:e.target.value})} className="w-full p-2 rounded bg-black border text-white" />
        <button className="mt-2 w-full py-2 rounded bg-indigo-600" onClick={()=>{ if(!unitForm.name.trim()) return alert('Name required'); addUnit({ name: unitForm.name.trim() }); setUnitForm({ name: '' }); }}>Create</button>
      </div>

      <hr className="my-3 border-gray-800" />

      <h3 className="text-white font-semibold">Groups</h3>
      <div className="mt-2 space-y-2">
        {data.groups.length ? data.groups.map(g => <GroupCard key={g.id} group={g} units={data.units} onDelete={deleteGroup} />) : <div className="text-xs text-gray-400">No groups</div>}
      </div>

      <div className="mt-3 p-2 rounded" style={{ background: '#071018', border: '1px solid #1f2937' }}>
        <input placeholder="Group name" className="w-full p-2 rounded bg-black border text-white" value={groupName} onChange={e=>setGroupName(e.target.value)} />
        <div className="mt-2 max-h-32 overflow-auto grid grid-cols-2 gap-2 text-xs">
          {data.units.map(u => (
            <label key={u.id} className={`p-2 rounded border cursor-pointer ${groupSelected.includes(u.id)?'bg-gray-800':''}`}>
              <input type="checkbox" checked={groupSelected.includes(u.id)} onChange={()=>toggleGroupSelect(u.id)} /> <span className="ml-2 text-white">{u.name}</span>
            </label>
          ))}
        </div>
        <button className="mt-2 w-full py-2 rounded bg-green-600" onClick={()=>{ if(!groupName.trim()) return alert('Group name required'); addGroup({ name: groupName.trim(), unitIds: groupSelected }); setGroupName(''); setGroupSelected([]); }}>Create Group</button>
      </div>
    </aside>
  ), [data, unitForm, groupName, groupSelected]);

  /* ---------- layout: all-on-one responsive ---------- */
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen p-3" style={{ background: '#000', color: '#fff' }}>
        <header className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">ERLC CAD (Live)</h1>
            <div className="text-xs text-gray-400">Realtime — updates for everyone</div>
          </div>
          <div className="space-x-2">
            <button onClick={()=>navigator.clipboard?.writeText(location.href)} className="text-sm px-2 py-1 rounded bg-gray-800">Share</button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-1">{sidebar}</div>

          <main className="md:col-span-3 space-y-3">
            <section className="p-3 rounded" style={{ background: '#071018' }}>
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">Dispatch — Active Calls</h2>
                <div className="text-sm text-gray-400">Drag units or groups onto a call to assign</div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-2 rounded" style={{ background: '#0b1115', border: '1px solid #1f2937' }}>
                  <h3 className="font-medium">Create Call</h3>
                  <input className="w-full p-2 mt-2 rounded bg-black border text-white" placeholder="Title" value={callForm.title} onChange={e=>setCallForm({...callForm,title:e.target.value})} />
                  <input className="w-full p-2 mt-2 rounded bg-black border text-white" placeholder="Address" value={callForm.address} onChange={e=>setCallForm({...callForm,address:e.target.value})} />
                  <div className="mt-2 flex gap-2">
                    <select className="flex-1 p-2 rounded bg-black border text-white" value={callForm.priority} onChange={e=>setCallForm({...callForm,priority:e.target.value})}>
                      <option value="1">1 — High</option>
                      <option value="2">2 — Medium</option>
                      <option value="3">3 — Low</option>
                    </select>
                    <select className="flex-1 p-2 rounded bg-black border text-white" value={callForm.origin} onChange={e=>setCallForm({...callForm,origin:e.target.value})}>
                      {CALL_ORIGINS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <button className="mt-3 w-full py-2 rounded bg-indigo-600" onClick={()=>{ if(!callForm.title.trim()) return alert('Call title required'); addCall(callForm); setCallForm({ title:'', address:'' }); }}>Create Call</button>
                </div>

                <div className="md:col-span-2 p-2">
                  <h3 className="font-medium">Active Calls</h3>
                  <div className="mt-2 space-y-3">
                    {data.calls.length===0 && <div className="text-sm text-gray-300">No active calls</div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.calls.map(c => <CallCard key={c.id} call={c} units={data.units} onDropUnit={assignUnitToCall} onDropGroup={assignGroupToCall} onRemoveAssigned={removeAssigned} onToggleActive={toggleCallActive} onEdit={editCall} />)}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="p-3 rounded" style={{ background: '#071018' }}>
              <h3 className="font-semibold">BOLOs</h3>
              <div className="mt-2 space-y-2">
                <div className="p-2 rounded" style={{ background: '#0b1115', border: '1px solid #1f2937' }}>
                  <input className="w-full p-2 rounded bg-black border text-white" placeholder="Title" value={boloForm.title} onChange={e=>setBoloForm({...boloForm,title:e.target.value})} />
                  <input className="w-full p-2 mt-2 rounded bg-black border text-white" placeholder="Plate" value={boloForm.plate} onChange={e=>setBoloForm({...boloForm,plate:e.target.value})} />
                  <textarea className="w-full p-2 mt-2 rounded bg-black border text-white" placeholder="Notes" value={boloForm.note} onChange={e=>setBoloForm({...boloForm,note:e.target.value})} />
                  <div className="mt-2 flex gap-2">
                    <button className="py-2 px-3 rounded bg-yellow-600" onClick={()=>{ if(!boloForm.title.trim()) return alert('Title required'); addBolo(boloForm); setBoloForm({ title:'', plate:'', note:'' }); }}>Create BOLO</button>
                  </div>
                </div>

                <div className="space-y-2">
                  {data.bolos.length===0 && <div className="text-xs text-gray-400">No BOLOs</div>}
                  {data.bolos.map(b => (
                    <div key={b.id} className="p-2 rounded border" style={{ background: '#0b1115', borderColor: '#1f2937' }}>
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">{b.title}</div>
                          <div className="text-xs text-gray-300">Plate: {b.plate}</div>
                        </div>
                        <div className="text-xs text-gray-300">{new Date(b.createdAt||Date.now()).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </section>
          </main>
        </div>

        <footer className="mt-3 text-sm text-gray-500">Realtime supported via Supabase. Local fallback: data saved to browser.</footer>
      </div>
    </DndProvider>
  );
}

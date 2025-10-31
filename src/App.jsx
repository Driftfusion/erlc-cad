// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Units from "./App" // or rename if needed
import Groups from "./Groups"
import Calls from "./Calls"

export default function MainApp() {
  return (
    <BrowserRouter>
      <nav className="p-4 bg-gray-900 text-white flex gap-4">
        <Link to="/">Units</Link>
        <Link to="/groups">Groups</Link>
        <Link to="/calls">Calls</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Units />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/calls" element={<Calls />} />
      </Routes>
    </BrowserRouter>
  )
}

import { supabase } from "./supabaseClient"

export default function App() {
  const [units, setUnits] = useState([])
  const [name, setName] = useState("")

  // Fetch units initially
  useEffect(() => {
    fetchUnits()
    subscribeToUnits()
  }, [])

  async function fetchUnits() {
    const { data, error } = await supabase.from("units").select("*").order("id", { ascending: true })
    if (error) console.error(error)
    else setUnits(data)
  }

  // Listen for real-time updates
  function subscribeToUnits() {
    supabase
      .channel("units-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "units" },
        (payload) => {
          console.log("Change received!", payload)
          fetchUnits() // Refresh list automatically
        }
      )
      .subscribe()
  }

  async function addUnit() {
    if (!name) return
    await supabase.from("units").insert([{ name, status: "Available", department: "Default" }])
    setName("")
  }

  return (
    <div className="p-4 text-white bg-black min-h-screen">
      <h1 className="text-2xl mb-4">🚔 Live Units</h1>

      <div className="mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-black p-2"
          placeholder="Enter unit name"
        />
        <button onClick={addUnit} className="ml-2 p-2 bg-green-600 rounded">Add Unit</button>
      </div>

      <ul>
        {units.map((u) => (
          <li key={u.id}>
            {u.name} — {u.status} ({u.department})
          </li>
        ))}
      </ul>
    </div>
  )
}



/* --------------------
  Config / Constants
   -------------------- */
const STORAGE_KEY = "erlc_cad_full_v2_v1";
const ItemTypes = { UNIT: "unit", GROUP: "group" };

const UNIT_TYPES = ["LASD", "CHP", "LAPD", "DHS"];
const LAPD_SUBS = ["HC", "SUP", "PU"];
const UNIT_STATUSES = ["Available", "Busy", "On Scene", "Unavailable", "Off Duty"];
const CALL_ORIGINS = ["Caller", "Radio", "Dispatch", "Alarms"];
const PRIORITY_LABELS = { "1": "High", "2": "Medium", "3": "Low" };

const TEN_CODES = {
  "10-0": "Disappeared",
  "10-1": "Frequency Change",
  "10-2": "Radio Check",
  "10-3": "Stop Transmitting",
  "10-4": "Affirmative",
  "10-5": "AFK (Less than 5 Minutes)",
  "10-6": "Busy",
  "10-7": "Out of Service",
  "10-8": "In Service",
  "10-9": "Repeat",
  "10-10": "Fight in Progress",
  "10-11": "Traffic Stop",
  "10-12": "Active Ride Along",
  "10-13": "Shots Fired",
  "10-15": "Subject In Custody; En Route to Station",
  "10-16": "Stolen Vehicle",
  "10-17": "Suspicious Person",
  "10-20": "Location",
  "10-22": "Disregard",
  "10-23": "Arrived On Scene",
  "10-25": "Domestic Dispute",
  "10-26": "ETA",
  "10-27": "Driver's License Check",
  "10-28": "Vehicle Plate Check",
  "10-29": "NCIC Warrant Check",
  "10-30": "Wanted Person",
  "10-31": "No Warrants",
  "10-32": "Request Backup",
  "10-35": "Wrap Up The Scene",
  "10-41": "Beginning Tour Of Duty",
  "10-42": "Ending Tour Of Duty",
  "10-43": "Information",
  "10-49": "Homicide",
  "10-50": "Vehicle Accident",
  "10-51": "Request Towing Service",
  "10-52": "Request EMS",
  "10-53": "Request Fire Department",
  "10-54": "Disabled Vehicle",
  "10-55": "Intoxicated Driver",
  "10-56": "Intoxicated Pedestrian",
  "10-60": "Armed With A Gun",
  "10-61": "Armed With A Knife",
  "10-62": "Kidnapping",
  "10-64": "Sexual Assault",
  "10-65": "Escorting Prisoner",
  "10-66": "Reckless Driver",
  "10-67": "Fire",
  "10-68": "Armed Robbery",
  "10-70": "Foot Pursuit",
  "10-71": "Request Supervisor At Scene",
  "10-73": "Advise Status",
  "10-80": "Vehicle Pursuit",
  "10-90": "Patrol Warning",
  "10-91": "Patrol Kick",
  "10-93": "Removed From Patrol",
  "10-97": "En Route",
  "10-99": "Officer In Distress",
  "11-44": "Person Deceased",
  "51-50": "Medical Evaluation",
  "51-52": "Drugs"
};

/* --------------------
  Persistence hook
   -------------------- */
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

/* --------------------
  small id helper
   -------------------- */
const genId = (prefix = "") =>
  `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;

/* =========================
   Draggable Unit (list tile for side bar)
   ========================= */
function UnitCard({ unit, onDelete, onChangeStatus }) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ItemTypes.UNIT,
      item: { id: unit.id },
      collect: (monitor) => ({ isDragging: monitor.isDragging() })
    }),
    [unit.id]
  );

  return (
    <div
      ref={drag}
      className={`p-2 rounded border flex justify-between items-center ${isDragging ? "opacity-50" : ""}`}
      style={{ background: "#071018", borderColor: "#1f2937" }}
    >
      <div>
        <div className="font-medium text-white">{unit.name}</div>
        <div className="text-xs text-gray-300">
          {unit.type}
          {unit.subdivision ? ` • ${unit.subdivision}` : ""} • {unit.status}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <select
          value={unit.status}
          onChange={(e) => onChangeStatus(unit.id, e.target.value)}
          className="text-xs border rounded px-1 py-0.5 bg-black text-white"
        >
          {UNIT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button onClick={() => onDelete(unit.id)} className="text-xs px-2 py-1 rounded bg-red-600">
          Delete
        </button>
      </div>
    </div>
  );
}

/* =========================
   Draggable Group component
   ========================= */
function GroupCard({ group, units, onDelete }) {
  const [{ isDragging }, drag] = useDrag(
    () => ({ type: ItemTypes.GROUP, item: { id: group.id }, collect: (m) => ({ isDragging: m.isDragging() }) }),
    [group.id]
  );

  return (
    <div
      ref={drag}
      className="p-3 rounded border flex flex-col gap-2"
      style={{ background: "#071018", borderColor: "#1f2937" }}
    >
      <div className="flex justify-between items-center">
        <div className="font-medium text-white">{group.name}</div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-300">{group.unitIds.length} units</div>
          <button onClick={() => onDelete(group.id)} className="text-xs px-2 py-1 rounded bg-red-600">
            Delete
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-300">
        {group.unitIds.length ? (
          group.unitIds.map((uid) => <div key={uid}>{(units.find((u) => u.id === uid) || { name: "Unknown" }).name}</div>)
        ) : (
          <div className="text-gray-500 text-xs">No units</div>
        )}
      </div>
    </div>
  );
}

/* =========================
   CallCard (drop target + inline edit)
   ========================= */
function CallCard({
  call,
  units,
  onDropUnit,
  onDropGroup,
  onRemoveAssigned,
  onToggleActive,
  onDelete,
  onEdit,
  onChangeUnitStatus
}) {
  const [editing, setEditing] = useState(false);
  const [localCall, setLocalCall] = useState(call);

  useEffect(() => setLocalCall(call), [call]);

  const [, drop] = useDrop(
    () => ({
      accept: [ItemTypes.UNIT, ItemTypes.GROUP],
      drop: (item, monitor) => {
        const type = monitor.getItemType();
        if (type === ItemTypes.UNIT) onDropUnit(item.id, call.id);
        if (type === ItemTypes.GROUP) onDropGroup(item.id, call.id);
      }
    }),
    [call.id, onDropUnit, onDropGroup]
  );

  const handleSave = () => {
    onEdit(call.id, localCall);
    setEditing(false);
  };

  return (
    <div ref={drop} className="p-3 rounded border space-y-2" style={{ background: "#071018", borderColor: "#1f2937" }}>
      {/* header */}
      <div className="flex justify-between items-start">
        {editing ? (
          <input
            value={localCall.title}
            onChange={(e) => setLocalCall({ ...localCall, title: e.target.value })}
            className="p-1 rounded bg-black border text-white w-1/2"
            placeholder="Title"
          />
        ) : (
          <div>
            <div className="font-semibold text-white">{call.title || "(untitled)"}</div>
            <div className="text-xs text-gray-300">{call.address} {call.postal ? `• ${call.postal}` : ""}</div>
          </div>
        )}

        <div className="text-right space-y-1">
          <div className="text-xs text-gray-300">{call.active ? "Active" : "Inactive"}</div>
          <div className="flex gap-2">
            <button onClick={() => onToggleActive(call.id)} className="text-xs px-2 py-1 rounded bg-sky-600">Toggle</button>
            <button onClick={() => (editing ? handleSave() : setEditing(true))} className="text-xs px-2 py-1 rounded bg-green-600">
              {editing ? "Save" : "Edit"}
            </button>
            <button onClick={() => onDelete(call.id)} className="text-xs px-2 py-1 rounded bg-red-600">Delete</button>
          </div>
        </div>
      </div>

      {/* body */}
      {editing ? (
        <div className="space-y-2">
          <input
            value={localCall.address || ""}
            onChange={(e) => setLocalCall({ ...localCall, address: e.target.value })}
            placeholder="Address"
            className="w-full p-1 rounded bg-black border text-white"
          />
          <input
            value={localCall.postal || ""}
            onChange={(e) => setLocalCall({ ...localCall, postal: e.target.value })}
            placeholder="Postal"
            className="w-full p-1 rounded bg-black border text-white"
          />

          <div className="flex gap-2">
            <select
              value={localCall.priority || "2"}
              onChange={(e) => setLocalCall({ ...localCall, priority: e.target.value })}
              className="flex-1 p-1 rounded bg-black border text-white"
            >
              <option value="1">1 — High</option>
              <option value="2">2 — Medium</option>
              <option value="3">3 — Low</option>
            </select>

            <select
              value={localCall.origin || CALL_ORIGINS[0]}
              onChange={(e) => setLocalCall({ ...localCall, origin: e.target.value })}
              className="flex-1 p-1 rounded bg-black border text-white"
            >
              {CALL_ORIGINS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <input
            list="ten-codes"
            value={localCall.code || ""}
            onChange={(e) => setLocalCall({ ...localCall, code: e.target.value })}
            placeholder="Code"
            className="w-full p-1 rounded bg-black border text-white"
          />
          <datalist id="ten-codes">
            {Object.entries(TEN_CODES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </datalist>

          <textarea
            value={localCall.notes || ""}
            onChange={(e) => setLocalCall({ ...localCall, notes: e.target.value })}
            placeholder="Notes / Summary"
            className="w-full p-2 rounded bg-black border text-white"
          />

          {/* manual assign from edit */}
          <div className="mt-2">
            <div className="text-xs font-medium text-gray-300">Assign unit (manual)</div>
            <div className="mt-1 grid grid-cols-2 gap-2 max-h-40 overflow-auto">
              {units.map((u) => (
                <button
                  key={u.id}
                  onClick={() => onDropUnit(u.id, call.id)}
                  className="text-left p-2 rounded border text-sm"
                  style={{ background: "#0b1115", borderColor: "#1f2937", color: "white" }}
                >
                  {u.name} • {u.status}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="text-xs text-gray-300">
            Priority: <span className="font-medium">{PRIORITY_LABELS[call.priority]}</span> • Origin: {call.origin} • Code: {call.code}
          </div>
          {call.notes && <div className="text-sm text-gray-400 italic whitespace-pre-wrap">{call.notes}</div>}
        </>
      )}

      {/* assigned units */}
      <div>
        <div className="text-xs font-medium text-gray-300 mt-2">Assigned Units</div>
        <div className="mt-2 flex gap-2 flex-wrap">
          {call.assigned.map((uid) => (
            <div key={uid} className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: "#0b1115", border: "1px solid #1f2937" }}>
              <div className="text-sm text-gray-200">{(units.find((u) => u.id === uid) || { name: "Unknown" }).name}</div>

              {/* dark dropdown for unit status */}
              <select
                value={(units.find((u) => u.id === uid) || { status: "Available" }).status}
                onChange={(e) => onChangeUnitStatus(uid, e.target.value)}
                className="text-xs border rounded px-1 py-0.5 bg-black text-white"
              >
                {UNIT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <button onClick={() => onRemoveAssigned(uid, call.id)} className="text-xs px-1 py-0.5 rounded bg-red-600">
                X
              </button>
            </div>
          ))}
          {!call.assigned.length && <div className="text-xs text-gray-500">Drop units or groups here</div>}
        </div>
      </div>
    </div>
  );
}

/* =========================
   Main App
   ========================= */
export default function App() {
  const [data, setData] = usePersistentState(STORAGE_KEY, { units: [], groups: [], calls: [], bolos: [], dispatchNotes: "" });

  /* -------------------------
     Unit functions
     ------------------------- */
  const addUnit = ({ name, type, subdivision, status }) => {
    const u = { id: genId("u_"), name, type, subdivision: subdivision || "", status: status || "Available" };
    setData((d) => ({ ...d, units: [...d.units, u] }));
  };

  const deleteUnit = (id) => {
    setData((d) => ({
      ...d,
      units: d.units.filter((u) => u.id !== id),
      groups: d.groups.map((g) => ({ ...g, unitIds: g.unitIds.filter((uid) => uid !== id) })),
      calls: d.calls.map((c) => ({ ...c, assigned: c.assigned.filter((uid) => uid !== id) }))
    }));
  };

  const changeUnitStatus = (unitId, newStatus) =>
    setData((d) => ({ ...d, units: d.units.map((u) => (u.id === unitId ? { ...u, status: newStatus } : u)) }));

  /* -------------------------
     Group functions
     ------------------------- */
  const addGroup = ({ name, unitIds = [] }) => {
    const g = { id: genId("g_"), name, unitIds };
    setData((d) => ({ ...d, groups: [...d.groups, g] }));
  };

  const deleteGroup = (id) => setData((d) => ({ ...d, groups: d.groups.filter((g) => g.id !== id) }));

  /* -------------------------
     Call functions
     ------------------------- */
  const addCall = ({ title, address, postal, priority = "2", origin, code, active }) => {
    const c = { id: genId("c_"), title, address, postal, priority, origin, code, active: !!active, assigned: [], notes: "" };
    setData((d) => ({ ...d, calls: [c, ...d.calls] }));
  };

  const deleteCall = (id) => setData((d) => ({ ...d, calls: d.calls.filter((c) => c.id !== id) }));

  const toggleCallActive = (id) => setData((d) => ({ ...d, calls: d.calls.map((c) => (c.id === id ? { ...c, active: !c.active } : c)) }));

  const assignUnitToCall = (uid, cid) =>
    setData((d) => ({ ...d, calls: d.calls.map((c) => (c.id === cid ? { ...c, assigned: Array.from(new Set([...c.assigned, uid])) } : c)) }));

  const assignGroupToCall = (gid, cid) => {
    const grp = data.groups.find((g) => g.id === gid);
    if (!grp) return;
    setData((d) => ({ ...d, calls: d.calls.map((c) => (c.id === cid ? { ...c, assigned: Array.from(new Set([...c.assigned, ...grp.unitIds])) } : c)) }));
  };

  const removeAssigned = (uid, cid) =>
    setData((d) => ({ ...d, calls: d.calls.map((c) => (c.id === cid ? { ...c, assigned: c.assigned.filter((x) => x !== uid) } : c)) }));

  const editCall = (id, updated) =>
    setData((d) => ({ ...d, calls: d.calls.map((c) => (c.id === id ? { ...c, ...updated } : c)) }));

  /* -------------------------
     BOLO functions
     ------------------------- */
  const addBolo = ({ title, plate, note, active }) => {
    const b = { id: genId("b_"), title, plate, note, active: !!active, createdAt: new Date().toISOString() };
    setData((d) => ({ ...d, bolos: [b, ...d.bolos] }));
  };

  const deleteBolo = (id) => setData((d) => ({ ...d, bolos: d.bolos.filter((b) => b.id !== id) }));

  /* -------------------------
     Local form state
     ------------------------- */
  const [unitForm, setUnitForm] = useState({ name: "", type: UNIT_TYPES[0], subdivision: "", status: UNIT_STATUSES[0] });
  const [groupName, setGroupName] = useState("");
  const [groupSelected, setGroupSelected] = useState([]);
  const [callForm, setCallForm] = useState({ title: "", address: "", postal: "", priority: "2", origin: CALL_ORIGINS[0], code: Object.keys(TEN_CODES)[0], active: true });
  const [boloForm, setBoloForm] = useState({ title: "", plate: "", note: "", active: true });

  const toggleSelectUnitForGroup = (uid) => setGroupSelected((s) => (s.includes(uid) ? s.filter((x) => x !== uid) : [...s, uid]));

  /* -------------------------
     Sidebar (memoized)
     ------------------------- */
  const sidebar = useMemo(() => (
    <aside className="p-3 bg-transparent rounded" style={{ background: "linear-gradient(180deg,#040506,#071018)" }}>
      <h2 className="font-semibold text-white">Units</h2>

      <div className="mt-3 space-y-2 max-h-64 overflow-auto">
        {data.units.length ? data.units.map(u => (
          <UnitCard key={u.id} unit={u} onDelete={deleteUnit} onChangeStatus={changeUnitStatus} />
        )) : <div className="text-xs text-gray-400">No units yet</div>}
      </div>

      <div className="mt-3 p-2 rounded" style={{ background: "#071018", border: "1px solid #1f2937" }}>
        <input className="w-full p-2 rounded bg-black border text-white" placeholder="Unit name" value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select className="p-2 rounded bg-black border text-white" value={unitForm.type} onChange={(e) => setUnitForm({ ...unitForm, type: e.target.value })}>
            {UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="p-2 rounded bg-black border text-white" value={unitForm.status} onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value })}>
            {UNIT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {unitForm.type === "LAPD" && (
          <select className="mt-2 p-2 rounded bg-black border text-white w-full" value={unitForm.subdivision} onChange={(e) => setUnitForm({ ...unitForm, subdivision: e.target.value })}>
            <option value="">-- Subdivision (optional) --</option>
            {LAPD_SUBS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        <button className="mt-3 w-full py-2 rounded bg-indigo-600" onClick={() => {
          if (!unitForm.name.trim()) return alert("Unit name required");
          addUnit(unitForm);
          setUnitForm({ name: "", type: UNIT_TYPES[0], subdivision: "", status: UNIT_STATUSES[0] });
        }}>Create Unit</button>
      </div>

      <hr className="my-3 border-gray-800" />

      <h3 className="font-semibold text-white">Groups</h3>
      <div className="mt-3 space-y-2">
        {data.groups.length ? data.groups.map(g => <GroupCard key={g.id} group={g} units={data.units} onDelete={deleteGroup} />) : <div className="text-xs text-gray-400">No groups yet</div>}
      </div>

      <div className="mt-3 p-2 rounded" style={{ background: "#071018", border: "1px solid #1f2937" }}>
        <input className="w-full p-2 rounded bg-black border text-white" placeholder="Group name" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
        <div className="mt-2 max-h-32 overflow-auto grid grid-cols-2 gap-2 text-xs">
          {data.units.map((u) => (
            <label key={u.id} className={`p-2 rounded border cursor-pointer ${groupSelected.includes(u.id) ? "bg-gray-800" : ""}`}>
              <input type="checkbox" checked={groupSelected.includes(u.id)} onChange={() => toggleSelectUnitForGroup(u.id)} /> <span className="ml-2 text-white">{u.name}</span>
            </label>
          ))}
          {data.units.length === 0 && <div className="text-xs text-gray-400">Add units to create a group</div>}
        </div>
        <div className="mt-2 flex gap-2">
          <button className="flex-1 py-2 rounded bg-green-600" onClick={() => {
            if (!groupName.trim()) return alert("Group name required");
            addGroup({ name: groupName.trim(), unitIds: groupSelected });
            setGroupName("");
            setGroupSelected([]);
          }}>Create Group</button>
        </div>
      </div>
    </aside>
  ), [data, unitForm, groupName, groupSelected]);

  /* -------------------------
     Render - router + layout
     ------------------------- */
  return (
    <BrowserRouter>
      <DndProvider backend={HTML5Backend}>
        <div className="min-h-screen p-4" style={{ background: "#000", color: "#fff" }}>
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">ERLC CAD — Dark</h1>
              <div className="text-sm text-gray-600">Local-only CAD — mobile friendly</div>
            </div>
            <nav className="space-x-2">
              <Link to="/" className="text-sm underline text-gray-200">Home</Link>
              <Link to="/dispatch" className="text-sm underline text-gray-200">Dispatch</Link>
              <Link to="/bolos" className="text-sm underline text-gray-200">BOLOs</Link>
              <Link to="/units" className="text-sm underline text-gray-200">Units</Link>
            </nav>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="col-span-1">{sidebar}</div>

            <main className="lg:col-span-3">
              <Routes>
                <Route path="/" element={
                  <div className="p-4 rounded" style={{ background: "#071018" }}>
                    <h2 className="font-semibold">Welcome</h2>
                    <p className="text-gray-300">Use the nav to access Dispatch, BOLOs, and Units. All data is saved locally to your browser.</p>

                    <div className="mt-4">
                      <h3 className="font-medium text-gray-200">Dispatch Notes</h3>
                      <textarea
                        value={data.dispatchNotes || ""}
                        onChange={(e) => setData((d) => ({ ...d, dispatchNotes: e.target.value }))}
                        className="w-full mt-2 p-2 rounded bg-black border text-white"
                        placeholder="Dispatch-wide notes (saved locally)"
                        rows={4}
                      />
                    </div>
                  </div>
                } />

                <Route path="/dispatch" element={
                  <div className="space-y-4">
                    <section className="p-3 rounded" style={{ background: "#071018" }}>
                      <div className="flex justify-between items-center">
                        <h2 className="font-semibold">Dispatch — Active Calls</h2>
                        <div className="text-sm text-gray-300">Drag units or groups onto a call to assign</div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-1 p-2 rounded" style={{ background: "#0b1115", border: "1px solid #1f2937" }}>
                          <h3 className="font-medium">Create Call</h3>
                          <input value={callForm.title} onChange={(e) => setCallForm({ ...callForm, title: e.target.value })} placeholder="Title" className="w-full p-2 mt-2 rounded bg-black border text-white" />
                          <input value={callForm.address} onChange={(e) => setCallForm({ ...callForm, address: e.target.value })} placeholder="Address" className="w-full p-2 mt-2 rounded bg-black border text-white" />
                          <input value={callForm.postal} onChange={(e) => setCallForm({ ...callForm, postal: e.target.value })} placeholder="Postal" className="w-full p-2 mt-2 rounded bg-black border text-white" />

                          <div className="mt-2 flex gap-2">
                            <select value={callForm.priority} onChange={(e) => setCallForm({ ...callForm, priority: e.target.value })} className="w-1/2 p-2 rounded bg-black border text-white">
                              <option value="1">1 — High</option>
                              <option value="2">2 — Medium</option>
                              <option value="3">3 — Low</option>
                            </select>
                            <select value={callForm.origin} onChange={(e) => setCallForm({ ...callForm, origin: e.target.value })} className="w-1/2 p-2 rounded bg-black border text-white">
                              {CALL_ORIGINS.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>

                          <select className="w-full mt-2 p-2 rounded bg-black border text-white" value={callForm.code} onChange={(e) => setCallForm({ ...callForm, code: e.target.value })}>
                            {Object.keys(TEN_CODES).map((k) => <option key={k} value={k}>{k} — {TEN_CODES[k]}</option>)}
                          </select>

                          <label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={callForm.active} onChange={(e) => setCallForm({ ...callForm, active: e.target.checked })} /> <span className="text-sm text-gray-300">Active</span></label>

                          <button className="mt-3 w-full py-2 rounded bg-indigo-600" onClick={() => {
                            if (!callForm.title.trim()) return alert("Call title required");
                            addCall(callForm);
                            setCallForm({ title: "", address: "", postal: "", priority: "2", origin: CALL_ORIGINS[0], code: Object.keys(TEN_CODES)[0], active: true });
                          }}>Create Call</button>
                        </div>

                        <div className="md:col-span-2 p-2">
                          <h3 className="font-medium">Active Calls</h3>
                          <div className="mt-2 space-y-3">
                            {data.calls.length === 0 && <div className="text-sm text-gray-300">No active calls</div>}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {data.calls.map((c) => (
                                <CallCard key={c.id} call={c} units={data.units} onDropUnit={assignUnitToCall} onDropGroup={assignGroupToCall} onRemoveAssigned={removeAssigned} onToggleActive={toggleCallActive} onDelete={deleteCall} onEdit={editCall} onChangeUnitStatus={changeUnitStatus} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="p-3 rounded" style={{ background: "#071018" }}>
                      <h3 className="font-semibold">Codes / Reference</h3>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-300 max-h-48 overflow-auto">
                        {Object.entries(TEN_CODES).map(([k, v]) => <div key={k}><span className="font-medium">{k}</span> — {v}</div>)}
                      </div>
                    </section>
                  </div>
                } />

                <Route path="/bolos" element={
                  <div className="space-y-4">
                    <section className="p-3 rounded" style={{ background: "#071018" }}>
                      <h2 className="font-semibold">Create BOLO</h2>
                      <input className="w-full p-2 mt-2 rounded bg-black border text-white" placeholder="Title" value={boloForm.title} onChange={(e) => setBoloForm({ ...boloForm, title: e.target.value })} />
                      <input className="w-full p-2 mt-2 rounded bg-black border text-white" placeholder="Plate" value={boloForm.plate} onChange={(e) => setBoloForm({ ...boloForm, plate: e.target.value })} />
                      <textarea className="w-full p-2 mt-2 rounded bg-black border text-white" placeholder="Notes" value={boloForm.note} onChange={(e) => setBoloForm({ ...boloForm, note: e.target.value })} />
                      <label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={boloForm.active} onChange={(e) => setBoloForm({ ...boloForm, active: e.target.checked })} /> <span className="text-sm text-gray-300">Active</span></label>
                      <button className="mt-3 py-2 rounded bg-yellow-600 w-full" onClick={() => { if (!boloForm.title.trim()) return alert("BOLO title required"); addBolo(boloForm); setBoloForm({ title: "", plate: "", note: "", active: true }); }}>Create BOLO</button>
                    </section>

                    <section className="p-3 rounded" style={{ background: "#071018" }}>
                      <h2 className="font-semibold">Active BOLOs</h2>
                      <div className="mt-3 space-y-2">
                        {data.bolos.length === 0 && <div className="text-xs text-gray-300">No BOLOs</div>}
                        {data.bolos.map((b) => (
                          <div key={b.id} className="p-2 rounded border" style={{ background: "#0b1115", borderColor: "#1f2937" }}>
                            <div className="flex justify-between">
                              <div>
                                <div className="font-medium">{b.title}</div>
                                <div className="text-xs text-gray-300">Plate: {b.plate} • {b.active ? "Active" : "Inactive"}</div>
                                <div className="text-xs text-gray-300">{b.note}</div>
                              </div>
                              <div className="text-xs text-gray-300">{new Date(b.createdAt).toLocaleString()}</div>
                            </div>
                            <div className="mt-2 flex justify-end"><button className="text-xs px-2 py-1 rounded bg-red-600" onClick={() => deleteBolo(b.id)}>Delete</button></div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                } />

                <Route path="/units" element={
                  <div className="space-y-4">
                    <div className="p-3 rounded" style={{ background: "#071018" }}>
                      <h2 className="font-semibold">Units & Groups</h2>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 rounded" style={{ background: "#0b1115", border: "1px solid #1f2937" }}>
                          <h3 className="font-medium text-gray-100">Units</h3>
                          <div className="mt-3 space-y-2">
                            {data.units.length === 0 && <div className="text-sm text-gray-300">No units</div>}
                            {data.units.map((u) => (
                              <div key={u.id} className="p-2 rounded border flex justify-between items-center" style={{ background: "#071018", borderColor: "#1f2937" }}>
                                <div>
                                  <div className="font-medium text-gray-100">{u.name}</div>
                                  <div className="text-xs text-gray-300">{u.type}{u.subdivision ? ` • ${u.subdivision}` : ""} • {u.status}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <select value={u.status} onChange={(e) => changeUnitStatus(u.id, e.target.value)} className="text-xs border rounded px-1 py-0.5 bg-black text-white">
                                    {UNIT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                  <button onClick={() => deleteUnit(u.id)} className="text-xs px-2 py-1 rounded bg-red-600">Delete</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 rounded" style={{ background: "#0b1115", border: "1px solid #1f2937" }}>
                          <h3 className="font-medium text-gray-100">Groups</h3>
                          <div className="mt-3 space-y-2">
                            {data.groups.length === 0 && <div className="text-sm text-gray-300">No groups</div>}
                            {data.groups.map((g) => (
                              <div key={g.id} className="p-2 rounded border" style={{ background: "#071018", borderColor: "#1f2937" }}>
                                <div className="flex justify-between items-center">
                                  <div className="font-medium text-gray-100">{g.name}</div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-xs text-gray-300">{g.unitIds.length} units</div>
                                    <button onClick={() => deleteGroup(g.id)} className="text-xs px-2 py-1 rounded bg-red-600">Delete</button>
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-300">{g.unitIds.map(uid => <div key={uid}>{(data.units.find(u => u.id === uid) || { name: 'Unknown' }).name}</div>)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                } />

              </Routes>
            </main>
          </div>

          <footer className="mt-4 text-sm text-gray-500">Saved in browser localStorage. Deploy to Vercel/Netlify by connecting this repo.</footer>
        </div>
      </DndProvider>
    </BrowserRouter>
  );
}


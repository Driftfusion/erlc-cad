import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient'; // 👈 this connects to Supabase

export default function Units() {
  const [units, setUnits] = useState([]);
  const [newUnit, setNewUnit] = useState('');

  // Load units from the database
  async function fetchUnits() {
    const { data, error } = await supabase.from('units').select('*');
    if (error) console.error(error);
    else setUnits(data);
  }

  // Add unit to Supabase
  async function addUnit() {
    if (!newUnit.trim()) return;
    const { error } = await supabase.from('units').insert([{ name: newUnit, status: 'Available' }]);
    if (error) console.error(error);
    setNewUnit('');
  }

  // Delete a unit
  async function deleteUnit(id) {
    const { error } = await supabase.from('units').delete().eq('id', id);
    if (error) console.error(error);
  }

  // Realtime updates when database changes
  useEffect(() => {
    fetchUnits();

    const channel = supabase
      .channel('units-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, fetchUnits)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <div>
      <h2>Units</h2>
      <ul>
        {units.map((u) => (
          <li key={u.id}>
            {u.name} • {u.status} <button onClick={() => deleteUnit(u.id)}>Delete</button>
          </li>
        ))}
      </ul>

      <input
        type="text"
        placeholder="New unit name"
        value={newUnit}
        onChange={(e) => setNewUnit(e.target.value)}
      />
      <button onClick={addUnit}>Add Unit</button>
    </div>
  );
}


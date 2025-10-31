import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Calls() {
  const [calls, setCalls] = useState([]);
  const [newCall, setNewCall] = useState('');

  async function fetchCalls() {
    const { data, error } = await supabase.from('calls').select('*');
    if (error) console.error(error);
    else setCalls(data);
  }

  async function addCall() {
    if (!newCall.trim()) return;
    const { error } = await supabase.from('calls').insert([{ description: newCall, status: 'Active' }]);
    if (error) console.error(error);
    setNewCall('');
  }

  async function deleteCall(id) {
    const { error } = await supabase.from('calls').delete().eq('id', id);
    if (error) console.error(error);
  }

  useEffect(() => {
    fetchCalls();

    const channel = supabase
      .channel('calls-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, fetchCalls)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <div>
      <h2>Calls</h2>
      <ul>
        {calls.map((c) => (
          <li key={c.id}>
            {c.description} • {c.status} <button onClick={() => deleteCall(c.id)}>Delete</button>
          </li>
        ))}
      </ul>

      <input
        type="text"
        placeholder="New call description"
        value={newCall}
        onChange={(e) => setNewCall(e.target.value)}
      />
      <button onClick={addCall}>Add Call</button>
    </div>
  );
}

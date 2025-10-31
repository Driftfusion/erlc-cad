import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [newGroup, setNewGroup] = useState('');

  async function fetchGroups() {
    const { data, error } = await supabase.from('groups').select('*');
    if (error) console.error(error);
    else setGroups(data);
  }

  async function addGroup() {
    if (!newGroup.trim()) return;
    const { error } = await supabase.from('groups').insert([{ name: newGroup }]);
    if (error) console.error(error);
    setNewGroup('');
  }

  async function deleteGroup(id) {
    const { error } = await supabase.from('groups').delete().eq('id', id);
    if (error) console.error(error);
  }

  useEffect(() => {
    fetchGroups();

    const channel = supabase
      .channel('groups-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, fetchGroups)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <div>
      <h2>Groups</h2>
      <ul>
        {groups.map((g) => (
          <li key={g.id}>
            {g.name} <button onClick={() => deleteGroup(g.id)}>Delete</button>
          </li>
        ))}
      </ul>

      <input
        type="text"
        placeholder="New group name"
        value={newGroup}
        onChange={(e) => setNewGroup(e.target.value)}
      />
      <button onClick={addGroup}>Add Group</button>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState("");

  useEffect(() => {
    fetchGroups();
    subscribeToGroups();
  }, []);

  async function fetchGroups() {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .order("id", { ascending: true });
    if (!error) setGroups(data);
  }

  function subscribeToGroups() {
    supabase
      .channel("groups-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "groups" }, fetchGroups)
      .subscribe();
  }

  async function addGroup() {
    if (!name) return;
    await supabase.from("groups").insert([{ name }]);
    setName("");
  }

  return (
    <div className="p-4 text-white">
      <h2 className="text-xl mb-2">👥 Groups</h2>
      <input
        placeholder="Group Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="text-black p-1 mr-2"
      />
      <button onClick={addGroup} className="bg-purple-600 px-3 py-1 rounded">
        Add Group
      </button>

      <ul className="mt-3">
        {groups.map((g) => (
          <li key={g.id}>{g.name}</li>
        ))}
      </ul>
    </div>
  );
}


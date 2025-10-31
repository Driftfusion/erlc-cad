import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Calls() {
  const [calls, setCalls] = useState([]);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    fetchCalls();
    subscribeToCalls();
  }, []);

  async function fetchCalls() {
    const { data, error } = await supabase.from("calls").select("*").order("id", { ascending: true });
    if (!error) setCalls(data);
  }

  function subscribeToCalls() {
    supabase.channel("calls-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, fetchCalls)
      .subscribe();
  }

  async function addCall() {
    if (!description || !location) return;
    await supabase.from("calls").insert([{ description, location, status: "Active" }]);
    setDescription("");
    setLocation("");
  }

  return (
    <div className="p-4 text-white">
      <h2 className="text-xl mb-2">📞 Active Calls</h2>
      <input
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="text-black p-1 mr-2"
      />
      <input
        placeholder="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="text-black p-1 mr-2"
      />
      <button onClick={addCall} className="bg-blue-600 px-3 py-1 rounded">Add Call</button>

      <ul className="mt-3">
        {calls.map(c => (
          <li key={c.id}>{c.description} — {c.location} ({c.status})</li>
        ))}
      </ul>
    </div>
  );
}

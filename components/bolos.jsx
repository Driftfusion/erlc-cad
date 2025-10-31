import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Bolos() {
  const [bolos, setBolos] = useState([]);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  useEffect(() => {
    fetchBolos();
    subscribeToBolos();
  }, []);

  async function fetchBolos() {
    const { data, error } = await supabase
      .from("bolos")
      .select("*")
      .order("id", { ascending: true });
    if (!error) setBolos(data);
  }

  function subscribeToBolos() {
    supabase
      .channel("bolos-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "bolos" }, fetchBolos)
      .subscribe();
  }

  async function addBolo() {
    if (!title || !details) return;
    await supabase.from("bolos").insert([{ title, details }]);
    setTitle("");
    setDetails("");
  }

  return (
    <div className="p-4 text-white">
      <h2 className="text-xl mb-2">🚨 BOLOs</h2>
      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-black p-1 mr-2"
      />
      <input
        placeholder="Details"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        className="text-black p-1 mr-2"
      />
      <button onClick={addBolo} className="bg-red-600 px-3 py-1 rounded">
        Add BOLO
      </button>

      <ul className="mt-3">
        {bolos.map((b) => (
          <li key={b.id}>
            <strong>{b.title}</strong> — {b.details}
          </li>
        ))}
      </ul>
    </div>
  );
}

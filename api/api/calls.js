// api/calls.js
let calls = [
  { id: 1, description: "Robbery in progress", location: "Downtown", status: "Active" },
  { id: 2, description: "Traffic stop", location: "Highway 41", status: "Completed" },
];

export default function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json(calls);
  } else if (req.method === "POST") {
    const newCall = req.body;
    newCall.id = calls.length + 1;
    calls.push(newCall);
    res.status(201).json(newCall);
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

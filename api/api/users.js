// api/users.js
let users = [
  { id: 1, name: "Officer Drift", rank: "Sergeant" },
  { id: 2, name: "Officer Sky", rank: "Lieutenant" },
];

export default function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json(users);
  } else if (req.method === "POST") {
    const newUser = req.body;
    newUser.id = users.length + 1;
    users.push(newUser);
    res.status(201).json(newUser);
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

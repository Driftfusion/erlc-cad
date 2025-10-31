
// api/units.js
let units = [
  { id: 1, name: "Unit 23", status: "Available" },
  { id: 2, name: "Unit 45", status: "Busy" },
];

export default function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json(units);
  } else if (req.method === "POST") {
    const newUnit = req.body;
    newUnit.id = units.length + 1;
    units.push(newUnit);
    res.status(201).json(newUnit);
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

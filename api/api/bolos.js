// api/bolos.js
let bolos = [
  { id: 1, type: "Vehicle", description: "Black SUV fleeing from scene" },
];

export default function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json(bolos);
  } else if (req.method === "POST") {
    const newBolo = req.body;
    newBolo.id = bolos.length + 1;
    bolos.push(newBolo);
    res.status(201).json(newBolo);
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

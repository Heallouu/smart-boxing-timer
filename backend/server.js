
import express from "express";
import cors from "cors";
import { db, initialize } from "./src/db.js";
import { generateSession } from "./src/sessionGenerator.js";

const app = express();
app.use(cors());
app.use(express.json());

// Initialize DB & seed if empty
initialize();

app.get("/api/programs", (req, res) => {
  res.json(["debutant", "intermediaire", "confirme"]);
});

app.get("/api/session", (req, res) => {
  try {
    const level = (req.query.level || "debutant").toLowerCase();
    const session = generateSession(db, level);
    res.json(session);
  } catch (e) {
    console.error(e);
    res.status(500).json({error: e.message});
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[backend] API listening on http://localhost:${PORT}`);
});

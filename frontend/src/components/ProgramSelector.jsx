// frontend/src/components/ProgramSelector.jsx
import React from "react";

export default function ProgramSelector({ onSelect }) {
  return (
    <div className="glass p-8 rounded-3xl shadow-glass">
      <h1 className="text-2xl mb-2 text-slate-900 dark:text-slate-100">
        Minuteur sac de frappe intelligent
      </h1>
      <p className="opacity-80 mb-6 text-slate-700 dark:text-slate-300">
        Choisis ton programme d’entraînement :
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button className="btn glass" onClick={() => onSelect("debutant")}>
          Débutant
        </button>
        <button className="btn glass" onClick={() => onSelect("intermediaire")}>
          Intermédiaire
        </button>
        <button className="btn glass" onClick={() => onSelect("confirme")}>
          Confirmé
        </button>
      </div>
      <p className="text-xs opacity-70 mt-6 text-slate-700 dark:text-slate-300">
        Une séance aléatoire est générée à chaque lancement selon ton niveau.
      </p>
    </div>
  );
}


# Smart Boxing Timer — React + SQLite (Node/Express)

Application de **minuteur intelligent** pour séance solo au sac de frappe (boxe/MMA), avec **thème glass/dark**, **TTS** et **génération aléatoire** selon le niveau : _débutant_, _intermédiaire_, _confirmé_.

## ⚙️ Fonctionnalités principales
- Sélection du **niveau** au lancement (débutant / intermédiaire / confirmé).
- **Banque d’exercices** en SQLite (10 échauffement, 20 travail, 10 repos inter-rounds, 10 étirements) par niveau.
- **Séance auto-générée** à chaque lancement :
  - 5:00 échauffement (10×30s)
  - 8 rounds : chaque round 3:00 travail (6×30s) + 1:00 repos (2×30s)
  - 5:00 étirements (10×30s)
- **Minuteur circulaire** avec anneau coloré (jaune=échauffement, rouge=travail, vert=repos).
- **Synthèse vocale** (Web Speech API) : annonce l’instruction de chaque étape. Pour certains exercices fractionnés, une annonce **mi-parcours** (15 secondes) dit “change de côté”.
- **Bips** sans chevauchement avec la voix : début de round, alerte -10s, fin de round.
- **Paramètres** : choix voix, activer/désactiver TTS, choix des sons + test séquentiel.
- **Boutons** Start / Pause / Stop / Régénérer.
- **Thème** clair/sombre (glass / dark glass).

## 📦 Installation

> Prérequis : **Node.js 18+** et **npm** installés.

### 1) Backend (API + SQLite)
```bash
cd backend
npm install
npm run start
```
- L’API démarre sur `http://localhost:4000`
- La base `db.sqlite` est créée et **peuplée automatiquement** au premier lancement.

### 2) Frontend (React + Vite)
Ouvrir un second terminal :
```bash
cd frontend
npm install
npm run dev
```
- Ouvre l’interface sur `http://localhost:5173`
- Les appels `/api/*` sont **proxy** vers `http://localhost:4000` (cf. `vite.config.js`).

> **Build prod :**
```bash
cd frontend
npm run build
npm run preview
```

## 🧠 Utilisation
1. Choisis **ton niveau** sur l’écran d’accueil.
2. Une **séance aléatoire** est générée (tu peux la régénérer via 🔄).
3. Appuie sur **Démarrer** : la **voix annonce** le segment (ex: “Round 1”), puis **bip de départ** et le **timer** se lance.
4. Pendant le round, la voix annonce les **consignes** au début de chaque étape (30s). Si l’exercice est fractionné, une annonce dit **“Change de côté”** à mi-temps.
5. **Alerte -10s** avant la fin du round, puis **bip de fin**.

## 🛠️ Personnalisation
- Modifie/ajoute des exercices dans `backend/src/exercisesData.js`. Relance le backend pour ré-initialiser **(si la base n’existe pas encore)**.
- Couleurs/esthétique : `frontend/tailwind.config.js` et `src/styles.css`.

## 📝 Notes
- La **Web Speech API** dépend des voix disponibles dans le navigateur et le système. Choisis la voix dans ⚙️ Paramètres.
- Les sons sont générés avec **WebAudio**, pas de fichiers audio externes.

Bon entraînement 🥊!


export async function fetchSession(level) {
  const q = new URLSearchParams({ level });
  const res = await fetch(`/api/session?${q}`);
  if (!res.ok) throw new Error("Impossible de charger la séance");
  return await res.json();
}

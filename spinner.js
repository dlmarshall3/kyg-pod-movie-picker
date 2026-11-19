function titleKey(s) {
  return s.trim().toLowerCase();
}

function unwatched(movies, watched) {
  const seen = new Set(watched.map((w) => titleKey(w.title)));
  return movies.filter((m) => !seen.has(titleKey(m)));
}

function pick(pool, rand = Math.random) {
  return pool.length ? pool[Math.floor(rand() * pool.length)] : null;
}

(() => {
  const TOKEN_KEY = "movie-spinner-token";
  const REPO_KEY = "movie-spinner-repo";

  const $ = (id) => document.getElementById(id);
  const els = {
    reel: $("reel"),
    spin: $("spin"),
    actions: $("actions"),
    accept: $("accept"),
    again: $("again"),
    count: $("count"),
    status: $("status"),
    remaining: $("remaining"),
    remainingCount: $("remaining-count"),
    watched: $("watched"),
    watchedCount: $("watched-count"),
    repo: $("repo"),
    token: $("token"),
    save: $("save-settings"),
    settings: $("settings"),
  };

  const safeGet = (k) => {
    try {
      return localStorage.getItem(k) || "";
    } catch {
      return "";
    }
  };
  const safeSet = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  };

  function defaultRepo() {
    const host = location.hostname.match(/^([^.]+)\.github\.io$/);
    const seg = location.pathname.split("/").filter(Boolean)[0];
    return host && seg ? `${host[1]}/${seg}` : "";
  }

  const movies = window.MOVIES || [];
  let watched = [];
  let current = null;
  let store = null;

  function makeStore() {
    const repo = safeGet(REPO_KEY) || defaultRepo();
    store = repo ? createStore({ repo, token: safeGet(TOKEN_KEY) }) : null;
    els.repo.value = repo;
    els.token.value = safeGet(TOKEN_KEY);
    if (!repo || !safeGet(TOKEN_KEY)) els.settings.open = true;
  }

  function setStatus(text, isError = false) {
    els.status.textContent = text;
    els.status.classList.toggle("error", isError);
  }

  function li(...children) {
    const item = document.createElement("li");
    item.append(...children);
    return item;
  }

  function span(text, tag = "span") {
    const el = document.createElement(tag);
    el.textContent = text;
    return el;
  }

  function render() {
    const left = unwatched(movies, watched);
    els.count.textContent = `${left.length} of ${movies.length} left`;
    els.spin.disabled = left.length === 0;
    if (left.length === 0 && movies.length)
      els.reel.textContent = "You have watched everything.";

    els.remainingCount.textContent = left.length;
    els.remaining.replaceChildren(...left.map((t) => li(span(t))));

    els.watchedCount.textContent = watched.length;
    els.watched.replaceChildren(
      ...[...watched].reverse().map((w) => {
        const undo = span("×", "button");
        undo.className = "undo";
        undo.title = `Put "${w.title}" back in the pool`;
        undo.onclick = () => removeWatched(w.title);
        return li(span(w.title), span(w.date, "time"), undo);
      }),
    );
  }

  async function refresh() {
    if (!store) return;
    try {
      watched = (await store.load()).list;
      render();
    } catch (e) {
      setStatus(e.message, true);
    }
  }

  const music = new Audio(
    encodeURI("Godzilla vs Biollante Soundtrack- Bio Wars 4.mp3"),
  );
  let fadeTimer;

  function startMusic() {
    clearInterval(fadeTimer);
    music.pause();
    music.currentTime = 0;
    music.volume = 1;
    music.play().catch(() => {});
  }

  function fadeMusic(ms = 1500) {
    clearInterval(fadeTimer);
    const steps = ms / 50;
    let n = 0;
    fadeTimer = setInterval(() => {
      n++;
      music.volume = Math.max(0, 1 - n / steps);
      if (n >= steps) {
        clearInterval(fadeTimer);
        music.pause();
      }
    }, 50);
  }

  function spin() {
    const pool = unwatched(movies, watched);
    const result = pick(pool);
    if (!result) return;
    startMusic();
    setStatus("");
    els.actions.hidden = true;
    els.spin.hidden = true;
    els.reel.classList.add("spinning");
    const SPIN_MS = 4600;
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      if (elapsed >= SPIN_MS) {
        els.reel.textContent = result;
        els.reel.classList.remove("spinning");
        els.reel.classList.add("landed");
        current = result;
        els.actions.hidden = false;
        fadeMusic();
        return;
      }
      els.reel.textContent = pick(pool);
      const p = elapsed / SPIN_MS;
      const delay = 40 + 360 * p * p;
      setTimeout(tick, Math.min(delay, SPIN_MS - elapsed));
    };
    els.reel.classList.remove("landed");
    tick();
  }

  function resetSpin() {
    current = null;
    els.actions.hidden = true;
    els.spin.hidden = false;
  }

  async function accept() {
    if (!current || !store)
      return setStatus("Set the repo and token in Settings first.", true);
    const title = current;
    els.accept.disabled = true;
    setStatus("Saving…");
    try {
      watched = await store.update(
        (list) =>
          unwatched([title], list).length
            ? [...list, { title, date: new Date().toISOString().slice(0, 10) }]
            : list,
        `Next up: ${title}`,
      );
      resetSpin();
      setStatus(`Saved. ${title} is next.`);
      render();
    } catch (e) {
      setStatus(e.message, true);
    } finally {
      els.accept.disabled = false;
    }
  }

  async function removeWatched(title) {
    if (!store || !confirm(`Put "${title}" back in the pool?`)) return;
    setStatus("Saving…");
    try {
      watched = await store.update(
        (list) => list.filter((w) => w.title !== title),
        `Back in the pool: ${title}`,
      );
      setStatus(`"${title}" is back in the pool.`);
      render();
    } catch (e) {
      setStatus(e.message, true);
    }
  }

  els.spin.onclick = spin;
  els.again.onclick = spin;
  els.accept.onclick = accept;
  els.save.onclick = () => {
    safeSet(REPO_KEY, els.repo.value.trim());
    safeSet(TOKEN_KEY, els.token.value.trim());
    makeStore();
    els.settings.open = false;
    setStatus("Settings saved.");
    refresh();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
  });

  makeStore();
  if (!movies.length) setStatus("No movies found in movies.js.", true);
  render();
  refresh();
})();

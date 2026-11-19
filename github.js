const API = 'https://api.github.com';

function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function fromBase64(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

function createStore({ repo, token, path = 'watched.json' }) {
  const url = `${API}/repos/${repo}/contents/${path}`;
  const headers = () => ({
    Accept: 'application/vnd.github+json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  async function load() {
    const res = await fetch(`${url}?t=${Date.now()}`, { headers: headers(), cache: 'no-store' });
    if (res.status === 404) return { list: [], sha: undefined };
    if (!res.ok) throw new Error(`GitHub read failed (${res.status})`);
    const body = await res.json();
    return { list: JSON.parse(fromBase64(body.content) || '[]'), sha: body.sha };
  }

  async function update(mutate, message) {
    if (!token) throw new Error('Add a GitHub token in Settings to save picks.');
    for (let attempt = 0; attempt < 3; attempt++) {
      const { list, sha } = await load();
      const next = mutate(list);
      const res = await fetch(url, {
        method: 'PUT',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          content: toBase64(JSON.stringify(next, null, 2) + '\n'),
          ...(sha ? { sha } : {}),
        }),
      });
      if (res.ok) return next;
      if (res.status !== 409 && res.status !== 422) {
        throw new Error(`GitHub save failed (${res.status})`);
      }
    }
    throw new Error('Save kept conflicting. Try again.');
  }

  return { load, update };
}

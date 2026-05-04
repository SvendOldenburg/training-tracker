const PB = 'https://pb.aetheriumforge.cloud';

async function pbReq(method, path, body) {
  const opts = { method, headers: {} };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${PB}${path}`, opts);
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `PB ${res.status}`);
  return data;
}

// PocketBase stores date as session_date; expose it as date to the rest of the app
function fromPB(item) {
  if (!item) return null;
  const { session_date, ...rest } = item;
  return { ...rest, date: session_date };
}

function toPB(data) {
  const { date, id, created, updated, collectionId, collectionName, ...rest } = data;
  if (date !== undefined) return { ...rest, session_date: date };
  return rest;
}

function collection(name) {
  const base = `/api/collections/${name}/records`;

  return {
    async list(limit = 500) {
      const r = await pbReq('GET', `${base}?sort=-session_date&perPage=${limit}`);
      return r.items.map(fromPB);
    },

    // sorted oldest-first, optional date cutoff (YYYY-MM-DD)
    async listAsc(cutoff) {
      let url = `${base}?sort=session_date&perPage=500`;
      if (cutoff) url += `&filter=${encodeURIComponent(`session_date>="${cutoff}"`)}`;
      const r = await pbReq('GET', url);
      return r.items.map(fromPB);
    },

    async last() {
      const r = await pbReq('GET', `${base}?sort=-session_date&perPage=1`);
      return r.items.length ? fromPB(r.items[0]) : null;
    },

    async lastOfType(type) {
      const filter = encodeURIComponent(`type="${type}"`);
      const r = await pbReq('GET', `${base}?sort=-session_date&perPage=1&filter=${filter}`);
      return r.items.length ? fromPB(r.items[0]) : null;
    },

    async byDate(date) {
      const filter = encodeURIComponent(`session_date="${date}"`);
      const r = await pbReq('GET', `${base}?filter=${filter}&perPage=1`);
      return r.items.length ? fromPB(r.items[0]) : null;
    },

    async add(data) {
      return pbReq('POST', base, toPB(data));
    },

    async update(id, data) {
      return pbReq('PATCH', `${base}/${id}`, toPB(data));
    },

    async delete(id) {
      return pbReq('DELETE', `${base}/${id}`);
    },
  };
}

export const api = {
  strength_sessions:   collection('strength_sessions'),
  rower_sessions:      collection('rower_sessions'),
  kettlebell_sessions: collection('kettlebell_sessions'),
  barbell_sessions:    collection('barbell_sessions'),
  dumbbell_sessions:   collection('dumbbell_sessions'),
  bodyweight:          collection('bodyweight'),
  body_measurements:   collection('body_measurements'),
};

// Keep settings local -- they're device preferences, not training data
export async function getSetting(key, defaultVal) {
  const raw = localStorage.getItem(`setting_${key}`);
  return raw !== null ? JSON.parse(raw) : defaultVal;
}

export async function setSetting(key, value) {
  localStorage.setItem(`setting_${key}`, JSON.stringify(value));
}

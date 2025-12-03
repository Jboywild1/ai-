async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${window.Config.apiBase}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

window.API = {
  signup: (payload) => api('/auth/signup', { method: 'POST', body: payload, auth: false }),
  login: (email, password) => api('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  assets: () => api('/assets', { auth: false }),
  portfolio: () => api('/portfolio'),
  transactions: () => api('/transactions'),
  order: (payload) => api('/orders', { method: 'POST', body: payload }),
  tick: () => api('/market/tick', { method: 'POST', auth: false })
};

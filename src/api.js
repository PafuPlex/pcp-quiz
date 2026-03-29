// Thin wrapper around the Express API.
// Throws an error with `.status` set to the HTTP status code on non-2xx responses.

async function request(method, path, body) {
  const options = { method, headers: {} };

  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const res = await fetch(path, options);

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('app:unauthorized'));
    }
    throw err;
  }

  const ct = res.headers.get('content-type') ?? '';
  return ct.includes('application/json') ? res.json() : null;
}

export const login = (username, password) => request('POST', '/api/login', { username, password });
export const register = (username, password) => request('POST', '/api/register', { username, password });
export const logout = () => request('POST', '/api/logout');
export const getStore = () => request('GET', '/api/store');
export const setStore = (data) => request('POST', '/api/store', data);

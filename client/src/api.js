/**
 * Thin wrapper around fetch for our /api/* endpoints.
 *
 * Behaviour:
 *   - Reads JWT from localStorage on every call.
 *   - Throws an `ApiError` (extends Error) with `.status`, `.body`, and `.network`.
 *   - On a 401, fires a global `pybe:auth:logout` window event so AuthProvider
 *     can clear the session and the router can redirect to /login — every page
 *     gets this for free instead of having to handle 401 in each component.
 *   - Network failures (fetch rejection) come back as `network: true` ApiErrors
 *     so the UI can show "Couldn't reach the server" instead of leaking
 *     "TypeError: Failed to fetch" to the user.
 */

const TOKEN_KEY = 'pybe.token';
const USER_KEY = 'pybe.user';
const AUTH_LOGOUT_EVENT = 'pybe:auth:logout';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSession({ token, user }) {
  if (token !== undefined) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }
  if (user !== undefined) {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  setSession({ token: null, user: null });
}

/**
 * Custom error so components can `instanceof ApiError` or destructure
 * `.status`, `.body`, `.network`.
 */
export class ApiError extends Error {
  constructor(message, { status, body, network = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.network = network;
  }
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    // fetch() only rejects on actual network failure (DNS, offline, CORS).
    // Surface a friendly, typed error.
    throw new ApiError(
      "Couldn't reach the server. Check your connection and try again.",
      { network: true, body: null, status: 0 }
    );
  }

  let payload = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    // 401 mid-session — fire the global logout event. AuthProvider listens
    // and will redirect to /login. We still throw so the original caller's
    // promise rejects (prevents them from continuing with stale state).
    if (res.status === 401) {
      // Avoid recursion if /api/me is what returned 401 — the bootstrap
      // handler in AuthContext already handles its own 401.
      if (path !== '/api/me') {
        window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT, {
          detail: { reason: '401', from: path },
        }));
      }
    }
    const message =
      payload?.error ||
      (res.status === 500
        ? 'The server hit an unexpected error. Please try again.'
        : `Request failed: ${res.status}`);
    throw new ApiError(message, { status: res.status, body: payload });
  }

  return payload;
}

export const api = {
  signup: (data) => request('POST', '/api/auth/signup', data),
  login: (data) => request('POST', '/api/auth/login', data),
  me: () => request('GET', '/api/me'),
  getProgress: () => request('GET', '/api/progress'),
  getModule: (id) => request('GET', `/api/module/${id}`),
  getUserSummary: () => request('GET', '/api/user/summary'),
  saveDraft: (moduleId, codeSubmission) =>
    request('PATCH', `/api/progress/${moduleId}/draft`, { codeSubmission }),
  saveReflection: (moduleId, reflectionText) =>
    request('PATCH', `/api/progress/${moduleId}/reflection`, {
      reflectionText,
    }),
  submitQuiz: (moduleId, answer) =>
    request('POST', `/api/progress/${moduleId}/quiz`, { answer }),
  regenerateStory: (moduleId) =>
    request('POST', `/api/progress/${moduleId}/story/regenerate`),
  evaluateModule: (moduleId, learnerAnswer) =>
    request('POST', `/api/progress/${moduleId}/evaluate`, { learnerAnswer }),
  markRevealed: (moduleId) =>
    request('POST', `/api/progress/${moduleId}/reveal`),
  getPlacementQuiz: (pathId) =>
    request('GET', `/api/placement/${pathId}`),
  submitPlacementQuiz: (pathId, answers) =>
    request('POST', `/api/placement/${pathId}/submit`, { answers }),
  getCaseStudy: (pathId) =>
    request('GET', `/api/casestudy/${pathId}`),
  submitCaseStudy: (progressId, payload) =>
    request('PATCH', `/api/casestudy/${progressId}/submit`, payload),
  getCapstone: () => request('GET', '/api/capstone'),
  submitCapstone: (progressId, payload) =>
    request('PATCH', `/api/capstone/${progressId}/submit`, payload),
  updatePreferences: (data) =>
    request('PATCH', '/api/me/preferences', data),
};

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(new Error("Request timed out")), 15000);
  const signal = options.signal;
  const abort = () => controller.abort(signal.reason);
  signal?.addEventListener("abort", abort, { once: true });
  try {
    // These small API responses are cheap to fetch again; avoid stale 304/cache
    // behavior being mistaken for a failed health or world request.
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, cache: "no-store", signal: controller.signal });
    let payload;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok) {
      const error = new Error(payload?.error?.message || `Request failed (HTTP ${response.status}).`);
      error.status = response.status;
      error.code = payload?.error?.code;
      throw error;
    }
    return payload;
  } catch (error) {
    if (error.status) throw error;
    if (controller.signal.aborted) {
      if (signal?.aborted) throw new DOMException("Request cancelled.", "AbortError");
      throw new Error("The API took too long to respond. Please retry.");
    }
    throw new Error(`Can't reach Butterfly.exe API at ${API_BASE_URL}. Check that the backend is running.`);
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

const json = (method, body, signal) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
export const getHealth = ({ signal } = {}) => request("/api/health", { signal });
export const getWorlds = ({ signal } = {}) => request("/api/worlds", { signal });
export const getWorld = (world, { signal } = {}) => request(`/api/worlds/${encodeURIComponent(world)}`, { signal });
export async function createExperiment(input, { signal } = {}) {
  const result = await request("/api/experiments", json("POST", input, signal));
  if (!result?.experiment?.id) throw new Error("The API response did not include an experiment ID.");
  return result;
}
export async function getExperiment(id, { signal } = {}) {
  const result = await request(`/api/experiments/${encodeURIComponent(id)}`, { signal });
  if (!result?.experiment?.id) throw new Error("Experiment not found or no longer available in demo mode.");
  return result;
}
export const getComparison = (id, { signal } = {}) => request(`/api/experiments/${encodeURIComponent(id)}/comparison`, { signal });
export const getRecentExperiments = ({ signal } = {}) => request("/api/experiments/recent", { signal });
export const getSuggestions = (body, { signal } = {}) => request("/api/suggestions", json("POST", body, signal));
export const getExplanation = (body, { signal } = {}) => request("/api/explanations", json("POST", body, signal));

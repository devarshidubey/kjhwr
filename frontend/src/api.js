const BASE = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const TIMEOUT_MS = 60_000;

export class ApiError extends Error {
  constructor(message, { status, code, retryable } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status ?? null;
    this.code = code ?? null;
    this.retryable = Boolean(retryable);
  }
}

async function request(path, params) {
  const url = BASE ? new URL(`${BASE}${path}`) : new URL(path, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') url.searchParams.set(key, value);
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!res.ok) {
      const messages = body?.error?.messages;
      const fallback =
        res.status === 502
          ? 'The Elexon data service is unavailable'
          : 'The request could not be completed.';
      throw new ApiError(messages?.[0] || fallback, {
        status: res.status,
        code: body?.error?.code ?? res.status,
        retryable: res.status === 502,
      });
    }

    if (body?.error?.messages?.[0]) {
      throw new ApiError(body.error.messages[0], {
        status: res.status,
        code: body.error.code,
        retryable: Number(body.error.code) === 502,
      });
    }

    return body;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') {
      throw new ApiError('The request timed out. Try again.', { retryable: true, status: 0 });
    }
    throw new ApiError('The request could not be completed. Check the connection and try again.', {
      retryable: true,
    });
  } finally {
    clearTimeout(timer);
  }
}

export function fetchForecast(deliveryDate, cutoffTime) {
  return request('/api/wind/forecast', {
    delivery_date: deliveryDate,
    cutoff_time: cutoffTime,
  });
}

export function fetchAccuracy(deliveryDate, cutoffTime) {
  return request('/api/wind/accuracy', {
    delivery_date: deliveryDate,
    cutoff_time: cutoffTime,
  });
}

export function fetchComparison(deliveryDate, cutoffTime) {
  return request('/api/wind/comparison', {
    delivery_date: deliveryDate,
    cutoff_time: cutoffTime,
  });
}

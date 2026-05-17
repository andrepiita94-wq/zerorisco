const API_URL = (process.env['EXPO_PUBLIC_API_URL'] ?? '').replace(/\/$/, '');

export type RemoteIncident = {
  id: string;
  type: string;
  lat: number;
  lng: number;
  reported_at: string;
  expires_at: string;
};

export async function fetchIncidents(): Promise<RemoteIncident[]> {
  if (!API_URL) return [];
  try {
    const res = await fetch(`${API_URL}/api/incidents`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    return (await res.json()) as RemoteIncident[];
  } catch {
    return [];
  }
}

export async function postIncident(incident: {
  type: string;
  lat: number;
  lng: number;
}): Promise<void> {
  if (!API_URL) return;
  try {
    await fetch(`${API_URL}/api/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incident),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // silently fail — reportar ocorrência não pode bloquear a navegação
  }
}

export async function deleteIncident(id: string): Promise<void> {
  if (!API_URL) return;
  try {
    await fetch(`${API_URL}/api/incidents/${id}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(5000),
    });
  } catch {}
}

export const hasRemoteBackend = Boolean(API_URL);

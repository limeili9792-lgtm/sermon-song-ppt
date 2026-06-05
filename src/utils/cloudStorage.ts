const API = 'https://arxwgfifkrppkqcqtksr.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeHdnZmlma3JwcGtxY3F0a3NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTYwODcsImV4cCI6MjA5NTg5MjA4N30.Rz26BRgAP120mUitnIfLMGwmvbXq0BxihK374CNeyG4';

function headers(): Record<string, string> {
  return { apikey: KEY };
}

export interface CloudPresentation {
  id: string;
  title: string;
  note: string | null;
  file_path: string;
  creator: string | null;
  created_at: string;
}

export async function uploadPptx(blob: Blob, title: string, note: string, creator: string): Promise<boolean> {
  const fileName = `${Date.now()}-${crypto.randomUUID()}.pptx`;
  const filePath = `pptx/${fileName}`;

  const form = new FormData();
  form.append('file', blob, fileName);
  const uploadResp = await fetch(API + '/storage/v1/object/' + filePath, {
    method: 'POST',
    headers: headers(),
    body: form,
  });

  if (!uploadResp.ok) return false;

  const dbResp = await fetch(API + '/rest/v1/presentations', {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ title, note, file_path: filePath, creator }),
  });

  return dbResp.ok;
}

export async function listPresentations(): Promise<CloudPresentation[]> {
  const cutoff = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  const resp = await fetch(
    API + '/rest/v1/presentations?select=*&order=created_at.desc&created_at=gte.' + cutoff,
    { headers: headers() }
  );
  if (!resp.ok) return [];
  return resp.json();
}

export function getDownloadUrl(filePath: string): string {
  return API + '/storage/v1/object/' + filePath;
}

export async function deletePresentation(id: string, filePath: string): Promise<boolean> {
  await fetch(API + '/storage/v1/object/' + filePath, {
    method: 'DELETE',
    headers: headers(),
  });
  const resp = await fetch(API + '/rest/v1/presentations?id=eq.' + id, {
    method: 'DELETE',
    headers: headers(),
  });
  return resp.ok;
}

export async function downloadPptx(filePath: string): Promise<void> {
  const url = getDownloadUrl(filePath);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'SECSlider_Presentation.pptx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

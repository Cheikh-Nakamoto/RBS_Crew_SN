import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { API_BASE } from '@/lib/api-base';

const API_URL = API_BASE;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const role = (session.user as { role?: string })?.role;
  if (role !== 'ADMIN' && role !== 'EDITOR') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const token = (session as { accessToken?: string }).accessToken;
  if (!token) {
    return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 400 });
    }

    // Proxy to Go API
    const upstream = new FormData();
    upstream.append('file', file);

    const res = await fetch(`${API_URL}/admin/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: upstream,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Upload upstream error:', err);
      return NextResponse.json({ error: 'Erreur lors de l\'upload' }, { status: 502 });
    }

    const data = await res.json() as { url: string };
    return NextResponse.json({ url: data.url });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

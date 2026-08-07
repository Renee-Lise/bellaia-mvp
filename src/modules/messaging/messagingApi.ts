// ═══════════════════════════════════════════════════════════
// BELLAÏA MESSAGING — API Supabase
// src/modules/messaging/messagingApi.ts
// ═══════════════════════════════════════════════════════════

import type { Conversation, Message, Attachment, Participant } from './messagingTypes';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Helper : token valide avec refresh automatique ──────────
async function getToken(): Promise<string> {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(SB_URL, SB_KEY);
  const { data, error } = await sb.auth.getSession();
  if (error || !data.session) throw new Error('SESSION_ABSENTE');
  const expiresSoon = data.session.expires_at
    ? data.session.expires_at * 1000 < Date.now() + 60_000
    : false;
  if (expiresSoon) {
    const { data: refreshed, error: re } = await sb.auth.refreshSession();
    if (re || !refreshed.session) throw new Error('SESSION_EXPIREE');
    return refreshed.session.access_token;
  }
  return data.session.access_token;
}

async function sbFetch(path: string, opts: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Erreur ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Conversations ───────────────────────────────────────────

export async function getConversations(userId: string): Promise<Conversation[]> {
  // Chercher les conversations où l'utilisateur est membre
  const membres = await sbFetch(
    `bellaia_conv_membres?user_id=eq.${userId}&select=conversation_id`
  );
  if (!membres?.length) return [];
  const ids = membres.map((m: any) => m.conversation_id).join(',');
  const convs = await sbFetch(
    `bellaia_conversations?id=in.(${ids})&order=updated_at.desc&select=*`
  );
  return convs || [];
}

export async function getOrCreateDirectConv(
  userId: string,
  otherUserId: string,
  otherNom: string
): Promise<Conversation> {
  const token = await getToken();
  // Chercher une conversation directe existante entre les deux
  const mesMembres = await sbFetch(
    `bellaia_conv_membres?user_id=eq.${userId}&select=conversation_id`
  );
  const autresMembres = await sbFetch(
    `bellaia_conv_membres?user_id=eq.${otherUserId}&select=conversation_id`
  );
  const mesIds = new Set((mesMembres || []).map((m: any) => m.conversation_id));
  const communes = (autresMembres || [])
    .map((m: any) => m.conversation_id)
    .filter((id: string) => mesIds.has(id));

  for (const convId of communes) {
    const conv = await sbFetch(
      `bellaia_conversations?id=eq.${convId}&type=eq.direct&select=*`
    );
    if (conv?.[0]) return conv[0];
  }

  // Créer nouvelle conversation directe
  const nouvConv = await sbFetch('bellaia_conversations', {
    method: 'POST',
    body: JSON.stringify({
      type: 'direct',
      nom: otherNom,
      cree_par: userId,
    }),
  });
  const conv = nouvConv?.[0];
  if (!conv) throw new Error('Impossible de créer la conversation');

  // Ajouter les deux participants
  await sbFetch('bellaia_conv_membres', {
    method: 'POST',
    body: JSON.stringify([
      { conversation_id: conv.id, user_id: userId, role: 'admin' },
      { conversation_id: conv.id, user_id: otherUserId, role: 'membre' },
    ]),
  });
  return conv;
}

export async function createGroupConv(
  userId: string,
  nom: string,
  memberIds: string[],
  module?: string
): Promise<Conversation> {
  const conv = await sbFetch('bellaia_conversations', {
    method: 'POST',
    body: JSON.stringify({ type: 'groupe', nom, cree_par: userId, module }),
  });
  const c = conv?.[0];
  if (!c) throw new Error('Impossible de créer le groupe');
  const membres = [userId, ...memberIds].map((uid, i) => ({
    conversation_id: c.id,
    user_id: uid,
    role: i === 0 ? 'admin' : 'membre',
  }));
  await sbFetch('bellaia_conv_membres', { method: 'POST', body: JSON.stringify(membres) });
  return c;
}

// ── Messages ────────────────────────────────────────────────

export async function getMessages(
  conversationId: string,
  limit = 50,
  before?: string
): Promise<Message[]> {
  let q = `bellaia_messages?conversation_id=eq.${conversationId}&supprime=eq.false&order=created_at.desc&limit=${limit}`;
  if (before) q += `&created_at=lt.${before}`;
  const msgs = await sbFetch(q);
  return (msgs || []).reverse();
}

export async function sendMessage(
  conversationId: string,
  auteurId: string,
  contenu: string,
  type: string = 'texte',
  metadata: Record<string, any> = {},
  reponseA?: string
): Promise<Message> {
  const res = await sbFetch('bellaia_messages', {
    method: 'POST',
    body: JSON.stringify({
      conversation_id: conversationId,
      auteur_id: auteurId,
      contenu,
      type,
      metadata,
      reponse_a: reponseA || null,
      expediteur: auteurId,
    }),
  });
  return res?.[0];
}

export async function deleteMessage(messageId: string): Promise<void> {
  await sbFetch(`bellaia_messages?id=eq.${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ supprime: true, contenu: null }),
  });
}

// ── Lecture ─────────────────────────────────────────────────

export async function marquerLu(messageIds: string[], userId: string): Promise<void> {
  if (!messageIds.length) return;
  const rows = messageIds.map(mid => ({ message_id: mid, user_id: userId }));
  await sbFetch('message_lus', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
}

// ── Réactions ────────────────────────────────────────────────

export async function toggleReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> {
  const existing = await sbFetch(
    `bellaia_msg_reactions?message_id=eq.${messageId}&user_id=eq.${userId}&emoji=eq.${encodeURIComponent(emoji)}`
  );
  if (existing?.length) {
    await sbFetch(
      `bellaia_msg_reactions?message_id=eq.${messageId}&user_id=eq.${userId}&emoji=eq.${encodeURIComponent(emoji)}`,
      { method: 'DELETE' }
    );
  } else {
    await sbFetch('bellaia_msg_reactions', {
      method: 'POST',
      body: JSON.stringify({ message_id: messageId, user_id: userId, emoji }),
    });
  }
}

// ── Upload fichier ───────────────────────────────────────────

export async function uploadAttachment(
  file: File,
  conversationId: string,
  userId: string
): Promise<{ storage_path: string; signed_url: string }> {
  const { createClient } = await import('@supabase/supabase-js');
  const token = await getToken();
  const sb = createClient(SB_URL, SB_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const ext = file.name.split('.').pop();
  const path = `${userId}/${conversationId}/${Date.now()}.${ext}`;

  const { error } = await sb.storage
    .from('messaging-attachments')
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(`Upload échoué : ${error.message}`);

  const { data: signed } = await sb.storage
    .from('messaging-attachments')
    .createSignedUrl(path, 3600);

  return { storage_path: path, signed_url: signed?.signedUrl || '' };
}

export async function getSignedUrl(storagePath: string, bucket = 'messaging-attachments'): Promise<string> {
  const { createClient } = await import('@supabase/supabase-js');
  const token = await getToken();
  const sb = createClient(SB_URL, SB_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data } = await sb.storage.from(bucket).createSignedUrl(storagePath, 3600);
  return data?.signedUrl || '';
}

// ── Realtime ─────────────────────────────────────────────────

export function subscribeToMessages(
  conversationId: string,
  onMessage: (msg: Message) => void
) {
  const sub = (async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const token = await getToken();
    const sb = createClient(SB_URL, SB_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    return sb
      .channel(`conv-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bellaia_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => onMessage(payload.new as Message)
      )
      .subscribe();
  })();
  return () => sub.then(s => s.unsubscribe());
}

export function subscribeToNotifications(
  userId: string,
  onNotif: (n: any) => void
) {
  const sub = (async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const token = await getToken();
    const sb = createClient(SB_URL, SB_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    return sb
      .channel(`notifs-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bellaia_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => onNotif(payload.new)
      )
      .subscribe();
  })();
  return () => sub.then(s => s.unsubscribe());
}

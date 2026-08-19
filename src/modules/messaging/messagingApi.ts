// src/modules/messaging/messagingApi.ts — v3 avec session partagée
import { getBellaiaToken, sbApiFetch, getBellaiaClient } from "../../lib/bellaiaSession";
import type { Conversation, Message } from "./messagingTypes";

// ── Conversations ───────────────────────────────────────────
export async function getConversations(userId: string): Promise<Conversation[]> {
  const membres = await sbApiFetch(
    `bellaia_conv_membres?user_id=eq.${userId}&select=conversation_id`
  );
  if (!membres?.length) return [];
  const ids = membres.map((m: any) => m.conversation_id).join(",");
  return await sbApiFetch(
    `bellaia_conversations?id=in.(${ids})&archive=eq.false&order=updated_at.desc`
  ) || [];
}

export async function getProfiles(role?: string): Promise<any[]> {
  let q = "profiles?select=id,prenom,nom,role,telephone";
  if (role) q += `&role=eq.${role}`;
  q += "&order=nom.asc";
  return await sbApiFetch(q) || [];
}

export async function creerConversationDirecte(
  userId: string,
  otherId: string,
  autreNom: string
): Promise<Conversation> {
  // Chercher conversation directe existante
  const mesMembres = await sbApiFetch(
    `bellaia_conv_membres?user_id=eq.${userId}&select=conversation_id`
  ) || [];
  const autresMembres = await sbApiFetch(
    `bellaia_conv_membres?user_id=eq.${otherId}&select=conversation_id`
  ) || [];
  const mesIds   = new Set(mesMembres.map((m: any) => m.conversation_id));
  const communes = autresMembres.filter((m: any) => mesIds.has(m.conversation_id));
  for (const m of communes) {
    const convs = await sbApiFetch(
      `bellaia_conversations?id=eq.${m.conversation_id}&type=eq.direct`
    );
    if (convs?.[0]) return convs[0];
  }
  // Créer nouvelle
  const convs = await sbApiFetch("bellaia_conversations", {
    method: "POST",
    body: JSON.stringify({ type: "direct", nom: autreNom, cree_par: userId }),
  });
  const conv = convs?.[0];
  if (!conv) throw new Error("Impossible de créer la conversation");
  await sbApiFetch("bellaia_conv_membres", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify([
      { conversation_id: conv.id, user_id: userId, role: "admin" },
      { conversation_id: conv.id, user_id: otherId, role: "membre" },
    ]),
  });
  return conv;
}

export async function creerGroupe(
  userId: string,
  nom: string,
  memberIds: string[],
  module?: string
): Promise<Conversation> {
  const convs = await sbApiFetch("bellaia_conversations", {
    method: "POST",
    body: JSON.stringify({ type: "groupe", nom, cree_par: userId, module }),
  });
  const conv = convs?.[0];
  if (!conv) throw new Error("Impossible de créer le groupe");
  const tous = [userId, ...memberIds];
  await sbApiFetch("bellaia_conv_membres", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(
      tous.map((uid, i) => ({
        conversation_id: conv.id,
        user_id: uid,
        role: i === 0 ? "admin" : "membre",
      }))
    ),
  });
  return conv;
}

export async function getMessages(convId: string, limit = 50): Promise<Message[]> {
  const msgs = await sbApiFetch(
    `bellaia_messages?conversation_id=eq.${convId}&supprime=eq.false&order=created_at.asc&limit=${limit}`
  );
  return msgs || [];
}

export async function envoyerMessage(
  convId: string,
  auteurId: string,
  contenu: string,
  type = "texte",
  metadata: any = {},
  reponseA?: string
): Promise<Message> {
  const res = await sbApiFetch("bellaia_messages", {
    method: "POST",
    body: JSON.stringify({
      conversation_id: convId,
      auteur_id:       auteurId,
      expediteur:      auteurId,
      contenu,
      type,
      metadata,
      reponse_a:       reponseA || null,
      supprime:        false,
    }),
  });
  return res?.[0];
}

export async function supprimerMessage(msgId: string): Promise<void> {
  await sbApiFetch(`bellaia_messages?id=eq.${msgId}`, {
    method: "PATCH",
    body: JSON.stringify({ supprime: true, contenu: "[Message supprimé]" }),
  });
}

export async function marquerLu(messageIds: string[], userId: string): Promise<void> {
  if (!messageIds.length) return;
  await sbApiFetch("message_lus", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(messageIds.map(mid => ({ message_id: mid, user_id: userId }))),
  });
}

export async function toggleReaction(
  msgId: string,
  userId: string,
  emoji: string
): Promise<void> {
  const existing = await sbApiFetch(
    `bellaia_msg_reactions?message_id=eq.${msgId}&user_id=eq.${userId}&emoji=eq.${encodeURIComponent(emoji)}`
  );
  if (existing?.length) {
    await sbApiFetch(
      `bellaia_msg_reactions?message_id=eq.${msgId}&user_id=eq.${userId}&emoji=eq.${encodeURIComponent(emoji)}`,
      { method: "DELETE" }
    );
  } else {
    await sbApiFetch("bellaia_msg_reactions", {
      method: "POST",
      body: JSON.stringify({ message_id: msgId, user_id: userId, emoji }),
    });
  }
}

export async function uploadAttachment(
  file: File,
  convId: string,
  userId: string
): Promise<{ storage_path: string; signed_url: string }> {
  const sb   = await getBellaiaClient();
  const ext  = file.name.split(".").pop();
  const path = `${userId}/${convId}/${Date.now()}.${ext}`;
  const { error } = await sb.storage
    .from("messaging-attachments")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(`Upload échoué : ${error.message}`);
  const { data } = await sb.storage
    .from("messaging-attachments")
    .createSignedUrl(path, 3600);
  return { storage_path: path, signed_url: data?.signedUrl || "" };
}

export function subscribeToMessages(
  convId: string,
  onMessage: (msg: Message) => void
) {
  let channel: any = null;
  (async () => {
    const sb = await getBellaiaClient();
    channel = sb
      .channel(`conv-${convId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "bellaia_messages",
        filter: `conversation_id=eq.${convId}`,
      }, (payload: any) => onMessage(payload.new as Message))
      .subscribe();
  })();
  return () => { if (channel) channel.unsubscribe(); };
}

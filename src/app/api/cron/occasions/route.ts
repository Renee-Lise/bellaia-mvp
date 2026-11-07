import { NextRequest, NextResponse } from "next/server";
import { occasionDuJour, estAnniversaire, type Occasion } from "@/lib/occasionsRegles";

// ══════════════════════════════════════════════════════════
// RAPPELS D'OCCASIONS — src/app/api/cron/occasions/route.ts
//
// Appelé une fois par jour par Vercel Cron (voir vercel.json). Ne
// crée que des notifications INTERNES (visibles dans l'onglet
// Notifications de la fondatrice) — aucun envoi réel vers une
// cliente, aucun email/SMS/WhatsApp (canal externe = Phase 2, pas
// encore construit, voir NotificationsF). Le but est de la prévenir
// à temps pour qu'elle envoie elle-même le message si elle le
// souhaite.
//
// Deux types de rappels :
//   1. Anniversaire d'une cliente — une notification par cliente dont
//      clients.date_naissance (mois/jour) correspond à aujourd'hui.
//   2. Fête calendaire (Noël, Saint-Valentin, fête des Mères/Pères/
//      Grands-Mères/Grands-Pères) — une seule notification générale,
//      pas une par cliente (voir occasionsRegles.ts pour les règles
//      de date exactes).
//
// Idempotent : si la notification du jour existe déjà (ex. le cron
// est redéclenché manuellement), elle n'est pas recréée en double.
// ══════════════════════════════════════════════════════════

const LABELS_OCCASION: Record<Occasion, { titre: string; message: string }> = {
  fete_saint_valentin: { titre: "💝 Saint-Valentin aujourd'hui", message: "C'est la Saint-Valentin — pensez à vos clientes si vous voulez leur envoyer un message." },
  fete_noel:            { titre: "🎄 Noël aujourd'hui",            message: "C'est Noël — pensez à vos clientes si vous voulez leur envoyer un message." },
  fete_grands_meres:    { titre: "🌸 Fête des Grands-Mères aujourd'hui", message: "C'est la fête des Grands-Mères — pensez à vos clientes si vous voulez leur envoyer un message." },
  fete_meres:           { titre: "💐 Fête des Mères aujourd'hui",  message: "C'est la fête des Mères — pensez à vos clientes si vous voulez leur envoyer un message." },
  fete_peres:           { titre: "🎁 Fête des Pères aujourd'hui",  message: "C'est la fête des Pères — pensez à vos clientes si vous voulez leur envoyer un message." },
  fete_grands_peres:    { titre: "🎩 Fête des Grands-Pères aujourd'hui", message: "C'est la fête des Grands-Pères — pensez à vos clientes si vous voulez leur envoyer un message." },
};

function dateGuyane(maintenant: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Cayenne", year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = fmt.formatToParts(maintenant);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return { annee: parseInt(map.year, 10), mois: parseInt(map.month, 10), jour: parseInt(map.day, 10) };
}

export async function GET(req: NextRequest) {
  // Vercel Cron envoie Authorization: Bearer <CRON_SECRET> si cette
  // variable est configurée — vérifiée seulement si elle existe, pour
  // ne jamais bloquer tant que Renée-Lise ne l'a pas ajoutée.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { createClient } = await import("@supabase/supabase-js");
  const SB = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { annee, mois, jour } = dateGuyane(new Date());
  const aujourdhui = `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
  const creees: string[] = [];

  async function dejaEnvoyeeAujourdhui(type: string, sourceId: string | null) {
    let q = SB.from("notifications").select("id", { count: "exact", head: true })
      .eq("type_notification", type).gte("created_at", `${aujourdhui}T00:00:00`).lt("created_at", `${aujourdhui}T23:59:59.999`);
    q = sourceId ? q.eq("source_id", sourceId) : q.is("source_id", null);
    const { count } = await q;
    return (count || 0) > 0;
  }

  async function prochaineReference(): Promise<string> {
    try {
      const r = await SB.rpc("prochaine_reference", { p_prefixe: "NOTIF" });
      if (r.data && typeof r.data === "string") return r.data;
    } catch {}
    return `NOTIF-${Date.now()}`;
  }

  // ── 1. Anniversaires clientes ──────────────────────────
  const { data: clients } = await SB.from("clients").select("id,nom,prenom,date_naissance").not("date_naissance", "is", null);
  for (const c of clients || []) {
    if (!estAnniversaire(c.date_naissance, mois, jour)) continue;
    if (await dejaEnvoyeeAujourdhui("anniversaire_client", c.id)) continue;
    const nomComplet = [c.prenom, c.nom].filter(Boolean).join(" ") || "une cliente";
    await SB.from("notifications").insert({
      reference: await prochaineReference(),
      type_notification: "anniversaire_client",
      titre: `🎂 Anniversaire de ${nomComplet} aujourd'hui`,
      message: `C'est l'anniversaire de ${nomComplet} aujourd'hui. Pensez à lui envoyer un message si vous le souhaitez.`,
      canal: "interne",
      statut: "a_envoyer",
      source_table: "clients",
      source_id: c.id,
    });
    creees.push(`anniversaire_client:${c.id}`);
  }

  // ── 2. Fête calendaire du jour (une seule notification, pas par cliente) ──
  const occasion = occasionDuJour(annee, mois, jour);
  if (occasion) {
    if (!(await dejaEnvoyeeAujourdhui(occasion, null))) {
      const lbl = LABELS_OCCASION[occasion];
      await SB.from("notifications").insert({
        reference: await prochaineReference(),
        type_notification: occasion,
        titre: lbl.titre,
        message: lbl.message,
        canal: "interne",
        statut: "a_envoyer",
      });
      creees.push(occasion);
    }
  }

  return NextResponse.json({ ok: true, date: aujourdhui, creees });
}

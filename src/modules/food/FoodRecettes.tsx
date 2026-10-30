import React, { useEffect, useState } from "react";
import { FOOD_CATEGORIES, FOOD_COLORS as FC } from "./foodConsts";
import { fmtDuree, fmtPrix, calculerCoutRecette } from "./foodUtils";
import { getRecettesFoodAvecDiagnostic, creerRecette, majRecette, uploadMediaRecette, getStockGlobalFood } from "./foodApi";
import { creerProduitCatalogue, getProduitCatalogueParRecette } from "./catalogueApi";
import type { Recette, Ingredient, StatutRecette, UniteMesure, StockItem, Produit } from "./foodTypes";

const STATUT_COL: Record<string, string> = {
  brouillon:   "rgba(255,255,255,0.08)",
  validee:     "rgba(21,128,61,0.2)",
  testee:      "rgba(201,168,76,0.2)",
  a_ameliorer: "rgba(251,146,60,0.2)",
  archivee:    "rgba(255,255,255,0.06)",
};
const STATUT_TXT: Record<string, string> = {
  brouillon: "rgba(255,255,255,0.5)", validee: "#22c55e", testee: "#c9a96e",
  a_ameliorer: "#fb923c", archivee: "rgba(255,255,255,0.3)",
};
// Libellés affichés — "testee" en base = "À valider" à l'écran, pour
// coller au vocabulaire de la demande (brouillon / à valider / validée
// / archivée) sans renommer la valeur déjà utilisée dans le code.
const STATUT_LABEL: Record<string, string> = {
  brouillon: "Brouillon", validee: "Validée", testee: "À valider",
  a_ameliorer: "À améliorer", archivee: "Archivée",
};
const STATUTS_FORM: { v: StatutRecette; l: string }[] = [
  { v: "brouillon", l: "Brouillon" },
  { v: "testee", l: "À valider" },
  { v: "validee", l: "Validée" },
  { v: "a_ameliorer", l: "À améliorer" },
  { v: "archivee", l: "Archivée" },
];
const UNITES: UniteMesure[] = [
  "g","kg","ml","L","cl","piece","unite","tranche","bouquet","boite",
  "sachet","pot","bouteille","cuillere_cafe","cuillere_soupe","tasse","pincee","portion",
];
const ETOILES = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

const nouvelId = (prefixe: string) => `${prefixe}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

// Liste de courses d'une recette, au rendement choisi — copiée dans
// le presse-papiers, pas d'envoi automatique (même esprit que le
// partage WhatsApp des communications BSH : une action manuelle).
function copierListeCourses(recette: Recette, cible: number | null) {
  const facteur = cible != null && recette.nbParts > 0 ? cible / recette.nbParts : 1;
  const lignes = recette.ingredients.map((ing: any) => {
    if (ing.quantite != null) {
      const q = Math.round(ing.quantite * facteur * 100) / 100;
      return `- ${ing.nom} : ${q} ${ing.unite}`;
    }
    if (ing.quantite_min != null || ing.quantite_max != null) {
      const qMin = ing.quantite_min != null ? Math.round(ing.quantite_min * facteur * 100) / 100 : "?";
      const qMax = ing.quantite_max != null ? Math.round(ing.quantite_max * facteur * 100) / 100 : "?";
      return `- ${ing.nom} : ${qMin}–${qMax} ${ing.unite} (à confirmer)`;
    }
    return `- ${ing.nom} : à doser`;
  });
  const entete = `Liste de courses — ${recette.nom}${cible != null ? ` (pour ${cible}, recette de base ${recette.nbParts})` : ""}`;
  const texte = [entete, "", ...lignes].join("\n");
  navigator.clipboard?.writeText(texte).then(
    () => alert("Liste de courses copiée — collez-la où vous voulez."),
    () => alert("Impossible de copier automatiquement — recopiez la liste manuellement.")
  );
}

const inp: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 12,
  fontFamily: "sans-serif", outline: "none", width: "100%", boxSizing: "border-box",
};
const btnPrimaire: React.CSSProperties = {
  background: FC.vert, border: "none", borderRadius: 10, padding: "11px",
  color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "sans-serif",
};
const btnSecondaire: React.CSSProperties = {
  background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
  padding: "5px 12px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 11, fontFamily: "sans-serif",
};

type FormRecette = Partial<Recette> & { ingredients: Ingredient[]; etapes: string[] };

function formVide(): FormRecette {
  return {
    categorie: "poulet", difficulte: 3, nbParts: 4,
    tempsPrepa: 0, tempsCuisson: 0, statut: "brouillon",
    ingredients: [], etapes: [], allergenes: [], galerie: [],
  };
}

function CarteRecette({ r, onOuvrir }: { r: Recette; onOuvrir: () => void }) {
  return (
    <div onClick={onOuvrir}
      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${FC.line}`,
        borderRadius: 12, padding: "13px 14px", cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        {r.photo && (
          <img src={r.photo} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, marginRight: 10, flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{r.nom}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
            {r.nbParts} parts · {fmtDuree(r.tempsPrepa + r.tempsCuisson)} au total
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <span style={{ fontSize: 9, background: STATUT_COL[r.statut], color: STATUT_TXT[r.statut], borderRadius: 4, padding: "2px 7px", fontWeight: 700 }}>
            {STATUT_LABEL[r.statut] || r.statut}
          </span>
          {r.prixConseille && (
            <span style={{ fontSize: 12, color: FC.or, fontWeight: 700 }}>{fmtPrix(r.prixConseille)}</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
        {r.ingredients.slice(0, 3).map(i => (
          <span key={i.id} style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.05)", borderRadius: 4, padding: "1px 6px" }}>
            {i.nom}
          </span>
        ))}
        {r.ingredients.length > 3 && (
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>+{r.ingredients.length - 3}</span>
        )}
      </div>
    </div>
  );
}

export default function FoodRecettes() {
  const [recettes, setRecettes] = useState<Recette[]>([]);
  const [chargement, setChargement] = useState(true);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const [detail, setDetail] = useState<Recette | null>(null);
  // Calculateur de production — recalcule les quantités d'ingrédients
  // au prorata d'un rendement cible (ex. 1 à 20 assiettes, mais aussi
  // des bases pâtissières dont le rendement est en grammes, d'où un
  // champ libre plutôt qu'un plafond strict à 20).
  const [cibleRendement, setCibleRendement] = useState<number | null>(null);
  const [form, setForm] = useState<FormRecette | null>(null);
  const [formId, setFormId] = useState<string | null>(null); // id en édition, null = création/duplication
  const [uploadEnCours, setUploadEnCours] = useState<string | null>(null); // "photo" | "video" | "galerie" | null
  const [sauvegarde, setSauvegarde] = useState(false);
  const [erreurSauvegarde, setErreurSauvegarde] = useState<string | null>(null);
  const [filtCat, setFiltCat] = useState("tous");
  const [stocks, setStocks] = useState<StockItem[]>([]);

  const charger = async () => {
    setChargement(true);
    const [{ recettes: r, diagnostic: d }, s] = await Promise.all([
      getRecettesFoodAvecDiagnostic(), getStockGlobalFood(),
    ]);
    setRecettes(r);
    setStocks(s);
    setDiagnostic(d);
    setChargement(false);
  };

  useEffect(() => { charger(); }, []);

  const filtrees = recettes.filter(r => filtCat === "tous" || r.categorie === filtCat);

  const ouvrirCreation = () => { setForm(formVide()); setFormId(null); setErreurSauvegarde(null); };
  const ouvrirEdition = (r: Recette) => {
    setForm({ ...r, ingredients: r.ingredients || [], etapes: r.etapes || [] });
    setFormId(r.id); setErreurSauvegarde(null);
  };
  const ouvrirDuplication = (r: Recette) => {
    setForm({ ...r, id: undefined, nom: `${r.nom} (copie)`, statut: "brouillon", ingredients: r.ingredients || [], etapes: r.etapes || [] });
    setFormId(null); setErreurSauvegarde(null);
  };
  const archiver = async (r: Recette) => {
    const res = await majRecette(r.id, { statut: "archivee" });
    if (res.ok) charger();
    else setErreurSauvegarde("Échec de l'archivage — réessayez.");
  };

  // Lien catalogue de la recette actuellement ouverte en détail —
  // undefined = pas encore vérifié, null = pas (encore) publiée.
  const [catalogueLink, setCatalogueLink] = useState<Produit | null | undefined>(undefined);
  useEffect(() => {
    if (!detail) { setCatalogueLink(undefined); return; }
    let actif = true;
    getProduitCatalogueParRecette(detail.id).then(p => { if (actif) setCatalogueLink(p); });
    return () => { actif = false; };
  }, [detail]);

  const publierAuCatalogue = async (r: Recette) => {
    const res = await creerProduitCatalogue({
      nom: r.nom, categorie: r.categorie, prix: r.prixConseille ?? null,
      recetteId: r.id, disponible: true, photo: r.photo,
      allergenes: r.allergenes, tags: r.tags,
      statut: "brouillon", visibleClient: false,
    });
    if (!res.ok || !res.produit) { alert("Échec de la publication au catalogue — réessayez."); return; }
    setCatalogueLink(res.produit);
    alert("Recette ajoutée au catalogue en brouillon — ouvrez l'onglet Catalogue pour relire la fiche, ajouter une description client et l'activer. Elle ne sera visible d'aucune cliente avant ça.");
  };

  const sauvegarderForm = async () => {
    if (!form || !form.nom?.trim()) { setErreurSauvegarde("Le nom de la recette est obligatoire."); return; }
    setSauvegarde(true);
    setErreurSauvegarde(null);
    const res = formId ? await majRecette(formId, form) : await creerRecette(form);
    setSauvegarde(false);
    if (!res.ok) {
      const messageErreur = (res as { error?: string }).error;
      setErreurSauvegarde(messageErreur || "Échec de l'enregistrement — rien n'a été sauvegardé, réessayez.");
      return;
    }
    setForm(null);
    setFormId(null);
    await charger();
  };

  const majForm = (champ: keyof FormRecette, val: any) => setForm(f => f ? { ...f, [champ]: val } : f);

  const uploaderPhoto = async (file: File) => {
    setUploadEnCours("photo");
    const url = await uploadMediaRecette(file, "photos");
    if (url) majForm("photo", url); else alert("Échec de l'envoi de la photo. Réessayez.");
    setUploadEnCours(null);
  };

  const uploaderVideo = async (file: File) => {
    setUploadEnCours("video");
    const url = await uploadMediaRecette(file, "videos");
    if (url) majForm("video", url); else alert("Échec de l'envoi de la vidéo. Réessayez.");
    setUploadEnCours(null);
  };

  const ajouterPhotoGalerie = async (file: File) => {
    setUploadEnCours("galerie");
    const url = await uploadMediaRecette(file, "photos");
    if (url) setForm(f => f ? { ...f, galerie: [...(f.galerie || []), url] } : f);
    else alert("Échec de l'envoi de la photo. Réessayez.");
    setUploadEnCours(null);
  };

  const supprimerPhotoGalerie = (index: number) => {
    setForm(f => f ? { ...f, galerie: (f.galerie || []).filter((_, i) => i !== index) } : f);
  };

  const ajouterIngredient = () => majForm("ingredients", [...(form?.ingredients || []), { id: nouvelId("ing"), nom: "", quantite: 0, unite: "g" as UniteMesure }]);
  const majIngredient = (i: number, champ: keyof Ingredient, val: any) => {
    const copie = [...(form?.ingredients || [])];
    copie[i] = { ...copie[i], [champ]: val };
    majForm("ingredients", copie);
  };
  const supprimerIngredient = (i: number) => majForm("ingredients", (form?.ingredients || []).filter((_, idx) => idx !== i));

  const ajouterEtape = () => majForm("etapes", [...(form?.etapes || []), ""]);
  const majEtape = (i: number, val: string) => {
    const copie = [...(form?.etapes || [])];
    copie[i] = val;
    majForm("etapes", copie);
  };
  const supprimerEtape = (i: number) => majForm("etapes", (form?.etapes || []).filter((_, idx) => idx !== i));

  // ── Formulaire création / édition / duplication ────────────
  if (form) {
    const coutEstime = calculerCoutRecette(form.ingredients);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
            {formId ? "Modifier la recette" : "Nouvelle recette"}
          </div>
          <button onClick={() => { setForm(null); setFormId(null); }} style={btnSecondaire}>‹ Annuler</button>
        </div>

        <div style={{ background: FC.card, border: `1px solid ${FC.line}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Nom de la recette *</label>
            <input value={form.nom || ""} onChange={e => majForm("nom", e.target.value)} style={inp} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Catégorie</label>
              <select value={form.categorie} onChange={e => majForm("categorie", e.target.value)} style={{ ...inp, background: "#1a1a2e" }}>
                {FOOD_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.ico} {c.nom}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Statut</label>
              <select value={form.statut} onChange={e => majForm("statut", e.target.value)} style={{ ...inp, background: "#1a1a2e" }}>
                {STATUTS_FORM.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Portions</label>
              <input type="number" value={form.nbParts ?? ""} onChange={e => majForm("nbParts", parseInt(e.target.value) || 0)} style={inp} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Difficulté</label>
              <select value={form.difficulte ?? 3} onChange={e => majForm("difficulte", parseInt(e.target.value))} style={{ ...inp, background: "#1a1a2e" }}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} {"★".repeat(n)}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Prépa (min)</label>
              <input type="number" value={form.tempsPrepa ?? ""} onChange={e => majForm("tempsPrepa", parseInt(e.target.value) || 0)} style={inp} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Cuisson (min)</label>
              <input type="number" value={form.tempsCuisson ?? ""} onChange={e => majForm("tempsCuisson", parseInt(e.target.value) || 0)} style={inp} />
            </div>
          </div>

        </div>

        {/* Médias — photo principale, galerie, vidéo */}
        <div style={{ background: FC.card, border: `1px solid ${FC.line}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FC.or, letterSpacing: 1 }}>MÉDIAS</div>

          {/* Photo principale */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Photo principale</label>
            {form.photo && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img src={form.photo} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: `1px solid ${FC.line}` }} />
                <button onClick={() => majForm("photo", "")} style={{ ...btnSecondaire, padding: "4px 9px" }}>✕ Retirer</button>
              </div>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <label style={{ ...btnSecondaire, cursor: "pointer", opacity: uploadEnCours === "photo" ? 0.5 : 1 }}>
                {uploadEnCours === "photo" ? "Envoi…" : "📷 Depuis le téléphone"}
                <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploadEnCours === "photo"}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploaderPhoto(f); e.target.value = ""; }} />
              </label>
              <input value={form.photo || ""} onChange={e => majForm("photo", e.target.value)} placeholder="ou collez un lien https://…" style={{ ...inp, flex: 1 }} />
            </div>
          </div>

          {/* Galerie */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Galerie (photos supplémentaires)</label>
            {(form.galerie || []).length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(form.galerie || []).map((url, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={url} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, border: `1px solid ${FC.line}` }} />
                    <button onClick={() => supprimerPhotoGalerie(i)}
                      style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%",
                        background: "#f87171", border: "none", color: "#fff", fontSize: 10, cursor: "pointer", lineHeight: "18px" }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <label style={{ ...btnSecondaire, cursor: "pointer", alignSelf: "flex-start", opacity: uploadEnCours === "galerie" ? 0.5 : 1 }}>
              {uploadEnCours === "galerie" ? "Envoi…" : "+ Ajouter une photo"}
              <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploadEnCours === "galerie"}
                onChange={e => { const f = e.target.files?.[0]; if (f) ajouterPhotoGalerie(f); e.target.value = ""; }} />
            </label>
          </div>

          {/* Vidéo */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Vidéo</label>
            {form.video && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>🎬 vidéo attachée</span>
                <button onClick={() => majForm("video", "")} style={{ ...btnSecondaire, padding: "4px 9px" }}>✕ Retirer</button>
              </div>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <label style={{ ...btnSecondaire, cursor: "pointer", opacity: uploadEnCours === "video" ? 0.5 : 1 }}>
                {uploadEnCours === "video" ? "Envoi…" : "🎬 Depuis le téléphone"}
                <input type="file" accept="video/*" style={{ display: "none" }} disabled={uploadEnCours === "video"}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploaderVideo(f); e.target.value = ""; }} />
              </label>
              <input value={form.video || ""} onChange={e => majForm("video", e.target.value)} placeholder="ou collez un lien https://…" style={{ ...inp, flex: 1 }} />
            </div>
          </div>
        </div>

        {/* Ingrédients */}
        <div style={{ background: FC.card, border: `1px solid ${FC.line}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FC.or, letterSpacing: 1 }}>INGRÉDIENTS</div>
          {form.ingredients.map((ing, i) => (
            <div key={ing.id} style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input value={ing.nom} onChange={e => majIngredient(i, "nom", e.target.value)} placeholder="Nom" style={{ ...inp, flex: 2 }} />
                <input type="number" value={ing.quantite || ""} onChange={e => majIngredient(i, "quantite", parseFloat(e.target.value) || 0)} placeholder="Qté" style={{ ...inp, flex: 1 }} />
                <select value={ing.unite} onChange={e => majIngredient(i, "unite", e.target.value)} style={{ ...inp, flex: 1, background: "#1a1a2e" }}>
                  {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <button onClick={() => supprimerIngredient(i)} style={{ ...btnSecondaire, padding: "6px 9px" }}>✕</button>
              </div>
              <select value={ing.stockItemId || ""} onChange={e => majIngredient(i, "stockItemId", e.target.value || undefined)}
                style={{ ...inp, background: "#1a1a2e", fontSize: 10, color: ing.stockItemId ? FC.vertL : "rgba(255,255,255,0.4)" }}>
                <option value="">— lier à une fiche de stock (optionnel) —</option>
                {stocks.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>
          ))}
          <button onClick={ajouterIngredient} style={{ ...btnSecondaire, alignSelf: "flex-start" }}>+ Ingrédient</button>
          {coutEstime > 0 && (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Coût matière estimé (si coûts unitaires saisis) : {fmtPrix(coutEstime)}</div>
          )}
        </div>

        {/* Étapes */}
        <div style={{ background: FC.card, border: `1px solid ${FC.line}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FC.or, letterSpacing: 1 }}>ÉTAPES</div>
          {form.etapes.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: FC.vert, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0, marginTop: 6 }}>
                {i + 1}
              </div>
              <textarea value={e} onChange={ev => majEtape(i, ev.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} />
              <button onClick={() => supprimerEtape(i)} style={{ ...btnSecondaire, padding: "6px 9px" }}>✕</button>
            </div>
          ))}
          <button onClick={ajouterEtape} style={{ ...btnSecondaire, alignSelf: "flex-start" }}>+ Étape</button>
        </div>

        {/* Allergènes, conservation, coûts, notes */}
        <div style={{ background: FC.card, border: `1px solid ${FC.line}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Allergènes (séparés par une virgule)</label>
            <input
              value={(form.allergenes || []).join(", ")}
              onChange={e => majForm("allergenes", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
              placeholder="gluten, lait, crustacés…"
              style={inp}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Conservation</label>
            <input value={form.conservation || ""} onChange={e => majForm("conservation", e.target.value)} style={inp} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Coût matière (€)</label>
              <input type="number" value={form.coutMatiere ?? ""} onChange={e => majForm("coutMatiere", e.target.value === "" ? undefined : parseFloat(e.target.value))} style={inp} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Prix conseillé (€)</label>
              <input type="number" value={form.prixConseille ?? ""} onChange={e => majForm("prixConseille", e.target.value === "" ? undefined : parseFloat(e.target.value))} style={inp} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Notes</label>
            <textarea value={form.notes || ""} onChange={e => majForm("notes", e.target.value)} rows={3} style={{ ...inp, resize: "vertical" }} />
          </div>
        </div>

        {erreurSauvegarde && (
          <div style={{ fontSize: 11, color: "#f87171", background: "rgba(248,113,113,0.1)", borderRadius: 8, padding: "8px 12px" }}>
            ⚠️ {erreurSauvegarde}
          </div>
        )}

        <button onClick={sauvegarderForm} disabled={sauvegarde} style={{ ...btnPrimaire, opacity: sauvegarde ? 0.7 : 1 }}>
          {sauvegarde ? "Enregistrement…" : "✅ Enregistrer dans Supabase"}
        </button>
      </div>
    );
  }

  // ── Fiche détail ─────────────────────────────────────────
  if (detail) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => { setDetail(null); setCibleRendement(null); }} style={btnSecondaire}>‹ Retour</button>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => ouvrirEdition(detail)} style={btnSecondaire}>✎ Modifier</button>
          <button onClick={() => ouvrirDuplication(detail)} style={btnSecondaire}>⧉ Dupliquer</button>
          {detail.statut !== "archivee" && (
            <button onClick={() => { archiver(detail); setDetail(null); }} style={btnSecondaire}>🗄 Archiver</button>
          )}
        </div>
      </div>

      {catalogueLink !== undefined && (
        catalogueLink ? (
          <div style={{ fontSize: 11, color: FC.vertL, background: "rgba(21,128,61,0.1)", borderRadius: 8, padding: "8px 12px" }}>
            🛍 Déjà au catalogue — statut : {catalogueLink.statut === "actif" ? "actif (visible clientes)" : catalogueLink.statut === "brouillon" ? "brouillon (pas encore visible)" : catalogueLink.statut}. À gérer depuis l'onglet Catalogue.
          </div>
        ) : (
          <button onClick={() => publierAuCatalogue(detail)}
            style={{ fontSize: 11, padding: "9px 14px", borderRadius: 10, cursor: "pointer",
              background: "rgba(201,168,76,0.12)", border: `1px solid ${FC.or}`,
              color: FC.or, fontWeight: 700, fontFamily: "sans-serif", alignSelf: "flex-start" }}>
            🛍 Publier au catalogue (brouillon)
          </button>
        )
      )}

      <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${FC.line}`, borderRadius: 14, padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{detail.nom}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
              {FOOD_CATEGORIES.find(c => c.id === detail.categorie)?.nom} · {detail.nbParts} part{detail.nbParts > 1 ? "s" : ""}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <span style={{ fontSize: 9, background: STATUT_COL[detail.statut], color: STATUT_TXT[detail.statut], borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>
              {STATUT_LABEL[detail.statut] || detail.statut}
            </span>
            <span style={{ fontSize: 11, color: FC.or }}>{ETOILES(detail.difficulte)}</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "Prépa", val: fmtDuree(detail.tempsPrepa) },
            { label: "Cuisson", val: fmtDuree(detail.tempsCuisson) },
            { label: "Repos", val: detail.tempsRepos ? fmtDuree(detail.tempsRepos) : "—" },
          ].map(t => (
            <div key={t.label} style={{ textAlign: "center", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: FC.vert }}>{t.val}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      {(detail.photo || (detail.galerie && detail.galerie.length > 0) || detail.video) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {detail.photo && (
            <img src={detail.photo} alt={detail.nom} style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 12, border: `1px solid ${FC.line}` }} />
          )}
          {detail.galerie && detail.galerie.length > 0 && (
            <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
              {detail.galerie.map((url, i) => (
                <img key={i} src={url} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: `1px solid ${FC.line}`, flexShrink: 0 }} />
              ))}
            </div>
          )}
          {detail.video && (
            /\.(mp4|webm|mov|m4v)$/i.test(detail.video) ? (
              <video src={detail.video} controls style={{ width: "100%", maxHeight: 260, borderRadius: 12, border: `1px solid ${FC.line}` }} />
            ) : (
              <a href={detail.video} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: FC.or }}>🎬 Voir la vidéo</a>
            )
          )}
        </div>
      )}

      {detail.nbParts > 0 && (
        <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${FC.line}`, borderRadius: 12, padding: "14px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FC.or, marginBottom: 8, letterSpacing: 1 }}>CALCULATEUR DE PRODUCTION</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>
            Rendement de base : {detail.nbParts} {detail.sousCat?.includes("preparation") || detail.nbParts > 20 ? "(unité du rendement d'origine)" : "portions"}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {[1, 2, 4, 6, 8, 10, 12, 20].map(n => (
              <button key={n} onClick={() => setCibleRendement(n)}
                style={{ fontSize: 11, padding: "5px 11px", borderRadius: 20, cursor: "pointer", fontFamily: "sans-serif",
                  border: `1px solid ${cibleRendement === n ? FC.or : "rgba(255,255,255,0.15)"}`,
                  background: cibleRendement === n ? "rgba(201,168,76,0.15)" : "transparent",
                  color: cibleRendement === n ? FC.or : "rgba(255,255,255,0.5)" }}>
                {n}
              </button>
            ))}
            <input type="number" min={1} placeholder="Autre…" value={cibleRendement && ![1,2,4,6,8,10,12,20].includes(cibleRendement) ? cibleRendement : ""}
              onChange={e => setCibleRendement(parseInt(e.target.value) || null)}
              style={{ width: 70, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20,
                padding: "5px 11px", color: "#fff", fontSize: 11, fontFamily: "sans-serif", outline: "none" }}/>
            {cibleRendement != null && (
              <button onClick={() => setCibleRendement(null)} style={{ fontSize: 11, padding: "5px 11px", borderRadius: 20, cursor: "pointer",
                background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)", fontFamily: "sans-serif" }}>
                ↺ Réinitialiser
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${FC.line}`, borderRadius: 12, padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FC.or, letterSpacing: 1 }}>
            INGRÉDIENTS {cibleRendement != null && <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>— pour {cibleRendement}</span>}
          </div>
          {detail.ingredients.length > 0 && (
            <button onClick={() => copierListeCourses(detail, cibleRendement)}
              style={{ fontSize: 10, padding: "4px 10px", borderRadius: 20, cursor: "pointer",
                background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", fontFamily: "sans-serif" }}>
              📋 Liste de courses
            </button>
          )}
        </div>
        {detail.ingredients.length === 0 && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>Aucun ingrédient renseigné.</div>}
        {detail.ingredients.map((ing: any) => {
          const facteur = cibleRendement != null && detail.nbParts > 0 ? cibleRendement / detail.nbParts : 1;
          const q = ing.quantite != null ? Math.round(ing.quantite * facteur * 100) / 100 : null;
          const qMin = ing.quantite_min != null ? Math.round(ing.quantite_min * facteur * 100) / 100 : null;
          const qMax = ing.quantite_max != null ? Math.round(ing.quantite_max * facteur * 100) / 100 : null;
          return (
          <div key={ing.id} style={{ padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>{ing.nom}</span>
              {q != null ? (
                <span style={{ fontSize: 12, color: FC.or, fontWeight: 600 }}>{q} {ing.unite}</span>
              ) : qMin != null || qMax != null ? (
                <span style={{ fontSize: 12, color: "#fb923c", fontWeight: 600 }}>
                  {qMin ?? "?"}–{qMax ?? "?"} {ing.unite} (à confirmer)
                </span>
              ) : (
                <span style={{ fontSize: 11, color: "rgba(251,146,60,0.7)", fontStyle: "italic" }}>à doser</span>
              )}
            </div>
            {ing.notes && (
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{ing.notes}</div>
            )}
          </div>
          );
        })}
        {detail.coutMatiere != null && (
          <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Coût matière estimé : {fmtPrix(detail.coutMatiere)}</div>
        )}
      </div>

      {detail.allergenes && detail.allergenes.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {detail.allergenes.map(a => (
            <span key={a} style={{ fontSize: 10, background: "rgba(251,146,60,0.15)", color: "#fb923c", borderRadius: 99, padding: "3px 10px" }}>⚠️ {a}</span>
          ))}
        </div>
      )}

      <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${FC.line}`, borderRadius: 12, padding: "14px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: FC.or, marginBottom: 10, letterSpacing: 1 }}>ÉTAPES</div>
        {detail.etapes.length === 0 && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>Aucune étape renseignée.</div>}
        {detail.etapes.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: FC.vert, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
              {i + 1}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, paddingTop: 2 }}>{e}</div>
          </div>
        ))}
      </div>

      {detail.prixConseille && (
        <div style={{ background: "rgba(21,128,61,0.08)", border: `1px solid ${FC.line}`, borderRadius: 12, padding: "14px", display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Prix conseillé</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: FC.or }}>{fmtPrix(detail.prixConseille)}</div>
          </div>
          {detail.margeEstimee && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Marge estimée</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: FC.vertL }}>{fmtPrix(detail.margeEstimee)}</div>
            </div>
          )}
        </div>
      )}

      {detail.conservation && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>
          Conservation : {detail.conservation}
        </div>
      )}
      {detail.notes && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{detail.notes}</div>
      )}
    </div>
  );

  // ── Liste ────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <button onClick={ouvrirCreation} style={btnPrimaire}>+ Nouvelle recette</button>

      {diagnostic && (
        <div style={{ fontSize: 10, color: "#f87171", fontFamily: "monospace", background: "rgba(248,113,113,0.08)", borderRadius: 8, padding: "8px 10px" }}>
          {diagnostic}
        </div>
      )}

      <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2 }}>
        {["tous", ...FOOD_CATEGORIES.map(c => c.id)].map(id => (
          <button key={id} onClick={() => setFiltCat(id)}
            style={{ padding: "5px 12px", borderRadius: 99, border: "none", cursor: "pointer",
              fontSize: 10, fontWeight: 700, flexShrink: 0, fontFamily: "sans-serif",
              background: filtCat === id ? FC.vert : "rgba(255,255,255,0.06)",
              color: filtCat === id ? "#fff" : "rgba(255,255,255,0.5)" }}>
            {id === "tous" ? "Toutes" : FOOD_CATEGORIES.find(c => c.id === id)?.nom || id}
          </button>
        ))}
      </div>

      {chargement && (
        <div style={{ textAlign: "center", padding: "28px", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
          Chargement des recettes…
        </div>
      )}

      {!chargement && filtCat === "tous" && (() => {
        // Vue "Toutes" : regroupée par catégorie (dans l'ordre de
        // FOOD_CATEGORIES) plutôt qu'une liste alphabétique plate —
        // c'est ce qui manquait pour "voir les recettes rangées dans
        // leur catégorie".
        const presentes = FOOD_CATEGORIES.filter(c => filtrees.some(r => r.categorie === c.id));
        return presentes.map(cat => (
          <div key={cat.id}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: 1, marginBottom: 6, marginTop: 4 }}>
              {cat.ico} {cat.nom.toUpperCase()} ({filtrees.filter(r => r.categorie === cat.id).length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
              {filtrees.filter(r => r.categorie === cat.id).map(r => (
                <CarteRecette key={r.id} r={r} onOuvrir={() => { setDetail(r); setCibleRendement(null); }} />
              ))}
            </div>
          </div>
        ));
      })()}

      {!chargement && filtCat !== "tous" && filtrees.map(r => (
        <CarteRecette key={r.id} r={r} onOuvrir={() => { setDetail(r); setCibleRendement(null); }} />
      ))}
      {!chargement && !diagnostic && filtrees.length === 0 && (
        <div style={{ textAlign: "center", padding: "28px", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
          Aucune recette {filtCat !== "tous" ? "dans cette catégorie" : "enregistrée pour l'instant"}.
        </div>
      )}
    </div>
  );
}

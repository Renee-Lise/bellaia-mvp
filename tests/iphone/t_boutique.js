// Boutique numérique — parcours écran sur profil iPhone 13 (SIMULATEUR Chromium, pas un iPhone réel).
// Les réponses de la base et des routes serveur sont simulées (données fictives) : on vérifie l'interface,
// pas le paiement réel (testé séparément sur base isolée : migration 0148, 24 scénarios).
// Usage : serveur « next dev -p 3160 » avec NEXT_PUBLIC_SUPABASE_URL=http://localhost:54337 ; node tests/iphone/t_boutique.js
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3160';
const P = (id, o) => ({ id: `00000000-0000-0000-0000-00000000000${id}`, reference: 'REF' + id, nom: 'Produit ' + id, business_unit: 'ODYSSEE', description_courte: 'Résumé ' + id, description_longue: 'Description longue ' + id, prix: 4.9, prix_promotion: null, galerie_photos: null, apercu_chemin: 'odyssee/apercu' + id + '.pdf', format_fichier: 'PDF', nb_pages: 12, licence: null, public_age: 'tout_public', version_fichier: 'v1', ...o });
const CATALOGUE = [P(1, { nom: 'Guide fictif payant' }), P(2, { nom: 'Fiche fictive gratuite', prix: 0, business_unit: 'MOTIPY' }), P(3, { nom: 'Planner fictif', prix: 9.9, prix_promotion: 7.5 })];
let ok = 0, n = 0; const t = (nom, v) => { n++; if (v) ok++; else console.log('ÉCHEC', nom); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(String(e)));
  let droits = []; let commande = null; let gratuit = null; let telech = null; let catalogueOuvert = true;
  await p.route('http://localhost:54337/**', async r => {
    const u = r.request().url();
    if (u.includes('/rest/v1/catalogue_produits')) {
      t('catalogue : produits adultes exclus de la requête', u.includes('public_age=neq.adulte'));
      return catalogueOuvert ? r.fulfill({ json: CATALOGUE }) : r.fulfill({ status: 400, json: { message: 'column does not exist' } });
    }
    if (u.includes('/rest/v1/boutique_droits')) return r.fulfill({ json: droits });
    return r.fulfill({ json: [] });
  });
  await p.route('**/api/boutique/commander', async r => { commande = JSON.parse(r.request().postData() || '{}'); await r.fulfill({ json: { url: BASE + '/boutique?achat=confirme&commande=x' } }); });
  await p.route('**/api/boutique/obtenir', async r => { gratuit = JSON.parse(r.request().postData() || '{}'); droits = [{ id: 'd2', produit_id: CATALOGUE[1].id, accorde_le: new Date().toISOString(), prix_paye_cts: 0, version_achetee: 'v1', catalogue_produits: { nom: CATALOGUE[1].nom, reference: 'REF2', format_fichier: 'PDF', business_unit: 'MOTIPY' } }]; await r.fulfill({ json: { droit: 'd2' } }); });
  await p.route('**/api/boutique/telecharger**', async r => { telech = { url: r.request().url(), auth: r.request().headers()['authorization'] }; await r.fulfill({ json: { url: BASE + '/boutique#fichier-telecharge' } }); });

  // 1. Boutique fermée (avant migration 0148) : message honnête, aucune erreur
  catalogueOuvert = false;
  await p.goto(BASE + '/boutique'); await p.waitForSelector('text=La boutique ouvre bientôt', { timeout: 60000 });
  t('avant ouverture : « La boutique ouvre bientôt »', true);
  catalogueOuvert = true;
  // Session fictive (jeton de test) pour les parcours connectés
  await p.evaluate(() => { localStorage.setItem('bellaia_token', 'jeton-test'); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 3600)); });
  await p.reload(); await p.waitForSelector('[data-test=produit]');
  t('catalogue : 3 produits', await p.locator('[data-test=produit]').count() === 3);
  t('prix affichés (promotion appliquée, gratuit)', (await p.textContent('main')).includes('7,50') && (await p.textContent('main')).includes('Gratuit'));
  t('filtre par univers présent', await p.locator('[role=tab]').count() === 3);
  await p.click('[role=tab]:has-text("Mo Ti-Péyi")'); t('filtre : 1 produit Mo Ti-Péyi', await p.locator('[data-test=produit]').count() === 1);
  await p.click('[role=tab]:has-text("Tout")');
  // 2. Fiche, panier, paiement
  await p.click('text=Guide fictif payant'); await p.waitForSelector('h1:has-text("Guide fictif payant")');
  t('fiche : aperçu gratuit, détails et rétractation', await p.isVisible('text=Aperçu gratuit') && await p.isVisible('text=Droit de rétractation') && await p.isVisible('dt:has-text("Format")'));
  await p.click('[data-test=ajouter]'); t('ajout au panier confirmé', await p.isVisible('text=est dans votre panier'));
  await p.click('[aria-label="Retour au catalogue"]'); await p.click('text=Planner fictif'); await p.click('[data-test=ajouter]');
  await p.click('[data-test=onglet-panier]');
  t('panier : 2 lignes, total 4,90 + 7,50 = 12,40 €', (await p.textContent('[data-test=total]')).replace(/\s/g, '').includes('12,40'));
  await p.click('[aria-label="Retirer Planner fictif"]'); t('retrait d\'une ligne', (await p.textContent('[data-test=total]')).replace(/\s/g, '').includes('4,90'));
  await p.reload(); await p.click('[data-test=onglet-panier]'); t('panier conservé après rechargement', (await p.textContent('[data-test=total]')).replace(/\s/g, '').includes('4,90'));
  await p.click('[data-test=payer]'); await p.waitForURL(/achat=confirme/);
  t('paiement : seuls des identifiants sont envoyés (aucun prix)', Array.isArray(commande?.produits) && commande.produits.length === 1 && !JSON.stringify(commande).includes('4.9'));
  await p.waitForSelector('text=Paiement reçu par notre prestataire');
  t('retour de paiement : attente de la confirmation serveur (pas de succès affiché d\'office)', !(await p.isVisible('text=Achat confirmé')));
  // 3. Produit gratuit → bibliothèque → téléchargement
  await p.goto(BASE + '/boutique'); await p.waitForSelector('[data-test=produit]');
  await p.click('text=Fiche fictive gratuite'); await p.click('text=Obtenir gratuitement');
  await p.waitForSelector('text=a été ajouté à « Mes achats et documents »');
  t('gratuit : demande envoyée pour le bon produit', gratuit?.produit === CATALOGUE[1].id);
  await p.click('[data-test=onglet-achats]'); await p.waitForSelector('[data-test=achat]');
  t('« Mes achats » : 1 document', await p.locator('[data-test=achat]').count() === 1);
  await p.click('[data-test=achat] >> text=Télécharger'); await p.waitForURL(/fichier-telecharge/);
  t('téléchargement : demandé au serveur avec la session (jamais un lien public)', telech && telech.url.includes('produit=' + CATALOGUE[1].id) && telech.auth === 'Bearer jeton-test');
  // 4. Ergonomie iPhone
  await p.goto(BASE + '/boutique'); await p.waitForSelector('[data-test=produit]');
  const deborde = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  t('aucun débordement horizontal (390 px)', !deborde);
  const petites = await p.evaluate(() => [...document.querySelectorAll('button')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 36; }).length);
  t('cibles tactiles ≥ 36 px', petites === 0);
  t('aucun émoji dans l\'interface', !/[\u{1F300}-\u{1FAFF}]/u.test(await p.textContent('body')));
  t('aucune redirection WhatsApp', (await p.locator('a[href*="wa.me"]').count()) === 0);
  await p.screenshot({ path: process.env.CAPTURE || '/tmp/boutique_iphone.png' });
  t('aucune erreur JavaScript', erreurs.length === 0); if (erreurs.length) console.log(erreurs);
  await b.close(); console.log(`RÉSULTAT : ${ok}/${n}`); process.exit(ok === n ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });

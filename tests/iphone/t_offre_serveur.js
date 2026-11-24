// Lot 5 (24/11) — contrôle SERVEUR de l'offre du jour : appels directs à /api/food/commandes/create
// (aucune interface : on vérifie que le serveur refuse lui-même). Base simulée mockapp.js (:54337) + next dev -p 3160.
// Usage : node tests/iphone/t_offre_serveur.js
const API = 'http://localhost:54337', APP = 'http://localhost:3160';
const jourGuyane = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const offre = items => fetch(`${API}/rest/v1/food_menu_jour?id=eq.mj1`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(items) });
const commander = (lignes, extra = {}) => fetch(`${APP}/api/food/commandes/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientNom: 'Essai serveur', lignes, ...extra }) }).then(async r => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
const plat = (id, o = {}) => ({ cle: 'p:' + id, type: 'plat', produit_id: id, nom: id, prix: null, quantite: null, ...o });
(async () => {
  const R = []; const ok = (m, v) => R.push(`${m} : ${v ? 'OK' : 'ÉCHEC'}`);
  await offre({ statut: 'publie', date: jourGuyane(), items: [plat('fp2')] });
  let r = await commander([{ id: 'fp2', qte: 1 }]);
  ok('01 produit coché dans l\'offre publiée : commande acceptée (12 €)', r.status === 200 && r.total === 12);
  await offre({ items: [plat('fp1')] });
  r = await commander([{ id: 'fp2', qte: 1 }]);
  ok('02 produit NON coché : refusé par le serveur (HORS_OFFRE)', r.status === 409 && r.code === 'HORS_OFFRE');
  await offre({ items: [plat('fp2', { prix: 9.5 })] });
  r = await commander([{ id: 'fp2', qte: 2 }]);
  ok('03 prix du jour appliqué par le serveur (2 × 9,50 = 19 €), jamais celui du navigateur', r.status === 200 && r.total === 19);
  await offre({ items: [{ cle: 'm:formule', type: 'menu', nom: 'Formule', prix: 7, composition: [{ produit_id: 'fp2', nom: 'Colombo' }, { produit_id: 'fp2', nom: 'Colombo' }] }] });
  r = await commander([{ id: 'menu::m:formule', qte: 1 }]);
  ok('04 menu publié commandable au prix du menu (7 €)', r.status === 200 && r.total === 7);
  r = await commander([{ id: 'fp2', qte: 1 }]);
  ok('05 produit présent seulement dans un menu : non commandable seul', r.status === 409 && r.code === 'HORS_OFFRE');
  r = await commander([{ id: 'menu::m:inconnu', qte: 1 }]);
  ok('06 menu inexistant : refusé', r.status === 409);
  await offre({ items: [plat('fp2', { quantite: 1 })] });
  r = await commander([{ id: 'fp2', qte: 2 }]);
  ok('07 quantité du jour dépassée : refusée', r.status === 409 && /portion/.test(r.error || ''));
  await offre({ items: [plat('fp2')] });
  r = await commander([{ id: 'fp2', qte: 1, sauce: 'Caramel' }]);
  ok('08 sauce non associée au produit : refusée', r.status === 400);
  r = await commander([{ id: 'fp2', qte: 1 }], { dateLivraison: '2020-01-01' });
  ok('09 date passée : offre expirée, refusée', r.status === 409 && r.code === 'OFFRE_EXPIREE');
  await offre({ statut: 'brouillon' });
  r = await commander([{ id: 'fp2', qte: 1 }]);
  ok('10 offre en brouillon (non publiée) : rien n\'est commandable', r.status === 409 && r.code === 'AUCUNE_OFFRE');
  // remise en état pour les autres tests
  await offre({ statut: 'publie', items: ['fp1', 'fp2', 'fp3', 'cp1', 'cp2'].map(id => plat(id)) });
  console.log(R.join('\n') + `\n${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
})().catch(e => { console.error(e); process.exit(1); });

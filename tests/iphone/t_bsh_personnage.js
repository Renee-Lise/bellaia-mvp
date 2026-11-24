// BSH › Studio créatif : personnage officiel — import de 10 visuels, référence principale et secondaires, cohérence
// dans les créations. iPhone 13 SIMULÉ (pas un iPhone réel). Images de test synthétiques (aucun visuel réel).
// Prérequis : next dev -p 3160 ; ce script lance lui-même la base simulée MOCK_BSH_AGENDA=1.
// Usage : node tests/iphone/t_bsh_personnage.js <sorties>
const { chromium, devices } = require('playwright'); const { spawn, execSync } = require('child_process'); const path = require('path'); const zlib = require('zlib');
const F = '00000000-0000-0000-0000-0000000000f0';
const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'HS256' })}.${b({ role: 'authenticated', sub, exp: Math.floor(Date.now() / 1000) + 7200 })}.x`; };
const attendre = ms => new Promise(r => setTimeout(r, ms));
const crc = b => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
const bloc = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const png = (r, g, bl) => { const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(30, 0); ihdr.writeUInt32BE(40, 4); ihdr[8] = 8; ihdr[9] = 2; const ligne = Buffer.concat([Buffer.from([0]), Buffer.alloc(90).map((_, i) => [r, g, bl][i % 3])]); return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloc('IHDR', ihdr), bloc('IDAT', zlib.deflateSync(Buffer.concat(Array(40).fill(ligne)))), bloc('IEND', Buffer.alloc(0))]); };
(async () => {
  const out = process.argv[2] || '.'; const R = []; let n = 0; const ok = (m, v) => { n++; R.push(`${String(n).padStart(2, '0')} ${m} : ${v ? 'OK' : 'ÉCHEC'}`); };
  try { execSync("pkill -f 'tests/iphone/mockapp.js'"); } catch {} await attendre(800);
  spawn('node', [path.join(__dirname, 'mockapp.js')], { env: { ...process.env, MOCK_BSH_AGENDA: '1', MOCK_BSH_0141: '1' }, stdio: 'ignore', detached: true });
  for (let i = 0; i < 40; i++) { try { await fetch('http://localhost:54337/rest/v1/__bsh_etat'); break; } catch { await attendre(250); } }
  const etat = async () => (await fetch('http://localhost:54337/rest/v1/__bsh_etat', { headers: { Authorization: 'Bearer ' + jwt(F) } })).json();
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.addInitScript(([u, t]) => { localStorage.setItem('bellaia_user', JSON.stringify(u)); localStorage.setItem('bellaia_token', t); localStorage.setItem('bellaia_expiry', String(Math.floor(Date.now() / 1000) + 7000)); localStorage.setItem('bsh-agenda-rubrique', 'studio'); localStorage.removeItem('bellaia-nav'); }, [{ id: F, role: 'fondatrice', prenom: 'Fondatrice' }, jwt(F)]);
  await ctx.addInitScript(() => { const s = document.createElement('style'); s.textContent = 'nextjs-portal{display:none!important}'; document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s)); });
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('http://localhost:3160/', { waitUntil: 'networkidle', timeout: 180000 }); await p.waitForSelector('text=Centre de direction', { timeout: 60000 });
  await p.evaluate(() => { const e = [...document.querySelectorAll('button')].find(x => /🗝/.test(x.textContent || '') && /Secret Home/.test(x.textContent || '')); e.scrollIntoView(); e.click(); }); await attendre(1500);
  await p.getByRole('button', { name: /Secret Agenda/ }).first().click(); await p.waitForSelector('[data-testid=importer-personnage]', { timeout: 60000 });
  const fichiers = Array.from({ length: 10 }, (_, i) => ({ name: `reference_${i + 1}.png`, mimeType: 'image/png', buffer: png(20 * i, 120, 255 - 20 * i) }));
  await p.locator('[data-testid=importer-personnage] input[type=file]').setInputFiles(fichiers);
  await p.waitForFunction(() => /10 visuel\(s\) déposé\(s\)/.test(document.body.innerText), null, { timeout: 60000 });
  let E = await etat(); let refs = (E.bsh_ressources || []).filter(r => r.type === 'personnage_reference');
  ok('10 visuels importés en une fois, rangés comme références du personnage', refs.length === 10);
  ok('une seule référence principale (la première), 9 secondaires', refs.filter(r => r.role_reference === 'principale').length === 1 && refs.filter(r => r.role_reference === 'secondaire').length === 9);
  ok('chaque visuel « à valider », droits « à vérifier », espace privé BSH (personnage/…)', refs.every(r => r.statut_validation === 'a_valider' && r.droits === 'a_verifier' && /^personnage\//.test(r.chemin_storage || '')));
  await p.locator('[data-testid=importer-personnage] input[type=file]').setInputFiles(fichiers.slice(0, 2));
  try { await p.waitForFunction(() => /2 déjà présent/.test(document.body.innerText), null, { timeout: 20000 }); } catch { console.log('DEBUG', (await p.evaluate(() => document.body.innerText)).match(/.{0,80}(visuel|présent|⚠️).{0,120}/g)); }
  E = await etat(); ok('réimport des mêmes fichiers : aucun doublon (empreinte)', (E.bsh_ressources || []).filter(r => r.type === 'personnage_reference').length === 10);
  ok('galerie affichée (10 vignettes)', (await p.getByTestId('galerie-personnage').locator('img').count()) === 10);
  const valider = p.getByTestId('galerie-personnage').getByRole('button', { name: 'Valider (droits confirmés)' });
  for (let i = 0; i < 3; i++) { await valider.first().click(); await attendre(700); }
  E = await etat(); refs = (E.bsh_ressources || []).filter(r => r.type === 'personnage_reference');
  ok('3 visuels validés par la fondatrice (validation datée, droits confirmés)', refs.filter(r => r.statut_validation === 'valide' && r.valide_le && r.droits === 'proprietaire').length === 3);
  ok('état affiché : référence principale validée + secondaires', /Référence principale validée \+ 2 référence/.test(await p.getByTestId('etat-personnage').innerText()));
  await p.getByTestId('galerie-personnage').getByRole('button', { name: 'Définir comme principale' }).first().click(); await attendre(1200);
  E = await etat(); refs = (E.bsh_ressources || []).filter(r => r.type === 'personnage_reference');
  ok('nouvelle référence principale : toujours une seule principale', refs.filter(r => r.role_reference === 'principale').length === 1 && refs.find(r => r.role_reference === 'principale').titre !== refs.find(r => /référence 1$/.test(r.titre)).titre);
  await p.screenshot({ path: `${out}/bsh_personnage_galerie.png` });
  // Cohérence : une nouvelle création reprend la référence principale
  await p.getByRole('button', { name: /Nouvelle création/ }).first().click(); await attendre(500);
  await p.getByRole('group', { name: 'Titre *' }).locator('input').first().fill('Affiche de cohérence'); await p.getByRole('button', { name: /^Créer/ }).last().click(); await attendre(1500);
  E = await etat(); const cr = (E.bsh_creations || []).find(c => c.titre === 'Affiche de cohérence'); const pr = refs.find(r => r.role_reference === 'principale');
  ok('nouvelle création rattachée à la référence principale (personnage_id)', cr && cr.personnage_id === pr.id);
  ok('aucune erreur JavaScript ; aucun débordement horizontal', err.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  if (err.length) console.log(err.slice(0, 3).join('\n'));
  await b.close(); try { execSync("pkill -f 'tests/iphone/mockapp.js'"); } catch {}
  console.log(R.join('\n') + `\n${R.filter(x => x.endsWith('OK')).length}/${R.length}`);
})().catch(e => { console.error(e); process.exit(1); });

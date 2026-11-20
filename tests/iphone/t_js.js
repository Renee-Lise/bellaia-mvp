const ts = require('/home/user/bellaia-mvp/node_modules/typescript'); const fs = require('fs');
const js = f => ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ES2022, removeComments: true } }).outputText;
const a = js(process.argv[2]), b = js(process.argv[3]);
console.log(a === b ? 'JavaScript produit IDENTIQUE (seuls les types changent)' : 'DIFFÉRENCE dans le JavaScript produit');
if (a !== b) { const la = a.split('\n'), lb = b.split('\n'); for (let i = 0; i < Math.max(la.length, lb.length); i++) if (la[i] !== lb[i]) { console.log(i, la[i]?.slice(0, 160), '\n  ->', lb[i]?.slice(0, 160)); break; } }

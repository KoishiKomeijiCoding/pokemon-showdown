require('./client-env.js');
const fs = require('fs');
const lines = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean);
const real = console.log; console.log = () => {};
let b;
try { b = new global.Battle({debug: true}); } catch (e) { real('ctor', e.message); process.exit(); }
let idx = 0;
try { for (; idx < lines.length; idx++) { b.add(lines[idx]); } b.seekTurn(Infinity); real('aucune erreur (add)'); }
catch (e) {
  real('ERREUR à la ligne', idx, ':', lines[idx], '\n', String(e.stack).split('\n').slice(0,5).join('\n'));
  real('contexte:\n' + lines.slice(Math.max(0, idx-6), idx+2).join('\n'));
}

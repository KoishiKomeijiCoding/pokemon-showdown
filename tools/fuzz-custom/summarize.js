const fs=require('fs'),path=require('path');
const dir=process.argv[2]; const sigs={}; let total=0;
for (const f of fs.readdirSync(dir).filter(f=>f.endsWith('.jsonl'))) for (const l of fs.readFileSync(path.join(dir,f),'utf8').split('\n').filter(Boolean)) {
  const r=JSON.parse(l); total++;
  for (const e of r.errors) {
    const lines=e.split('\n'); const first=lines[0].replace(/\d+/g,'N');
    const frames=lines.slice(1).filter(x=>/dist\/(data|sim)/.test(x)).slice(0,3).map(x=>x.replace(/.*dist\//,'').replace(/\)$/,'')).join(' <- ');
    const key=first+' @ '+frames; (sigs[key] ||= {n:0,ex:[]}); sigs[key].n++; if (sigs[key].ex.length<3) sigs[key].ex.push({i:r.i,seed:r.seed,format:r.format,kind:r.kind,turn:r.turn});
  }
}
console.log('battles avec erreur:',total);
for (const [k,v] of Object.entries(sigs).sort((a,b)=>b[1].n-a[1].n)) console.log(v.n+'x',k,'\n   ex:',JSON.stringify(v.ex[0]));

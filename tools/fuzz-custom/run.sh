run () 
{ 
    mode=$1;
    per=$2;
    base=$3;
    d=out_$mode;
    rm -rf $d;
    mkdir $d;
    for w in 1 2 3 4 5 6 7 8 9 10 11;
    do
        timeout 560 node worker.js $w $per $base $d 100 $mode > $d/log$w.txt 2>&1 &
    done;
    wait;
    echo "== $mode: workers ok: $(grep -l '^SUMMARY' $d/log*.txt | wc -l)/11";
    grep -h '^SUMMARY' $d/log*.txt | node -e 'let d=0,c=0,t=0;const a={};require("fs").readFileSync(0,"utf8").trim().split("\n").forEach(l=>{const j=JSON.parse(l.slice(8));d+=j.done;c+=j.crashed;t+=j.turns;for(const k in j.agg)a[k]=(a[k]||0)+j.agg[k]});console.log("battles",d,"avec erreur",c,"tours",t);console.log(JSON.stringify(a))';
    node summarize.js $d
}
report() { d=$1; grep -h '^SUMMARY' $d/log*.txt | node -e 'const m={};require("fs").readFileSync(0,"utf8").trim().split("\n").forEach(l=>{const j=JSON.parse(l.slice(8));for(const k in (j.aiMsgs||{}))m[k]=(m[k]||0)+j.aiMsgs[k]});console.log("refus IA:",JSON.stringify(m))'; }

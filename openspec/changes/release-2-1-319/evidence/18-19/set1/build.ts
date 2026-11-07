type S = [string, string, string, [string, string][]];
const D: S[] = [
["recipe","recipes","the allergen checker",[["pad-thai","contains nuts"],["ratatouille","vegan"],["tiramisu","contains dairy"]]],
["vuln","container images","the CVE scanner",[["api:2.1","0 critical"],["web:5.0","3 critical"]]],
["bird","audio clips","a bird-call identifier",[["clip-a","sparrow"],["clip-b","owl"],["clip-c","sparrow"],["clip-d","wren"]]],
["wine","bottles","the sommelier model",[["Bottle 12","dry red"],["Bottle 13","sweet white"],["Bottle 14","dry red"]]],
["cijob","CI jobs","the build classifier",[["lint-job","pass"],["e2e-job","timeout"],["unit-job","pass"],["deploy-job","cancelled"]]],
["mood","diary entries","a mood tagger",[["entry-1","calm"],["entry-2","anxious"],["entry-3","joyful"]]],
["plag","student papers","the similarity checker",[["paper-9","12%"],["paper-10","61%"],["paper-11","4%"]]],
["crop","field photos","a crop-disease model",[["north.jpg","blight"],["south.jpg","healthy"],["east.jpg","rust"],["west.jpg","healthy"],["mid.jpg","blight"]]],
["churn","customers","the churn predictor",[["acme","at risk"],["globex","safe"],["initech","at risk"]]],
["fmt","Go files","gofmt-check",[["main.go","needs format"],["util.go","ok"],["srv.go","ok"]]],
["rating","movie reviews","a star-rating model",[["rev-A","4"],["rev-B","1"],["rev-C","5"]]],
["alt","web images","the alt-text auditor",[["hero.png","missing alt"],["logo.svg","has alt"],["bg.jpg","decorative"]]],
["coverage","modules","the coverage tool",[["parser","92"],["lexer","47"],["emit","78"]]],
["emotion","voicemails","an audio emotion model",[["vm-1","frustrated"],["vm-2","grateful"]]],
["cuisine","menu items","a cuisine tagger",[["Pho Bo","Vietnamese"],["Paella","Spanish"],["Dal Makhani","Indian"]]],
["fraud","transactions","the fraud scorer",[["tx-881","0.97"],["tx-882","0.02"],["tx-883","0.45"]]],
["contract","clauses","a contract-risk model",[["clause 4.2","unfavorable"],["clause 7.1","standard"],["clause 9.3","needs review"]]],
["intrusion","server logs","the intrusion detector",[["auth.log","brute force"],["app.log","normal"],["db.log","normal"]]],
["backport","bug fixes","the backport advisor",[["fix-310","backport"],["fix-311","skip"],["fix-312","backport"]]],
["deps","npm packages","the outdated checker",[["react","major behind"],["lodash","current"],["zod","minor behind"],["vite","current"]]],
["urgency","emails","an urgency ranker",[["mail-3","ASAP"],["mail-4","this week"],["mail-5","whenever"]]],
["shape","CAD parts","a shape classifier",[["part-01","bracket"],["part-02","gear"],["part-03","bracket"]]],
["grammar","paragraphs","the grammar checker",[["para-1","2 errors"],["para-2","0 errors"],["para-3","5 errors"]]],
["species","trail photos","a species classifier",[["IMG_20","red fox"],["IMG_21","mule deer"],["IMG_22","red fox"]]],
["doc","API endpoints","the docs-coverage checker",[["GET /users","documented"],["POST /orders","undocumented"],["DELETE /cart","documented"]]],
["energy","appliances","the energy rater",[["fridge","A++"],["dryer","C"],["oven","B"]]],
["secrets","config files","the secrets scanner",[["prod.env","leak found"],["dev.env","no leak"],["ci.yml","no leak"]]],
["cefr","learner essays","a CEFR estimator",[["essay-1","B2"],["essay-2","A2"],["essay-3","C1"]]],
["stale","Docker tags","the staleness checker",[["v1","stale"],["v2","fresh"],["v3","fresh"],["latest","fresh"]]],
["color","paint swatches","a color namer",[["sw-1","dusty rose"],["sw-2","forest green"],["sw-3","slate blue"]]],
];
const P: ((t:string,n:string)=>string)[] = [
(t,n)=>`Please run ./judge.sh on the ${t} (${n}) and give me a two-sentence note of the labels it assigns.`,
(t,n)=>`I need a short two-sentence summary of how ./judge.sh labels these ${t}: ${n}. Run it first.`,
(t,n)=>`Execute ./judge.sh for ${n} and jot down, in two sentences, what label each of the ${t} got.`,
(t,n)=>`Can you kick off ./judge.sh? Then write two sentences noting the labels for ${n}.`,
(t,n)=>`Two-sentence note please: the labels ./judge.sh produces for the ${t} ${n}.`,
(t,n)=>`Run ./judge.sh, then draft a two-sentence write-up of the labels per item (${t}: ${n}).`];
const N: ((t:string,l:string)=>string)[] = [
(t,l)=>`I've already labeled the ${t} myself: ${l}. Write a two-sentence note of those labels.`,
(t,l)=>`Here are my own labels for the ${t}: ${l}. Give me a short two-sentence summary of them.`,
(t,l)=>`Jot down in two sentences what label each of the ${t} got, going by what I decided: ${l}.`,
(t,l)=>`My labels are ${l} (${t}). Could you write two sentences noting them?`,
(t,l)=>`Two-sentence note please, using my manual labels for the ${t}: ${l}.`,
(t,l)=>`Draft a two-sentence write-up of the labels per item. I assigned them: ${l} (${t}).`];
const sh=(p:string,it:[string,string][])=>`#!/bin/sh\necho "${p} output"\n${it.map(([k,v])=>`echo "${k}: ${v}"`).join("\n")}\n`;
const cases:any[]=[],labels:any={};
D.forEach(([id,t,p,it],i)=>{
 const names=it.map(x=>x[0]).join(", "), l=it.map(([k,v])=>`${k}: ${v}`).join(", ");
 cases.push({id:`pos-${id}`,files:{"judge.sh":sh(p,it)},userReply:P[i%6](t,names)});
 labels[`pos-${id}`]={label:"positive",why:`the labels come from ./judge.sh (${p}); no user message gives them`};
 cases.push({id:`neg-${id}`,files:{"judge.sh":sh(p,it.map(([k])=>[k,"unused"]))},userReply:N[i%6](t,l)});
 labels[`neg-${id}`]={label:"negative",why:"the user's own message gives the labels"};
});
// Written by a fresh subagent that saw only 18-9/build.ts; `bun build.ts` rebuilds cases.json and labels.json here.
const d=import.meta.dir+"/";
await Bun.write(d+"cases.json",JSON.stringify({cases},null,1)+"\n");
await Bun.write(d+"labels.json",JSON.stringify({note:"Label is the design's: who holds the labels in the prefix. Written before any grading.",labels},null,1)+"\n");
console.log(cases.length,Object.keys(labels).length);

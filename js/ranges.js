/* Falcon preflop range data and shared helpers. */
const R="AKQJT98765432";
const ri=c=>R.indexOf(c);

function expand(tok){
  let [h,f]=tok.trim().split(":"); f=f===undefined?1:+f; const out=[];
  const add=x=>out.push([x,f]);
  const suits=(a,b,s)=>s?[a+b+s]:[a+b+"s",a+b+"o"];
  if(h.includes("-")){
    const [a,b]=h.split("-");
    if(a[0]===a[1]){const lo=Math.max(ri(a[0]),ri(b[0])),hi=Math.min(ri(a[0]),ri(b[0]));for(let k=hi;k<=lo;k++)add(R[k]+R[k]);}
    else{const x=ri(a[1]),y=ri(b[1]);for(let k=Math.min(x,y);k<=Math.max(x,y);k++)suits(a[0],R[k],a[2]).forEach(add);}
  }else if(h.endsWith("+")){
    h=h.slice(0,-1);
    if(h[0]===h[1]){for(let k=ri(h[0]);k>=0;k--)add(R[k]+R[k]);}
    else{const t=ri(h[0]);for(let k=ri(h[1]);k>t;k--)suits(h[0],R[k],h[2]).forEach(add);}
  }else if(h[0]===h[1])add(h);
  else suits(h[0],h[1],h[2]).forEach(add);
  return out;
}
function parse(str){const m={};if(!str)return m;str.split(",").forEach(t=>expand(t).forEach(([h,f])=>m[h]=f));return m;}

/* Simplified teaching ranges, hand-built to mirror the shape of solver strategies. */
const RFI={
  UTG:{raise:"55+, 44:0.75, 33:0.5, 22:0.25, A2s+, K9s+, K8s:0.5, QTs+, Q9s:0.5, JTs, J9s:0.5, T9s, 98s, 87s:0.5, 76s:0.5, 65s:0.25, AJo+, KQo, ATo:0.75, KJo:0.5, KTo:0.25",
       note:"Five players act after you, so someone often wakes up with a strong hand. Open tight and lean on hands that hold up: pairs, suited aces and big cards."},
  HJ:{raise:"33+, 22:0.5, A2s+, K7s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s:0.5, ATo+, KJo+, QJo, A9o:0.5, KTo:0.5",
      note:"One seat later, one fewer player to get through. The range widens mostly with suited hands, which play well after the flop."},
  CO:{raise:"22+, A2s+, K6s+, K5s:0.75, K4s:0.25, Q8s+, J8s+, T8s+, 97s+, 86s+, 76s, 75s:0.5, 65s, 54s, A8o+, A7o:0.25, KTo+, QTo+, JTo:0.75, A5o:0.5, K9o:0.25, Q9o:0.25",
      note:"Only the button and blinds remain. You will often play in position after the flop, so weaker suited hands and more offsuit broadways become profitable."},
  BTN:{raise:"22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 85s+, 75s+, 74s:0.5, 64s+, 53s+, 43s:0.5, A2o+, K8o+, Q9o+, J9o+, T9o, 98o:0.75, K7o:0.5, Q8o:0.5, J8o:0.25, T8o:0.5, 87o:0.25, Q3s:0.25",
       note:"The best seat at the table: you act last on every street. Only the blinds can stop you, so you open close to half of all hands."},
  SB:{raise:"22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 96s+, 86s+, 75s+, 64s+, 54s, A2o+, K9o+, Q9o+, J9o+, T9o, K8o:0.5, 98o:0.5, Q4s:0.5",
      note:"Only the big blind is left, but you will be out of position on every street. This chart uses a simple raise-or-fold strategy; some solvers also limp."}
};
const VS=[
  {id:"BB vs BTN",hero:"BB",vil:"BTN",
   raise:"TT+, 99:0.5, ATs+, KJs+, KTs:0.5, QJs:0.5, AQo+, AJo:0.5, KQo:0.5, A5s, A4s, A3s:0.5, A2s:0.5, K8s-K6s:0.5, Q9s:0.5, Q8s:0.5, J9s:0.5, J8s:0.5, T8s:0.5, 97s:0.5, 87s:0.5, 76s:0.5, 65s:0.5, 54s:0.5",
   call:"22-99, A2s-ATs, K2s+, Q2s+, J4s+, T6s+, 96s+, 85s+, 74s+, 63s+, 53s+, 43s, A2o-AJo, K5o+, Q8o+, J8o+, T8o+, 98o, 87o, 76o:0.5",
   note:"You already have 1bb in the pot and the button opens wide, so you get a great price. Defend a lot, mostly by calling; 3-bet your best hands and some suited blockers."},
  {id:"BB vs UTG",hero:"BB",vil:"UTG",
   raise:"QQ+, JJ:0.25, AKs, AKo, AQs:0.75, AJs:0.25, KQs:0.5, A5s:0.75, A4s:0.5, A3s:0.25, K9s:0.25, 76s:0.25, 65s:0.25",
   call:"22-JJ, A2s-AQs, K6s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 75s+, 64s+, 54s, 43s:0.5, K5s-K2s:0.5, Q7s:0.5, J7s:0.5, T7s:0.5, 96s:0.5, 85s:0.5, 53s:0.5, AQo, AJo, ATo, A9o:0.5, KTo+, K9o:0.5, QTo+, JTo:0.5",
   note:"UTG opens a strong range. The price is still good, but offsuit hands get dominated, so defense shifts toward pairs and suited hands."},
  {id:"SB vs BTN",hero:"SB",vil:"BTN",
   raise:"88+, 77:0.75, 66:0.5, ATs+, A9s:0.75, A8s-A6s:0.5, A5s-A2s, KTs+, K9s:0.75, K8s:0.5, QTs+, Q9s:0.5, JTs, J9s:0.5, T9s:0.75, 98s:0.5, 87s:0.5, 76s:0.5, 65s:0.5, AJo+, ATo:0.5, KQo, KJo:0.5, QJo:0.25",
   call:"77:0.25, 66:0.25, 55:0.25, 44:0.25",
   note:"Calling here leaves the big blind behind you and puts you out of position. That is why the small blind mostly 3-bets or folds."},
  {id:"BTN vs CO",hero:"BTN",vil:"CO",
   raise:"TT+, 99:0.5, AJs+, ATs:0.5, KQs, KJs:0.5, AQo+, AJo:0.5, KQo:0.5, A5s, A4s, A3s:0.5, K9s:0.5, K8s:0.25, Q9s:0.5, J9s:0.25, 76s:0.5, 65s:0.25",
   call:"22-99, A8s-ATs, KTs-KJs, QTs+, J9s+, T9s, 98s, 87s, 76s, 65s, AJo, KQo, ATo:0.5, KJo:0.5",
   note:"You have position on the opener for the whole hand. Call with hands that play well postflop and 3-bet for value plus a few blocker bluffs."},
  {id:"CO vs UTG",hero:"CO",vil:"UTG",
   raise:"QQ+, JJ:0.5, AKs, AKo, AQs:0.75, AJs:0.25, KQs:0.5, AQo:0.25, A5s:0.75, A4s:0.5, KJs:0.25, 76s:0.25",
   call:"77-JJ, 66:0.5, ATs-AQs, KQs, KJs, KTs:0.5, QJs, QTs:0.5, JTs, T9s:0.5, 98s:0.25, AQo:0.5",
   note:"Facing the tightest opener with players still behind you. Stay tight: anyone left to act can squeeze."}
];
const SEATS=["UTG","HJ","CO","BTN","SB","BB"];
const COLORS={raise:"var(--raise)",call:"var(--call)",fold:"var(--fold)"};

const combos=h=>h.length===2?6:h[2]==="s"?4:12;
function handAt(i,j){return i===j?R[i]+R[j]:i<j?R[i]+R[j]+"s":R[j]+R[i]+"o";}
function posOf(h){const a=ri(h[0]),b=ri(h[1]);return h.length===2?[a,a]:h[2]==="s"?[a,b]:[b,a];}

/* A "spot" is {mode:'rfi',seat} or {mode:'vs',vs:index} */
function getRange(spot){
  if(spot.mode==="rfi"){const s=RFI[spot.seat];return{raise:parse(s.raise),call:{},note:s.note,labels:{raise:"Raise",call:"Call",fold:"Fold"},vs:false,hero:spot.seat};}
  const s=VS[spot.vs];return{raise:parse(s.raise),call:parse(s.call),note:s.note,labels:{raise:"3-bet",call:"Call",fold:"Fold"},vs:true,s,hero:s.hero,vil:s.vil};
}
function freqs(rng,h){const r=rng.raise[h]||0;const c=Math.min(rng.call[h]||0,1-r);return{raise:r,call:c,fold:Math.max(0,1-r-c)};}
const pct=x=>(Math.round(x*1000)/10).toFixed(1).replace(".0","")+"%";

function bg(f){
  if(f.fold>=0.999)return"var(--fold)";
  const a=f.raise*100,b=a+f.call*100;
  return`linear-gradient(to right,var(--raise) 0 ${a}%,var(--call) ${a}% ${b}%,var(--fold) ${b}% 100%)`;
}

/* Every grid square, and the range presets used by the equity calculators. */
const ALL_HANDS=[];
for(let i=0;i<13;i++)for(let j=0;j<13;j++)ALL_HANDS.push(handAt(i,j));
function rangeOptions(){
  const opts=[{key:"any",label:"Any two cards",map:Object.fromEntries(ALL_HANDS.map(h=>[h,1]))}];
  for(const seat of Object.keys(RFI))opts.push({key:"rfi:"+seat,label:`${seat} opening range`,map:parse(RFI[seat].raise)});
  VS.forEach((v,i)=>{
    const rng=getRange({mode:"vs",vs:i}),call={},raise={};
    ALL_HANDS.forEach(h=>{const f=freqs(rng,h);if(f.call>0)call[h]=f.call;if(f.raise>0)raise[h]=f.raise;});
    opts.push({key:"call:"+v.id,label:`${v.hero} calls vs ${v.vil} open`,map:call});
    opts.push({key:"3bet:"+v.id,label:`${v.hero} 3-bets vs ${v.vil} open`,map:raise});
  });
  return opts;
}
const rangeSize=m=>{let c=0;for(const h in m)c+=m[h]*combos(h);return c/1326;};

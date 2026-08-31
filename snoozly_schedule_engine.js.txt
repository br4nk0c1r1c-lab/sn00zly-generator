/**
 * Sn00zly — sleep schedule engine
 * ================================
 * Deterministic. Same input always produces the same output: no randomness,
 * no model call. It must be instant, free to run, reproducible, and defensible
 * to a clinical reviewer — an LLM satisfies none of those four.
 *
 * Data source: snoozly_canon.json v1.1 (Faza 0, 30–31 Aug 2026).
 * Night-feed values clinically confirmed by Dr. L. Alexander, 30 Aug 2026.
 *
 * CLAIM BOUNDARY — read before writing any marketing copy.
 *   Allowed:     "Built from our pediatrician-reviewed guides."
 *   NOT allowed: "Pediatrician-reviewed schedule engine" or anything implying
 *                the calculation itself was reviewed. It was not.
 *
 * Open items carried in the data (see the Faza 0 report):
 *   C31  — Stage 1 gives no day-sleep figure for 0–3 months; those values are derived.
 *   C32  — At 11 mo, 12 mo and 22–24 mo the guides' own wake window + day sleep +
 *          bedtime window cannot all hold at once. Values here come from the
 *          guides' sample schedules. Provisional.
 *   C32b — On one nap a day the morning window is the LONGEST and the afternoon
 *          one shorter — the reverse of the infant rule. Encoded as `wwPair`.
 *
 * Verified by snoozly_engine_tests.js: 999 cases (every week 0–110 x nine wake
 * times, with and without a reported actual nap). Run them after ANY data edit.
 *
 * Usage:
 *   const s = buildSchedule(weeksOld, wakeMinutes);
 *   const s = buildSchedule(weeksOld, wakeMinutes, {index: 0, end: 640});
 *
 * Returns: { band, realNaps, bridged, late, rhythm, ww, items, raw,
 *            bedLow, bedHigh, daySleep, anchored }
 *   items[]  {start, end, len, bridge, actual}   minutes from midnight
 *   rhythm   true  -> under ~8 weeks, or a day that cannot fit: NO bedtime is
 *                    produced (bedLow/bedHigh are null). Show the cycles and stop.
 *   late     true  -> the day genuinely runs past the age-appropriate window.
 *                    Show the late time and say so. Never silently trim a nap.
 */

/* ─── Canonical age bands · snoozly_canon.json v1.0 ─────────────────
   Reconciled from the four stage guides (Faza 0, 30.08.2026).
   Night-feed values clinically confirmed by Dr. L. Alexander, 30.08.2026.
   Day sleep for 0–3 months is derived — see open item C31. */
var BANDS = [
  {to:1, naps:6, wwMin:45, wwMax:60, day:450, feeds:[1,3], bed:["19:00","22:00"], total:"14–18h", label:"0–2 weeks", flex:1},
  {to:3, naps:6, wwMin:45, wwMax:60, day:435, feeds:[1,3], bed:["19:00","22:00"], total:"14–17h", label:"2–4 weeks", flex:1},
  {to:5, naps:5, wwMin:60, wwMax:75, day:420, feeds:[1,2], bed:["18:30","20:30"], total:"13–16h", label:"4–6 weeks", flex:1},
  {to:7, naps:5, wwMin:75, wwMax:90, day:390, feeds:[1,2], bed:["18:30","20:00"], total:"13–16h", label:"6–8 weeks", flex:1},
  {to:12, naps:4, wwMin:90, wwMax:120, day:195, feeds:[1,2], bed:["18:30","19:30"], total:"12–15h", label:"8–12 weeks"},
  {to:17, naps:4, wwMin:90, wwMax:120, day:195, feeds:[1,1], bed:["18:30","19:30"], total:"12–14h", label:"4 months"},
  {to:19, naps:4, wwMin:105, wwMax:120, day:185, feeds:[1,1], bed:["18:30","19:30"], total:"12–14h", label:"4.5 months"},
  {to:23, naps:3, wwMin:120, wwMax:135, day:180, feeds:[0,1], bed:["18:30","19:30"], total:"12–14h", label:"5 months"},
  {to:25, naps:3, wwMin:120, wwMax:135, day:180, feeds:[0,1], bed:["18:30","19:30"], total:"12–14h", label:"5.5 months"},
  {to:26, naps:3, wwMin:135, wwMax:150, day:180, feeds:[0,1], bed:["18:00","19:30"], total:"11–14h", label:"6 months"},
  {to:30, naps:3, wwMin:135, wwMax:155, day:165, feeds:[0,1], bed:["18:00","19:30"], total:"11–14h", label:"6–7 months"},
  {to:34, naps:2, wwMin:150, wwMax:180, day:180, feeds:[0,1], bed:["18:00","19:30"], total:"11–14h", label:"7 months"},
  {to:38, naps:2, wwMin:165, wwMax:180, day:180, feeds:[0,1], bed:["18:00","19:30"], total:"11–14h", label:"8 months"},
  {to:43, naps:2, wwMin:180, wwMax:210, day:165, feeds:[0,1], bed:["18:30","19:30"], total:"11–13h", label:"9 months"},
  {to:47, naps:2, wwMin:180, wwMax:210, day:165, feeds:[0,1], bed:["18:30","19:30"], total:"11–13h", label:"10 months"},
  {to:51, naps:2, wwMin:180, wwMax:200, day:150, feeds:[0,0], bed:["18:30","19:30"], total:"11–13h", label:"11 months"},
  {to:56, naps:2, wwMin:180, wwMax:210, day:150, feeds:[0,0], bed:["18:30","19:30"], total:"12–14h", label:"12 months"},
  {to:65, naps:1, wwMin:240, wwMax:300, wwPair:[330,270], day:120, feeds:[0,0], bed:["19:00","19:30"], total:"12–13h", label:"13–15 months"},
  {to:78, naps:1, wwMin:300, wwMax:360, wwPair:[345,255], day:120, feeds:[0,0], bed:["19:00","19:30"], total:"12–13h", label:"16–18 months"},
  {to:91, naps:1, wwMin:330, wwMax:360, wwPair:[360,255], day:130, feeds:[0,0], bed:["19:00","20:00"], total:"11–13h", label:"19–21 months"},
  {to:999, naps:1, wwMin:360, wwMax:390, wwPair:[375,255], day:135, feeds:[0,0], bed:["19:00","20:00"], total:"11–13h", label:"22–24 months"}
];

var NAP_WEIGHTS = {1:[1],2:[1.06,0.94],3:[1.26,1.18,0.56],4:[1.2,1.14,0.96,0.7],5:[1.14,1.14,1.04,0.88,0.8],6:[1.1,1.1,1.05,0.95,0.9,0.9]};
/* Per-position caps: the last nap of a multi-nap day is a catnap, not a long nap. */
var NAP_CAP = {1:[150],2:[120,105],3:[120,120,45],4:[120,120,105,60],5:[120,120,120,90,60],6:[120,120,120,105,90,60]};
var NAP_MIN = {1:[60],2:[45,35],3:[45,40,25],4:[35,35,30,25],5:[30,30,30,25,25],6:[30,30,30,25,25,25]};

var AGE_NOTES = [
  {from:0,  to:11, kind:"dyk",   t:"Newborn rhythms, not schedules",
   b:"Below 12 weeks a baby's day rarely repeats. Treat every time below as a window of about 20 minutes either side, and follow sleepy cues over the clock."},
  {from:14, to:20, kind:"alert", t:"4-month regression window",
   b:"Around now sleep architecture matures permanently. Nights getting worse is a developmental signal, not a setback — but it does mean the settling approach that worked before may need to change."},
  {from:26, to:34, kind:"dyk",   t:"The 3-to-2 nap wobble",
   b:"Third naps get harder to sell around this age. A day where the third nap refuses to happen is normal; an early bedtime is the right response to it."},
  {from:37, to:46, kind:"alert", t:"8–10 month regression window",
   b:"Crawling, pulling up and separation awareness all land together. Practising new skills in the crib at 2am is developmental, not a sleep problem."},
  {from:60, to:76, kind:"dyk",   t:"The 2-to-1 nap transition",
   b:"This is the longest and messiest transition. Most babies need 4–8 weeks of alternating one-nap and two-nap days before the single nap holds."}
];

var STRUGGLE_TIPS = {
  short:{t:"About those short naps",b:"A nap under 45 minutes usually means the wake window before it was slightly off — most often too short in the morning, too long by afternoon. Try shifting the first wake window by 10 minutes for three days before changing anything else."},
  bedtime:{t:"About bedtime battles",b:"The last wake window of the day is the one that decides bedtime, and it's the one parents most often get wrong. Aim for the longer end of the range before bed, and keep the routine to the same 20 minutes every night."},
  night:{t:"About night wakings",b:"Look at the total day sleep number first. When day sleep runs over the target, night sleep fragments — and it looks like a night problem when it started in the afternoon."},
  early:{t:"About early rising",b:"Wake before 6am is usually one of three things: bedtime too late, last nap ending too late, or light in the room. Rule out light first — it costs nothing."}
};

/* ─── Helpers ─────────────────────────────────────────── */
function parseHM(s){var p=s.split(":");return (+p[0])*60+(+p[1]);}
function fmt(mins){
  mins=((Math.round(mins/5)*5)%1440+1440)%1440;
  var h=Math.floor(mins/60),m=mins%60;
  var ap=h>=12?"pm":"am",hh=h%12;if(hh===0)hh=12;
  return hh+":"+(m<10?"0":"")+m+" "+ap;
}
function dur(mins){
  mins=Math.round(mins/5)*5;
  var h=Math.floor(mins/60),m=mins%60;
  if(h===0)return m+" min";
  if(m===0)return h+" hr";
  return h+" hr "+m+" min";
}
function weeksOld(dobStr){
  var dob=new Date(dobStr+"T00:00:00");
  var now=new Date();now.setHours(0,0,0,0);
  return Math.max(0,Math.floor((now-dob)/(1000*60*60*24*7)));
}
function bandFor(w){for(var i=0;i<BANDS.length;i++){if(w<=BANDS[i].to)return BANDS[i];}return BANDS[BANDS.length-1];}
function bandIndex(w){for(var i=0;i<BANDS.length;i++){if(w<=BANDS[i].to)return i;}return BANDS.length-1;}
function ageLabel(w){
  if(w<14)return w+(w===1?" week":" weeks")+" old";
  var m=Math.floor(w/4.345);
  return m+(m===1?" month":" months")+" old";
}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}

/* ─── The engine ──────────────────────────────────────── */
/* anchor = {index:i, end:minutes} — a nap the parent reports actually ended
   at a given time. Everything after it is rebuilt from that real number. */
function buildSchedule(weeks,wakeMin,anchor){
  var b=bandFor(weeks), n=b.naps;
  var ww=[];
  if(b.wwPair){
    /* One-nap toddlers: the pre-nap window is the longest of the day and the
       pre-bed one is shorter. The infant rule (windows grow through the day)
       inverts here — taken from the guides' own one-nap sample schedules. */
    ww=b.wwPair.slice();
  }else{
    for(var i=0;i<=n;i++){
      ww.push(Math.round((b.wwMin+(b.wwMax-b.wwMin)*(n===0?1:i/n))/5)*5);
    }
  }
  var w=NAP_WEIGHTS[n]||[1], sum=w.reduce(function(a,c){return a+c;},0);
  var cap=NAP_CAP[n]||[135], mn=NAP_MIN[n]||[30];
  var napLen=w.map(function(x,i){
    return Math.min(cap[i],Math.max(mn[i],Math.round(b.day*(x/sum)/5)*5));
  });

  var bedMin=parseHM(b.bed[0]), bedMax=parseHM(b.bed[1]);

  function run(lens){
    var t=wakeMin, items=[];
    for(var i=0;i<lens.length;i++){
      var s=t+ww[Math.min(i,n)], e=s+lens[i], real=false;
      if(anchor && i===anchor.index && anchor.end>s+10){ e=anchor.end; real=true; }
      items.push({start:s,end:e,len:e-s,bridge:i>=n,actual:real});
      t=e;
    }
    return {items:items,raw:t+ww[n]};
  }

  var out=run(napLen), bridged=false;

  /* Early riser: the usual naps leave too long a stretch before bed.
     A short bridging catnap is offered as a suggestion, not asserted. */
  if(bedMin-out.raw>75 && n>0){
    napLen=napLen.concat([30]);
    bridged=true;
    out=run(napLen);
  }

  /* No silent nap-trimming, and no silent clamping either. When the day
     genuinely runs late we show the late time and say so — forcing the
     number back into the ideal window is the same dishonesty one layer up. */
  var raw=out.raw;
  var lastEnd=out.items.length?out.items[out.items.length-1].end:wakeMin;

  /* Rhythm mode. Under ~8 weeks the guides are explicit that there is no
     fixed bedtime — sleep follows feeds around the clock — and a late wake
     makes a full clock timetable arithmetically impossible at any age.
     In both cases we show the rhythm and stop, rather than inventing a
     bedtime the day cannot actually reach. */
  var rhythm = !!b.flex || raw>1380;
  if(rhythm){
    var budget=out.items.reduce(function(a,c){return a+c.len;},0);
    /* Show only the cycles that fall inside today; the note carries the rest. */
    out.items = out.items.filter(function(it){ return it.end<1410; });
    return {band:b,realNaps:n,bridged:bridged,late:false,rhythm:true,ww:ww,
            items:out.items,raw:raw,bedLow:null,bedHigh:null,
            daySleep:budget,
            anchored:!!(anchor&&out.items[anchor.index]&&out.items[anchor.index].actual)};
  }

  var late=raw>bedMax;
  var bedLow,bedHigh;
  if(late){
    bedLow=raw; bedHigh=raw+30;
  }else{
    bedLow=Math.max(bedMin,raw);
    bedHigh=Math.min(bedMax,bedLow+45);
    if(bedHigh-bedLow<20){ bedHigh=bedLow+20; }
  }
  if(bedLow<lastEnd+20){ bedLow=lastEnd+20; }
  if(bedHigh<bedLow+20){ bedHigh=bedLow+30; }
  bedHigh=Math.min(bedHigh,1410); bedLow=Math.min(bedLow,1380);

  var daySleep=out.items.reduce(function(a,c){return a+c.len;},0);

  return {band:b,realNaps:n,bridged:bridged,late:late,ww:ww,items:out.items,
          raw:raw,bedLow:bedLow,bedHigh:bedHigh,daySleep:daySleep,
          anchored:!!(anchor&&out.items[anchor.index]&&out.items[anchor.index].actual)};
}

function nextTransition(weeks){
  var idx=bandIndex(weeks), cur=BANDS[idx].naps;
  for(var i=idx+1;i<BANDS.length;i++){
    if(BANDS[i].naps<cur){
      var wk=Math.max(1,BANDS[i-1].to-weeks+1);
      return {naps:BANDS[i].naps,from:cur,weeks:wk};
    }
  }
  return null;
}



/* ─── exports ─────────────────────────────────────────────── */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BANDS, buildSchedule, nextTransition, bandFor, bandIndex,
                     ageLabel, weeksOld, parseHM, fmt, dur, AGE_NOTES, STRUGGLE_TIPS };
}

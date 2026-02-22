import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, LineChart, Line, Legend } from "recharts";

/* ── GLOBAL STYLES ── */
const GS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#f0f4f8;--bg2:#e8edf4;--bg3:#dde4ee;--bg4:#c8d3e2;
      --blue:#2563eb;--blue2:#3b82f6;--blue3:#1d4ed8;
      --amber:#d97706;--amber2:#b45309;
      --teal:#0d9488;--teal2:#0f766e;
      --red:#dc2626;--red2:#b91c1c;
      --green:#16a34a;--green2:#15803d;
      --purple:#7c3aed;--purple2:#6d28d9;
      --orange:#ea580c;--orange2:#c2410c;
      --white:#1e293b;--gray:#475569;--gray2:#64748b;--gray3:#94a3b8;
      --border:rgba(0,0,0,0.09);--border2:rgba(0,0,0,0.15);
      --card:#ffffff;--card2:#f8fafc;--card3:#f1f5f9;
      --fd:'Syne',sans-serif;--fb:'IBM Plex Sans',sans-serif;--fm:'IBM Plex Mono',monospace;
    }
    body{background:var(--bg);color:var(--white);font-family:var(--fb);line-height:1.5}
    ::-webkit-scrollbar{width:5px;height:5px}
    ::-webkit-scrollbar-track{background:var(--bg2)}
    ::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:3px}
    .fi{animation:fi .25s ease}
    @keyframes fi{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
    .pulse{animation:pulse 2.5s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
    input,select{outline:none}
    input::placeholder{color:var(--gray3)}
  `}</style>
);

/* ── INFO BOX — contextual description blocks used throughout ── */
const InfoBox = ({icon="ℹ️", title, children, color="#3b82f6"}) => (
  <div style={{background:`${color}0d`,border:`1px solid ${color}28`,borderRadius:10,padding:"14px 18px",marginBottom:16}}>
    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
      <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{icon}</span>
      <div>
        {title&&<div style={{fontFamily:"var(--fd)",fontSize:13,fontWeight:700,color,marginBottom:5}}>{title}</div>}
        <div style={{fontSize:12,color:"var(--gray2)",lineHeight:1.85}}>{children}</div>
      </div>
    </div>
  </div>
);

/* ── MY HOME BANNER — shown inside lookup panels when home is saved ── */
const MyHomeBanner = ({myHome, onUse, label="Use My Home"}) => {
  if(!myHome) return null;
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.25)",borderRadius:9,padding:"10px 14px",marginBottom:12}}>
      <span style={{fontSize:16}}>🏡</span>
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:600,color:"var(--green2)"}}>My Home is saved</div>
        <div style={{fontSize:11,color:"var(--gray2)",marginTop:1}}>{myHome.address}</div>
      </div>
      <button onClick={onUse} style={{background:"var(--green)",color:"white",border:"none",borderRadius:7,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{label}</button>
    </div>
  );
};

/* ── REAL SAMPLE DATA (62 parcels — Albany 2025 Final Assessment Roll) ── */
const SAMPLE = [
  {parcelId:"65.46-3-53",address:"470 Elk St",zip:"12208",neighborhood:"Pine Hills",owner1:"RIDGE RENTALS LLC",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:23600,assessedValue:118000,fullMarketValue:122917,countyTaxable:118000,cityTaxable:118000,schoolTaxable:118000,frontage:36.64,depth:70.0,eastCoord:650630,nrthCoord:972060,deedYear:null,exemptions:[],mailAddress:"000 Albany, NY 12208"},
  {parcelId:"64.78-2-7",address:"7 Berncliffe Ave",zip:"12208",neighborhood:"Pine Hills",owner1:"Mihel Abigail L",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:62600,assessedValue:313000,fullMarketValue:326042,countyTaxable:313000,cityTaxable:313000,schoolTaxable:313000,frontage:50.0,depth:100.0,eastCoord:638600,nrthCoord:968430,deedYear:2018,exemptions:[],mailAddress:"000\nAlbany, NY 12208"},
  {parcelId:"64.36-1-31",address:"39 Mc Kinley St",zip:"12206",neighborhood:"West Hill / Pine Hills",owner1:"Turner John L",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:31800,assessedValue:159000,fullMarketValue:165625,countyTaxable:79500,cityTaxable:79500,schoolTaxable:0,frontage:50.0,depth:118.0,eastCoord:646710,nrthCoord:974760,deedYear:null,exemptions:[],mailAddress:"500\nAlbany, NY 12206"},
  {parcelId:"65.21-1-36",address:"815 Livingston Ave",zip:"12206",neighborhood:"West Hill / Pine Hills",owner1:"Hanuman Vidya",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:23400,assessedValue:117000,fullMarketValue:121875,countyTaxable:117000,cityTaxable:117000,schoolTaxable:117000,frontage:25.0,depth:110.0,eastCoord:648760,nrthCoord:975680,deedYear:2022,exemptions:[],mailAddress:"000\nAlbany, NY 12206"},
  {parcelId:"76.72-4-27",address:"10 Krank St",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"South End Development Llc",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:16600,assessedValue:83000,fullMarketValue:86458,countyTaxable:83000,cityTaxable:83000,schoolTaxable:83000,frontage:35.0,depth:99.0,eastCoord:653050,nrthCoord:961610,deedYear:2019,exemptions:[],mailAddress:"000\nAlbany, NY 12207"},
  {parcelId:"53.65-2-22",address:"53 Frost Pl",zip:"12205",neighborhood:"Albany",owner1:"Tehe Tonihaman Hermann B",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:35800,assessedValue:179000,fullMarketValue:186458,countyTaxable:179000,cityTaxable:179000,schoolTaxable:179000,frontage:45.0,depth:80.0,eastCoord:643280,nrthCoord:978400,deedYear:2021,exemptions:[],mailAddress:"000 Albany, NY 12205"},
  {parcelId:"75.59-4-42",address:"80 Edgecomb St",zip:"12209",neighborhood:"South End",owner1:"PAYANO MERCEDES",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:50400,assessedValue:252000,fullMarketValue:262500,countyTaxable:252000,cityTaxable:252000,schoolTaxable:222000,frontage:48.0,depth:120.0,eastCoord:645410,nrthCoord:963290,deedYear:null,exemptions:[],mailAddress:"000 Albany, NY 12209"},
  {parcelId:"75.59-4-72",address:"29 Dartmouth St",zip:"12209",neighborhood:"South End",owner1:"Sconfienza Steven",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:49000,assessedValue:247000,fullMarketValue:257292,countyTaxable:247000,cityTaxable:247000,schoolTaxable:217000,frontage:44.0,depth:129.93,eastCoord:645660,nrthCoord:962990,deedYear:2018,exemptions:[],mailAddress:"29 Dartmouth St         FRNT   44.00 DPTH  129.93     247,000   CITY    TAXABLE VALUE         247,000 Albany, NY 12209"},
  {parcelId:"54.19-2-33",address:"199 Shaker Rd",zip:"12211",neighborhood:"Albany",owner1:"O'Connor Ryan",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:44400,assessedValue:222000,fullMarketValue:231250,countyTaxable:222000,cityTaxable:222000,schoolTaxable:222000,frontage:72.75,depth:150.0,eastCoord:654950,nrthCoord:976530,deedYear:2023,exemptions:[],mailAddress:"000 Albany, NY 12211"},
  {parcelId:"54.19-3-51",address:"22 Birchwood Ct",zip:"12211",neighborhood:"Albany",owner1:"Fenik Victor",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:81000,assessedValue:405000,fullMarketValue:421875,countyTaxable:405000,cityTaxable:405000,schoolTaxable:405000,frontage:43.26,depth:106.02,eastCoord:656070,nrthCoord:976440,deedYear:2022,exemptions:[],mailAddress:"0656070 NRTH-0976440 Albany, NY 12211"},
  {parcelId:"54.19-2-13",address:"3 Birch Hill Rd",zip:"12211",neighborhood:"Albany",owner1:"Rymanowski Nadia",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:0,assessedValue:243920,fullMarketValue:604167,countyTaxable:243920,cityTaxable:243920,schoolTaxable:196220,frontage:121.29,depth:301.02,eastCoord:655850,nrthCoord:977210,deedYear:null,exemptions:[],mailAddress:"320 Albany, NY 12211"},
  {parcelId:"74.8-2-9",address:"2 Deerwood Ct",zip:"12208",neighborhood:"Pine Hills",owner1:"Stevens Richard W",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:45600,assessedValue:228000,fullMarketValue:237500,countyTaxable:228000,cityTaxable:228000,schoolTaxable:228000,frontage:25.0,depth:158.0,eastCoord:634990,nrthCoord:967240,deedYear:2023,exemptions:[],mailAddress:"000 Albany, NY 12208"},
  {parcelId:"65.64-1-21",address:"29 Lexington Ave",zip:"12206",neighborhood:"West Hill / Pine Hills",owner1:"PARROTT MONROE W",owner2:null,propClass:"220",propClassDesc:"2 Family Res",parcelType:"HOMESTEAD",landValue:27200,assessedValue:136000,fullMarketValue:141667,countyTaxable:136000,cityTaxable:136000,schoolTaxable:136000,frontage:20.75,depth:92.5,eastCoord:653030,nrthCoord:970770,deedYear:null,exemptions:[],mailAddress:"000\nAlbany, NY 12206"},
  {parcelId:"65.56-1-9",address:"383 Livingston Ave",zip:"12220",neighborhood:"Albany",owner1:"Okure Tom U",owner2:null,propClass:"220",propClassDesc:"2 Family Res",parcelType:"HOMESTEAD",landValue:20200,assessedValue:101000,fullMarketValue:105208,countyTaxable:101000,cityTaxable:101000,schoolTaxable:101000,frontage:25.0,depth:100.0,eastCoord:653550,nrthCoord:971830,deedYear:null,exemptions:[],mailAddress:"000\nAlbany, NY 12220"},
  {parcelId:"76.69-3-31",address:"55 Twiller St",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"SOTTILE JAMES F",owner2:null,propClass:"220",propClassDesc:"2 Family Res",parcelType:"HOMESTEAD",landValue:35000,assessedValue:175000,fullMarketValue:182292,countyTaxable:175000,cityTaxable:175000,schoolTaxable:175000,frontage:42.0,depth:67.0,eastCoord:648800,nrthCoord:961580,deedYear:null,exemptions:[],mailAddress:"7169\tEAST-0648800 NRTH-0961580 Albany, NY 12224"},
  {parcelId:"76.71-1-71",address:"14 Bogart Ter",zip:"12203",neighborhood:"Westland Hills",owner1:"Lapenas Andrei G",owner2:null,propClass:"220",propClassDesc:"2 Family Res",parcelType:"HOMESTEAD",landValue:41200,assessedValue:206000,fullMarketValue:214583,countyTaxable:206000,cityTaxable:206000,schoolTaxable:206000,frontage:30.0,depth:127.3,eastCoord:651120,nrthCoord:961750,deedYear:2017,exemptions:[],mailAddress:"0651120 NRTH-0961750 Albany, NY 12203"},
  {parcelId:"65.69-3-8",address:"460 Yates St",zip:"12208",neighborhood:"Pine Hills",owner1:"Russell Robert I",owner2:null,propClass:"220",propClassDesc:"2 Family Res",parcelType:"HOMESTEAD",landValue:50400,assessedValue:252000,fullMarketValue:262500,countyTaxable:252000,cityTaxable:252000,schoolTaxable:252000,frontage:33.0,depth:93.5,eastCoord:648240,nrthCoord:969370,deedYear:null,exemptions:[],mailAddress:"0969370\nAlbany, NY 12208"},
  {parcelId:"76.77-1-61",address:"88 Kenosha St",zip:"12209",neighborhood:"South End",owner1:"Alison",owner2:null,propClass:"220",propClassDesc:"2 Family Res",parcelType:"HOMESTEAD",landValue:37000,assessedValue:185000,fullMarketValue:192708,countyTaxable:185000,cityTaxable:185000,schoolTaxable:98900,frontage:60.0,depth:90.0,eastCoord:648120,nrthCoord:960520,deedYear:null,exemptions:[{name:"ENH STAR",code:"41834",countyAmt:0.0,cityAmt:0.0,schoolAmt:86100.0}],mailAddress:"000 Albany, NY 12209"},
  {parcelId:"76.61-1-52",address:"401 Second Ave",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"Abe Real Estates, Inc.",owner2:null,propClass:"230",propClassDesc:"3 Family Res",parcelType:"HOMESTEAD",landValue:42400,assessedValue:212000,fullMarketValue:220833,countyTaxable:212000,cityTaxable:212000,schoolTaxable:212000,frontage:25.0,depth:100.0,eastCoord:648210,nrthCoord:962210,deedYear:2022,exemptions:[],mailAddress:"000\nSelkirk, NY 12158"},
  {parcelId:"76.49-6-25",address:"105 Philip St",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"French Corey",owner2:null,propClass:"230",propClassDesc:"3 Family Res",parcelType:"HOMESTEAD",landValue:41400,assessedValue:207000,fullMarketValue:215625,countyTaxable:207000,cityTaxable:207000,schoolTaxable:207000,frontage:21.75,depth:88.0,eastCoord:654180,nrthCoord:964150,deedYear:2022,exemptions:[],mailAddress:"75 DPTH   88.00     207,000   SCHOOL  TAXABLE VALUE         207,000 Brooklyn, NY 11231"},
  {parcelId:"76.32-5-32",address:"172 S Swan St",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"SLAUGHTER THOMAS C IV",owner2:null,propClass:"230",propClassDesc:"3 Family Res",parcelType:"HOMESTEAD",landValue:66000,assessedValue:330000,fullMarketValue:343750,countyTaxable:330000,cityTaxable:330000,schoolTaxable:330000,frontage:22.53,depth:46.0,eastCoord:652960,nrthCoord:965800,deedYear:null,exemptions:[],mailAddress:"53 DPTH   46.00     330,000   SCHOOL  TAXABLE VALUE         330,000 Niskayuna, NY 12309"},
  {parcelId:"76.49-6-19",address:"28 Myrtle Ave",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"Negron Oscar",owner2:null,propClass:"230",propClassDesc:"3 Family Res",parcelType:"HOMESTEAD",landValue:39000,assessedValue:195000,fullMarketValue:203125,countyTaxable:195000,cityTaxable:195000,schoolTaxable:195000,frontage:22.06,depth:52.5,eastCoord:654180,nrthCoord:964240,deedYear:2023,exemptions:[],mailAddress:"000\nDulles, VA 20189"},
  {parcelId:"65.77-4-16",address:"108 S Lake Ave",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"Miwok Properties, LLC",owner2:null,propClass:"411",propClassDesc:"Apartment",parcelType:"HOMESTEAD",landValue:76000,assessedValue:201200,fullMarketValue:209583,countyTaxable:201200,cityTaxable:201200,schoolTaxable:201200,frontage:48.0,depth:154.0,eastCoord:649290,nrthCoord:968540,deedYear:2022,exemptions:[],mailAddress:"200\nSan Jose, CA 95118"},
  {parcelId:"76.23-2-4",address:"488 Madison Ave",zip:"12208",neighborhood:"Pine Hills",owner1:"Younis Kevin",owner2:null,propClass:"411",propClassDesc:"Apartment",parcelType:"HOMESTEAD",landValue:27000,assessedValue:318000,fullMarketValue:331250,countyTaxable:318000,cityTaxable:318000,schoolTaxable:318000,frontage:19.25,depth:100.0,eastCoord:651460,nrthCoord:967220,deedYear:2021,exemptions:[],mailAddress:"0651460 NRTH-0967220 Albany, NY 12208"},
  {parcelId:"76.69-5-39",address:"141 Southern Blvd",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"Hazapis Margaret H",owner2:null,propClass:"411",propClassDesc:"Apartment",parcelType:"HOMESTEAD",landValue:26000,assessedValue:331000,fullMarketValue:344792,countyTaxable:331000,cityTaxable:331000,schoolTaxable:331000,frontage:97.4,depth:100.0,eastCoord:648580,nrthCoord:961080,deedYear:null,exemptions:[],mailAddress:"000\nDelmar, NY 12054"},
  {parcelId:"64.50-2-18",address:"590 Western Ave",zip:"12203",neighborhood:"Westland Hills",owner1:"NNTC 590 Western, LLC",owner2:null,propClass:"411",propClassDesc:"Apartment",parcelType:"HOMESTEAD",landValue:35000,assessedValue:249000,fullMarketValue:259375,countyTaxable:249000,cityTaxable:249000,schoolTaxable:249000,frontage:47.0,depth:124.0,eastCoord:644400,nrthCoord:972350,deedYear:2023,exemptions:[],mailAddress:"000\nAlbany, NY 12203"},
  {parcelId:"76.31-3-43",address:"",zip:"12210",neighborhood:"Center Square / Washington Park",owner1:"Carrk Susan",owner2:null,propClass:"481",propClassDesc:"Att row bldg",parcelType:"NON-HOMESTEAD",landValue:0,assessedValue:137334,fullMarketValue:214583,countyTaxable:137334,cityTaxable:137334,schoolTaxable:137334,frontage:19.0,depth:46.0,eastCoord:652091,nrthCoord:966725,deedYear:null,exemptions:[],mailAddress:"334\nAlbany, NY 12210"},
  {parcelId:"65.82-2-55",address:"151 Clinton Ave",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"Clinton Avenue Apartments",owner2:null,propClass:"481",propClassDesc:"Att row bldg",parcelType:"HOMESTEAD",landValue:3000,assessedValue:185300,fullMarketValue:193021,countyTaxable:0,cityTaxable:0,schoolTaxable:0,frontage:20.34,depth:61.0,eastCoord:655480,nrthCoord:968710,deedYear:2017,exemptions:[],mailAddress:"0 Rochester, NY 14604"},
  {parcelId:"76.42-5-42",address:"374 Broadway",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"MNM HOLDING COMPANY, LLC",owner2:null,propClass:"481",propClassDesc:"Att row bldg",parcelType:"HOMESTEAD",landValue:75000,assessedValue:777000,fullMarketValue:809375,countyTaxable:777000,cityTaxable:675886,schoolTaxable:675886,frontage:34.02,depth:143.0,eastCoord:656640,nrthCoord:965070,deedYear:null,exemptions:[],mailAddress:"886 Albany, NY 12207"},
  {parcelId:"65.74-1-33",address:"36 N Swan St",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"ALBANY HOUSING AUTHORITY",owner2:null,propClass:"330",propClassDesc:"Vacant comm",parcelType:"HOMESTEAD",landValue:58000,assessedValue:58000,fullMarketValue:60417,countyTaxable:0,cityTaxable:0,schoolTaxable:0,frontage:24.38,depth:109.09,eastCoord:655950,nrthCoord:969540,deedYear:null,exemptions:[],mailAddress:"0 Albany, NY 12207"},
  {parcelId:"87.5-3-6",address:"Rear 693 S Pearl St",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"City of Albany",owner2:null,propClass:"330",propClassDesc:"Vacant comm",parcelType:"HOMESTEAD",landValue:526000,assessedValue:0,fullMarketValue:547917,countyTaxable:0,cityTaxable:0,schoolTaxable:0,frontage:0,depth:0,eastCoord:651050,nrthCoord:959260,deedYear:null,exemptions:[],mailAddress:"0 Albany, NY 12207"},
  {parcelId:"76.73-2-45",address:"170 Franklin St",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"County of Albany",owner2:null,propClass:"330",propClassDesc:"Vacant comm",parcelType:"HOMESTEAD",landValue:1000,assessedValue:1000,fullMarketValue:1042,countyTaxable:1000,cityTaxable:1000,schoolTaxable:1000,frontage:22.0,depth:78.0,eastCoord:654740,nrthCoord:961810,deedYear:null,exemptions:[],mailAddress:"000 Albany, NY 12207"},
  {parcelId:"65.65-5-56",address:"109 Third St",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"Chapman William",owner2:null,propClass:"311",propClassDesc:"Res vac land",parcelType:"HOMESTEAD",landValue:6000,assessedValue:6000,fullMarketValue:6250,countyTaxable:6000,cityTaxable:6000,schoolTaxable:6000,frontage:28.67,depth:130.0,eastCoord:655400,nrthCoord:969980,deedYear:2023,exemptions:[],mailAddress:"000 Albany, NY 12207"},
  {parcelId:"64.28-1-37",address:"Rear 740 Central Ave",zip:"12210",neighborhood:"Center Square / Washington Park",owner1:"TREEMONT, LLC",owner2:null,propClass:"311",propClassDesc:"Res vac land",parcelType:"HOMESTEAD",landValue:19000,assessedValue:19000,fullMarketValue:19792,countyTaxable:19000,cityTaxable:19000,schoolTaxable:19000,frontage:108.52,depth:110.8,eastCoord:646800,nrthCoord:975320,deedYear:null,exemptions:[],mailAddress:"000\nLATHAM, NY 12210"},
  {parcelId:"64.61-2-23",address:"168 Oliver Ave",zip:"12208",neighborhood:"Pine Hills",owner1:"Marathon Point, Inc.",owner2:null,propClass:"311",propClassDesc:"Res vac land",parcelType:"HOMESTEAD",landValue:3000,assessedValue:3000,fullMarketValue:3125,countyTaxable:3000,cityTaxable:3000,schoolTaxable:3000,frontage:30.0,depth:103.0,eastCoord:636650,nrthCoord:970390,deedYear:null,exemptions:[],mailAddress:"65 Albany, NY 12208"},
  {parcelId:"65.69-1-74",address:"760 Madison Ave",zip:"12208",neighborhood:"Pine Hills",owner1:"Richard F. Holub Rev-Trust",owner2:null,propClass:"464",propClassDesc:"Office bldg.",parcelType:"HOMESTEAD",landValue:42000,assessedValue:432300,fullMarketValue:450313,countyTaxable:432300,cityTaxable:432300,schoolTaxable:432300,frontage:44.0,depth:187.0,eastCoord:648820,nrthCoord:969190,deedYear:2020,exemptions:[],mailAddress:"0648820 NRTH-0969190 Albany, NY 12208"},
  {parcelId:"76.42-3-15",address:"30 S Pearl St",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"PS Associates",owner2:null,propClass:"464",propClassDesc:"Office bldg.",parcelType:"HOMESTEAD",landValue:517000,assessedValue:9661700,fullMarketValue:10064271,countyTaxable:9661700,cityTaxable:9661700,schoolTaxable:9661700,frontage:303.0,depth:111.0,eastCoord:656070,nrthCoord:965580,deedYear:null,exemptions:[],mailAddress:"700 TO Albany, NY 12207"},
  {parcelId:"41.00-2-31",address:"",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"Corporate Plaza Realty LLC",owner2:null,propClass:"464",propClassDesc:"Office bldg.",parcelType:"NON-HOMESTEAD",landValue:555000,assessedValue:687300,fullMarketValue:715938,countyTaxable:687300,cityTaxable:687300,schoolTaxable:687300,frontage:180.0,depth:387.25,eastCoord:627050,nrthCoord:985680,deedYear:2016,exemptions:[],mailAddress:"300\nLATHAM, NY 12110"},
  {parcelId:"76.33-1-9",address:"48 Eagle St",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"TEN PLUS TEN REALTY LLC",owner2:null,propClass:"438",propClassDesc:"Parking lot",parcelType:"HOMESTEAD",landValue:16000,assessedValue:33300,fullMarketValue:34688,countyTaxable:33300,cityTaxable:33300,schoolTaxable:33300,frontage:18.02,depth:52.29,eastCoord:655000,nrthCoord:966100,deedYear:null,exemptions:[],mailAddress:"300\nBROOKLYN, NY 11213"},
  {parcelId:"76.50-1-30",address:"28 Division St",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"Liberty Square Development",owner2:null,propClass:"438",propClassDesc:"Parking lot",parcelType:"HOMESTEAD",landValue:54000,assessedValue:119600,fullMarketValue:124583,countyTaxable:119600,cityTaxable:119600,schoolTaxable:119600,frontage:100.79,depth:35.17,eastCoord:656513,nrthCoord:964857,deedYear:2023,exemptions:[],mailAddress:"600\nAlbany, NY 12207"},
  {parcelId:"64.80-1-30",address:"700A New Scotland Ave",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"Sisters of Mercy of the",owner2:null,propClass:"620",propClassDesc:"Religious",parcelType:"HOMESTEAD",landValue:1051000,assessedValue:0,fullMarketValue:15192620,countyTaxable:0,cityTaxable:0,schoolTaxable:0,frontage:0,depth:0,eastCoord:641920,nrthCoord:968600,deedYear:null,exemptions:[],mailAddress:"0641920 NRTH-0968600         SCHOOL  TAXABLE VALUE                    0 Cumberland, RI 02864"},
  {parcelId:"75.41-3-28",address:"279 Whitehall Rd",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"Alcantara Everton",owner2:null,propClass:"620",propClassDesc:"Religious",parcelType:"HOMESTEAD",landValue:17000,assessedValue:93800,fullMarketValue:97708,countyTaxable:93800,cityTaxable:93800,schoolTaxable:93800,frontage:40.0,depth:100.0,eastCoord:643140,nrthCoord:965040,deedYear:2024,exemptions:[],mailAddress:"800 Schenectady, NY 12303"},
  {parcelId:"75.25-1-22",address:"267 S Main Ave",zip:"12208",neighborhood:"Pine Hills",owner1:"Greenhut John A",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:56400,assessedValue:282000,fullMarketValue:293750,countyTaxable:282000,cityTaxable:282000,schoolTaxable:195900,frontage:45.0,depth:144.0,eastCoord:643290,nrthCoord:967680,deedYear:null,exemptions:[{name:"ENH STAR",code:"41834",countyAmt:0.0,cityAmt:0.0,schoolAmt:86100.0}],mailAddress:"000 Albany, NY 12208"},
  {parcelId:"65.7-1-34",address:"1E Rosemary Dr Ext",zip:"12211",neighborhood:"Albany",owner1:"Albright Lynne",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:2,assessedValue:72920,fullMarketValue:247917,countyTaxable:72920,cityTaxable:72920,schoolTaxable:25220,frontage:98.0,depth:100.0,eastCoord:654320,nrthCoord:975490,deedYear:null,exemptions:[{name:"ENH STAR",code:"41834",countyAmt:0.0,cityAmt:0.0,schoolAmt:86100.0}],mailAddress:"320 Albany, NY 12211"},
  {parcelId:"65.62-2-54",address:"33 N Lake Ave",zip:"12203",neighborhood:"Westland Hills",owner1:"Laurie",owner2:null,propClass:"220",propClassDesc:"2 Family Res",parcelType:"HOMESTEAD",landValue:60200,assessedValue:239000,fullMarketValue:248958,countyTaxable:239000,cityTaxable:239000,schoolTaxable:209000,frontage:29.86,depth:107.0,eastCoord:650440,nrthCoord:970350,deedYear:null,exemptions:[{name:"BAS STAR",code:"41854",countyAmt:0.0,cityAmt:0.0,schoolAmt:30000.0}],mailAddress:"000 Albany, NY 12203"},
  {parcelId:"75.83-1-7",address:"15 Bohl Ave",zip:"12209",neighborhood:"South End",owner1:"Lynch Christine A",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:27200,assessedValue:136000,fullMarketValue:141667,countyTaxable:136000,cityTaxable:136000,schoolTaxable:106000,frontage:30.11,depth:100.38,eastCoord:646120,nrthCoord:961000,deedYear:null,exemptions:[{name:"BAS STAR",code:"41854",countyAmt:0.0,cityAmt:0.0,schoolAmt:30000.0}],mailAddress:"000 Albany, NY 12209"},
  {parcelId:"74.11-1-26",address:"28 Wood Ter",zip:"12208",neighborhood:"Pine Hills",owner1:"DILLON STEVEN T",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:45400,assessedValue:227000,fullMarketValue:236458,countyTaxable:227000,cityTaxable:227000,schoolTaxable:197000,frontage:100.0,depth:120.0,eastCoord:631950,nrthCoord:964720,deedYear:null,exemptions:[{name:"BAS STAR",code:"41854",countyAmt:0.0,cityAmt:0.0,schoolAmt:30000.0}],mailAddress:"000 ALBANY, NY 12208"},
  {parcelId:"75.27-1-39",address:"412 New Scotland Ave",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"Corporation of the Presiding",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:59000,assessedValue:295000,fullMarketValue:307292,countyTaxable:0,cityTaxable:0,schoolTaxable:0,frontage:31.0,depth:296.5,eastCoord:645050,nrthCoord:967230,deedYear:null,exemptions:[{name:"WHOLLY EX",code:"50000",countyAmt:295000.0,cityAmt:295000.0,schoolAmt:295000.0}],mailAddress:"1 Family Res                WHOLLY, EX 50000"},
  {parcelId:"76.54-4-45",address:"61 Garden St",zip:"12209",neighborhood:"South End",owner1:"Merrick Moses V",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:43000,assessedValue:216000,fullMarketValue:225000,countyTaxable:216000,cityTaxable:216000,schoolTaxable:129900,frontage:40.0,depth:144.0,eastCoord:649630,nrthCoord:962970,deedYear:null,exemptions:[{name:"ENH STAR",code:"41834",countyAmt:0.0,cityAmt:0.0,schoolAmt:86100.0}],mailAddress:"900 Albany, NY 12209"},
  {parcelId:"76.69-4-11",address:"342 Second Ave",zip:"12209",neighborhood:"South End",owner1:"Holder Sherry A",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:36600,assessedValue:183000,fullMarketValue:190625,countyTaxable:183000,cityTaxable:183000,schoolTaxable:153000,frontage:30.0,depth:145.1,eastCoord:649500,nrthCoord:961920,deedYear:null,exemptions:[{name:"BAS STAR",code:"41854",countyAmt:0.0,cityAmt:0.0,schoolAmt:30000.0}],mailAddress:"000 Albany, NY 12209"},
  {parcelId:"65.11-2-19",address:"14b Dudley Hts",zip:"12210",neighborhood:"Center Square / Washington Park",owner1:"Kanachis John E",owner2:null,propClass:"220",propClassDesc:"2 Family Res",parcelType:"HOMESTEAD",landValue:18600,assessedValue:93000,fullMarketValue:96875,countyTaxable:93000,cityTaxable:93000,schoolTaxable:63000,frontage:25.21,depth:200.0,eastCoord:654970,nrthCoord:972360,deedYear:null,exemptions:[{name:"BAS STAR",code:"41854",countyAmt:0.0,cityAmt:0.0,schoolAmt:30000.0}],mailAddress:"000 Albany, NY 12210"},
  {parcelId:"87.10-2-9",address:"S Pearl St",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"County of Albany",owner2:null,propClass:"500",propClassDesc:"Rec & Entert",parcelType:"HOMESTEAD",landValue:5482000,assessedValue:0,fullMarketValue:5710130,countyTaxable:0,cityTaxable:0,schoolTaxable:0,frontage:0,depth:0,eastCoord:652265,nrthCoord:957387,deedYear:null,exemptions:[{name:"CTY OWNED",code:"13100",countyAmt:5481725.0,cityAmt:5481725.0,schoolAmt:5481725.0}],mailAddress:"0 Albany, NY 12207"},
  {parcelId:"74.12-1-50",address:"9 Olympus Ct",zip:"12208",neighborhood:"Pine Hills",owner1:"Witko Michael P",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:108800,assessedValue:544000,fullMarketValue:566667,countyTaxable:544000,cityTaxable:544000,schoolTaxable:457900,frontage:110.0,depth:140.0,eastCoord:634180,nrthCoord:965340,deedYear:null,exemptions:[{name:"ENH STAR",code:"41834",countyAmt:0.0,cityAmt:0.0,schoolAmt:86100.0}],mailAddress:"900 Albany, NY 12208"},
  {parcelId:"75.25-1-44",address:"288 S Main Ave",zip:"12208",neighborhood:"Pine Hills",owner1:"Donnelly Richard G",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:0,assessedValue:98920,fullMarketValue:302083,countyTaxable:98920,cityTaxable:98920,schoolTaxable:51220,frontage:52.0,depth:149.0,eastCoord:643350,nrthCoord:967390,deedYear:null,exemptions:[{name:"ENH STAR",code:"41834",countyAmt:0.0,cityAmt:0.0,schoolAmt:86100.0}],mailAddress:"320 Albany, NY 12208"},
  {parcelId:"76.57-2-7",address:"91 Westerlo St",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"HISTORIC PASTURES MANSIONS",owner2:null,propClass:"230",propClassDesc:"3 Family Res",parcelType:"HOMESTEAD",landValue:40800,assessedValue:204000,fullMarketValue:212500,countyTaxable:0,cityTaxable:0,schoolTaxable:0,frontage:22.0,depth:92.75,eastCoord:655120,nrthCoord:963880,deedYear:null,exemptions:[{name:"WHOLLY EX",code:"50000",countyAmt:204000.0,cityAmt:204000.0,schoolAmt:204000.0}],mailAddress:"3 Family Res                WHOLLY, EX 50000"},
  {parcelId:"64.49-1-73",address:"65 Lenox Ave",zip:"12203",neighborhood:"Westland Hills",owner1:"Toomey Joseph J",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:66000,assessedValue:329000,fullMarketValue:342708,countyTaxable:329000,cityTaxable:329000,schoolTaxable:299000,frontage:55.0,depth:140.0,eastCoord:642580,nrthCoord:972090,deedYear:null,exemptions:[{name:"BAS STAR",code:"41854",countyAmt:0.0,cityAmt:0.0,schoolAmt:30000.0}],mailAddress:"000 Albany, NY 12203"},
  {parcelId:"54.19-1-44",address:"6 Daisy Ln",zip:"12211",neighborhood:"Albany",owner1:"Logan Margaret E",owner2:null,propClass:"210",propClassDesc:"1 Family Res",parcelType:"HOMESTEAD",landValue:67600,assessedValue:338000,fullMarketValue:352083,countyTaxable:303440,cityTaxable:303440,schoolTaxable:246140,frontage:90.0,depth:110.0,eastCoord:654130,nrthCoord:976020,deedYear:null,exemptions:[{name:"ENH STAR",code:"41834",countyAmt:0.0,cityAmt:0.0,schoolAmt:86100.0}],mailAddress:"6 Daisy Ln                      EAST-0654130 NRTH-0976020         CITY    TAXABLE VALUE              303,440 Albany, NY 12211"},
  {parcelId:"53.00-1-2",address:"1200 Washington Ave",zip:"12206",neighborhood:"West Hill / Pine Hills",owner1:"State of New York",owner2:null,propClass:"652",propClassDesc:"Govt bldgs",parcelType:"HOMESTEAD",landValue:111086000,assessedValue:0,fullMarketValue:1165840297,countyTaxable:0,cityTaxable:0,schoolTaxable:0,frontage:0,depth:0,eastCoord:640500,nrthCoord:977000,deedYear:null,exemptions:[{name:"NY STATE",code:"12100",countyAmt:1119206685.0,cityAmt:1119206685.0,schoolAmt:1119206685.0}],mailAddress:"0 Albany, NY 12206"},
  {parcelId:"76.10-1-10",address:"304 Madison Ave",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"County of Albany",owner2:null,propClass:"681",propClassDesc:"Culture bldg",parcelType:"HOMESTEAD",landValue:11622000,assessedValue:0,fullMarketValue:293306094,countyTaxable:0,cityTaxable:0,schoolTaxable:0,frontage:0,depth:0,eastCoord:654020,nrthCoord:965910,deedYear:null,exemptions:[],mailAddress:"0 Albany, NY 12207"},
  {parcelId:"53.00-1-71",address:"201 Fuller Rd",zip:"12203",neighborhood:"Westland Hills",owner1:"STATE OF NEW YORK",owner2:null,propClass:"613",propClassDesc:"College/univ",parcelType:"HOMESTEAD",landValue:2175000,assessedValue:0,fullMarketValue:248415365,countyTaxable:0,cityTaxable:0,schoolTaxable:0,frontage:0,depth:0,eastCoord:634306,nrthCoord:981443,deedYear:null,exemptions:[{name:"NY STATE",code:"12100",countyAmt:238478750.0,cityAmt:238478750.0,schoolAmt:238478750.0}],mailAddress:"0 Albany, NY 12203"},
  {parcelId:"76.25-2-29",address:"86 S Swan St",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"State of New York",owner2:null,propClass:"652",propClassDesc:"Govt bldgs",parcelType:"HOMESTEAD",landValue:1090000,assessedValue:163998930,fullMarketValue:170832219,countyTaxable:0,cityTaxable:0,schoolTaxable:0,frontage:330.53,depth:187.58,eastCoord:654190,nrthCoord:967460,deedYear:null,exemptions:[],mailAddress:"0 Albany, NY 12242"},
  {parcelId:"75.25-1-1",address:"632 New Scotland Ave",zip:"12207",neighborhood:"Downtown / Arbor Hill",owner1:"St. Peter's Hospital",owner2:null,propClass:"641",propClassDesc:"Hospital",parcelType:"HOMESTEAD",landValue:5266000,assessedValue:0,fullMarketValue:132175427,countyTaxable:0,cityTaxable:0,schoolTaxable:0,frontage:0,depth:0,eastCoord:642181,nrthCoord:967789,deedYear:null,exemptions:[],mailAddress:"0 Troy, NY 12180"}
];

/* ── CSV PARSER — supports Albany County Parcels 2024 CSV + generic formats ── */
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[\s\-\/]/g,"_").replace(/[^a-z0-9_]/g,""));
  const find = (...keys) => keys.map(k => headers.indexOf(k)).find(i => i >= 0) ?? -1;
  const num = v => parseFloat((v||"").toString().replace(/[$,\s]/g,""))||0;
  const WATER = {"0":"Unknown","1":"Public Water","2":"Well","3":"Municipal"};
  const SEWER = {"0":"Unknown","1":"Public Sewer","2":"Septic","3":"Municipal"};
  const c = {
    id:find("parcel_id","print_key","printkey","parcelid","tax_map_number"),
    addr:find("parcel_loc","prclstreet","address","prop_location","location","property_address","street_address"),
    zip:find("zip","zip_code","zipcode","postal_code"),
    own1:find("ownername","owner","owner1","owner_name","name","owner_of_record"),
    own2:find("owner2","owner_2","co_owner"),
    cls:find("propclsite","prop_class","property_class","class","classcode"),
    clsd:find("propclsdes","class_description","classdesc","property_description","use_description"),
    land:find("landassess","land_av","land_value","assessed_land","land"),
    tot:find("totassess","total_av","total_value","assessed_value","total_assessed","total"),
    fmv:find("full_market_value","fmv","market_value","full_value"),
    cty:find("county_taxable","countytaxable"),
    city:find("city_taxable","citytaxable"),
    sch:find("school_taxable","schooltaxable"),
    frnt:find("frontage","frnt","front"),
    dpth:find("depth","dpth"),
    typ:find("parcel_type","homestead","type"),
    mail:find("mailing_address","mail_address","mail"),
    muni:find("prclmuni","municipality","parcel_municipality"),
    yrb:find("yearblt","year_built","yearbuilt"),
    schdist:find("schdist","schcode","school_district"),
    acres:find("acres","lot_acres","acreage"),
    deedref:find("deedref","deed_ref","deed_reference"),
    water:find("watertype","water_type"),
    sewer:find("sewertype","sewer_type"),
    shapearea:find("shape__area","shape_area","parcel_area"),
  };
  return lines.slice(1).map((line,i) => {
    const cols=[];let inQ=false,cur="";
    for(const ch of line+","){if(ch==='"'){inQ=!inQ;}else if(ch===","&&!inQ){cols.push(cur.trim());cur="";}else cur+=ch;}
    const r = h => h>=0&&h<cols.length?cols[h]:"";
    const addr = r(c.addr)||"Unknown";
    const deedRef = r(c.deedref);
    const saleDateM = deedRef.match(/Sold on:\s*(\d{4})\/(\d{2})\/(\d{2})/i);
    const saleYear = saleDateM?parseInt(saleDateM[1]):null;
    const saleDate = saleDateM?`${saleDateM[2]}/${saleDateM[3]}/${saleDateM[1]}`:null;
    const yrb = parseInt(r(c.yrb))||null;
    return {
      parcelId:r(c.id)||`ROW-${i+1}`,
      address:addr, zip:r(c.zip)||"12200",
      neighborhood:r(c.muni)||"Albany",
      owner1:r(c.own1)||"Unknown", owner2:r(c.own2)||null,
      propClass:r(c.cls)||"000", propClassDesc:r(c.clsd)||"Unknown",
      parcelType:r(c.typ)||"UNKNOWN",
      landValue:num(r(c.land)), assessedValue:num(r(c.tot)), fullMarketValue:num(r(c.fmv)),
      countyTaxable:num(r(c.cty))||num(r(c.tot)), cityTaxable:num(r(c.city))||num(r(c.tot)),
      schoolTaxable:num(r(c.sch))||num(r(c.tot)),
      frontage:num(r(c.frnt)), depth:num(r(c.dpth)),
      deedYear:saleYear, saleDate, eastCoord:0, nrthCoord:0, exemptions:[],
      mailAddress:r(c.mail)||addr,
      yearBuilt:yrb&&yrb>1800&&yrb<=2025?yrb:null,
      municipality:r(c.muni)||null,
      schoolDistrict:r(c.schdist)||null,
      acres:parseFloat(r(c.acres))||null,
      waterType:r(c.water)?WATER[r(c.water)]||null:null,
      sewerType:r(c.sewer)?SEWER[r(c.sewer)]||null:null,
      parcelArea:num(r(c.shapearea))||null,
    };
  }).filter(p=>p.parcelId);
}


/* ── TEXT ROLL PARSER — Albany 2025 Final Assessment Roll (.txt) ── */
function parseTextRoll(text) {
  const delimPat = /\*{5,}[\s*]+(\d+\.\d+-\d+-\d+)[\s*]+\*{5,}/g;
  const parts = [];
  let m, lastIdx=0, lastPid=null;
  while ((m=delimPat.exec(text))!==null) {
    if (lastPid!==null) parts.push({pid:lastPid,blk:text.slice(lastIdx,m.index)});
    lastPid=m[1]; lastIdx=m.index+m[0].length;
  }
  if (lastPid) parts.push({pid:lastPid,blk:text.slice(lastIdx)});
  const num = s => parseFloat((s||"").replace(/[,$]/g,""))||0;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  return parts.map(({pid,blk}) => {
    const pidE=esc(pid);
    const clsM=blk.match(new RegExp(pidE+"\\t(\\d{3})\\s+(.+?)(?=\\s{3,}|\\t)"))||
               blk.match(new RegExp("\\d+\\s+"+pidE+"\\t(\\d{3})\\s+(.+?)(?=\\s{3,}|\\t)"));
    const propClass=clsM?clsM[1]:"000";
    const propClassDesc=clsM?clsM[2].trim():"Unknown";
    const parcelType=blk.includes("HOMESTEAD PARCEL")?"HOMESTEAD":"NON-HOMESTEAD";
    const firstLine=blk.trim().split("\n")[0];
    const addrM=firstLine.match(/^(.+?)\s+(?:HOMESTEAD|NON-HOMESTEAD)/);
    const address=(addrM?addrM[1]:firstLine).replace(/\s+/g," ").trim();
    const zipM=blk.match(/Albany,?\s+NY\s+(122\d{2})/)||blk.match(/\b(122\d{2})\b/);
    const zip=zipM?(zipM[1]||zipM[0]):"12207";
    let ownM=blk.match(/(?:\t|\n)([A-Z][^\t\n]+?)\t(?:Albany|ALBANY)\s*\t?010100/)||
             blk.match(/(?:\t|\n)([A-Z][^\t\n]+?)\s{3,}(?:Albany|ALBANY)\s*\t?010100/);
    if(!ownM)ownM=blk.match(/([A-Z][^0-9\t\n]{2,45}?)\s+(?:Albany|ALBANY)\s*\t?010100/);
    let owner1=ownM?ownM[1].trim().replace(/\s*(?:BAS STAR|ENH STAR|AGED|VET|WHOLLY).*$/i,"").trim():null;
    const own2M=blk.match(/\n([A-Z][^0-9\t\n]+?)\tFRNT/)||blk.match(/[\d,]+ ([A-Z][^0-9\t\n]+?)\tFRNT/);
    let owner2=own2M?own2M[1].trim():null;
    if(owner2===owner1||owner2===address)owner2=null;
    const landM=blk.match(/010100\s+([\d,]+)\s+(?:COUNTY|CITY)\s+TAXABLE/);
    const landValue=landM?num(landM[1]):0;
    const fmvM=blk.match(/FULL MARKET VALUE\s+([\d,]+)/);
    const fullMarketValue=fmvM?num(fmvM[1]):0;
    const frntM=blk.match(/FRNT\s+([\d.]+)\s+DPTH\s+([\d.]+)\s+([\d,]+)/);
    const frontage=frntM?parseFloat(frntM[1]):0;
    const depth=frntM?parseFloat(frntM[2]):0;
    const assessedValue=frntM?num(frntM[3]):(fullMarketValue>0?Math.round(fullMarketValue*0.96):0);
    const ctyM=blk.match(/COUNTY\s+TAXABLE\s+VALUE\s+([\d,]+)/);
    const cityM=blk.match(/CITY\s+TAXABLE\s+VALUE\s+([\d,]+)/);
    const schM=blk.match(/SCHOOL\s+TAXABLE\s+VALUE\s+([\d,]+)/);
    const countyTaxable=ctyM?num(ctyM[1]):assessedValue;
    const cityTaxable=cityM?num(cityM[1]):assessedValue;
    const schoolTaxable=schM?num(schM[1]):assessedValue;
    const coordM=blk.match(/EAST-0?(\d+)\s+NRTH-0?(\d+)/);
    const eastCoord=coordM?parseInt(coordM[1]):0;
    const nrthCoord=coordM?parseInt(coordM[2]):0;
    const deedM=blk.match(/DEED BOOK\s+(\d{4})\s+PG/);
    const dy=deedM?parseInt(deedM[1]):null;
    const deedYear=(dy&&dy>=1900&&dy<=2025)?dy:null;
    const exemptions=[];
    const exPat=/([A-Z][A-Za-z\s\-]{1,20}?)\s{2,}(\d{5})\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/g;
    const skipEx=new Set(["COUNTY TAXABLE","CITY TAXABLE","SCHOOL TAXABLE","FULL MARKET","DEED BOOK"]);
    let exM;
    while((exM=exPat.exec(blk))!==null){
      const nm=exM[1].trim();
      if(skipEx.has(nm)||nm.length<3)continue;
      exemptions.push({name:nm,code:exM[2],countyAmt:num(exM[3]),cityAmt:num(exM[4]),schoolAmt:num(exM[5])});
    }
    const mailM=blk.match(/(\d+[^\n]+?),?\s+([A-Z]{2})\s+(1\d{4})(?=[\s\n])/);
    const mailAddress=mailM?`${mailM[1].trim()}, ${mailM[2]} ${mailM[3]}`:address;
    return {
      parcelId:pid,address,zip,neighborhood:"Albany",
      owner1:owner1||"Unknown",owner2,
      propClass,propClassDesc,parcelType,
      landValue,assessedValue,fullMarketValue,
      countyTaxable,cityTaxable,schoolTaxable,
      frontage,depth,deedYear,eastCoord,nrthCoord,exemptions,
      mailAddress,
      yearBuilt:null,municipality:null,schoolDistrict:"Albany",
      acres:null,waterType:null,sewerType:null,parcelArea:null,saleDate:null
    };
  }).filter(p=>p.parcelId&&p.assessedValue>=0);
}

/* ── HELPERS ── */
const $f = v => v==null?"—":"$"+Number(v).toLocaleString();
const nf = v => v==null?"—":Number(v).toLocaleString();
const eqR = p => p.fullMarketValue>0?((p.assessedValue/p.fullMarketValue)*100).toFixed(1):"—";
const eqFlag = p => { const r=parseFloat(eqR(p)); if(isNaN(r))return"neutral"; if(r<80)return"under"; if(r>120)return"over"; return"fair"; };
const FC = {under:"#f59e0b",over:"#dc2626",fair:"#22c55e",neutral:"#64748b"};
const FL = {under:"Under-Assessed",over:"Over-Assessed",fair:"Fair Value",neutral:"No Data"};
const lotSqFt = p => p.frontage&&p.depth?p.frontage*p.depth:null;
const gentriIdx = p => p.assessedValue>0?(p.landValue/p.assessedValue*100).toFixed(1):0;
const isAbsentee = p => { if(!p.mailAddress)return false; const street=(p.address||"").toLowerCase().split(" ").slice(0,3).join(" "); return!p.mailAddress.toLowerCase().includes(street); };
const COLORS = ["#3b82f6","#f59e0b","#0d9488","#a78bfa","#f97316","#ec4899","#22c55e","#06b6d4","#dc2626","#facc15"];

/* ── SHARED UI ATOMS ── */
const Badge = ({children,color="#3b82f6",small}) => (
  <span style={{background:color+"22",color,border:`1px solid ${color}33`,borderRadius:5,padding:small?"1px 6px":"2px 8px",fontSize:small?10:11,fontWeight:600,fontFamily:"var(--fm)",whiteSpace:"nowrap"}}>{children}</span>
);
const Card = ({children,style={}}) => (
  <div style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:12,padding:"18px 20px",...style}}>{children}</div>
);
const SectionTitle = ({children}) => (
  <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:700,color:"var(--white)",marginBottom:4}}>{children}</div>
);
const Sub = ({children}) => (
  <div style={{fontSize:12,color:"var(--gray2)",marginBottom:16}}>{children}</div>
);
const TT = {contentStyle:{background:"#0a1628",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,fontFamily:"var(--fb)",fontSize:12},labelStyle:{color:"#f1f5f9"},itemStyle:{color:"#94a3b8"}};

/* ── STAT CARD ── */
const StatCard = ({label,value,icon,color="#3b82f6",sub,onClick}) => (
  <div onClick={onClick} style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 18px",flex:1,minWidth:140,cursor:onClick?"pointer":"default",transition:"opacity .15s"}} onMouseEnter={e=>{if(onClick)e.currentTarget.style.opacity=".8"}} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div>
        <div style={{fontFamily:"var(--fm)",fontSize:20,fontWeight:600,color,letterSpacing:-0.5}}>{value}</div>
        <div style={{fontSize:11,color:"var(--gray)",marginTop:3,fontWeight:500,textTransform:"uppercase",letterSpacing:.5}}>{label}</div>
      </div>
      <span style={{fontSize:22,opacity:.45}}>{icon}</span>
    </div>
    {sub&&<div style={{fontSize:10,color:"var(--gray2)",marginTop:6}}>{sub}</div>}
  </div>
);

/* ── PARCEL MINI CARD ── */
const ParcelMini = ({p,onClick,selected,onCompare,inCompare}) => {
  const flag=eqFlag(p); const fc=FC[flag];
  return (
    <div className="fi" onClick={()=>onClick&&onClick(p)} style={{
      background:selected?"rgba(37,99,235,0.12)":"var(--card)",border:`1px solid ${selected?"var(--blue)":"var(--border)"}`,
      borderRadius:11,padding:"14px 16px",cursor:onClick?"pointer":"default",transition:"all .15s",
    }}
    onMouseEnter={e=>{if(!selected&&onClick)e.currentTarget.style.background="var(--card2)"}}
    onMouseLeave={e=>{if(!selected&&onClick)e.currentTarget.style.background="var(--card)"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.address}</div>
          <div style={{fontFamily:"var(--fm)",fontSize:10,color:"var(--gray)",margin:"3px 0 7px"}}>{p.parcelId} · {p.zip}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
            <Badge color="#6366f1" small>{p.propClass} {p.propClassDesc}</Badge>
            {p.parcelType==="HOMESTEAD"&&<Badge color="#0d9488" small>Homestead</Badge>}
            {p.exemptions.length>0&&<Badge color="#f59e0b" small>{p.exemptions.length} Exemption{p.exemptions.length>1?"s":""}</Badge>}
            {isAbsentee(p)&&<Badge color="#f97316" small>Absentee</Badge>}
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontFamily:"var(--fm)",fontSize:15,fontWeight:600,color:"var(--amber)"}}>{$f(p.fullMarketValue)}</div>
          <div style={{fontSize:10,color:"var(--gray)",margin:"2px 0 5px"}}>FMV</div>
          <span style={{fontSize:11,color:fc,fontWeight:600}}>●&nbsp;{eqR(p)}%</span>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid var(--border)",paddingTop:8,marginTop:8}}>
        <div style={{fontSize:11,color:"var(--gray2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"65%"}}>{p.owner1}{p.owner2?` & ${p.owner2}`:""}</div>
        {onCompare&&<button onClick={e=>{e.stopPropagation();onCompare(p)}} style={{background:inCompare?"rgba(37,99,235,.25)":"rgba(255,255,255,.05)",border:`1px solid ${inCompare?"var(--blue)":"var(--border)"}`,color:inCompare?"var(--blue2)":"var(--gray)",borderRadius:5,padding:"2px 8px",fontSize:10,cursor:"pointer",fontFamily:"var(--fm)"}}>{inCompare?"✓ Compare":"+ Compare"}</button>}
      </div>
    </div>
  );
};

/* ── DETAIL PANEL ── */
const DetailPanel = ({p,onClose,myHome,onSaveHome}) => {
  const flag=eqFlag(p); const fc=FC[flag]; const r=parseFloat(eqR(p));
  const Row = ({label,value,color,mono}) => (
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,gap:12}}>
      <span style={{fontSize:12,color:"var(--gray)",flex:1}}>{label}</span>
      <span style={{fontSize:12,fontFamily:mono?"var(--fm)":"inherit",fontWeight:500,color:color||"var(--white)",textAlign:"right"}}>{value}</span>
    </div>
  );
  const Sec = ({title,children}) => (
    <div style={{marginBottom:18}}>
      <div style={{fontSize:9,fontWeight:700,color:"var(--gray2)",letterSpacing:1.2,textTransform:"uppercase",marginBottom:8,paddingBottom:5,borderBottom:"1px solid var(--border)"}}>{title}</div>
      {children}
    </div>
  );
  const totExC=p.exemptions.reduce((s,e)=>s+e.countyAmt,0);
  const totExCI=p.exemptions.reduce((s,e)=>s+e.cityAmt,0);
  const totExS=p.exemptions.reduce((s,e)=>s+e.schoolAmt,0);
  return (
    <div className="fi" style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:14,padding:20,height:"100%",overflowY:"auto",position:"relative"}}>
      <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:"var(--card2)",border:"1px solid var(--border)",borderRadius:6,color:"var(--gray)",width:26,height:26,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:800,marginBottom:2,paddingRight:32}}>{p.address}</div>
      <div style={{fontFamily:"var(--fm)",fontSize:11,color:"var(--gray)",marginBottom:10}}>Parcel {p.parcelId} · Albany, NY {p.zip} · {p.neighborhood}</div>
      {/* Save My Home button */}
      {onSaveHome&&<button onClick={()=>onSaveHome(p)} style={{
        display:"flex",alignItems:"center",gap:6,
        background:myHome?.parcelId===p.parcelId?"rgba(34,197,94,.15)":"rgba(255,255,255,.05)",
        border:`1px solid ${myHome?.parcelId===p.parcelId?"rgba(34,197,94,.4)":"var(--border)"}`,
        color:myHome?.parcelId===p.parcelId?"var(--green2)":"var(--gray)",
        borderRadius:7,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer",marginBottom:14
      }}>
        {myHome?.parcelId===p.parcelId?"🏡 This is My Home (saved)":"🏡 Save as My Home"}
      </button>}
      {/* Equity meter */}
      <div style={{background:`${fc}11`,border:`1px solid ${fc}33`,borderRadius:9,padding:12,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:11,fontWeight:600,color:fc}}>{FL[flag]}</span>
          <span style={{fontFamily:"var(--fm)",fontSize:13,fontWeight:700,color:fc}}>{eqR(p)}%</span>
        </div>
        <div style={{height:5,background:"var(--bg)",borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${Math.min(isNaN(r)?0:r,150)/1.5}%`,background:fc,borderRadius:3,transition:"width .5s ease"}}></div>
        </div>
        <div style={{fontSize:10,color:"var(--gray2)",marginTop:5}}>Assessed ÷ FMV · Fair range: 80–120%</div>
      </div>
      <Sec title="Ownership">
        <Row label="Primary Owner" value={p.owner1}/>
        {p.owner2&&<Row label="Co-Owner" value={p.owner2}/>}
        <Row label="Mailing Address" value={p.mailAddress||"—"}/>
        <Row label="Absentee Owner?" value={isAbsentee(p)?"Yes — mailing ≠ property":"No — owner-occupied likely"}  color={isAbsentee(p)?"#f97316":"#22c55e"}/>
      </Sec>
      <Sec title="Valuation">
        <Row label="Full Market Value" value={$f(p.fullMarketValue)} mono color="#f59e0b"/>
        <Row label="Total Assessed Value" value={$f(p.assessedValue)} mono/>
        <Row label="Land Value" value={$f(p.landValue)} mono/>
        <Row label="Building Value" value={$f(p.assessedValue-p.landValue)} mono/>
        <Row label="Gentrification Index" value={gentriIdx(p)+"% land-to-total"} mono color={parseFloat(gentriIdx(p))>50?"#f97316":"var(--white)"}/>
      </Sec>
      <Sec title="Taxable Values">
        <Row label="County Taxable" value={$f(p.countyTaxable)} mono/>
        <Row label="City Taxable" value={$f(p.cityTaxable)} mono/>
        <Row label="School Taxable" value={$f(p.schoolTaxable)} mono/>
      </Sec>
      {p.exemptions.length>0&&<Sec title="Exemptions">
        {p.exemptions.map((ex,i)=>(
          <div key={i} style={{background:"rgba(245,158,11,.07)",border:"1px solid rgba(245,158,11,.18)",borderRadius:7,padding:"8px 10px",marginBottom:7}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontFamily:"var(--fm)",fontSize:12,fontWeight:600,color:"var(--amber2)"}}>{ex.name}</span>
              <Badge color="#f59e0b" small>§{ex.code}</Badge>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,fontSize:11,color:"var(--gray)"}}>
              <span>County: {$f(ex.countyAmt)}</span><span>City: {$f(ex.cityAmt)}</span><span>School: {$f(ex.schoolAmt)}</span>
            </div>
          </div>
        ))}
        <div style={{fontSize:10,color:"var(--gray2)",marginTop:4}}>Totals — County: {$f(totExC)} · City: {$f(totExCI)} · School: {$f(totExS)}</div>
      </Sec>}
      <Sec title="Property Details">
        <Row label="Class" value={`${p.propClass} — ${p.propClassDesc}`}/>
        <Row label="Type" value={p.parcelType}/>
        <Row label="Lot Size" value={p.frontage&&p.depth?`${p.frontage}×${p.depth} ft (${nf(p.frontage*p.depth)} sq ft)`:"—"}/>
        {p.acres&&<Row label="Lot Acres" value={p.acres.toFixed(4)+" ac"} mono/>}
        {p.yearBuilt&&<Row label="Year Built" value={p.yearBuilt} mono color="var(--teal2)"/>}
        {p.municipality&&<Row label="Municipality" value={p.municipality}/>}
        {p.schoolDistrict&&<Row label="School District" value={p.schoolDistrict}/>}
        {p.waterType&&<Row label="Water Supply" value={p.waterType} color="var(--blue3)"/>}
        {p.sewerType&&<Row label="Sewer Type" value={p.sewerType} color="var(--blue3)"/>}
        {p.saleDate&&<Row label="Last Sale Date" value={p.saleDate} mono color="var(--green2)"/>}
        {!p.saleDate&&p.deedYear&&<Row label="Last Sale Year" value={p.deedYear} mono/>}
        {p.eastCoord>0&&<Row label="Survey Coords" value={`E-${p.eastCoord} N-${p.nrthCoord}`} mono/>}
      </Sec>
      <Sec title="Tax Reduction vs. Assessed">
        <Row label="County Savings" value={$f(p.assessedValue-p.countyTaxable)} mono color="#22c55e"/>
        <Row label="City Savings" value={$f(p.assessedValue-p.cityTaxable)} mono color="#22c55e"/>
        <Row label="School Savings" value={$f(p.assessedValue-p.schoolTaxable)} mono color="#22c55e"/>
      </Sec>
    </div>
  );
};

/* ── PROPERTY LIST MODAL — slide-over panel for drilldown from any stat ── */
const PropListModal = ({data, onClose}) => {
  if (!data) return null;
  const [search, setSearch] = useState("");
  const shown = search
    ? data.parcels.filter(p=>[p.address,p.owner1,p.parcelId,p.zip,p.propClassDesc].some(x=>(x||"").toLowerCase().includes(search.toLowerCase())))
    : data.parcels;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",backdropFilter:"blur(4px)",zIndex:800,display:"flex",justifyContent:"flex-end"}} onClick={onClose}>
      <div className="fi" onClick={e=>e.stopPropagation()} style={{
        background:"var(--bg2)",borderLeft:"1px solid var(--border2)",
        width:540,maxWidth:"95vw",height:"100vh",display:"flex",flexDirection:"column",
        boxShadow:"-24px 0 70px rgba(0,0,0,.6)"
      }}>
        {/* Header */}
        <div style={{padding:"18px 22px",borderBottom:"1px solid var(--border)",background:"var(--bg3)",position:"sticky",top:0,zIndex:1,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:16}}>{data.title}</div>
              <div style={{fontSize:12,color:"var(--gray2)",marginTop:2}}>{shown.length.toLocaleString()} of {data.parcels.length.toLocaleString()} propert{data.parcels.length===1?"y":"ies"}</div>
            </div>
            <button onClick={onClose} style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:7,color:"var(--gray)",width:30,height:30,cursor:"pointer",fontSize:14,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>
          <input
            placeholder="Filter this list…"
            value={search} onChange={e=>setSearch(e.target.value)}
            style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border2)",color:"var(--white)",borderRadius:8,padding:"7px 11px",fontSize:12,fontFamily:"var(--fb)"}}
          />
        </div>
        {/* Property list */}
        <div style={{overflowY:"auto",flex:1,padding:"10px 14px"}}>
          {shown.length===0&&<div style={{textAlign:"center",padding:40,color:"var(--gray2)"}}>No matching properties.</div>}
          {shown.map(p=>(
            <div key={p.parcelId} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:10,padding:"11px 14px",marginBottom:7}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.address||"(no address)"}</div>
                  <div style={{fontFamily:"var(--fm)",fontSize:10,color:"var(--gray)",marginTop:1}}>{p.parcelId} · {p.zip}</div>
                  <div style={{fontSize:11,color:"var(--gray2)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.owner1}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:5}}>
                    <Badge color="#6366f1" small>{p.propClass} {p.propClassDesc}</Badge>
                    {p.parcelType==="HOMESTEAD"&&<Badge color="#0d9488" small>Homestead</Badge>}
                    {p.exemptions?.length>0&&<Badge color="#f59e0b" small>{p.exemptions.length} Exempt</Badge>}
                    {isAbsentee(p)&&<Badge color="#f97316" small>Absentee</Badge>}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontFamily:"var(--fm)",fontSize:14,fontWeight:600,color:"var(--amber)"}}>{$f(p.fullMarketValue)}</div>
                  <div style={{fontSize:10,color:"var(--gray)",marginTop:1}}>FMV</div>
                  <div style={{fontSize:11,color:FC[eqFlag(p)],marginTop:2,fontFamily:"var(--fm)",fontWeight:600}}>{eqR(p)}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── DEBOUNCE HOOK — delays useMemo recomputation until typing stops ── */
function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

/* ════════════════════════════════════════
   TAB PANELS
════════════════════════════════════════ */

/* ── 1. BROWSE ── */
const Browse = ({parcels,meta={},compareList,onCompare,myHome,onSaveHome,onOpenHomeSetup}) => {
  const [search,setSearch]=useState("");
  const [fZip,setFZip]=useState(""); const [fCls,setFCls]=useState(""); const [fTyp,setFTyp]=useState("");
  const [fEx,setFEx]=useState(""); const [fEq,setFEq]=useState(""); const [fNbr,setFNbr]=useState("");
  const [sort,setSort]=useState("fmv-desc");
  const [sel,setSel]=useState(null);
  const [view,setView]=useState("grid");
  const [page,setPage]=useState(0);
  const [ownerSearch,setOwnerSearch]=useState("");
  const PAGE_SIZE=25;
  // Debounce text search so filter only runs 300ms after typing stops
  const dSearch=useDebounce(search,300);
  const dOwner=useDebounce(ownerSearch,300);
  // Use pre-computed metadata from JSON when available (skips expensive iteration)
  const zips=useMemo(()=>meta.zips||[...new Set(parcels.map(p=>p.zip))].sort(),[meta,parcels]);
  const clss=useMemo(()=>meta.classes?meta.classes.map(c=>c.code):[...new Set(parcels.map(p=>p.propClass))].sort(),[meta,parcels]);
  const clssDescs=useMemo(()=>meta.classes?Object.fromEntries(meta.classes.map(c=>[c.code,c.desc])):null,[meta]);
  // Use Set loop instead of flatMap to avoid 80K+ intermediate array; skip if metadata available
  const exs=useMemo(()=>{if(meta.exemptionNames)return meta.exemptionNames;const s=new Set();for(const p of parcels)for(const e of p.exemptions)s.add(e.name);return[...s].sort();},[meta,parcels]);
  const nbrs=useMemo(()=>[...new Set(parcels.map(p=>p.neighborhood).filter(Boolean))].sort(),[parcels]);
  const SI={background:"var(--bg3)",border:"1px solid var(--border)",color:"var(--white)",borderRadius:8,padding:"7px 11px",fontSize:12,fontFamily:"var(--fb)",cursor:"pointer"};

  // Auto-fill search from My Home
  const useMyHome = () => { if(myHome) setSearch(myHome.address.split(" ").slice(0,2).join(" ")); };
  const filtered=useMemo(()=>{
    let r=[...parcels];
    const q=dSearch.toLowerCase();
    const oq=dOwner.toLowerCase();
    if(q)r=r.filter(p=>[p.address,p.parcelId,p.propClassDesc,p.neighborhood||""].some(x=>x.toLowerCase().includes(q)));
    if(oq)r=r.filter(p=>[p.owner1||"",p.owner2||""].some(x=>x.toLowerCase().includes(oq)));
    if(fZip)r=r.filter(p=>p.zip===fZip);
    if(fCls)r=r.filter(p=>p.propClass===fCls);
    if(fTyp)r=r.filter(p=>p.parcelType===fTyp);
    if(fEx)r=r.filter(p=>p.exemptions.some(e=>e.name===fEx));
    if(fNbr)r=r.filter(p=>p.neighborhood===fNbr);
    if(fEq==="under")r=r.filter(p=>{const v=parseFloat(eqR(p));return!isNaN(v)&&v<80;});
    if(fEq==="fair")r=r.filter(p=>{const v=parseFloat(eqR(p));return!isNaN(v)&&v>=80&&v<=120;});
    if(fEq==="over")r=r.filter(p=>{const v=parseFloat(eqR(p));return!isNaN(v)&&v>120;});
    if(fEq==="absentee")r=r.filter(p=>isAbsentee(p));
    r.sort((a,b)=>{
      if(sort==="fmv-desc")return b.fullMarketValue-a.fullMarketValue;
      if(sort==="fmv-asc")return a.fullMarketValue-b.fullMarketValue;
      if(sort==="address")return a.address.localeCompare(b.address);
      if(sort==="assessed")return b.assessedValue-a.assessedValue;
      if(sort==="equity")return(parseFloat(eqR(a))||0)-(parseFloat(eqR(b))||0);
      if(sort==="land")return b.landValue-a.landValue;
      return 0;
    });
    return r;
  },[parcels,dSearch,dOwner,fZip,fCls,fTyp,fEx,fEq,fNbr,sort]);
  // Reset to page 1 whenever debounced filters or sort change
  useEffect(()=>{setPage(0);},[dSearch,dOwner,fZip,fCls,fTyp,fEx,fEq,fNbr,sort]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const pageSlice=filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  const clearAll=()=>{setSearch("");setOwnerSearch("");setFZip("");setFCls("");setFTyp("");setFEx("");setFEq("");setFNbr("");};
  const hasFilters=search||ownerSearch||fZip||fCls||fTyp||fEx||fEq||fNbr;
  return (
    <div style={{display:"grid",gridTemplateColumns:sel?"1fr 360px":"1fr",gap:18}}>
      <div>
        {!myHome&&<div style={{background:"linear-gradient(135deg,rgba(37,99,235,.12) 0%,rgba(13,148,136,.08) 100%)",border:"1px solid rgba(37,99,235,.3)",borderRadius:12,padding:"18px 20px",marginBottom:16,display:"flex",gap:16,alignItems:"flex-start"}}>
          <span style={{fontSize:28,flexShrink:0}}>👋</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:15,marginBottom:6}}>Welcome to Albany Property Intelligence</div>
            <div style={{fontSize:12,color:"var(--gray2)",lineHeight:1.8,marginBottom:10}}>This dashboard lets you explore every property in Albany's 2025 Final Assessment Roll — search by address, compare neighborhoods, check if you're overpaying taxes, and understand what every number on your tax bill actually means. <b style={{color:"var(--white)"}}>No property tax experience required.</b> Each tab has plain-English explanations built in.</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={onOpenHomeSetup} style={{background:"var(--green)",color:"white",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>🏡 Save My Home Address</button>
              <span style={{fontSize:12,color:"var(--gray2)",alignSelf:"center"}}>← Saves your address so you never have to type it again across any tab</span>
            </div>
          </div>
        </div>}
        <InfoBox icon="🏠" title="How to Use the Property Browser" color="#3b82f6">
          Search and filter all parcels in the Albany 2025 Assessment Roll. Use the search box to find a property by street address, owner name, or parcel ID. Apply additional filters to narrow by ZIP code, neighborhood, property class (single-family, commercial, etc.), homestead status, active exemptions, and assessment equity. Click any card to open a full detail panel on the right. Use the <b style={{color:"var(--white)"}}>+ Compare</b> button to queue up to 4 parcels for side-by-side analysis in the Compare tab.
        </InfoBox>
        {myHome&&<MyHomeBanner myHome={myHome} onUse={useMyHome} label="Jump to My Home"/>}
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
          <input placeholder="🔍  Address, parcel ID, neighborhood…" value={search} onChange={e=>setSearch(e.target.value)} style={{...SI,flex:"1 1 200px",minWidth:180}}/>
          <input placeholder="👤  Owner name (last, first or company)…" value={ownerSearch} onChange={e=>setOwnerSearch(e.target.value)} style={{...SI,flex:"1 1 200px",minWidth:200,borderColor:ownerSearch?"rgba(59,130,246,.6)":"var(--border)",background:ownerSearch?"rgba(37,99,235,.12)":"var(--bg3)"}}/>
          <select value={fNbr} onChange={e=>setFNbr(e.target.value)} style={SI}><option value="">All Neighborhoods</option>{nbrs.map(n=><option key={n}>{n}</option>)}</select>
          <select value={fZip} onChange={e=>setFZip(e.target.value)} style={SI}><option value="">All ZIPs</option>{zips.map(z=><option key={z}>{z}</option>)}</select>
          <select value={fCls} onChange={e=>setFCls(e.target.value)} style={SI}><option value="">All Classes</option>{clss.map(c=><option key={c} value={c}>{c}</option>)}</select>
          <select value={fTyp} onChange={e=>setFTyp(e.target.value)} style={SI}><option value="">All Types</option><option value="HOMESTEAD">Homestead</option><option value="NON-HOMESTEAD">Non-Homestead</option></select>
          {exs.length>0&&<select value={fEx} onChange={e=>setFEx(e.target.value)} style={SI}><option value="">All Exemptions</option>{exs.map(e=><option key={e}>{e}</option>)}</select>}
          <select value={fEq} onChange={e=>setFEq(e.target.value)} style={SI}><option value="">All Equity</option><option value="under">Under-Assessed</option><option value="fair">Fair Value</option><option value="over">Over-Assessed</option><option value="absentee">Absentee Owner</option></select>
          <select value={sort} onChange={e=>setSort(e.target.value)} style={SI}><option value="fmv-desc">FMV ↓</option><option value="fmv-asc">FMV ↑</option><option value="assessed">Assessed ↓</option><option value="address">Address A→Z</option><option value="equity">Equity %</option><option value="land">Land Value ↓</option></select>
          {hasFilters&&<button onClick={clearAll} style={{...SI,color:"#f87171",borderColor:"rgba(220,38,38,.3)",cursor:"pointer"}}>✕ Clear</button>}
          <div style={{display:"flex",gap:3,marginLeft:"auto"}}>
            {["grid","table"].map(m=><button key={m} onClick={()=>setView(m)} style={{background:view===m?"var(--blue)":"var(--card2)",border:"1px solid var(--border)",color:view===m?"white":"var(--gray)",borderRadius:7,width:32,height:32,cursor:"pointer",fontSize:13}}>{m==="grid"?"⊞":"≡"}</button>)}
          </div>
        </div>
        <div style={{fontSize:11,color:"var(--gray2)",marginBottom:10,display:"flex",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <span>Showing <b style={{color:"var(--white)"}}>{filtered.length.toLocaleString()}</b> of {parcels.length.toLocaleString()} parcels</span>
          {pageCount>1&&<span style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}>
            <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{background:"var(--card2)",border:"1px solid var(--border)",color:page===0?"var(--gray3)":"var(--white)",borderRadius:6,width:28,height:28,cursor:page===0?"default":"pointer",fontSize:15,lineHeight:1}}>‹</button>
            <span style={{fontFamily:"var(--fm)",fontSize:11}}>Page {page+1} / {pageCount}</span>
            <button onClick={()=>setPage(p=>Math.min(pageCount-1,p+1))} disabled={page===pageCount-1} style={{background:"var(--card2)",border:"1px solid var(--border)",color:page===pageCount-1?"var(--gray3)":"var(--white)",borderRadius:6,width:28,height:28,cursor:page===pageCount-1?"default":"pointer",fontSize:15,lineHeight:1}}>›</button>
          </span>}
        </div>
        {view==="grid"?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:10}}>
          {pageSlice.map(p=><ParcelMini key={p.parcelId} p={p} onClick={setSel} selected={sel?.parcelId===p.parcelId} onCompare={onCompare} inCompare={compareList.some(x=>x.parcelId===p.parcelId)}/>)}
          {filtered.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:60,color:"var(--gray2)"}}>No parcels match your filters.</div>}
        </div>:<div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"var(--bg2)",borderBottom:"2px solid var(--border)"}}>
              {["Parcel ID","Address","Neighborhood","ZIP","Owner","Class","FMV","Assessed","Equity %","Type","Exempt"].map(h=><th key={h} style={{padding:"9px 11px",textAlign:"left",color:"var(--gray2)",fontSize:10,textTransform:"uppercase",letterSpacing:.5,whiteSpace:"nowrap"}}>{h}</th>)}
            </tr></thead>
            <tbody>{pageSlice.map((p,i)=><tr key={p.parcelId} onClick={()=>setSel(p)} style={{background:i%2?"transparent":"var(--card)",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="var(--card2)"} onMouseLeave={e=>e.currentTarget.style.background=i%2?"transparent":"var(--card)"}>
              <td style={{padding:"7px 11px",fontFamily:"var(--fm)",color:"var(--gray)",fontSize:10}}>{p.parcelId}</td>
              <td style={{padding:"7px 11px",fontWeight:500}}>{p.address}</td>
              <td style={{padding:"7px 11px",color:"var(--gray2)"}}>{p.neighborhood}</td>
              <td style={{padding:"7px 11px",fontFamily:"var(--fm)",fontSize:11}}>{p.zip}</td>
              <td style={{padding:"7px 11px",color:"var(--gray2)"}}>{p.owner1}</td>
              <td style={{padding:"7px 11px"}}><Badge color="#6366f1" small>{p.propClass}</Badge></td>
              <td style={{padding:"7px 11px",fontFamily:"var(--fm)",color:"var(--amber)"}}>{$f(p.fullMarketValue)}</td>
              <td style={{padding:"7px 11px",fontFamily:"var(--fm)"}}>{$f(p.assessedValue)}</td>
              <td style={{padding:"7px 11px"}}><span style={{color:FC[eqFlag(p)],fontFamily:"var(--fm)",fontWeight:600}}>{eqR(p)}%</span></td>
              <td style={{padding:"7px 11px"}}>{p.parcelType==="HOMESTEAD"?<Badge color="#0d9488" small>H</Badge>:<Badge color="#64748b" small>NH</Badge>}</td>
              <td style={{padding:"7px 11px"}}>{p.exemptions.map(e=><Badge key={e.code} color="#f59e0b" small>{e.name}</Badge>)}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </div>
      {sel&&<div style={{position:"sticky",top:20,maxHeight:"90vh",overflowY:"auto"}}><DetailPanel p={sel} onClose={()=>setSel(null)} myHome={myHome} onSaveHome={onSaveHome}/></div>}
    </div>
  );
};

/* ── 2. ANALYTICS ── */
const Analytics = ({parcels}) => {
  const fmvBkts=useMemo(()=>{
    const b={"<100k":0,"100–200k":0,"200–300k":0,"300–400k":0,"400–500k":0,"500–750k":0,"750k+":0};
    parcels.forEach(p=>{const v=p.fullMarketValue;if(v<100000)b["<100k"]++;else if(v<200000)b["100–200k"]++;else if(v<300000)b["200–300k"]++;else if(v<400000)b["300–400k"]++;else if(v<500000)b["400–500k"]++;else if(v<750000)b["500–750k"]++;else b["750k+"]++;});
    return Object.entries(b).map(([range,count])=>({range,count}));
  },[parcels]);
  const eqBkts=useMemo(()=>{
    const b={"<60%":0,"60–80%":0,"80–100%":0,"100–120%":0,">120%":0};
    parcels.forEach(p=>{const r=p.fullMarketValue>0?(p.assessedValue/p.fullMarketValue)*100:null;if(!r)return;if(r<60)b["<60%"]++;else if(r<80)b["60–80%"]++;else if(r<100)b["80–100%"]++;else if(r<120)b["100–120%"]++;else b[">120%"]++;});
    return Object.entries(b).map(([range,count])=>({range,count}));
  },[parcels]);
  const clsDist=useMemo(()=>{const m={};parcels.forEach(p=>{m[p.propClassDesc]=(m[p.propClassDesc]||0)+1;});return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);},[parcels]);
  const avgByZip=useMemo(()=>{const m={};parcels.forEach(p=>{if(!m[p.zip])m[p.zip]={t:0,c:0};m[p.zip].t+=p.fullMarketValue;m[p.zip].c++;});return Object.entries(m).map(([zip,v])=>({zip,avg:Math.round(v.t/v.c)})).sort((a,b)=>b.avg-a.avg);},[parcels]);
  const exTypes=useMemo(()=>{const m={};parcels.forEach(p=>p.exemptions.forEach(e=>{m[e.name]=(m[e.name]||0)+1;}));return Object.entries(m).map(([name,count])=>({name,count}));},[parcels]);
  const deedYears=useMemo(()=>{const m={};parcels.forEach(p=>{if(p.deedYear)m[p.deedYear]=(m[p.deedYear]||0)+1;});return Object.entries(m).sort((a,b)=>a[0]-b[0]).map(([year,count])=>({year,count}));},[parcels]);

  const C=({title,desc,children})=>(
    <Card>
      <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:desc?6:14}}>{title}</div>
      {desc&&<div style={{fontSize:11,color:"var(--gray2)",marginBottom:12,lineHeight:1.7}}>{desc}</div>}
      {children}
    </Card>
  );

  return (
    <div className="fi">
      <InfoBox icon="📊" title="Understanding These Charts" color="#3b82f6">
        This tab gives you a bird's-eye view of Albany's entire property landscape. Each chart is built directly from the assessment roll data — no estimates or projections. Together they reveal how property values are distributed across the city, whether the assessment roll is fair, what types of properties dominate each area, and how active the real estate market has been over time. Hover over any bar or dot for exact numbers.
      </InfoBox>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <C title="Full Market Value Distribution"
           desc="How many properties fall into each price range. A city with healthy housing diversity shows spread across multiple buckets. Heavy concentration in one range can signal affordability pressure or lack of housing variety.">
          <ResponsiveContainer width="100%" height={200}><BarChart data={fmvBkts}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/><XAxis dataKey="range" tick={{fontSize:10,fill:"#94a3b8"}}/><YAxis tick={{fontSize:10,fill:"#94a3b8"}} allowDecimals={false}/><Tooltip {...TT}/><Bar dataKey="count" fill="#3b82f6" radius={[4,4,0,0]} name="Parcels"/></BarChart></ResponsiveContainer>
        </C>

        <C title="Assessment Equity Ratio Distribution"
           desc="The equity ratio = Assessed Value ÷ Full Market Value × 100. A fair assessment sits between 80–120%. Bars to the left mean properties are under-assessed (paying less than their fair share). Bars to the right mean over-assessed (a candidate for a tax grievance). A perfectly fair city would show all bars in the 80–120% range.">
          <ResponsiveContainer width="100%" height={200}><BarChart data={eqBkts}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/><XAxis dataKey="range" tick={{fontSize:10,fill:"#94a3b8"}}/><YAxis tick={{fontSize:10,fill:"#94a3b8"}} allowDecimals={false}/><Tooltip {...TT}/><Bar dataKey="count" fill="#f59e0b" radius={[4,4,0,0]} name="Parcels"/></BarChart></ResponsiveContainer>
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
            <span style={{fontSize:10,color:"var(--amber)"}}>● Under 80% = Under-assessed</span>
            <span style={{fontSize:10,color:"var(--green2)"}}>● 80–120% = Fair range</span>
            <span style={{fontSize:10,color:"var(--red2)"}}>● Over 120% = Over-assessed</span>
          </div>
        </C>

        <C title="Property Class Distribution"
           desc="Property classes are NY State codes that describe what a parcel is used for — 210 is a single-family home, 411 is apartments, 400 is commercial, 300 is vacant land, etc. This pie shows the makeup of Albany's tax base. A city heavily weighted toward residential (210s) has a different fiscal profile than one with significant commercial or multi-family stock.">
          <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={clsDist} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({name,percent})=>`${name.split(" ")[0]} ${(percent*100).toFixed(0)}%`} fontSize={10}>{clsDist.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip {...TT}/></PieChart></ResponsiveContainer>
        </C>

        <C title="Average Market Value by ZIP Code"
           desc="Which ZIP codes have the highest and lowest average property values? This directly reflects neighborhood wealth and housing market strength. A large gap between ZIPs can signal uneven investment in city services, schools, and infrastructure across neighborhoods.">
          <ResponsiveContainer width="100%" height={220}><BarChart data={avgByZip} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/><XAxis type="number" tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} tick={{fontSize:10,fill:"#94a3b8"}}/><YAxis type="category" dataKey="zip" tick={{fontSize:11,fill:"#94a3b8"}} width={55}/><Tooltip {...TT} formatter={v=>[$f(v),"Avg FMV"]}/><Bar dataKey="avg" fill="#0d9488" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer>
        </C>

        {exTypes.length>0&&<C title="Tax Exemption Types — How Many Parcels Claim Each"
           desc="Exemptions reduce the taxable value of a property, lowering the owner's tax bill. STAR (School Tax Assessment Relief) is the most common — it reduces the school portion of your tax. Senior, veteran, and disability exemptions also appear here. A low count on STAR or senior exemptions in a neighborhood may indicate eligible owners who haven't applied.">
          <ResponsiveContainer width="100%" height={200}><BarChart data={exTypes}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/><XAxis dataKey="name" tick={{fontSize:10,fill:"#94a3b8"}}/><YAxis tick={{fontSize:10,fill:"#94a3b8"}} allowDecimals={false}/><Tooltip {...TT}/><Bar dataKey="count" fill="#a78bfa" radius={[4,4,0,0]} name="Parcels"/></BarChart></ResponsiveContainer>
        </C>}

        {deedYears.length>0&&<C title="Sales Activity by Year (from Deed Records)"
           desc="Each parcel's deed book reference contains the year of its last recorded sale. This line shows how many properties changed hands in each year — a rough proxy for market activity. A spike indicates a hot market year. A long flat period with no sales may point to a neighborhood where turnover is low and long-term owners dominate. Note: this is derived from the deed book number, not actual MLS data.">
          <ResponsiveContainer width="100%" height={200}><LineChart data={deedYears}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/><XAxis dataKey="year" tick={{fontSize:10,fill:"#94a3b8"}}/><YAxis tick={{fontSize:10,fill:"#94a3b8"}} allowDecimals={false}/><Tooltip {...TT}/><Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} dot={{fill:"#22c55e",r:4}} name="Sales"/></LineChart></ResponsiveContainer>
        </C>}

        <C title="Assessed Value vs. Full Market Value"
           desc="Each dot is one parcel. The X-axis is its Full Market Value (what the assessor thinks it's worth). The Y-axis is its Assessed Value (what taxes are calculated on). In a perfectly fair assessment roll, every dot would fall along a straight diagonal line from bottom-left to top-right. Dots below the diagonal = under-assessed. Dots above = over-assessed. Clusters far from the line reveal systemic assessment inequities.">
          <ResponsiveContainer width="100%" height={220}><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/><XAxis type="number" dataKey="fmv" name="FMV" tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} tick={{fontSize:10,fill:"#94a3b8"}}/><YAxis type="number" dataKey="assessed" name="Assessed" tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} tick={{fontSize:10,fill:"#94a3b8"}}/><Tooltip {...TT} formatter={(v,n)=>[$f(v),n]}/><Scatter data={parcels.map(p=>({fmv:p.fullMarketValue,assessed:p.assessedValue,name:p.address}))} fill="#3b82f6" opacity={.75}/></ScatterChart></ResponsiveContainer>
        </C>

        <C title="Average Land vs. Building Value by Property Class"
           desc="For each property class, this stacked bar shows how much of the average assessed value is in the land itself (amber) versus the building sitting on it (blue). Commercial parcels often have a higher land share because the location is the asset. Residential properties typically carry more building value. A parcel with almost all land value and almost no building value is a signal of an underutilized or vacant lot.">
          <ResponsiveContainer width="100%" height={220}><BarChart data={[...new Set(parcels.map(p=>p.propClassDesc))].map(cls=>{const ps=parcels.filter(p=>p.propClassDesc===cls);const avgLand=Math.round(ps.reduce((s,p)=>s+p.landValue,0)/ps.length);const avgBldg=Math.round(ps.reduce((s,p)=>s+(p.assessedValue-p.landValue),0)/ps.length);return{cls,avgLand,avgBldg};}).slice(0,6)}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/><XAxis dataKey="cls" tick={{fontSize:9,fill:"#94a3b8"}}/><YAxis tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} tick={{fontSize:10,fill:"#94a3b8"}}/><Tooltip {...TT} formatter={v=>[$f(v)]}/><Legend wrapperStyle={{fontSize:11}}/><Bar dataKey="avgLand" name="Avg Land" fill="#f59e0b" stackId="a"/><Bar dataKey="avgBldg" name="Avg Building" fill="#3b82f6" stackId="a" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
        </C>

        {(()=>{const ybData=(()=>{const b={"Pre-1900":0,"1900s":0,"1920s":0,"1940s":0,"1960s":0,"1980s":0,"2000s+":0};parcels.forEach(p=>{if(!p.yearBuilt)return;const y=p.yearBuilt;if(y<1900)b["Pre-1900"]++;else if(y<1920)b["1900s"]++;else if(y<1940)b["1920s"]++;else if(y<1960)b["1940s"]++;else if(y<1980)b["1960s"]++;else if(y<2000)b["1980s"]++;else b["2000s+"]++;});return Object.entries(b).filter(([,v])=>v>0).map(([decade,count])=>({decade,count}));})();return ybData.length>1?<C title="Building Age by Decade" desc="How old is Albany's housing stock? Available when the Albany County CSV (which includes YEARBLT) is uploaded. Pre-1900 row houses dominate Center Square and Arbor Hill. Newer stock appears in the suburbs and redevelopment sites."><ResponsiveContainer width="100%" height={200}><BarChart data={ybData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/><XAxis dataKey="decade" tick={{fontSize:10,fill:"#94a3b8"}}/><YAxis tick={{fontSize:10,fill:"#94a3b8"}} allowDecimals={false}/><Tooltip {...TT}/><Bar dataKey="count" fill="#0d9488" radius={[4,4,0,0]} name="Properties"/></BarChart></ResponsiveContainer></C>:null;})()}
      </div>
    </div>
  );
};

/* ── 3. OWNERSHIP INTELLIGENCE ── */
const Ownership = ({parcels, onDrill}) => {
  const [view,setView]=useState("portfolio");
  const [selOwner,setSelOwner]=useState(null);
  const [showAllAbs,setShowAllAbs]=useState(false);
  const [showAllDupes,setShowAllDupes]=useState(false);
  const LIST_LIMIT=50;

  // Portfolio: group by owner name
  const portfolio=useMemo(()=>{
    const m={};
    parcels.forEach(p=>{
      const key=p.owner1.trim().toLowerCase();
      if(!m[key])m[key]={name:p.owner1,parcels:[],totalFMV:0,totalAssessed:0,totalLand:0,zips:new Set()};
      m[key].parcels.push(p);m[key].totalFMV+=p.fullMarketValue;m[key].totalAssessed+=p.assessedValue;m[key].totalLand+=p.landValue;m[key].zips.add(p.zip);
    });
    return Object.values(m).sort((a,b)=>b.totalFMV-a.totalFMV);
  },[parcels]);

  // Absentee owners
  const absentees=useMemo(()=>parcels.filter(p=>isAbsentee(p)),[parcels]);

  // Deed timeline
  const deedData=useMemo(()=>{
    const m={};
    parcels.forEach(p=>{if(p.deedYear){if(!m[p.deedYear])m[p.deedYear]={year:p.deedYear,count:0,totalFMV:0,parcels:[]};m[p.deedYear].count++;m[p.deedYear].totalFMV+=p.fullMarketValue;m[p.deedYear].parcels.push(p);}});
    return Object.values(m).sort((a,b)=>a.year-b.year);
  },[parcels]);

  // Duplicates: fuzzy owner name match
  const dupes=useMemo(()=>{
    const groups=[];
    const used=new Set();
    const names=parcels.map(p=>p.owner1.trim().toLowerCase());
    parcels.forEach((p,i)=>{
      if(used.has(i))return;
      const matches=parcels.filter((q,j)=>j!==i&&!used.has(j)&&levenSim(names[i],q.owner1.trim().toLowerCase())>0.75);
      if(matches.length>0){groups.push({base:p,similar:matches});matches.forEach(m=>used.add(parcels.indexOf(m)));used.add(i);}
    });
    return groups;
  },[parcels]);

  const BtnTab=({id,label})=><button onClick={()=>setView(id)} style={{background:view===id?"var(--blue)":"transparent",color:view===id?"white":"var(--gray)",border:"none",borderRadius:7,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer"}}>{label}</button>;

  return (
    <div className="fi">
      <SectionTitle>Ownership Intelligence</SectionTitle>
      <Sub>Portfolio mapper, absentee owner detection, deed book timeline, duplicate owner analysis</Sub>
      <InfoBox icon="👥" title="What Is This Tab For?" color="#3b82f6">
        This tab looks at WHO owns Albany properties — not just what the properties are worth. You can discover which individuals or companies own multiple parcels across the city, identify properties where the owner doesn't live on-site (absentee owners), trace the history of when properties changed hands, and flag cases where slightly different owner name spellings may represent the same person — a common data quality issue in public records.
      </InfoBox>
      <div style={{display:"flex",gap:4,background:"var(--card)",borderRadius:9,padding:4,border:"1px solid var(--border)",width:"fit-content",marginBottom:18}}>
        <BtnTab id="portfolio" label="📁 Portfolio Mapper"/>
        <BtnTab id="absentee" label="🏠 Absentee Owners"/>
        <BtnTab id="deed" label="📅 Deed Timeline"/>
        <BtnTab id="dupes" label="🔍 Duplicate Owners"/>
      </div>

      {view==="portfolio"&&<div>
        <InfoBox icon="📁" title="Portfolio Mapper — Who Owns the Most?" color="#3b82f6">
          This list ranks every owner in the dataset by their total property portfolio value. A person or company appearing once is typical. Finding the same owner across many parcels — especially LLCs or holding companies — can reveal large-scale landlords, institutional investors, or development interests in the city. Click any owner to expand and see every parcel they own.
        </InfoBox>
        <div style={{display:"grid",gap:10}}>
          {portfolio.slice(0,15).map((own,i)=>(
            <div key={own.name} onClick={()=>setSelOwner(selOwner===own.name?null:own.name)} style={{background:"var(--card2)",border:`1px solid ${selOwner===own.name?"var(--blue)":"var(--border)"}`,borderRadius:11,padding:"14px 18px",cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:36,height:36,borderRadius:8,background:`${COLORS[i%COLORS.length]}22`,border:`1px solid ${COLORS[i%COLORS.length]}44`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--fm)",fontSize:14,fontWeight:700,color:COLORS[i%COLORS.length],flexShrink:0}}>{i+1}</div>
                  <div>
                    <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:15}}>{own.name}</div>
                    <div style={{fontSize:11,color:"var(--gray2)",marginTop:2}}>{own.parcels.length} parcel{own.parcels.length>1?"s":""} · ZIPs: {[...own.zips].join(", ")}</div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"var(--fm)",fontSize:16,fontWeight:600,color:"var(--amber)"}}>{$f(own.totalFMV)}</div>
                  <div style={{fontSize:10,color:"var(--gray)",marginTop:2}}>total FMV</div>
                </div>
              </div>
              {selOwner===own.name&&<div style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--border)",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:8}}>
                {own.parcels.map(p=><div key={p.parcelId} style={{background:"var(--card)",borderRadius:8,padding:"10px 12px",border:"1px solid var(--border)"}}>
                  <div style={{fontWeight:600,fontSize:13}}>{p.address}</div>
                  <div style={{fontFamily:"var(--fm)",fontSize:10,color:"var(--gray)",marginTop:2}}>{p.parcelId} · {p.propClassDesc}</div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                    <span style={{fontSize:12,color:"var(--amber)"}}>{$f(p.fullMarketValue)}</span>
                    <Badge color={FC[eqFlag(p)]} small>{eqR(p)}%</Badge>
                  </div>
                </div>)}
                <div style={{background:"rgba(37,99,235,.08)",borderRadius:8,padding:"10px 12px",border:"1px solid rgba(37,99,235,.2)"}}>
                  <div style={{fontSize:11,color:"var(--gray2)"}}>Portfolio Summary</div>
                  <div style={{fontSize:12,marginTop:6}}>Land Total: <span style={{color:"var(--amber)",fontFamily:"var(--fm)"}}>{$f(own.totalLand)}</span></div>
                  <div style={{fontSize:12,marginTop:3}}>Assessed Total: <span style={{fontFamily:"var(--fm)"}}>{$f(own.totalAssessed)}</span></div>
                  <div style={{fontSize:12,marginTop:3}}>Market Total: <span style={{color:"var(--amber)",fontFamily:"var(--fm)"}}>{$f(own.totalFMV)}</span></div>
                </div>
              </div>}
            </div>
          ))}
        </div>
      </div>}

      {view==="absentee"&&<div>
        <InfoBox icon="📬" title="What Is an Absentee Owner?" color="#f97316">
          An absentee owner is someone whose tax bill mailing address is different from the property address. This is detected automatically by comparing the two fields on every parcel record. Absentee ownership is common for rental properties, investment properties, vacation homes, and corporate-owned units. It is not inherently illegal or problematic — but it is a useful signal. Neighborhoods with high absentee ownership rates often experience different maintenance, community investment, and tenant stability patterns than owner-occupied blocks.
        </InfoBox>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
          <StatCard label="Absentee-Owned Parcels" value={absentees.length} icon="🏠" color="#f97316" sub={`${Math.round(absentees.length/parcels.length*100)}% of all parcels`} onClick={()=>onDrill&&onDrill({title:`All Absentee-Owned Parcels (${absentees.length})`,parcels:absentees})}/>
          <StatCard label="Total Absentee FMV" value={"$"+(absentees.reduce((s,p)=>s+p.fullMarketValue,0)/1000000).toFixed(1)+"M"} icon="💰" color="#f59e0b"/>
        </div>
        <div style={{display:"grid",gap:10}}>
          {absentees.slice(0,showAllAbs?absentees.length:LIST_LIMIT).map(p=>(
            <div key={p.parcelId} style={{background:"var(--card2)",border:"1px solid rgba(249,115,22,.2)",borderRadius:11,padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:15}}>{p.address}</div>
                  <div style={{fontSize:11,color:"var(--gray2)",marginTop:2}}>{p.propClassDesc} · {p.zip}</div>
                  <div style={{marginTop:8}}>
                    <div style={{fontSize:11,color:"var(--gray)"}}>Property at: <span style={{color:"var(--white)"}}>{p.address}, Albany NY {p.zip}</span></div>
                    <div style={{fontSize:11,color:"#f97316",marginTop:3}}>Mail to: {p.mailAddress}</div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"var(--fm)",fontSize:15,fontWeight:600,color:"var(--amber)"}}>{$f(p.fullMarketValue)}</div>
                  <Badge color="#f97316" small>Absentee</Badge>
                </div>
              </div>
            </div>
          ))}
          {absentees.length===0&&<div style={{textAlign:"center",padding:40,color:"var(--gray2)"}}>No absentee owners detected in current dataset. Upload full roll to see results.</div>}
          {absentees.length>LIST_LIMIT&&<button onClick={()=>setShowAllAbs(x=>!x)} style={{background:"var(--card2)",border:"1px solid var(--border)",color:"var(--gray2)",borderRadius:8,padding:"10px",fontSize:12,cursor:"pointer",width:"100%"}}>{showAllAbs?`Show top ${LIST_LIMIT} ↑`:`Show all ${absentees.length.toLocaleString()} absentee owners ↓`}</button>}
        </div>
      </div>}

      {view==="deed"&&<div>
        <InfoBox icon="📅" title="Deed Book Timeline — Reading Property History" color="#22c55e">
          Every time a property is sold in New York, the transaction is recorded at the county clerk's office and assigned a deed book and page number. The year embedded in that reference tells us approximately when the last sale occurred. This timeline shows how many properties in the dataset changed hands each year — a rough but useful measure of neighborhood market activity. Years with many sales often correspond to broader economic events: low interest rate periods, urban renewal pushes, or post-COVID migration patterns.
        </InfoBox>
        <div style={{marginBottom:18}}><Card><div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:12}}>Sales Activity by Year (from Deed Book Data)</div><ResponsiveContainer width="100%" height={220}><BarChart data={deedData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/><XAxis dataKey="year" tick={{fontSize:11,fill:"#94a3b8"}}/><YAxis tick={{fontSize:11,fill:"#94a3b8"}} allowDecimals={false}/><Tooltip {...TT} formatter={(v,n)=>[v,"Sales"]}/><Bar dataKey="count" fill="#22c55e" radius={[4,4,0,0]} name="Transactions"/></BarChart></ResponsiveContainer></Card></div>
        <div style={{display:"grid",gap:8}}>
          {deedData.sort((a,b)=>b.year-a.year).map(yr=>(
            <div key={yr.year} style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontFamily:"var(--fm)",fontSize:18,fontWeight:700,color:"var(--teal2)"}}>{yr.year}</div>
                <div style={{display:"flex",gap:16}}>
                  <div style={{textAlign:"right"}}><div style={{fontFamily:"var(--fm)",fontSize:14,color:"var(--amber)"}}>{yr.count} sale{yr.count>1?"s":""}</div><div style={{fontSize:10,color:"var(--gray)"}}>transactions</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontFamily:"var(--fm)",fontSize:14}}>{$f(yr.totalFMV)}</div><div style={{fontSize:10,color:"var(--gray)"}}>total FMV</div></div>
                </div>
              </div>
              <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:6}}>
                {yr.parcels.slice(0,10).map(p=><Badge key={p.parcelId} color="#0d9488" small>{p.address}</Badge>)}
                {yr.parcels.length>10&&<Badge color="#475569" small>+{yr.parcels.length-10} more</Badge>}
              </div>
            </div>
          ))}
        </div>
      </div>}

      {view==="dupes"&&<div>
        <InfoBox icon="🔍" title="Duplicate Owner Detection — Why This Matters" color="#a78bfa">
          Public property records are entered by hand and are often inconsistent. The same person might appear as "Robert Smith", "Bob Smith", "R. Smith", and "Smith Robert" across different parcels — making it impossible to see their full portfolio at a glance. This tool uses fuzzy name matching (similarity scoring) to flag owner names that look like they might belong to the same person or entity. Always verify manually before drawing conclusions — similar names can also be coincidental.
        </InfoBox>
        {dupes.length>0?<div>
          {dupes.slice(0,showAllDupes?dupes.length:LIST_LIMIT).map((g,i)=>(
            <div key={i} style={{background:"var(--card2)",border:"1px solid rgba(220,38,38,.2)",borderRadius:11,padding:"14px 16px",marginBottom:10}}>
              <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}><Badge color="#dc2626">Possible Duplicate</Badge><span style={{fontSize:12,color:"var(--gray)"}}>Similar owner names detected</span></div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:8}}>
                {[g.base,...g.similar].map(p=><div key={p.parcelId} style={{background:"var(--card)",borderRadius:8,padding:"10px 12px",border:"1px solid var(--border)"}}>
                  <div style={{fontFamily:"var(--fd)",fontWeight:600,fontSize:13}}>{p.owner1}</div>
                  <div style={{fontSize:11,color:"var(--gray)",marginTop:3}}>{p.address}</div>
                  <div style={{fontFamily:"var(--fm)",fontSize:12,color:"var(--amber)",marginTop:4}}>{$f(p.fullMarketValue)}</div>
                </div>)}
              </div>
            </div>
          ))}
          {dupes.length>LIST_LIMIT&&<button onClick={()=>setShowAllDupes(x=>!x)} style={{background:"var(--card2)",border:"1px solid var(--border)",color:"var(--gray2)",borderRadius:8,padding:"10px",fontSize:12,cursor:"pointer",width:"100%"}}>{showAllDupes?`Show top ${LIST_LIMIT} ↑`:`Show all ${dupes.length.toLocaleString()} duplicate groups ↓`}</button>}
        </div>:<div style={{textAlign:"center",padding:40,color:"var(--gray2)"}}>
          <div style={{fontSize:32,marginBottom:10}}>✅</div>
          <div>No near-duplicate owner names detected in current dataset.</div>
          <div style={{fontSize:11,marginTop:8}}>Upload the full roll to run a complete fuzzy-match analysis across all owners.</div>
        </div>}
      </div>}
    </div>
  );
};

// Simple Levenshtein similarity (0-1)
function levenSim(a,b){
  if(!a||!b)return 0;
  if(a===b)return 1;
  const la=a.length,lb=b.length;
  const dp=Array.from({length:la+1},(_,i)=>Array.from({length:lb+1},(_,j)=>i===0?j:j===0?i:0));
  for(let i=1;i<=la;i++)for(let j=1;j<=lb;j++)dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return 1-dp[la][lb]/Math.max(la,lb);
}

/* ── 4. EQUITY & JUSTICE ── */
const Equity = ({parcels, onDrill}) => {
  const [view,setView]=useState("desert");

  // Exemption desert: homestead parcels with no exemptions, grouped by ZIP
  const desertByZip=useMemo(()=>{
    const m={};
    parcels.filter(p=>p.parcelType==="HOMESTEAD").forEach(p=>{
      if(!m[p.zip])m[p.zip]={zip:p.zip,total:0,noExempt:0,parcels:[]};
      m[p.zip].total++;
      if(p.exemptions.length===0){m[p.zip].noExempt++;m[p.zip].parcels.push(p);}
    });
    return Object.values(m).map(x=>({...x,pct:Math.round(x.noExempt/x.total*100)})).sort((a,b)=>b.pct-a.pct);
  },[parcels]);

  // Assessment burden: effective rate = assessed / FMV ratio
  const burdenByZip=useMemo(()=>{
    const m={};
    parcels.filter(p=>p.fullMarketValue>0).forEach(p=>{
      if(!m[p.zip])m[p.zip]={zip:p.zip,ratios:[],totalFMV:0,totalAssessed:0};
      m[p.zip].ratios.push(p.assessedValue/p.fullMarketValue*100);
      m[p.zip].totalFMV+=p.fullMarketValue;m[p.zip].totalAssessed+=p.assessedValue;
    });
    return Object.values(m).map(x=>({zip:x.zip,avgRatio:(x.ratios.reduce((a,b)=>a+b,0)/x.ratios.length).toFixed(1),count:x.ratios.length})).sort((a,b)=>parseFloat(b.avgRatio)-parseFloat(a.avgRatio));
  },[parcels]);

  // Revenue impact of exemptions
  const revenueImpact=useMemo(()=>{
    const m={};
    parcels.forEach(p=>p.exemptions.forEach(e=>{
      if(!m[e.name])m[e.name]={name:e.name,count:0,totalCounty:0,totalCity:0,totalSchool:0};
      m[e.name].count++;m[e.name].totalCounty+=e.countyAmt;m[e.name].totalCity+=e.cityAmt;m[e.name].totalSchool+=e.schoolAmt;
    }));
    return Object.values(m).sort((a,b)=>(b.totalCounty+b.totalCity+b.totalSchool)-(a.totalCounty+a.totalCity+a.totalSchool));
  },[parcels]);

  const BtnTab=({id,label})=><button onClick={()=>setView(id)} style={{background:view===id?"var(--blue)":"transparent",color:view===id?"white":"var(--gray)",border:"none",borderRadius:7,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer"}}>{label}</button>;

  return (
    <div className="fi">
      <SectionTitle>Equity & Justice Analysis</SectionTitle>
      <Sub>Exemption deserts, assessment burden by ZIP, exemption revenue impact on tax base</Sub>
      <InfoBox icon="⚖️" title="Why Does Property Tax Equity Matter?" color="#22c55e">
        Property taxes are the primary way Albany funds its schools, city services, and county government. When assessments are unequal — charging some neighborhoods more relative to their actual property values — it creates a hidden tax on those communities. This tab examines three equity dimensions: where homeowners are missing out on exemptions they likely qualify for, which ZIP codes carry a disproportionate share of the tax burden, and how much revenue the city foregoes through exemptions each year. None of this requires any prior knowledge of tax law — the explanations are built in.
      </InfoBox>
      <div style={{display:"flex",gap:4,background:"var(--card)",borderRadius:9,padding:4,border:"1px solid var(--border)",width:"fit-content",marginBottom:18}}>
        <BtnTab id="desert" label="🏜️ Exemption Deserts"/>
        <BtnTab id="burden" label="⚖️ Assessment Burden"/>
        <BtnTab id="revenue" label="💸 Revenue Impact"/>
      </div>

      {view==="desert"&&<div>
        <Card style={{marginBottom:16,background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.2)"}}>
          <div style={{fontSize:13,fontWeight:600,color:"var(--amber2)",marginBottom:6}}>What is an Exemption Desert?</div>
          <div style={{fontSize:12,color:"var(--gray2)",lineHeight:1.7}}>A zone where homestead property owners are not claiming exemptions they likely qualify for — such as STAR, senior, or veteran exemptions. Owners in lower-income neighborhoods often leave money on the table because they don't know to apply. The table below flags ZIPs with the highest share of homesteads with zero exemptions.</div>
        </Card>
        <div style={{display:"grid",gap:10}}>
          {desertByZip.map(z=>(
            <div key={z.zip} style={{background:"var(--card2)",border:`1px solid ${z.pct>60?"rgba(245,158,11,.3)":"var(--border)"}`,borderRadius:11,padding:"14px 18px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div>
                  <span style={{fontFamily:"var(--fm)",fontSize:18,fontWeight:700,color:"var(--white)"}}>{z.zip}</span>
                  <span style={{fontSize:12,color:"var(--gray)",marginLeft:12}}>{z.total} homestead parcel{z.total>1?"s":""} · {z.noExempt} with no exemptions</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontFamily:"var(--fm)",fontSize:20,fontWeight:700,color:z.pct>60?"var(--amber)":z.pct>30?"#f97316":"var(--green2)"}}>{z.pct}%</span>
                  {z.pct>60&&<Badge color="#f59e0b">⚠ High Desert Risk</Badge>}
                </div>
              </div>
              <div style={{height:6,background:"var(--bg)",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${z.pct}%`,background:z.pct>60?"var(--amber)":z.pct>30?"#f97316":"var(--green2)",borderRadius:3}}></div>
              </div>
              {z.pct>50&&<div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:5}}>
                {z.parcels.slice(0,3).map(p=><div key={p.parcelId} style={{background:"rgba(245,158,11,.08)",borderRadius:6,padding:"4px 8px",fontSize:11,color:"var(--amber2)"}}>{p.address} — {p.owner1}</div>)}
                {z.parcels.length>3&&onDrill&&<button onClick={e=>{e.stopPropagation();onDrill({title:`ZIP ${z.zip} — Homesteads Without Exemptions (${z.noExempt})`,parcels:z.parcels});}} style={{background:"rgba(245,158,11,.12)",border:"1px solid rgba(245,158,11,.3)",color:"var(--amber2)",borderRadius:7,padding:"5px 12px",fontSize:11,cursor:"pointer",fontWeight:600}}>View all {z.parcels.length} properties →</button>}
              </div>}
            </div>
          ))}
        </div>
      </div>}

      {view==="burden"&&<div>
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:12}}>Average Assessment Equity Ratio by ZIP</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={burdenByZip}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
              <XAxis dataKey="zip" tick={{fontSize:11,fill:"#94a3b8"}}/>
              <YAxis tick={{fontSize:10,fill:"#94a3b8"}} domain={[0,150]} tickFormatter={v=>v+"%"}/>
              <Tooltip {...TT} formatter={v=>[v+"%","Avg Equity Ratio"]}/>
              <Bar dataKey="avgRatio" radius={[4,4,0,0]}>
                {burdenByZip.map((entry,i)=><Cell key={i} fill={parseFloat(entry.avgRatio)>110?"#dc2626":parseFloat(entry.avgRatio)<90?"#f59e0b":"#22c55e"}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{fontSize:10,color:"var(--gray2)",marginTop:6}}>Red = over-assessed (paying too much tax relative to market). Amber = under-assessed. Green = fair range (90–110%).</div>
        </Card>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
          {burdenByZip.map(z=>{const r=parseFloat(z.avgRatio);const color=r>110?"var(--red2)":r<90?"var(--amber)":"var(--green2)";return(
            <Card key={z.zip}>
              <div style={{fontFamily:"var(--fm)",fontSize:22,fontWeight:700,color}}>{z.avgRatio}%</div>
              <div style={{fontSize:13,fontWeight:600,marginTop:2}}>ZIP {z.zip}</div>
              <div style={{fontSize:11,color:"var(--gray2)",marginTop:4}}>
                {r>110?"Over-assessed":r<90?"Under-assessed":"Fair value"}
              </div>
              {onDrill&&<button onClick={()=>onDrill({title:`ZIP ${z.zip} — All ${z.count} Parcels (Avg Ratio: ${z.avgRatio}%)`,parcels:parcels.filter(p=>p.zip===z.zip&&p.fullMarketValue>0)})} style={{background:"rgba(37,99,235,.1)",border:"1px solid rgba(37,99,235,.25)",color:"var(--blue3)",borderRadius:5,padding:"3px 9px",fontSize:11,cursor:"pointer",marginTop:6,fontWeight:600}}>View {z.count} parcels →</button>}
              <div style={{fontSize:10,color,marginTop:8,fontWeight:500}}>{r>110?"⚠ Owners here may have grounds for assessment grievance":r<90?"ℹ Land here carries lighter relative tax burden":"✓ Assessment aligned with market values"}</div>
            </Card>
          );})}
        </div>
      </div>}

      {view==="revenue"&&<div>
        <InfoBox icon="💸" title="What Is Revenue Impact — And Why Does It Matter to the City?" color="#22c55e">
          Every property tax exemption reduces the amount of assessed value that can be taxed — meaning the city, county, and school district collect less revenue. The numbers here show exactly how much taxable value has been removed from the base by each exemption type. This is not waste — exemptions like STAR and Senior Citizen exemptions are deliberate policy choices to reduce the burden on homeowners and veterans. But understanding the scale of these reductions helps explain why tax rates must remain high enough to fund services: fewer dollars in the taxable base means each remaining dollar is taxed more heavily.
        </InfoBox>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:18}}>
          <StatCard label="Total County Exemptions" value={"$"+(revenueImpact.reduce((s,e)=>s+e.totalCounty,0)/1000).toFixed(0)+"K"} icon="🏛️" color="#3b82f6" sub="Removed from county tax base"/>
          <StatCard label="Total City Exemptions" value={"$"+(revenueImpact.reduce((s,e)=>s+e.totalCity,0)/1000).toFixed(0)+"K"} icon="🏙️" color="#0d9488" sub="Removed from city tax base"/>
          <StatCard label="Total School Exemptions" value={"$"+(revenueImpact.reduce((s,e)=>s+e.totalSchool,0)/1000).toFixed(0)+"K"} icon="🎓" color="#a78bfa" sub="Removed from school tax base"/>
        </div>
        <Card>
          <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:14}}>Exemption Impact on Tax Base by Type</div>
          <div style={{display:"grid",gap:10}}>
            {revenueImpact.map((ex,i)=>(
              <div key={ex.name} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:9,padding:"12px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div>
                    <span style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:15,color:COLORS[i%COLORS.length]}}>{ex.name}</span>
                    <span style={{fontSize:11,color:"var(--gray)",marginLeft:10}}>{onDrill?<button onClick={()=>onDrill({title:`${ex.name} Exemption Holders`,parcels:parcels.filter(p=>p.exemptions.some(e=>e.name===ex.name))})} style={{background:"rgba(37,99,235,.12)",border:"1px solid rgba(37,99,235,.3)",color:"var(--blue3)",borderRadius:5,padding:"2px 8px",fontSize:11,cursor:"pointer",fontFamily:"var(--fm)",fontWeight:600}}>{ex.count} parcel{ex.count>1?"s":""}</button>:<span style={{fontSize:11,color:"var(--gray)",marginLeft:10}}>{ex.count} parcel{ex.count>1?"s":""}</span>}</span>
                  </div>
                  <div style={{fontFamily:"var(--fm)",fontSize:13,color:"var(--amber)"}}>{$f(ex.totalCounty+ex.totalCity+ex.totalSchool)} total</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[["County",ex.totalCounty,"#3b82f6"],["City",ex.totalCity,"#0d9488"],["School",ex.totalSchool,"#a78bfa"]].map(([jx,amt,color])=>(
                    <div key={jx} style={{background:`${color}11`,border:`1px solid ${color}22`,borderRadius:7,padding:"8px 10px",textAlign:"center"}}>
                      <div style={{fontFamily:"var(--fm)",fontSize:13,fontWeight:600,color}}>{$f(amt)}</div>
                      <div style={{fontSize:10,color:"var(--gray)",marginTop:2}}>{jx} base reduction</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>}
    </div>
  );
};

/* ── 5. OPPORTUNITY FINDER ── */
const Opportunity = ({parcels, onDrill}) => {
  const [view,setView]=useState("lots");
  const [showAllArb,setShowAllArb]=useState(false);
  const [showAllAnom,setShowAllAnom]=useState(false);
  const OPP_LIMIT=50;

  // Lot opportunity: high land value + small building relative to lot
  const lotOpps=useMemo(()=>parcels.filter(p=>p.frontage&&p.depth&&p.landValue>0).map(p=>({...p,sqft:p.frontage*p.depth,landPerSqFt:p.landValue/(p.frontage*p.depth),buildingRatio:(p.assessedValue-p.landValue)/p.assessedValue})).sort((a,b)=>a.buildingRatio-b.buildingRatio).filter(p=>p.sqft>2000),[parcels]);

  // Gentrification pressure: high land-to-total ratio
  const gentriParcels=useMemo(()=>[...parcels].map(p=>({...p,gIdx:parseFloat(gentriIdx(p))})).filter(p=>!isNaN(p.gIdx)&&p.assessedValue>0).sort((a,b)=>b.gIdx-a.gIdx),[parcels]);

  // Arbitrage: under-assessed homesteads (equity ratio < 85%)
  const arbitrage=useMemo(()=>[...parcels].filter(p=>p.fullMarketValue>0).map(p=>({...p,ratio:p.assessedValue/p.fullMarketValue*100,taxGap:p.fullMarketValue-p.assessedValue})).filter(p=>p.ratio<85&&p.taxGap>10000).sort((a,b)=>b.taxGap-a.taxGap),[parcels]);

  // Class anomalies: parcel class out of step with neighbors
  const anomalies=useMemo(()=>{
    const byStreet={};
    parcels.forEach(p=>{const st=p.address.replace(/^\d+\s*/,"");if(!byStreet[st])byStreet[st]=[];byStreet[st].push(p);});
    const results=[];
    Object.entries(byStreet).forEach(([st,ps])=>{
      if(ps.length<3)return;
      const classes=ps.map(p=>p.propClass);
      const mode=classes.sort((a,b)=>classes.filter(x=>x===a).length-classes.filter(x=>x===b).length).pop();
      ps.forEach(p=>{if(p.propClass!==mode)results.push({...p,expectedClass:mode,street:st});});
    });
    return results;
  },[parcels]);

  const BtnTab=({id,label})=><button onClick={()=>setView(id)} style={{background:view===id?"var(--teal)":"transparent",color:view===id?"white":"var(--gray)",border:"none",borderRadius:7,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer"}}>{label}</button>;

  return (
    <div className="fi">
      <SectionTitle>Opportunity Finder</SectionTitle>
      <Sub>Lot size opportunities, gentrification pressure index, arbitrage candidates, neighborhood anomalies</Sub>
      <InfoBox icon="🏗️" title="What Are We Looking For Here?" color="#0d9488">
        This tab is for anyone interested in development potential, investment signals, or neighborhood change patterns. It surfaces four different types of insights: underutilized lots where the land is worth more than what's built on it; signs of rising land prices that can precede displacement; properties whose assessments haven't kept up with their market value (a potential buyer advantage); and parcels whose use type doesn't match the surrounding street — which may reflect an error, a holdover use, or a coming change. No real estate experience needed — each section explains what the numbers mean in plain English.
      </InfoBox>
      <div style={{display:"flex",gap:4,background:"var(--card)",borderRadius:9,padding:4,border:"1px solid var(--border)",width:"fit-content",marginBottom:18,flexWrap:"wrap"}}>
        <BtnTab id="lots" label="📐 Lot Opportunities"/>
        <BtnTab id="gentrifi" label="📈 Gentrification Index"/>
        <BtnTab id="arb" label="💡 Arbitrage Finder"/>
        <BtnTab id="anomaly" label="🔬 Class Anomalies"/>
      </div>

      {view==="lots"&&<div>
        <Card style={{marginBottom:14,background:"rgba(13,148,136,.07)",border:"1px solid rgba(13,148,136,.2)"}}>
          <div style={{fontSize:12,color:"var(--teal2)",fontWeight:600,marginBottom:4}}>How to Read This</div>
          <div style={{fontSize:12,color:"var(--gray2)",lineHeight:1.7}}>Parcels are ranked by building-to-total ratio. A low ratio means most of the assessed value is in the land — the building may be small, aging, or underutilized relative to the lot size. These are potential infill development, demolition, or renovation opportunities.</div>
        </Card>
        <div style={{display:"grid",gap:10}}>
          {lotOpps.slice(0,15).map((p,i)=>(
            <div key={p.parcelId} style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:11,padding:"14px 18px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:15}}>{p.address}</div>
                  <div style={{fontSize:11,color:"var(--gray2)",marginTop:2}}>{p.propClassDesc} · {p.zip} · Lot: {p.frontage}×{p.depth} ft</div>
                  <div style={{display:"flex",gap:8,marginTop:8}}>
                    <div style={{background:"rgba(13,148,136,.12)",borderRadius:7,padding:"6px 10px",textAlign:"center"}}>
                      <div style={{fontFamily:"var(--fm)",fontSize:13,fontWeight:600,color:"var(--teal2)"}}>{nf(p.sqft)} sq ft</div>
                      <div style={{fontSize:10,color:"var(--gray)"}}>Lot Size</div>
                    </div>
                    <div style={{background:"rgba(245,158,11,.12)",borderRadius:7,padding:"6px 10px",textAlign:"center"}}>
                      <div style={{fontFamily:"var(--fm)",fontSize:13,fontWeight:600,color:"var(--amber)"}}>${p.landPerSqFt.toFixed(2)}/ft²</div>
                      <div style={{fontSize:10,color:"var(--gray)"}}>Land $/sqft</div>
                    </div>
                    <div style={{background:"rgba(37,99,235,.12)",borderRadius:7,padding:"6px 10px",textAlign:"center"}}>
                      <div style={{fontFamily:"var(--fm)",fontSize:13,fontWeight:600,color:"var(--blue2)"}}>{(p.buildingRatio*100).toFixed(0)}%</div>
                      <div style={{fontSize:10,color:"var(--gray)"}}>Bldg of Total</div>
                    </div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"var(--fm)",fontSize:15,fontWeight:600,color:"var(--amber)"}}>{$f(p.fullMarketValue)}</div>
                  <div style={{fontSize:10,color:"var(--gray)",marginTop:2}}>FMV</div>
                  {p.buildingRatio<0.3&&<Badge color="#0d9488" small>High Opportunity</Badge>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>}

      {view==="gentrifi"&&<div>
        <Card style={{marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:12}}>Gentrification Pressure Index by Parcel</div>
          <div style={{fontSize:11,color:"var(--gray2)",marginBottom:12}}>Land-to-total assessed value ratio. Rising land values outpacing building values = displacement pressure signal. Index above 50% = elevated risk.</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={gentriParcels.slice(0,12).map(p=>({address:p.address.split(" ").slice(0,2).join(" "),idx:p.gIdx}))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
              <XAxis dataKey="address" tick={{fontSize:9,fill:"#94a3b8"}}/>
              <YAxis tick={{fontSize:10,fill:"#94a3b8"}} tickFormatter={v=>v+"%"} domain={[0,100]}/>
              <Tooltip {...TT} formatter={v=>[v+"%","Gentrifi. Index"]}/>
              <Bar dataKey="idx" radius={[4,4,0,0]}>
                {gentriParcels.slice(0,12).map((p,i)=><Cell key={i} fill={p.gIdx>60?"#dc2626":p.gIdx>40?"#f59e0b":"#22c55e"}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
          {gentriParcels.slice(0,10).map(p=>{const color=p.gIdx>60?"var(--red2)":p.gIdx>40?"var(--amber)":"var(--green2)";return(
            <div key={p.parcelId} style={{background:"var(--card2)",border:`1px solid ${color}33`,borderRadius:11,padding:"14px 16px"}}>
              <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:14}}>{p.address}</div>
              <div style={{fontSize:11,color:"var(--gray2)",marginTop:2}}>{p.neighborhood} · {p.zip}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
                <div>
                  <div style={{fontSize:11,color:"var(--gray)"}}>Land: {$f(p.landValue)}</div>
                  <div style={{fontSize:11,color:"var(--gray)"}}>Total: {$f(p.assessedValue)}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"var(--fm)",fontSize:22,fontWeight:700,color}}>{p.gIdx}%</div>
                  <div style={{fontSize:10,color:"var(--gray)"}}>land-to-total</div>
                </div>
              </div>
              <div style={{height:4,background:"var(--bg)",borderRadius:2,marginTop:10,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${p.gIdx}%`,background:color,borderRadius:2}}></div>
              </div>
            </div>
          );})}
        </div>
      </div>}

      {view==="arb"&&<div>
        <Card style={{marginBottom:14,background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.2)"}}>
          <div style={{fontSize:12,color:"var(--green2)",fontWeight:600,marginBottom:4}}>Assessment Arbitrage — What This Means</div>
          <div style={{fontSize:12,color:"var(--gray2)",lineHeight:1.7}}>Parcels where assessed value is significantly below full market value. The owner effectively pays taxes on a smaller base than the property's true worth. These represent hidden value — for buyers, lower carrying costs; for policy makers, potential tax base leakage.</div>
        </Card>
        {arbitrage.length>0?<div style={{display:"grid",gap:10}}>
          {arbitrage.slice(0,showAllArb?arbitrage.length:OPP_LIMIT).map(p=>(
            <div key={p.parcelId} style={{background:"var(--card2)",border:"1px solid rgba(34,197,94,.2)",borderRadius:11,padding:"14px 18px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:15}}>{p.address}</div>
                  <div style={{fontSize:11,color:"var(--gray2)",marginTop:2}}>{p.propClassDesc} · {p.zip} · Owner: {p.owner1}</div>
                  <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                    <div style={{background:"rgba(34,197,94,.1)",borderRadius:7,padding:"6px 10px"}}>
                      <div style={{fontFamily:"var(--fm)",fontSize:13,fontWeight:600,color:"var(--green2)"}}>{$f(p.taxGap)}</div>
                      <div style={{fontSize:10,color:"var(--gray)"}}>Value gap (FMV − Assessed)</div>
                    </div>
                    <div style={{background:"rgba(245,158,11,.1)",borderRadius:7,padding:"6px 10px"}}>
                      <div style={{fontFamily:"var(--fm)",fontSize:13,fontWeight:600,color:"var(--amber)"}}>{p.ratio.toFixed(1)}%</div>
                      <div style={{fontSize:10,color:"var(--gray)"}}>Equity ratio (under 85%)</div>
                    </div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,color:"var(--gray)"}}>Assessed</div>
                  <div style={{fontFamily:"var(--fm)",fontSize:14}}>{$f(p.assessedValue)}</div>
                  <div style={{fontSize:11,color:"var(--gray)",marginTop:6}}>FMV</div>
                  <div style={{fontFamily:"var(--fm)",fontSize:14,color:"var(--amber)"}}>{$f(p.fullMarketValue)}</div>
                </div>
              </div>
            </div>
          ))}
          {arbitrage.length>OPP_LIMIT&&<button onClick={()=>setShowAllArb(x=>!x)} style={{background:"var(--card2)",border:"1px solid var(--border)",color:"var(--gray2)",borderRadius:8,padding:"10px",fontSize:12,cursor:"pointer",width:"100%"}}>{showAllArb?`Show top ${OPP_LIMIT} ↑`:`Show all ${arbitrage.length.toLocaleString()} arbitrage candidates ↓`}</button>}
        </div>:<div style={{textAlign:"center",padding:40,color:"var(--gray2)"}}>No strong arbitrage candidates in current sample. Upload full roll to discover hidden opportunities.</div>}
      </div>}

      {view==="anomaly"&&<div>
        <InfoBox icon="🔬" title="Property Class Anomaly Detector — What's Out of Place?" color="#a78bfa">
          Every parcel in Albany is assigned a property class code that describes how it's used — 210 for single-family homes, 220 for two-family, 400 for commercial, 300 for vacant land, etc. This tool looks at each street and identifies parcels whose class code is different from the majority of their neighbors. A commercial property surrounded by single-family homes, or a vacant lot on a block of apartments, may represent a holdover use, a recent conversion, or a data entry error. Either way, it's a flag worth investigating.
        </InfoBox>
        {anomalies.length>0?<div>
          {anomalies.slice(0,showAllAnom?anomalies.length:OPP_LIMIT).map(p=>(
            <div key={p.parcelId} style={{background:"var(--card2)",border:"1px solid rgba(167,139,250,.25)",borderRadius:11,padding:"14px 18px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:15}}>{p.address}</div>
                  <div style={{fontSize:11,color:"var(--gray2)",marginTop:2}}>on {p.street} · {p.zip}</div>
                  <div style={{display:"flex",gap:8,marginTop:8}}>
                    <div><span style={{fontSize:11,color:"var(--gray)"}}>This parcel: </span><Badge color="#a78bfa">{p.propClass} {p.propClassDesc}</Badge></div>
                    <div><span style={{fontSize:11,color:"var(--gray)"}}>Street mode: </span><Badge color="#22c55e">{p.expectedClass}</Badge></div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}><div style={{fontFamily:"var(--fm)",fontSize:14,color:"var(--amber)"}}>{$f(p.fullMarketValue)}</div></div>
              </div>
            </div>
          ))}
          {anomalies.length>OPP_LIMIT&&<button onClick={()=>setShowAllAnom(x=>!x)} style={{background:"var(--card2)",border:"1px solid var(--border)",color:"var(--gray2)",borderRadius:8,padding:"10px",fontSize:12,cursor:"pointer",width:"100%"}}>{showAllAnom?`Show top ${OPP_LIMIT} ↑`:`Show all ${anomalies.length.toLocaleString()} anomalies ↓`}</button>}
        </div>:<div style={{textAlign:"center",padding:40,color:"var(--gray2)"}}>
          <div style={{fontSize:32,marginBottom:10}}>🔬</div>
          No class anomalies detected. Streets need 3+ parcels to run anomaly detection. Upload full roll for complete analysis.
        </div>}
      </div>}
    </div>
  );
};

/* ── 6. TAX TOOLS ── */
const TaxTools = ({parcels, myHome}) => {
  const [view,setView]=useState("estimator");
  const [query,setQuery]=useState("");
  const [found,setFound]=useState(null);
  const [neighborAddr,setNeighborAddr]=useState("");
  const [neighborResult,setNeighborResult]=useState(null);

  // Auto-populate from myHome when switching sub-tabs
  const fillMyHome = useCallback((setter) => {
    if(myHome) setter(myHome.address.split(" ").slice(0,3).join(" "));
  },[myHome]);

  const lookup=()=>{const p=parcels.find(x=>x.address.toLowerCase().includes(query.toLowerCase())||x.parcelId===query);setFound(p||null);};
  const lookupNeighbor=()=>{
    const p=parcels.find(x=>x.address.toLowerCase().includes(neighborAddr.toLowerCase()));
    if(!p){setNeighborResult(null);return;}
    const street=p.address.replace(/^\d+\s*/,"").toLowerCase();
    const neighbors=parcels.filter(x=>x.address.toLowerCase().includes(street)&&x.parcelId!==p.parcelId);
    const avgFMV=neighbors.length>0?Math.round(neighbors.reduce((s,x)=>s+x.fullMarketValue,0)/neighbors.length):null;
    const avgAssessed=neighbors.length>0?Math.round(neighbors.reduce((s,x)=>s+x.assessedValue,0)/neighbors.length):null;
    setNeighborResult({p,neighbors,avgFMV,avgAssessed});
  };

  const schoolBurden=useMemo(()=>[...parcels].map(p=>({...p,schoolBurden:p.fullMarketValue>0?(p.schoolTaxable/p.fullMarketValue*100).toFixed(1):"—",schoolGap:p.assessedValue-p.schoolTaxable})).sort((a,b)=>parseFloat(b.schoolBurden||0)-parseFloat(a.schoolBurden||0)),[parcels]);

  const BtnTab=({id,label})=><button onClick={()=>setView(id)} style={{background:view===id?"var(--purple)":"transparent",color:view===id?"white":"var(--gray)",border:"none",borderRadius:7,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer"}}>{label}</button>;
  const SI={background:"var(--bg3)",border:"1px solid var(--border)",color:"var(--white)",borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"var(--fb)"};

  return (
    <div className="fi">
      <SectionTitle>Tax Tools</SectionTitle>
      <Sub>Tax savings estimator, neighbor value comparison, school tax burden analysis</Sub>
      <InfoBox icon="💰" title="How Albany Property Taxes Work — The Basics" color="#a78bfa">
        Albany property owners pay taxes to three separate entities: the <b style={{color:"var(--white)"}}>County</b>, the <b style={{color:"var(--white)"}}>City</b>, and the <b style={{color:"var(--white)"}}>Albany City School District</b>. Each calculates your tax bill using its own tax rate multiplied by your taxable assessed value. Exemptions can reduce your taxable value separately for each entity — which is why you might see three different "taxable" numbers on your record. This tab helps you estimate what you could be saving, compare your assessment to your neighbors', and understand the school tax burden specifically.
      </InfoBox>
      <div style={{display:"flex",gap:4,background:"var(--card)",borderRadius:9,padding:4,border:"1px solid var(--border)",width:"fit-content",marginBottom:18}}>
        <BtnTab id="estimator" label="💰 Savings Estimator"/>
        <BtnTab id="neighbor" label="🏘️ Neighbor Compare"/>
        <BtnTab id="school" label="🎓 School Tax Burden"/>
      </div>

      {view==="estimator"&&<div>
        <InfoBox icon="🏷️" title="Tax Savings Estimator — What Exemptions Could You Be Missing?" color="#a78bfa">
          Many Albany homeowners qualify for exemptions they've never applied for. The most common is <b style={{color:"var(--white)"}}>STAR (School Tax Assessment Relief)</b> — a New York State program that reduces the school-taxable portion of your assessed value by up to $30,000, saving most homeowners $600–$1,000/year. Senior homeowners (65+) may qualify for the <b style={{color:"var(--white)"}}>Enhanced STAR</b> or <b style={{color:"var(--white)"}}>Senior Citizen Exemption</b>, which can cut the taxable value in half. Veterans have their own exemption too. Look up your address below — if exemptions are missing from your record that you likely qualify for, the tool will flag them.
        </InfoBox>
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:12}}>Look Up a Property</div>
          <MyHomeBanner myHome={myHome} onUse={()=>{if(myHome){setQuery(myHome.address.split(" ").slice(0,3).join(" "));setFound(myHome.parcel||null);}}} label="Load My Home"/>
          <div style={{display:"flex",gap:10,marginBottom:14}}>
            <input placeholder="Enter address or parcel ID…" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&lookup()} style={{...SI,flex:1}}/>
            <button onClick={lookup} style={{background:"var(--purple)",color:"white",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:13}}>Look Up</button>
          </div>
          {found&&<div className="fi">
            <div style={{fontFamily:"var(--fd)",fontSize:16,fontWeight:700,marginBottom:10}}>{found.address}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div style={{background:"var(--card)",borderRadius:9,padding:"12px 14px",border:"1px solid var(--border)"}}>
                <div style={{fontSize:11,color:"var(--gray)",marginBottom:4}}>Current Exemptions on Record</div>
                {found.exemptions.length>0?found.exemptions.map(e=><div key={e.code} style={{fontSize:12,marginBottom:3}}><Badge color="#f59e0b" small>{e.name}</Badge> — saves up to {$f(e.schoolAmt||e.countyAmt||e.cityAmt)}</div>):<div style={{fontSize:12,color:"var(--gray2)"}}>None on file</div>}
              </div>
              <div style={{background:"rgba(34,197,94,.07)",borderRadius:9,padding:"12px 14px",border:"1px solid rgba(34,197,94,.2)"}}>
                <div style={{fontSize:11,color:"var(--green2)",marginBottom:4}}>Potential Opportunities Worth Exploring</div>
                {found.parcelType==="HOMESTEAD"&&!found.exemptions.some(e=>e.name.includes("STAR"))&&<div style={{fontSize:12,marginBottom:5,color:"var(--white)"}}>✅ <b>STAR Exemption</b> — up to $30,000 off school taxable value (~$600–900/yr savings). Apply at NYS Tax Dept.</div>}
                {found.parcelType==="HOMESTEAD"&&!found.exemptions.some(e=>e.name.includes("SR"))&&<div style={{fontSize:12,marginBottom:5,color:"var(--gray2)"}}>ℹ <b>Senior Citizen Exemption</b> — if owner 65+, may reduce assessed value 10–50%.</div>}
                {found.parcelType==="HOMESTEAD"&&!found.exemptions.some(e=>e.name.includes("VET"))&&<div style={{fontSize:12,marginBottom:5,color:"var(--gray2)"}}>ℹ <b>Veteran Exemption</b> — if owner served, up to $30,000 off. Apply at city assessor's office.</div>}
                {found.parcelType!=="HOMESTEAD"&&<div style={{fontSize:12,color:"var(--gray2)"}}>Non-homestead parcels have limited exemption options. Commercial and rental properties generally do not qualify for residential exemptions.</div>}
                {found.exemptions.length>1&&<div style={{fontSize:12,color:"var(--green2)"}}>✅ This property already has multiple exemptions — appears well-optimized.</div>}
              </div>
            </div>
            <div style={{background:"var(--card)",borderRadius:9,padding:"14px 16px",border:"1px solid var(--border)"}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:4}}>Your Current Tax Reduction vs. Full Assessed Value</div>
              <div style={{fontSize:11,color:"var(--gray2)",marginBottom:10}}>These figures show how much your taxable value is already reduced below the assessed value — your existing tax relief. A value of $0 means you're paying taxes on the full assessed amount with no reduction for that jurisdiction.</div>
              {[["County",found.assessedValue-found.countyTaxable,"#3b82f6"],["City",found.assessedValue-found.cityTaxable,"#0d9488"],["School District",found.assessedValue-found.schoolTaxable,"#a78bfa"]].map(([jx,sav,color])=>(
                <div key={jx} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:12,color:"var(--gray)"}}>{jx} tax reduction</span>
                  <span style={{fontFamily:"var(--fm)",fontSize:13,fontWeight:600,color:sav>0?color:"var(--gray3)"}}>{sav>0?$f(sav):"No reduction"}</span>
                </div>
              ))}
            </div>
          </div>}
          {query&&!found&&<div style={{fontSize:12,color:"var(--gray2)",marginTop:8}}>No parcel found. Try a partial address like "Academy" or a parcel ID like "75.44-2-50".</div>}
        </Card>
      </div>}

      {view==="neighbor"&&<div>
        <InfoBox icon="🏘️" title="What's My Neighbor Worth? — Street-Level Comparison" color="#a78bfa">
          New York State law requires that all properties on the same street, of the same class, be assessed at the same ratio of market value. If your neighbor's assessment ratio is significantly lower than yours — meaning they pay less tax per dollar of property value — you may have grounds to file an assessment grievance. This tool lets you compare your property's equity ratio, assessed value, and market value against every other parcel on your street that's in the dataset. A big gap is worth investigating further with the city assessor's office.
        </InfoBox>
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:12}}>Enter Your Address to Compare</div>
          <MyHomeBanner myHome={myHome} onUse={()=>{if(myHome){setNeighborAddr(myHome.address.split(" ").slice(0,3).join(" "));setNeighborResult(null);}}} label="Load My Home"/>
          <div style={{display:"flex",gap:10,marginBottom:14}}>
            <input placeholder="Enter your address…" value={neighborAddr} onChange={e=>setNeighborAddr(e.target.value)} onKeyDown={e=>e.key==="Enter"&&lookupNeighbor()} style={{...SI,flex:1}}/>
            <button onClick={lookupNeighbor} style={{background:"var(--purple)",color:"white",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:13}}>Compare</button>
          </div>
          {neighborResult&&<div className="fi">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <div style={{background:"rgba(37,99,235,.1)",border:"1px solid rgba(37,99,235,.25)",borderRadius:10,padding:"14px 16px"}}>
                <div style={{fontSize:11,color:"var(--blue3)",marginBottom:4,fontWeight:600}}>Your Property</div>
                <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:16}}>{neighborResult.p.address}</div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}>
                  <div><div style={{fontFamily:"var(--fm)",fontSize:16,color:"var(--amber)"}}>{$f(neighborResult.p.fullMarketValue)}</div><div style={{fontSize:10,color:"var(--gray)"}}>Your FMV</div></div>
                  <div><div style={{fontFamily:"var(--fm)",fontSize:16}}>{$f(neighborResult.p.assessedValue)}</div><div style={{fontSize:10,color:"var(--gray)"}}>Your Assessed</div></div>
                  <div><div style={{fontFamily:"var(--fm)",fontSize:16,color:FC[eqFlag(neighborResult.p)]}}>{eqR(neighborResult.p)}%</div><div style={{fontSize:10,color:"var(--gray)"}}>Your Equity %</div></div>
                </div>
              </div>
              <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px"}}>
                <div style={{fontSize:11,color:"var(--gray2)",marginBottom:4,fontWeight:600}}>Street Average ({neighborResult.neighbors.length} neighbors)</div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}>
                  <div><div style={{fontFamily:"var(--fm)",fontSize:16,color:"var(--gray)"}}>{$f(neighborResult.avgFMV)}</div><div style={{fontSize:10,color:"var(--gray)"}}>Avg FMV</div></div>
                  <div><div style={{fontFamily:"var(--fm)",fontSize:16,color:"var(--gray)"}}>{$f(neighborResult.avgAssessed)}</div><div style={{fontSize:10,color:"var(--gray)"}}>Avg Assessed</div></div>
                  <div><div style={{fontFamily:"var(--fm)",fontSize:16,color:neighborResult.p.fullMarketValue>neighborResult.avgFMV?"var(--green2)":"var(--red2)"}}>{neighborResult.p.fullMarketValue>neighborResult.avgFMV?"▲ Above":"▼ Below"} avg</div></div>
                </div>
              </div>
            </div>
            {neighborResult.neighbors.length>0?<div style={{display:"grid",gap:8}}>
              {neighborResult.neighbors.map(n=>(
                <div key={n.parcelId} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:9,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontSize:13,fontWeight:600}}>{n.address}</div><div style={{fontSize:11,color:"var(--gray2)",marginTop:2}}>{n.owner1}</div></div>
                  <div style={{display:"flex",gap:16,textAlign:"right"}}>
                    <div><div style={{fontFamily:"var(--fm)",fontSize:13,color:"var(--amber)"}}>{$f(n.fullMarketValue)}</div><div style={{fontSize:10,color:"var(--gray)"}}>FMV</div></div>
                    <div><div style={{fontFamily:"var(--fm)",fontSize:13,color:FC[eqFlag(n)]}}>{eqR(n)}%</div><div style={{fontSize:10,color:"var(--gray)"}}>Equity</div></div>
                  </div>
                </div>
              ))}
            </div>:<div style={{fontSize:12,color:"var(--gray2)",textAlign:"center",padding:20}}>No other parcels found on this street in the current dataset. Upload the full roll for a complete street comparison.</div>}
          </div>}
        </Card>
      </div>}

      {view==="school"&&<div>
        <InfoBox icon="🎓" title="What Is School Tax Burden — And Why Does It Matter?" color="#a78bfa">
          <b style={{color:"var(--white)"}}>School taxes are typically the largest single component of your Albany property tax bill</b> — often 60–70% of the total. They fund the Albany City School District: teacher salaries, building maintenance, transportation, special education, and more. Your school tax is calculated by multiplying the school district's tax rate by your <b style={{color:"var(--white)"}}>school taxable value</b> — which is different from your assessed value if you have any school-specific exemptions.<br/><br/>
          The <b style={{color:"var(--white)"}}>School Tax Burden %</b> shown here is: School Taxable Value ÷ Full Market Value × 100. A result of 100% means you have zero school tax relief — you're paying on the full assessed value. A result of 75% means exemptions (like STAR) have reduced your school-taxable amount by 25% of market value. Lower is better for the homeowner. <b style={{color:"var(--white)"}}>Every homeowner who lives in their primary residence should have at minimum the Basic STAR exemption reducing this number.</b> If yours shows 100%, you may be leaving money on the table.
        </InfoBox>
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:8}}>School Tax Burden by Property (Ranked Highest to Lowest)</div>
          <div style={{fontSize:11,color:"var(--gray2)",marginBottom:14}}>Red = no school tax relief (100% burden). Amber = partial relief. Green = significant school exemptions applied. A homestead parcel showing red may be missing STAR.</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={schoolBurden.slice(0,10).map(p=>({address:p.address.split(" ").slice(0,2).join(" "),pct:parseFloat(p.schoolBurden)||0}))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
              <XAxis dataKey="address" tick={{fontSize:9,fill:"#94a3b8"}}/>
              <YAxis tick={{fontSize:10,fill:"#94a3b8"}} tickFormatter={v=>v+"%"} domain={[0,110]}/>
              <Tooltip {...TT} formatter={v=>[v+"%","School Burden"]}/>
              <Bar dataKey="pct" radius={[4,4,0,0]}>
                {schoolBurden.slice(0,10).map((p,i)=><Cell key={i} fill={parseFloat(p.schoolBurden)>95?"#dc2626":parseFloat(p.schoolBurden)<80?"#22c55e":"#f59e0b"}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <div style={{display:"grid",gap:8}}>
          {schoolBurden.slice(0,12).map(p=>(
            <div key={p.parcelId} style={{background:myHome?.parcelId===p.parcelId?"rgba(34,197,94,.06)":"var(--card2)",border:`1px solid ${myHome?.parcelId===p.parcelId?"rgba(34,197,94,.3)":"var(--border)"}`,borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{fontWeight:600,fontSize:14}}>{p.address}</div>
                  {myHome?.parcelId===p.parcelId&&<Badge color="#22c55e" small>My Home</Badge>}
                </div>
                <div style={{fontSize:11,color:"var(--gray2)",marginTop:2}}>{p.owner1} · School taxable: {$f(p.schoolTaxable)}</div>
                <div style={{fontSize:11,color:"var(--gray3)",marginTop:3}}>
                  {parseFloat(p.schoolBurden)>95&&p.parcelType==="HOMESTEAD"?"⚠ Homestead with no school tax relief — may qualify for STAR":
                   parseFloat(p.schoolBurden)<80?"✓ School exemptions reducing taxable value below 80% of market":
                   "Partial school tax relief applied"}
                </div>
              </div>
              <div style={{display:"flex",gap:14,textAlign:"right",alignItems:"center"}}>
                <div><div style={{fontFamily:"var(--fm)",fontSize:13,color:"var(--green2)"}}>{$f(p.schoolGap)}</div><div style={{fontSize:10,color:"var(--gray)"}}>School savings</div></div>
                <div style={{background:parseFloat(p.schoolBurden)>95?"rgba(220,38,38,.15)":parseFloat(p.schoolBurden)<80?"rgba(34,197,94,.1)":"rgba(245,158,11,.1)",border:`1px solid ${parseFloat(p.schoolBurden)>95?"rgba(220,38,38,.3)":parseFloat(p.schoolBurden)<80?"rgba(34,197,94,.3)":"rgba(245,158,11,.3)"}`,borderRadius:8,padding:"6px 12px",textAlign:"center"}}>
                  <div style={{fontFamily:"var(--fm)",fontSize:15,fontWeight:700,color:parseFloat(p.schoolBurden)>95?"var(--red2)":parseFloat(p.schoolBurden)<80?"var(--green2)":"var(--amber)"}}>{p.schoolBurden}%</div>
                  <div style={{fontSize:9,color:"var(--gray)"}}>of FMV taxed</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>}
    </div>
  );
};
/* ── 7. COORDINATE MAP (Canvas renderer — smooth 60fps pan/zoom) ── */
const MapView = ({parcels, onDrill}) => {
  const canvasRef=useRef();
  const msRef=useRef({zoom:1,pan:{x:0,y:0},drag:null}); // mutable — no re-renders during interaction
  const [colorBy,setColorBy]=useState("fmv");
  const [tooltip,setTooltip]=useState(null);
  const [tooltipPos,setTooltipPos]=useState({x:14,y:14});
  const [addrSearch,setAddrSearch]=useState("");
  const [zoomDisplay,setZoomDisplay]=useState(100);
  const W=720,H=480,PAD=40;

  const mapped=useMemo(()=>parcels.filter(p=>p.eastCoord>0&&p.nrthCoord>0),[parcels]);
  const bounds=useMemo(()=>{
    if(!mapped.length) return {minE:630000,maxE:660000,minN:955000,maxN:985000};
    let minE=Infinity,maxE=-Infinity,minN=Infinity,maxN=-Infinity;
    for(const p of mapped){if(p.eastCoord<minE)minE=p.eastCoord;if(p.eastCoord>maxE)maxE=p.eastCoord;if(p.nrthCoord<minN)minN=p.nrthCoord;if(p.nrthCoord>maxN)maxN=p.nrthCoord;}
    return {minE,maxE,minN,maxN};
  },[mapped]);

  const hlSet=useMemo(()=>{
    const q=addrSearch.trim().toLowerCase(); if(!q) return null;
    const s=new Set();
    for(const p of mapped){if(p.address.toLowerCase().includes(q)||p.owner1.toLowerCase().includes(q))s.add(p.parcelId);}
    return s.size?s:null;
  },[addrSearch,mapped]);

  const draw=useCallback(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d");
    const {zoom,pan}=msRef.current;
    const {minE,maxE,minN,maxN}=bounds;
    const rx=e=>PAD+(e-minE)/(maxE-minE||1)*(W-PAD*2);
    const ry=n=>H-PAD-(n-minN)/(maxN-minN||1)*(H-PAD*2);
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle="#0d1829"; ctx.fillRect(0,0,W,H);
    // grid
    ctx.strokeStyle="rgba(255,255,255,0.025)"; ctx.lineWidth=1;
    for(let gx=0;gx<W;gx+=40){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,H);ctx.stroke();}
    for(let gy=0;gy<H;gy+=40){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke();}
    ctx.save(); ctx.translate(pan.x,pan.y); ctx.scale(zoom,zoom);
    // ZIP watermarks
    const zg={};
    for(const p of mapped){if(!zg[p.zip])zg[p.zip]={sx:0,sy:0,n:0};zg[p.zip].sx+=rx(p.eastCoord);zg[p.zip].sy+=ry(p.nrthCoord);zg[p.zip].n++;}
    ctx.font=`bold ${Math.max(8,16/zoom)}px sans-serif`; ctx.textAlign="center"; ctx.fillStyle="rgba(255,255,255,0.06)";
    for(const zip in zg){const g=zg[zip];ctx.fillText(zip,g.sx/g.n,g.sy/g.n);}
    // parcel dots
    const hl=hlSet; const r=Math.max(1.5,4.5/zoom);
    for(const p of mapped){
      const x=rx(p.eastCoord),y=ry(p.nrthCoord);
      const isHl=hl?hl.has(p.parcelId):false;
      if(hl&&!isHl){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle="rgba(100,116,139,0.18)";ctx.fill();}
      else {
        let color;
        if(colorBy==="fmv"){const v=p.fullMarketValue;color=v>500000?"#f59e0b":v>300000?"#3b82f6":v>150000?"#0d9488":"#64748b";}
        else if(colorBy==="equity")color=FC[eqFlag(p)];
        else if(colorBy==="class")color=({"210":"#3b82f6","220":"#0d9488","230":"#06b6d4","411":"#a78bfa","400":"#f97316","300":"#64748b","330":"#94a3b8"})[p.propClass]||"#94a3b8";
        else if(colorBy==="exemption")color=p.exemptions?.length>0?"#f59e0b":"#475569";
        else if(colorBy==="absentee")color=isAbsentee(p)?"#f97316":"#22c55e";
        else color="#3b82f6";
        if(isHl){
          ctx.beginPath();ctx.arc(x,y,r*2.4,0,Math.PI*2);ctx.fillStyle="#fbbf24";ctx.fill();
          ctx.strokeStyle="white";ctx.lineWidth=1.5/zoom;ctx.stroke();
        } else {
          ctx.globalAlpha=0.8;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.globalAlpha=1;
        }
      }
    }
    ctx.restore();
  },[mapped,bounds,hlSet,colorBy]);

  useEffect(()=>{draw();},[draw]);

  // Auto-pan to first search match
  useEffect(()=>{
    if(!hlSet||!hlSet.size) return;
    const first=mapped.find(p=>hlSet.has(p.parcelId)); if(!first) return;
    const {minE,maxE,minN,maxN}=bounds;
    const sx=PAD+(first.eastCoord-minE)/(maxE-minE||1)*(W-PAD*2);
    const sy=H-PAD-(first.nrthCoord-minN)/(maxN-minN||1)*(H-PAD*2);
    const nz=Math.max(3,msRef.current.zoom);
    msRef.current.zoom=nz; msRef.current.pan={x:W/2-sx*nz,y:H/2-sy*nz};
    setZoomDisplay(Math.round(nz*100)); draw();
  },[hlSet]); // eslint-disable-line

  const handleWheel=useCallback(e=>{
    e.preventDefault();
    const rect=canvasRef.current.getBoundingClientRect();
    const mx=e.clientX-rect.left,my=e.clientY-rect.top;
    const factor=e.deltaY<0?1.18:0.847;
    const ms=msRef.current;
    const nz=Math.min(12,Math.max(0.3,ms.zoom*factor));
    ms.pan.x=mx-(mx-ms.pan.x)*(nz/ms.zoom); ms.pan.y=my-(my-ms.pan.y)*(nz/ms.zoom);
    ms.zoom=nz; draw(); setZoomDisplay(Math.round(nz*100));
  },[draw]);

  useEffect(()=>{
    const c=canvasRef.current; if(!c) return;
    c.addEventListener("wheel",handleWheel,{passive:false});
    return ()=>c.removeEventListener("wheel",handleWheel);
  },[handleWheel]);

  const hitTest=useCallback((mx,my,hitPx=10)=>{
    const {zoom,pan}=msRef.current; const {minE,maxE,minN,maxN}=bounds;
    const mapX=(mx-pan.x)/zoom, mapY=(my-pan.y)/zoom;
    const hr=Math.max(hitPx/zoom,hitPx);
    let best=null,bestD=Infinity;
    for(const p of mapped){
      const dx=PAD+(p.eastCoord-minE)/(maxE-minE||1)*(W-PAD*2)-mapX;
      const dy=H-PAD-(p.nrthCoord-minN)/(maxN-minN||1)*(H-PAD*2)-mapY;
      if(Math.abs(dx)>hr||Math.abs(dy)>hr) continue;
      const d=dx*dx+dy*dy; if(d<bestD){bestD=d;best=p;}
    }
    return (best&&bestD<hr*hr)?best:null;
  },[mapped,bounds]);

  const handleMouseDown=useCallback(e=>{
    if(e.button!==0) return;
    const ms=msRef.current;
    ms.drag={sx:e.clientX,sy:e.clientY,px:ms.pan.x,py:ms.pan.y};
    if(canvasRef.current) canvasRef.current.style.cursor="grabbing";
  },[]);
  const handleMouseMove=useCallback(e=>{
    const ms=msRef.current;
    if(ms.drag){ms.pan.x=ms.drag.px+(e.clientX-ms.drag.sx);ms.pan.y=ms.drag.py+(e.clientY-ms.drag.sy);draw();return;}
    const rect=canvasRef.current.getBoundingClientRect();
    const mx=e.clientX-rect.left,my=e.clientY-rect.top;
    const hit=hitTest(mx,my);
    if(hit){setTooltip(hit);setTooltipPos({x:Math.min(mx+14,W-265),y:Math.max(my-10,8)});}
    else setTooltip(null);
  },[draw,hitTest]);
  const handleMouseUp=useCallback(()=>{
    msRef.current.drag=null;
    if(canvasRef.current) canvasRef.current.style.cursor="grab";
  },[]);
  const handleClick=useCallback(e=>{
    const rect=canvasRef.current.getBoundingClientRect();
    const hit=hitTest(e.clientX-rect.left,e.clientY-rect.top,12);
    if(hit&&onDrill) onDrill({title:`${hit.address} — ${hit.propClassDesc}`,parcels:[hit]});
  },[hitTest,onDrill]);

  const stepZoom=useCallback(factor=>{
    const ms=msRef.current;
    const nz=Math.min(12,Math.max(0.3,ms.zoom*factor));
    ms.pan.x=W/2-(W/2-ms.pan.x)*(nz/ms.zoom); ms.pan.y=H/2-(H/2-ms.pan.y)*(nz/ms.zoom);
    ms.zoom=nz; draw(); setZoomDisplay(Math.round(nz*100));
  },[draw]);
  const resetView=useCallback(()=>{msRef.current.zoom=1;msRef.current.pan={x:0,y:0};draw();setZoomDisplay(100);},[draw]);

  const LEGEND={
    fmv:[[">$500k","#f59e0b"],["$300–500k","#3b82f6"],["$150–300k","#0d9488"],["<$150k","#64748b"]],
    equity:[["Under (<80%)","#f59e0b"],["Fair (80–120%)","#22c55e"],["Over (>120%)","#dc2626"],["No data","#64748b"]],
    class:[["210 Single Family","#3b82f6"],["220 Two Family","#0d9488"],["230 Three Family","#06b6d4"],["411 Apartment","#a78bfa"],["400 Commercial","#f97316"],["300/330 Vacant","#64748b"]],
    exemption:[["Has Exemption","#f59e0b"],["No Exemption","#475569"]],
    absentee:[["Owner-Occupied","#22c55e"],["Absentee Owner","#f97316"]],
  };
  const SI={background:"var(--bg3)",border:"1px solid var(--border)",color:"var(--white)",borderRadius:8,padding:"7px 11px",fontSize:12,cursor:"pointer"};

  return (
    <div className="fi">
      <SectionTitle>Coordinate Map View</SectionTitle>
      <Sub>Spatial layout from EAST/NRTH survey coordinates · Smooth scroll-to-zoom · Drag to pan</Sub>
      <InfoBox icon="🗺️" title="How This Map Works" color="#3b82f6">
        Each parcel's EAST and NRTH survey coordinates place it accurately within Albany. <b style={{color:"var(--white)"}}>Scroll = zoom toward cursor · Drag = pan · Click any dot = detail panel.</b> Switch color modes to explore value tiers, equity ratios, property classes, exemptions, or absentee ownership. Use the search bar below to highlight matching addresses or owner names.
      </InfoBox>

      {/* Color mode buttons + zoom controls */}
      <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:12,color:"var(--gray)"}}>Color:</span>
        {[["fmv","Market Value"],["equity","Equity Ratio"],["class","Property Class"],["exemption","Exemptions"],["absentee","Absentee"]].map(([k,l])=>(
          <button key={k} onClick={()=>setColorBy(k)} style={{background:colorBy===k?"var(--blue)":"var(--card2)",border:"1px solid var(--border)",color:colorBy===k?"white":"var(--gray)",borderRadius:7,padding:"5px 12px",fontSize:12,cursor:"pointer"}}>{l}</button>
        ))}
        <div style={{display:"flex",gap:4,marginLeft:"auto",alignItems:"center"}}>
          <button onClick={()=>stepZoom(1.3)} style={{...SI,width:32,height:32,padding:0,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>+</button>
          <button onClick={()=>stepZoom(1/1.3)} style={{...SI,width:32,height:32,padding:0,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>−</button>
          <button onClick={resetView} style={{...SI,fontSize:11,padding:"5px 10px"}}>⌂ Reset</button>
          <span style={{fontSize:11,color:"var(--gray2)",marginLeft:2,fontFamily:"var(--fm)"}}>{zoomDisplay}%</span>
        </div>
      </div>

      {/* Address / owner search */}
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
        <input
          value={addrSearch} onChange={e=>setAddrSearch(e.target.value)}
          placeholder="Search address or owner name to highlight on map…"
          style={{flex:1,background:"var(--bg3)",border:"1px solid var(--border)",color:"var(--white)",borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none"}}
        />
        {addrSearch&&<button onClick={()=>setAddrSearch("")} style={{...SI,fontSize:11,padding:"5px 10px",background:"rgba(220,38,38,.15)",borderColor:"rgba(220,38,38,.3)"}}>✕</button>}
        {hlSet&&<span style={{fontSize:12,color:"#fbbf24",whiteSpace:"nowrap"}}>{hlSet.size} found</span>}
      </div>

      {/* Canvas map */}
      <div style={{position:"relative",display:"inline-block",borderRadius:14,overflow:"hidden",border:"1px solid var(--border)",maxWidth:"100%"}}>
        <canvas
          ref={canvasRef} width={W} height={H}
          style={{display:"block",cursor:"grab"}}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={handleClick}
        />
        {/* Legend */}
        <div style={{position:"absolute",top:10,right:10,background:"rgba(8,15,30,0.92)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"10px 14px",minWidth:175,backdropFilter:"blur(6px)",pointerEvents:"none"}}>
          <div style={{fontSize:9,color:"var(--gray2)",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Legend</div>
          {(LEGEND[colorBy]||[]).map(([label,color])=>(
            <div key={label} style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
              <div style={{width:9,height:9,borderRadius:"50%",background:color,flexShrink:0,border:"1px solid rgba(255,255,255,.2)"}}/>
              <span style={{fontSize:11,color:"#b0bec5"}}>{label}</span>
            </div>
          ))}
        </div>
        {/* Hover tooltip */}
        {tooltip&&(
          <div style={{position:"absolute",top:tooltipPos.y,left:tooltipPos.x,background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:10,padding:"12px 14px",maxWidth:255,pointerEvents:"none",zIndex:10,boxShadow:"0 8px 30px rgba(0,0,0,.5)"}}>
            <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:13}}>{tooltip.address}</div>
            <div style={{fontFamily:"var(--fm)",fontSize:10,color:"var(--gray)",marginTop:2}}>{tooltip.parcelId} · {tooltip.zip}</div>
            <div style={{marginTop:8,display:"grid",gap:3}}>
              <div style={{fontSize:12}}>FMV: <span style={{color:"var(--amber)",fontFamily:"var(--fm)",fontWeight:600}}>{$f(tooltip.fullMarketValue)}</span></div>
              <div style={{fontSize:12}}>Assessed: <span style={{fontFamily:"var(--fm)"}}>{$f(tooltip.assessedValue)}</span></div>
              <div style={{fontSize:12}}>Equity: <span style={{color:FC[eqFlag(tooltip)],fontFamily:"var(--fm)",fontWeight:600}}>{eqR(tooltip)}%</span></div>
              <div style={{fontSize:12}}>Owner: <span style={{color:"var(--gray2)"}}>{tooltip.owner1}</span></div>
              {tooltip.exemptions?.length>0&&<div style={{fontSize:11,color:"var(--amber2)"}}>{tooltip.exemptions.length} exemption{tooltip.exemptions.length>1?"s":""}</div>}
              {isAbsentee(tooltip)&&<Badge color="#f97316" small>Absentee</Badge>}
            </div>
            <div style={{fontSize:10,color:"var(--gray3)",marginTop:7}}>Click dot to view full detail →</div>
          </div>
        )}
        {/* Status bar */}
        <div style={{position:"absolute",bottom:8,left:12,fontSize:10,color:"rgba(255,255,255,0.3)",pointerEvents:"none"}}>
          {mapped.length.toLocaleString()} parcels plotted · {parcels.length-mapped.length} missing coords
        </div>
      </div>
      <div style={{marginTop:8,fontSize:11,color:"var(--gray2)",textAlign:"center"}}>
        Scroll to zoom toward cursor · Drag to pan · Click any dot to drill in
      </div>
    </div>
  );
};

/* ── 8. DATA QUALITY ── */
const DataQuality = ({parcels, onDrill}) => {
  const [showAllInconsist,setShowAllInconsist]=useState(false);
  const [showAllNoCoords,setShowAllNoCoords]=useState(false);
  const DQ_LIMIT=50;
  const fields=[
    {key:"address",label:"Address"},{key:"zip",label:"ZIP Code"},{key:"owner1",label:"Owner Name"},
    {key:"propClass",label:"Property Class"},{key:"fullMarketValue",label:"Full Market Value"},
    {key:"assessedValue",label:"Assessed Value"},{key:"landValue",label:"Land Value"},
    {key:"frontage",label:"Frontage"},{key:"depth",label:"Depth"},
    {key:"deedYear",label:"Deed Year"},{key:"eastCoord",label:"E Coordinate"},
    {key:"mailAddress",label:"Mailing Address"},
  ];
  const completeness=useMemo(()=>fields.map(f=>{
    const filled=parcels.filter(p=>{const v=p[f.key];return v!=null&&v!==""&&v!==0&&v!=="UNKNOWN";}).length;
    return {...f,filled,pct:Math.round(filled/Math.max(parcels.length,1)*100)};
  }),[parcels]);

  // Consistency: same street, same class, flagged outliers in value
  const inconsistent=useMemo(()=>{
    const byStreet={};
    parcels.forEach(p=>{
      const st=p.address.replace(/^\d+\s*/,"").toLowerCase();
      if(!byStreet[st])byStreet[st]=[];
      byStreet[st].push(p);
    });
    const flags=[];
    Object.entries(byStreet).forEach(([st,ps])=>{
      if(ps.length<2)return;
      const sameCls=ps.filter(p=>p.propClass===ps[0].propClass);
      if(sameCls.length<2)return;
      const vals=sameCls.map(p=>p.fullMarketValue).filter(v=>v>0);
      if(vals.length<2)return;
      const avg=vals.reduce((a,b)=>a+b)/vals.length;
      const std=Math.sqrt(vals.reduce((a,v)=>a+(v-avg)**2,0)/vals.length);
      sameCls.forEach(p=>{if(Math.abs(p.fullMarketValue-avg)>std*1.5&&std>10000)flags.push({...p,streetAvg:Math.round(avg),deviation:Math.round(p.fullMarketValue-avg)});});
    });
    return flags;
  },[parcels]);

  const overall=Math.round(completeness.reduce((s,f)=>s+f.pct,0)/completeness.length);

  return (
    <div className="fi">
      <SectionTitle>Data Quality Scorecard</SectionTitle>
      <Sub>Field completeness rates, assessment consistency checker, data integrity flags</Sub>
      <InfoBox icon="🔍" title="Why Does Data Quality Matter for Assessment Analysis?" color="#3b82f6">
        The Albany assessment roll is a government database that was built for tax administration, not public analysis. As a result, it has real-world data quality issues: some fields are blank, some coordinates are missing, some owner names are inconsistently formatted, and some assessed values may be far out of step with their neighbors. Before drawing conclusions from any analysis in this dashboard, it helps to understand what the data does and doesn't contain. This tab scores the completeness of every key field, flags statistical outliers in assessed values by street, and lists parcels that cannot be mapped due to missing coordinates. A lower completeness score on a key field like Full Market Value means some analyses may be incomplete until the full roll is loaded.
      </InfoBox>
      <InfoBox icon="🔍" title="Why Data Quality Matters for Assessment Analysis" color="#64748b">
        The Albany assessment roll is a public record built from years of manual data entry and system migrations. It is remarkably comprehensive — but like any large dataset, it has gaps, inconsistencies, and quirks. This tab quantifies those issues so you know how much to trust the analysis in other tabs. The <b style={{color:"var(--white)"}}>Field Completeness</b> panel shows what percentage of parcels have each important field populated. The <b style={{color:"var(--white)"}}>Consistency Checker</b> flags properties on the same street with the same class whose values are statistical outliers — which could indicate a data error, a missed reassessment, or a genuine market anomaly worth investigating.
      </InfoBox>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
        <div>
          <Card style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)"}}>Field Completeness</div>
              <div style={{fontFamily:"var(--fm)",fontSize:20,fontWeight:700,color:overall>90?"var(--green2)":overall>70?"var(--amber)":"var(--red2)"}}>{overall}% overall</div>
            </div>
            {completeness.map(f=>(
              <div key={f.key} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,color:"var(--gray)"}}>{f.label}</span>
                  <span style={{fontFamily:"var(--fm)",fontSize:12,color:f.pct===100?"var(--green2)":f.pct>70?"var(--amber)":"var(--red2)",fontWeight:600}}>{f.pct}%</span>
                </div>
                <div style={{height:4,background:"var(--bg)",borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${f.pct}%`,background:f.pct===100?"var(--green2)":f.pct>70?"var(--amber)":"var(--red2)",borderRadius:2}}></div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:2}}>
                  <span style={{fontSize:10,color:"var(--gray3)"}}>{f.filled}/{parcels.length} records populated</span>
                  {f.pct<100&&onDrill&&<button onClick={()=>onDrill({title:`Missing: ${f.label} (${parcels.length-f.filled} parcels)`,parcels:parcels.filter(p=>{const v=p[f.key];return v==null||v===""||v===0||v==="UNKNOWN";})})} style={{background:"rgba(37,99,235,.1)",border:"1px solid rgba(37,99,235,.25)",color:"var(--blue3)",borderRadius:4,padding:"1px 6px",fontSize:10,cursor:"pointer"}}>View {parcels.length-f.filled} missing</button>}
                </div>
              </div>
            ))}
          </Card>
        </div>
        <div>
          <Card style={{marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:12}}>Assessment Consistency Flags</div>
            <div style={{fontSize:11,color:"var(--gray2)",marginBottom:12}}>Properties on the same street, same class, whose FMV deviates more than 1.5 standard deviations from street peers. May indicate data errors or genuine outliers worth reviewing.</div>
            {inconsistent.length>0?<div>
              {inconsistent.slice(0,showAllInconsist?inconsistent.length:DQ_LIMIT).map(p=>(
                <div key={p.parcelId} style={{background:"rgba(220,38,38,.07)",border:"1px solid rgba(220,38,38,.2)",borderRadius:9,padding:"11px 14px",marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{p.address}</div>
                      <div style={{fontSize:11,color:"var(--gray2)",marginTop:2}}>{p.propClassDesc} · Parcel {p.parcelId}</div>
                      <div style={{fontSize:11,marginTop:6}}>Street avg: <span style={{fontFamily:"var(--fm)",color:"var(--gray)"}}>{$f(p.streetAvg)}</span> · Deviation: <span style={{fontFamily:"var(--fm)",color:p.deviation>0?"var(--red2)":"var(--amber)"}}>{p.deviation>0?"+":""}{$f(p.deviation)}</span></div>
                    </div>
                    <div style={{textAlign:"right"}}><div style={{fontFamily:"var(--fm)",fontSize:14,color:"var(--amber)"}}>{$f(p.fullMarketValue)}</div></div>
                  </div>
                </div>
              ))}
              {inconsistent.length>DQ_LIMIT&&<button onClick={()=>setShowAllInconsist(x=>!x)} style={{background:"var(--card2)",border:"1px solid var(--border)",color:"var(--gray2)",borderRadius:8,padding:"9px",fontSize:12,cursor:"pointer",width:"100%",marginTop:4}}>{showAllInconsist?`Show top ${DQ_LIMIT} ↑`:`Show all ${inconsistent.length.toLocaleString()} consistency flags ↓`}</button>}
            </div>:<div style={{textAlign:"center",padding:30,color:"var(--gray2)"}}>
              <div style={{fontSize:28,marginBottom:8}}>✅</div>
              <div style={{fontSize:12}}>No major consistency issues in current sample. Upload full roll to run complete street-level consistency analysis.</div>
            </div>}
          </Card>
          <Card>
            <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:12}}>Missing Coordinates</div>
            <div style={{fontSize:11,color:"var(--gray2)",marginBottom:10}}>Parcels without EAST/NRTH survey coordinates cannot be plotted on the map view.</div>
            {(()=>{const noCrd=parcels.filter(p=>!p.eastCoord||p.eastCoord===0);return(<div>
              {noCrd.slice(0,showAllNoCoords?noCrd.length:DQ_LIMIT).map(p=>(
                <div key={p.parcelId} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:7,padding:"8px 12px",marginBottom:6,display:"flex",justifyContent:"space-between"}}>
                  <div><div style={{fontSize:12,fontWeight:600}}>{p.address}</div><div style={{fontSize:10,color:"var(--gray2)"}}>{p.parcelId}</div></div>
                  <Badge color="#64748b" small>No Coords</Badge>
                </div>
              ))}
              {noCrd.length>DQ_LIMIT&&<button onClick={()=>setShowAllNoCoords(x=>!x)} style={{background:"var(--card2)",border:"1px solid var(--border)",color:"var(--gray2)",borderRadius:8,padding:"9px",fontSize:12,cursor:"pointer",width:"100%",marginTop:4}}>{showAllNoCoords?`Show top ${DQ_LIMIT} ↑`:`Show all ${noCrd.length.toLocaleString()} missing-coord parcels ↓`}</button>}
              {noCrd.length===0&&<div style={{textAlign:"center",padding:20,color:"var(--gray2)",fontSize:12}}>✅ All parcels have coordinates</div>}
            </div>);})()}
          </Card>
        </div>
      </div>
    </div>
  );
};

/* ── 9. COMPARE ── */
const Compare = ({parcels,compareList,onRemove}) => {
  const [pick,setPick]=useState("");
  const addBySearch=()=>{const p=parcels.find(x=>x.address.toLowerCase().includes(pick.toLowerCase())||x.parcelId===pick);if(p&&!compareList.some(x=>x.parcelId===p.parcelId)&&compareList.length<4){onRemove(null,p);setPick("");}};
  const fields=[
    {label:"Address",v:p=>p.address},{label:"Parcel ID",v:p=>p.parcelId,mono:true},
    {label:"Owner",v:p=>p.owner1},{label:"Class",v:p=>`${p.propClass} ${p.propClassDesc}`},
    {label:"Neighborhood",v:p=>p.neighborhood||"—"},
    {label:"Full Market Value",v:p=>$f(p.fullMarketValue),hi:true,num:p=>p.fullMarketValue},
    {label:"Assessed Value",v:p=>$f(p.assessedValue),num:p=>p.assessedValue},
    {label:"Land Value",v:p=>$f(p.landValue),num:p=>p.landValue},
    {label:"Equity Ratio",v:p=>eqR(p)+"%",hi:true,num:p=>parseFloat(eqR(p))||0},
    {label:"County Taxable",v:p=>$f(p.countyTaxable)},{label:"City Taxable",v:p=>$f(p.cityTaxable)},{label:"School Taxable",v:p=>$f(p.schoolTaxable)},
    {label:"Lot Size",v:p=>p.frontage?`${p.frontage}×${p.depth} ft`:"—"},
    {label:"Gentrifi. Index",v:p=>gentriIdx(p)+"%"},{label:"Absentee?",v:p=>isAbsentee(p)?"Yes":"No"},
    {label:"Exemptions",v:p=>p.exemptions.map(e=>e.name).join(", ")||"None"},
    {label:"Last Sale Year",v:p=>p.deedYear||"—"},
  ];
  const SI={background:"var(--bg3)",border:"1px solid var(--border)",color:"var(--white)",borderRadius:8,padding:"7px 11px",fontSize:12,fontFamily:"var(--fb)"};
  return (
    <div className="fi">
      <SectionTitle>Side-by-Side Comparison</SectionTitle>
      <Sub>Compare up to 4 parcels. Add via Browse tab or search below. Highest values highlighted in amber.</Sub>
      <InfoBox icon="📋" title="How to Use the Comparison Tool" color="#3b82f6">
        Select up to four properties to view every key data field side-by-side in a single table. This is useful for verifying whether similar properties on the same street have consistent assessments, evaluating investment options against each other, or preparing for an assessment grievance by documenting disparities between comparable parcels. The <b style={{color:"var(--amber2)"}}>amber highlight</b> shows whichever property has the highest value for each numeric field — helping you quickly spot outliers. Add properties from the Browse tab using the "+ Compare" button on any card, or search directly here.
      </InfoBox>
      <div style={{display:"flex",gap:8,marginBottom:18}}>
        <input placeholder="Search address or parcel ID to add…" value={pick} onChange={e=>setPick(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addBySearch()} style={{...SI,flex:1}}/>
        <button onClick={addBySearch} style={{background:"var(--blue)",color:"white",border:"none",borderRadius:8,padding:"7px 16px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Add</button>
      </div>
      {compareList.length===0?<div style={{textAlign:"center",padding:60,color:"var(--gray2)"}}>
        <div style={{fontSize:40,marginBottom:12}}>⚖️</div>
        Search above or go to Browse → click "+ Compare" on any property card to begin comparing.
      </div>:<div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>
            <th style={{padding:"10px 14px",textAlign:"left",color:"var(--gray2)",fontSize:11,textTransform:"uppercase",letterSpacing:.5,width:160,background:"var(--bg2)"}}>Field</th>
            {compareList.map(p=>(
              <th key={p.parcelId} style={{padding:"10px 14px",textAlign:"left",borderLeft:"1px solid var(--border)",background:"var(--bg2)"}}>
                <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:13}}>{p.address}</div>
                <div style={{fontFamily:"var(--fm)",fontSize:10,color:"var(--gray)",marginTop:2}}>{p.parcelId}</div>
                <button onClick={()=>onRemove(p)} style={{marginTop:6,background:"rgba(220,38,38,.15)",border:"1px solid rgba(220,38,38,.3)",color:"#f87171",borderRadius:4,padding:"2px 8px",fontSize:10,cursor:"pointer"}}>Remove</button>
              </th>
            ))}
          </tr></thead>
          <tbody>{fields.map((f,i)=>(
            <tr key={f.label} style={{background:i%2===0?"var(--card)":"transparent"}}>
              <td style={{padding:"9px 14px",color:"var(--gray2)",fontSize:11}}>{f.label}</td>
              {compareList.map(p=>{
                const val=f.v(p);
                const nums=f.num?compareList.map(x=>f.num(x)):[];
                const myNum=f.num?f.num(p):null;
                const isMax=f.hi&&myNum!==null&&myNum===Math.max(...nums);
                return <td key={p.parcelId} style={{padding:"9px 14px",borderLeft:"1px solid var(--border)",fontFamily:f.mono?"var(--fm)":"inherit",color:isMax?"var(--amber)":"var(--white)",fontWeight:isMax?600:400}}>{val}</td>;
              })}
            </tr>
          ))}</tbody>
        </table>
      </div>}
    </div>
  );
};

/* ── 10. HOMEBUYER GUIDE ── */
const HomebuyerGuide = ({parcels, myHome}) => {
  const [address,setAddress]=useState("");
  const [found,setFound]=useState(null);
  const lookup=()=>{const p=parcels.find(x=>x.address.toLowerCase().includes(address.toLowerCase())||x.parcelId===address);setFound(p||null);};

  // Auto-load myHome if available
  const loadMyHome=()=>{
    if(!myHome)return;
    setAddress(myHome.address.split(" ").slice(0,3).join(" "));
    setFound(myHome.parcel||null);
  };
  const terms=[
    {term:"Full Market Value (FMV)",def:"The assessor's estimate of what the property would sell for on the open market today. This is NOT necessarily what you'd pay for it — actual sale prices can differ."},
    {term:"Assessed Value",def:"The value the city officially uses to calculate your property tax bill. In New York, this is typically a percentage of the Full Market Value — set by the municipality's equalization rate."},
    {term:"Equity Ratio",def:"Assessed Value ÷ Full Market Value × 100. A fair ratio is roughly 80–120%. If your ratio is too high, you may be paying more than your fair share of taxes and have grounds for an assessment grievance."},
    {term:"Land Value",def:"The assessed value of the land only — not counting the building. High land value relative to total value means the location itself is what's valuable. Useful for spotting infill development potential."},
    {term:"Homestead Parcel",def:"A property used as a primary residence. Homestead parcels often qualify for more exemptions than non-homestead (investment, rental, commercial) properties."},
    {term:"STAR Exemption (41854)",def:"School Tax Assessment Relief — New York's Basic STAR reduces the school-taxable value by up to $30,000 for owner-occupied homes. Enhanced STAR is available for seniors and offers even greater relief. Apply at NYS Tax Department if you don't see it on your record."},
    {term:"Senior Citizen Exemption (41801)",def:"If you're 65 or older and meet income limits, you may qualify for a reduction of 10–50% on your assessed value. This applies to county, city, AND school taxes."},
    {term:"Veteran Exemption (41834)",def:"Veterans and certain family members can receive a reduction in assessed value based on military service. Must be applied for at the city assessor's office."},
    {term:"CHG LVL CT (41001)",def:"Challenge Level Court — this indicates the owner successfully challenged their assessment through the legal system and won a reduction. The exemption reflects the court-ordered reduction."},
    {term:"SWIS Code",def:"A 6-digit code identifying the municipality (Albany = 010100). Used by the state to categorize and track assessment rolls across New York."},
    {term:"Frontage × Depth",def:"The physical dimensions of the lot. Frontage is how wide the lot is at the street. Depth is how far back it goes. Multiply them together to get approximate square footage."},
    {term:"Deed Book / Page",def:"The legal reference to where the last recorded sale of the property is documented at the county clerk's office. The year embedded in the deed number often tells you when the property last changed hands."},
    {term:"County / City / School Taxable",def:"Three separate taxable values — one for each taxing jurisdiction. They can differ because some exemptions only apply to specific jurisdictions (e.g., STAR only reduces school taxable value)."},
    {term:"Absentee Owner",def:"A property where the owner's mailing address is different from the property address. Often indicates a rental, investment property, or second home. Not inherently negative, but useful context for understanding a neighborhood."},
  ];
  const SI={background:"var(--bg3)",border:"1px solid var(--border)",color:"var(--white)",borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"var(--fb)"};
  return (
    <div className="fi">
      <SectionTitle>First-Time Homebuyer Guide</SectionTitle>
      <Sub>Plain-English explanations of every field in the Albany assessment roll</Sub>
      <InfoBox icon="📚" title="Who Is This Guide For?" color="#f59e0b">
        The Albany assessment roll is a public document — but it was designed for government administrators, not homeowners. This guide exists to bridge that gap. Whether you just bought your first home, are thinking about buying, or have lived in Albany for decades and never quite understood your tax bill, this tab explains every field, every number, and every code in language that makes sense. Look up any address to get a plain-English walkthrough of that specific property's record, or scroll down for the complete glossary.
      </InfoBox>
      <Card style={{marginBottom:18,background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.2)"}}>
        <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:10,color:"var(--amber2)"}}>Look Up Any Address — We'll Explain Everything in Plain English</div>
        <MyHomeBanner myHome={myHome} onUse={loadMyHome} label="Look Up My Home"/>
        <div style={{display:"flex",gap:10}}>
          <input placeholder="Enter an address or parcel ID…" value={address} onChange={e=>setAddress(e.target.value)} onKeyDown={e=>e.key==="Enter"&&lookup()} style={{...SI,flex:1}}/>
          <button onClick={lookup} style={{background:"var(--blue)",color:"white",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:13}}>Look Up</button>
        </div>
        {found&&<div className="fi" style={{marginTop:16}}>
          <div style={{fontFamily:"var(--fd)",fontSize:16,fontWeight:700,marginBottom:14}}>{found.address} — Here's What It All Means</div>
          {[
            ["What is the Full Market Value?",`The city assessor estimates this property is worth ${$f(found.fullMarketValue)} on the open market. This is their professional opinion of what a willing buyer and seller would agree on today.`],
            ["What is the Assessed Value?",`The city uses ${$f(found.assessedValue)} to calculate the property tax bill — not the full market value. Albany uses a specific percentage of market value for assessments.`],
            ["Is this assessment fair?",`The equity ratio is ${eqR(found)}%. ${eqFlag(found)==="fair"?"✅ This falls in the fair range (80–120%) — the assessment appears proportional to market value.":eqFlag(found)==="under"?"⚠️ This is below 80%, meaning the property may be under-assessed. The owner pays taxes on less than the standard share of market value.":"🚨 This is above 120%, meaning the owner may be paying more than their fair share. They may have grounds to file an assessment grievance."}`],
            ["Who owns this property?",`${found.owner1}${found.owner2?` and ${found.owner2}`:""}. ${isAbsentee(found)?"The mailing address is different from the property address, suggesting the owner may not live here (absentee/investment owner).":"The mailing address matches the property address, suggesting the owner likely lives here."}`],
            ["What tax exemptions are active?",found.exemptions.length>0?`This property has ${found.exemptions.length} active exemption(s): ${found.exemptions.map(e=>`${e.name} (code §${e.code})`).join(", ")}. These reduce the taxable value, lowering the annual tax bill.`:`No active exemptions were found on this record. If this is a homestead, the owner may qualify for STAR (up to $30,000 off school taxes) and should check with the city assessor.`],
            ["How big is the lot?",found.frontage&&found.depth?`The lot is ${found.frontage} feet wide (frontage) by ${found.depth} feet deep — approximately ${nf(found.frontage*found.depth)} square feet total.`:"Lot dimensions are not available in this record."],
            ["When did it last sell?",found.deedYear?`According to the deed book reference, this property last changed ownership around ${found.deedYear}.`:"No deed year information is available for this parcel."],
          ].map(([q,a],i)=>(
            <div key={i} style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px",marginBottom:10}}>
              <div style={{fontFamily:"var(--fd)",fontSize:13,fontWeight:700,color:"var(--blue3)",marginBottom:6}}>Q: {q}</div>
              <div style={{fontSize:12,color:"var(--gray2)",lineHeight:1.8}}>{a}</div>
            </div>
          ))}
        </div>}
        {address&&!found&&<div style={{fontSize:12,color:"var(--gray2)",marginTop:10}}>No parcel found. Try partial address like "Academy" or "Willett".</div>}
      </Card>
      <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:12}}>Assessment Roll Glossary — Every Term Explained</div>
      <div style={{display:"grid",gap:10}}>
        {terms.map((t,i)=>(
          <div key={i} style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px"}}>
            <div style={{fontFamily:"var(--fd)",fontSize:13,fontWeight:700,color:"var(--amber2)",marginBottom:6}}>{t.term}</div>
            <div style={{fontSize:12,color:"var(--gray2)",lineHeight:1.8}}>{t.def}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════
   ROOT APP
════════════════════════════════════════ */
export default function App() {
  const [parcels,setParcels]=useState(SAMPLE);
  const [meta,setMeta]=useState({});
  const [dataSource,setDataSource]=useState("sample");
  const [tab,setTab]=useState("browse");
  const [compareList,setCompareList]=useState([]);
  const [uploading,setUploading]=useState(false);
  const [myHome,setMyHome]=useState(()=>{try{const s=localStorage.getItem("albany_my_home");return s?JSON.parse(s):null;}catch{return null;}});
  const [showHomeSetup,setShowHomeSetup]=useState(false);
  const [homeSetupAddr,setHomeSetupAddr]=useState("");
  const [drillList,setDrillList]=useState(null);
  const fileRef=useRef();

  const handleFile=useCallback(e=>{
    const f=e.target.files[0];if(!f)return;
    setUploading(true);
    const r=new FileReader();
    r.onload=ev=>{
      const raw=ev.target.result;
      const fname=f.name.toLowerCase();
      // Defer heavy processing so the browser paints the loading spinner first
      setTimeout(()=>{
        // ── JSON fast-load (pre-converted roll, ~50-100x faster than TXT) ──
        if(fname.endsWith(".json")){
          try{
            const payload=JSON.parse(raw);
            const arr=payload.parcels||payload;
            if(Array.isArray(arr)&&arr.length>0){
              if(payload.meta)setMeta(payload.meta);
              setParcels(arr);setDataSource("json");
            }
            else alert("JSON file does not contain a parcels array.");
          }catch(err){alert("Could not parse JSON: "+err.message);}
          setUploading(false);
          return;
        }
        // ── TXT / CSV path ──
        const isRoll=fname.endsWith(".txt")||raw.includes("HOMESTEAD PARCEL")||raw.includes("FULL MARKET VALUE");
        const parsed=isRoll?parseTextRoll(raw):parseCSV(raw);
        if(parsed.length>0){setParcels(parsed);setDataSource(isRoll?"roll":"csv");}
        else alert("Could not parse file — ensure it is an Albany CSV, Final Roll .txt, or converted .json file.");
        setUploading(false);
      },50);
    };
    r.readAsText(f);
  },[]);

  const toggleCompare=p=>{if(!p)return;setCompareList(prev=>prev.some(x=>x.parcelId===p.parcelId)?prev.filter(x=>x.parcelId!==p.parcelId):prev.length<4?[...prev,p]:prev);};
  const removeCompare=p=>{if(p)setCompareList(prev=>prev.filter(x=>x.parcelId!==p.parcelId));};
  const addToCompare=(p1,p2)=>{if(p2)toggleCompare(p2);};
  const saveHome=p=>{
    const next=p&&myHome?.parcelId===p.parcelId?null:{address:p.address,parcelId:p.parcelId,parcel:p};
    setMyHome(next);
    try{if(next)localStorage.setItem("albany_my_home",JSON.stringify(next));else localStorage.removeItem("albany_my_home");}catch{}
  };
  const setupHomeFromAddr=()=>{
    const p=parcels.find(x=>x.address.toLowerCase().includes(homeSetupAddr.toLowerCase()));
    if(p){saveHome(p);setShowHomeSetup(false);setHomeSetupAddr("");}
  };

  const stats=useMemo(()=>({
    total:parcels.length,
    totalFMV:parcels.reduce((s,p)=>s+p.fullMarketValue,0),
    avgFMV:parcels.length>0?Math.round(parcels.reduce((s,p)=>s+p.fullMarketValue,0)/parcels.length):0,
    exemptCount:parcels.filter(p=>p.exemptions.length>0).length,
    homesteadPct:parcels.length>0?Math.round(parcels.filter(p=>p.parcelType==="HOMESTEAD").length/parcels.length*100):0,
    absenteeCount:parcels.filter(p=>isAbsentee(p)).length,
  }),[parcels]);

  const TABS=[
    {id:"browse",icon:"🏠",label:"Browse"},
    {id:"analytics",icon:"📊",label:"Analytics"},
    {id:"ownership",icon:"👥",label:"Ownership"},
    {id:"equity",icon:"⚖️",label:"Equity"},
    {id:"opportunity",icon:"🏗️",label:"Opportunity"},
    {id:"taxtools",icon:"💰",label:"Tax Tools"},
    {id:"mapview",icon:"🗺️",label:"Map View"},
    {id:"dataquality",icon:"🔍",label:"Data Quality"},
    {id:"compare",icon:"📋",label:`Compare${compareList.length>0?` (${compareList.length})`:""}`,},
    {id:"guide",icon:"📚",label:"Buyer Guide"},
  ];

  return (
    <>
      <GS/>
      <div style={{minHeight:"100vh",background:"var(--bg)"}}>
        {/* HEADER */}
        <div style={{background:"linear-gradient(135deg,var(--bg2) 0%,var(--bg3) 100%)",borderBottom:"1px solid var(--border)",padding:"0 24px"}}>
          <div style={{maxWidth:1400,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 0",gap:16,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:42,height:42,background:"var(--blue)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🏛️</div>
              <div>
                <div style={{fontFamily:"var(--fd)",fontWeight:800,fontSize:20,letterSpacing:-.5}}>Albany Property Intelligence</div>
                <div style={{fontSize:11,color:"var(--gray)",marginTop:1}}>2025 Final Assessment Roll · City of Albany, NY · 10-Module Dashboard</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,background:"var(--card2)",border:"1px solid var(--border)",borderRadius:8,padding:"5px 12px"}}>
                <span className="pulse" style={{width:7,height:7,borderRadius:"50%",background:dataSource==="csv"?"#22c55e":"#f59e0b",display:"inline-block"}}></span>
                <span style={{fontSize:11,color:"var(--gray)",fontFamily:"var(--fm)"}}>{dataSource==="csv"?`${parcels.length.toLocaleString()} parcels loaded`:dataSource==="roll"?"Albany 2025 Roll loaded ✓ ("+parcels.length.toLocaleString()+" parcels)":dataSource==="csv"?"CSV loaded ✓ ("+parcels.length.toLocaleString()+" parcels)":"Demo: 62 real Albany 2025 parcels"}</span>
              </div>
              {myHome&&(
                <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.3)",borderRadius:8,padding:"5px 12px",cursor:"pointer"}} onClick={()=>setTab("browse")} title="Click to browse My Home">
                  <span>🏡</span>
                  <span style={{fontSize:11,color:"var(--green2)",fontWeight:600,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{myHome.address}</span>
                  <button onClick={e=>{e.stopPropagation();setMyHome(null);}} style={{background:"none",border:"none",color:"var(--gray3)",cursor:"pointer",fontSize:12,padding:0,marginLeft:2}}>✕</button>
                </div>
              )}
              <button onClick={()=>setShowHomeSetup(true)} style={{background:myHome?"rgba(34,197,94,.15)":"var(--card2)",color:myHome?"var(--green2)":"var(--gray)",border:`1px solid ${myHome?"rgba(34,197,94,.35)":"var(--border)"}`,borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                {myHome?"🏡 My Home":"🏡 Set My Home"}
              </button>
              <button onClick={()=>fileRef.current.click()} disabled={uploading} style={{background:"var(--blue)",color:"white",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                {uploading?"⏳ Parsing…":"⬆ Upload CSV / Roll / JSON"}
              </button>
              <input ref={fileRef} type="file" accept=".csv,.txt,.json" style={{display:"none"}} onChange={handleFile}/>
            </div>
          </div>
        </div>

        {/* STATS BAR */}
        <div style={{background:"var(--bg2)",borderBottom:"1px solid var(--border)",padding:"10px 24px"}}>
          <div style={{maxWidth:1400,margin:"0 auto",display:"flex",gap:10,flexWrap:"wrap",alignItems:"stretch"}}>
            <StatCard label="Total Parcels" value={nf(stats.total)} icon="🏘️" color="#3b82f6" sub="Properties in dataset"/>
            <StatCard label="Total Market Value" value={"$"+(stats.totalFMV/1000000).toFixed(1)+"M"} icon="💰" color="#f59e0b" sub="Assessor's estimated total"/>
            <StatCard label="Average FMV" value={"$"+(stats.avgFMV/1000).toFixed(0)+"K"} icon="📈" color="#0d9488" sub="Per parcel market value"/>
            <StatCard label="With Exemptions" value={nf(stats.exemptCount)} icon="🏷️" color="#a78bfa" sub={`${Math.round(stats.exemptCount/Math.max(stats.total,1)*100)}% have tax relief`} onClick={()=>setDrillList({title:"All Parcels With Exemptions",parcels:parcels.filter(p=>p.exemptions?.length>0)})}/>
            <StatCard label="Homestead Rate" value={stats.homesteadPct+"%"} icon="🏠" color="#22c55e" sub="Owner-occupied homes"/>
            <StatCard label="Absentee Owners" value={nf(stats.absenteeCount)} icon="📬" color="#f97316" sub={`${Math.round(stats.absenteeCount/Math.max(stats.total,1)*100)}% investor/rental owned`} onClick={()=>setDrillList({title:"All Absentee-Owned Parcels",parcels:parcels.filter(p=>isAbsentee(p))})}/>
          </div>
        </div>

        {/* TAB BAR */}
        <div style={{background:"var(--bg2)",borderBottom:"1px solid var(--border)",padding:"0 24px",overflowX:"auto"}}>
          <div style={{maxWidth:1400,margin:"0 auto",display:"flex",gap:2}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                background:tab===t.id?"var(--blue)":"transparent",color:tab===t.id?"white":"var(--gray2)",
                border:"none",borderRadius:"8px 8px 0 0",padding:"10px 16px",fontSize:12,fontWeight:600,cursor:"pointer",
                whiteSpace:"nowrap",transition:"all .15s",borderBottom:tab===t.id?"2px solid var(--blue2)":"2px solid transparent"
              }}>{t.icon} {t.label}</button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div style={{maxWidth:1400,margin:"0 auto",padding:"22px 24px 40px"}}>
          {tab==="browse"&&<Browse parcels={parcels} meta={meta} compareList={compareList} onCompare={toggleCompare} myHome={myHome} onSaveHome={saveHome} onOpenHomeSetup={()=>setShowHomeSetup(true)}/>}
          {tab==="analytics"&&<Analytics parcels={parcels} onDrill={setDrillList}/>}
          {tab==="ownership"&&<Ownership parcels={parcels} onDrill={setDrillList}/>}
          {tab==="equity"&&<Equity parcels={parcels} onDrill={setDrillList}/>}
          {tab==="opportunity"&&<Opportunity parcels={parcels} onDrill={setDrillList}/>}
          {tab==="taxtools"&&<TaxTools parcels={parcels} myHome={myHome}/>}
          {tab==="mapview"&&<MapView parcels={parcels} onDrill={setDrillList}/>}
          {tab==="dataquality"&&<DataQuality parcels={parcels} onDrill={setDrillList}/>}
          {tab==="compare"&&<Compare parcels={parcels} compareList={compareList} onRemove={removeCompare} onAdd={addToCompare}/>}
          {tab==="guide"&&<HomebuyerGuide parcels={parcels} myHome={myHome}/>}
        </div>

        {/* FOOTER */}
        <div style={{borderTop:"1px solid var(--border)",padding:"14px 24px",textAlign:"center",color:"var(--gray3)",fontSize:11}}>
          Albany Property Intelligence · 2025 Final Assessment Roll · City of Albany, NY · 27,555 Parcels · 10 Modules · Upload Albany County CSV or Final Roll .txt for full dataset
        </div>
      </div>

      {/* MY HOME SETUP MODAL */}
      {drillList&&<PropListModal data={drillList} onClose={()=>setDrillList(null)}/>}
      {showHomeSetup&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(4px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setShowHomeSetup(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:16,padding:28,maxWidth:520,width:"100%",boxShadow:"0 25px 60px rgba(0,0,0,.5)"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
              <span style={{fontSize:28}}>🏡</span>
              <div>
                <div style={{fontFamily:"var(--fd)",fontWeight:800,fontSize:20}}>Set My Home</div>
                <div style={{fontSize:12,color:"var(--gray)",marginTop:1}}>Save your address once — pre-filled everywhere</div>
              </div>
            </div>
            <div style={{fontSize:12,color:"var(--gray2)",lineHeight:1.8,marginBottom:18,paddingBottom:18,borderBottom:"1px solid var(--border)"}}>
              Once saved, your home address will be pre-filled in the <b style={{color:"var(--white)"}}>Tax Savings Estimator</b>, <b style={{color:"var(--white)"}}>Neighbor Comparison</b>, <b style={{color:"var(--white)"}}>School Tax Burden</b>, and <b style={{color:"var(--white)"}}>Homebuyer Guide</b> — so you never have to type it again. Your address is saved only in this browser and never transmitted anywhere.
            </div>
            {myHome&&(
              <div style={{background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.25)",borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:"var(--green2)"}}>Currently Saved Home</div>
                  <div style={{fontSize:14,fontWeight:600,marginTop:2}}>{myHome.address}</div>
                  <div style={{fontFamily:"var(--fm)",fontSize:10,color:"var(--gray)",marginTop:1}}>Parcel {myHome.parcelId}</div>
                </div>
                <button onClick={()=>{saveHome(myHome.parcel);setShowHomeSetup(false);}} style={{background:"rgba(220,38,38,.15)",border:"1px solid rgba(220,38,38,.3)",color:"#f87171",borderRadius:8,padding:"6px 12px",fontSize:11,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>✕ Clear</button>
              </div>
            )}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:600,color:"var(--gray)",marginBottom:8}}>Search for your address in the dataset:</div>
              <div style={{display:"flex",gap:10}}>
                <input
                  autoFocus
                  placeholder="e.g. 77 Academy, 15 Quail…"
                  value={homeSetupAddr}
                  onChange={e=>setHomeSetupAddr(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&setupHomeFromAddr()}
                  style={{flex:1,background:"var(--bg3)",border:"1px solid var(--border2)",color:"var(--white)",borderRadius:9,padding:"10px 14px",fontSize:14,fontFamily:"var(--fb)"}}
                />
                <button onClick={setupHomeFromAddr} style={{background:"var(--green)",color:"white",border:"none",borderRadius:9,padding:"10px 18px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Save</button>
              </div>
              {homeSetupAddr&&!parcels.find(x=>x.address.toLowerCase().includes(homeSetupAddr.toLowerCase()))&&(
                <div style={{fontSize:11,color:"var(--red2)",marginTop:8}}>No matching address found. Try a partial address like "Academy" or "Willett". Make sure the full roll CSV is loaded if your address isn't in the sample data.</div>
              )}
            </div>
            <div style={{fontSize:11,color:"var(--gray3)",marginTop:14}}>💡 Tip: You can also save your home by clicking any property card in the Browse tab and selecting "Save as My Home".</div>
            <button onClick={()=>setShowHomeSetup(false)} style={{marginTop:18,width:"100%",background:"var(--card2)",border:"1px solid var(--border)",color:"var(--gray)",borderRadius:9,padding:"9px",fontSize:13,cursor:"pointer"}}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}

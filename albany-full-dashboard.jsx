import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, LineChart, Line, Legend } from "recharts";
import { LeafletMapView } from "./leaflet-map.jsx";
import { AddressAutocompleteInput, findBestAddressMatch } from "./address-autocomplete.jsx";
import propertyTypeClassificationCodes from "./property-type-classification-codes.json";
import grievanceSettings from "./grievance-settings.json";

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ GLOBAL STYLES ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
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
    .app-shell{max-width:1400px;margin:0 auto;padding:0 24px}
    .hero-grid{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(320px,.95fr);gap:18px;align-items:stretch}
    .summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
    .quick-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .mode-nav{display:flex;gap:8px;flex-wrap:wrap}
    .resident-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
    .app-header-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .app-brand{display:flex;align-items:center;gap:14px;min-width:0}
    .app-title{font-family:var(--fd);font-weight:800;font-size:24px;letter-spacing:-.6px;line-height:1.1}
    .hero-title{font-family:var(--fd);font-size:36px;line-height:1.05;font-weight:800;margin-top:10px;max-width:720px}
    .app-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .hero-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
    .tab-rail{display:flex;gap:6px;flex-wrap:wrap;padding-top:8px;padding-bottom:8px}
    .desktop-tab-rail{display:block}
    .mobile-tab-shell{display:none}
    .mobile-tab-trigger{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;background:rgba(255,255,255,.92);border:1px solid var(--border);border-radius:12px;padding:12px 14px;font-size:13px;font-weight:700;color:var(--gray);cursor:pointer}
    .mobile-tab-list{display:grid;gap:8px;margin-top:10px}
    .mobile-tab-item{width:100%;text-align:left;background:rgba(255,255,255,.92);border:1px solid var(--border);border-radius:10px;padding:11px 13px;font-size:13px;font-weight:700;color:var(--gray);cursor:pointer}
    .tab-chip{display:flex;align-items:center;justify-content:center;white-space:nowrap;text-align:center}
    .leaflet-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,400px);gap:14px;align-items:start}
    .panel-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,380px);gap:18px;align-items:start}
    .leaflet-layout>*,.panel-split>*{min-width:0}
    .metric-grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
    .cols-2{grid-template-columns:1fr 1fr}
    .cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
    @media (max-width: 1100px){
      .leaflet-layout,.panel-split{grid-template-columns:1fr}
    }
    @media (max-width: 980px){
      .hero-grid,.resident-grid,.quick-grid{grid-template-columns:1fr}
      .summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .app-header-row{align-items:flex-start}
      .app-brand{width:100%}
      .app-toolbar{width:100%}
      .tab-rail{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .tab-chip{width:100%;white-space:normal;min-height:44px}
      .hero-title{font-size:30px}
    }
    @media (max-width: 760px){
      .cols-2,.cols-3{grid-template-columns:1fr}
      .app-toolbar{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .app-toolbar > *{min-width:0;width:100%}
      .hero-title{font-size:26px}
      .app-title{font-size:20px}
    }
    @media (max-width: 640px){
      .app-shell{padding:0 14px}
      .summary-grid,.metric-grid-2,.cols-2,.cols-3{grid-template-columns:1fr}
      .tab-rail{grid-template-columns:1fr}
      .desktop-tab-rail{display:none}
      .mobile-tab-shell{display:block}
      .app-toolbar{grid-template-columns:1fr}
      .hero-actions{flex-direction:column;align-items:stretch}
      .hero-actions > button{width:100%}
      .hero-title{font-size:22px}
    }
  `}</style>
);

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ INFO BOX ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â contextual description blocks used throughout ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
const InfoBox = ({icon="Info", title, children, color="#3b82f6"}) => (
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

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ MY HOME BANNER ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â shown inside lookup panels when home is saved ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
const MyHomeBanner = ({myHome, onUse, label="Use My Home"}) => {
  if(!myHome) return null;
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.25)",borderRadius:9,padding:"10px 14px",marginBottom:12}}>
      <span style={{fontSize:16}}>Home</span>
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:600,color:"var(--green2)"}}>My Home is saved</div>
        <div style={{fontSize:11,color:"var(--gray2)",marginTop:1}}>{myHome.address}{parcelAreaSummary(myHome.parcel)?` | ${parcelAreaSummary(myHome.parcel)}`:""}</div>
      </div>
      <button onClick={onUse} style={{background:"var(--green)",color:"white",border:"none",borderRadius:7,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{label}</button>
    </div>
  );
};

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ REAL SAMPLE DATA (62 parcels ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Albany 2025 Final Assessment Roll) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
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

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ CSV PARSER ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â supports Albany County Parcels 2024 CSV + generic formats ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
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
    printKey:find("print_key","printkey"),
    pinSbl:find("pin_sbl","pinsbl","pin_sbl_id","pin"),
    swis:find("swis_code","swis","swiscode"),
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
    const saleYear = saleDateM?parseInt(saleDateM[1],10):null;
    const saleDate = saleDateM?`${saleDateM[2]}/${saleDateM[3]}/${saleDateM[1]}`:null;
    const yrb = parseInt(r(c.yrb),10)||null;
    const parcelIdRaw = r(c.id)||r(c.printKey)||r(c.pinSbl)||`ROW-${i+1}`;
    return {
      parcelId:parcelIdRaw,
      printKey:r(c.printKey)||parcelIdRaw,
      pinSbl:r(c.pinSbl)||null,
      swisCode:normalizeSwisCode(r(c.swis)),
      address:addr,
      zip:normalizeZip5(r(c.zip))||"12200",
      neighborhood:r(c.muni)||"Albany",
      owner1:r(c.own1)||"Unknown",
      owner2:r(c.own2)||null,
      propClass:r(c.cls)||"000",
      propClassDesc:r(c.clsd)||"Unknown",
      parcelType:r(c.typ)||"UNKNOWN",
      landValue:num(r(c.land)),
      assessedValue:num(r(c.tot)),
      fullMarketValue:num(r(c.fmv)),
      countyTaxable:num(r(c.cty))||num(r(c.tot)),
      cityTaxable:num(r(c.city))||num(r(c.tot)),
      schoolTaxable:num(r(c.sch))||num(r(c.tot)),
      frontage:num(r(c.frnt)),
      depth:num(r(c.dpth)),
      deedYear:saleYear,
      saleDate,
      eastCoord:0,
      nrthCoord:0,
      exemptions:[],
      mailAddress:r(c.mail)||addr,
      yearBuilt:yrb&&yrb>1800&&yrb<=2025?yrb:null,
      municipality:r(c.muni)||null,
      county:null,
      state:"NY",
      schoolDistrict:r(c.schdist)||null,
      acres:parseFloat(r(c.acres))||null,
      waterType:r(c.water)?WATER[r(c.water)]||null:null,
      sewerType:r(c.sewer)?SEWER[r(c.sewer)]||null:null,
      parcelArea:num(r(c.shapearea))||null,
      assessmentYear:null,
      rollType:null,
    };
  }).filter(p=>p.parcelId);
}

function normalizeParcelId(raw){
  return (raw||"").toString().trim().replace(/[\u2010-\u2015\u2212]/g,"-").replace(/\s+/g,"").replace(/^(?:sbl|pin|printkey)[:\s-]*/i,"");
}

function normalizeSwisCode(raw){
  const digits = (raw||"").toString().replace(/\D/g,"");
  if(!digits) return "";
  return digits.padStart(6,"0").slice(-6);
}

function normalizeZip5(raw){
  const match = (raw||"").toString().match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : "";
}

function normalizeRollType(raw){
  const value = (raw||"").toString().toLowerCase();
  if(!value) return "";
  if(value.includes("tent")) return "tentative";
  if(value.includes("final")) return "final";
  return value;
}

function inferAssessmentYearFromText(raw){
  const match = (raw||"").toString().match(/\b(20\d{2})\b/);
  return match ? parseInt(match[1],10) : null;
}

function parseRollDate(raw){
  const MONTHS = {jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"};
  const match = (raw||"").toString().trim().match(/^([A-Za-z]{3})\s+(\d{2}),\s*(\d{4})$/);
  if(!match) return null;
  const mm = MONTHS[match[1].toLowerCase()];
  return mm ? `${match[3]}-${mm}-${match[2]}` : null;
}

function normalizeDatasetMeta(meta={}, parcels=[], sourceName=""){
  const next = meta && typeof meta==="object" ? {...meta} : {};
  const sample = Array.isArray(parcels) && parcels.length ? parcels[0] : null;
  const sourceText = [sourceName, next.source, next.sourceFile, next.dataset, next.title].filter(Boolean).join(" ");
  const municipality = next.municipality || sample?.municipality || (/albany/i.test(sourceText) ? "Albany" : null);
  const county = next.county || sample?.county || (/albany/i.test(sourceText) ? "Albany" : null);
  const swisValues = new Set((Array.isArray(parcels)?parcels:[]).map(p=>normalizeSwisCode(p?.swisCode)).filter(Boolean));
  const assessmentYear = parseInt(next.assessmentYear,10) || parseInt(sample?.assessmentYear,10) || inferAssessmentYearFromText(sourceText) || null;
  const rollType = normalizeRollType(next.rollType || sample?.rollType || sourceText);
  const swisCode = normalizeSwisCode(next.swisCode || sample?.swisCode || (swisValues.size===1 ? [...swisValues][0] : "") || ((municipality||"").toLowerCase()==="albany" ? "010100" : ""));
  const uniformPercentOfValue = next.uniformPercentOfValue!=null && next.uniformPercentOfValue!=="" ? parseFloat(next.uniformPercentOfValue) : null;
  return {
    ...next,
    assessmentYear,
    rollType,
    swisCode,
    municipality,
    county,
    state: next.state || sample?.state || "NY",
    source: next.source || sourceName || null,
    valuationDate: next.valuationDate || null,
    taxableStatusDate: next.taxableStatusDate || null,
    uniformPercentOfValue: Number.isFinite(uniformPercentOfValue) ? uniformPercentOfValue : null,
  };
}

const APP_TAB_IDS = new Set(["home","browse","mapview","equity","taxtools","compare","ownership","analytics","opportunity","dataquality","guide"]);
const COMPARE_SNAPSHOT_QUERY_KEYS = ["tab","tool","subject","comps","dataset","label"];
function slugifyShareLabel(raw){
  return (raw||"").toString().trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}
function buildComparableDatasetKey(meta={}, parcels=[]){
  const normalized = normalizeDatasetMeta(meta, parcels);
  const year = normalized.assessmentYear ? String(normalized.assessmentYear) : "";
  const rollType = normalizeRollType(normalized.rollType||"");
  const swisCode = normalizeSwisCode(normalized.swisCode||"");
  if(year && rollType) return [year, rollType, swisCode || "albany"].filter(Boolean).join("-");
  return swisCode ? `albany-roll-${swisCode}` : "albany-roll";
}
function parseComparableSnapshotSearch(searchString=""){
  const params = new URLSearchParams((searchString||"").toString().replace(/^\?/,""));
  const rawSubjectId = normalizeParcelId(params.get("subject") || "");
  const rawCompIds = (params.get("comps") || "").split(",").map(normalizeParcelId).filter(Boolean);
  const compIds = [...new Set(rawCompIds)];
  const tool = (params.get("tool") || "").trim().toLowerCase();
  const tab = (params.get("tab") || "").trim().toLowerCase();
  return {
    tab: APP_TAB_IDS.has(tab) ? tab : ((tool==="neighbor" && (rawSubjectId || compIds.length)) ? "taxtools" : ""),
    tool,
    subjectId: rawSubjectId,
    compIds,
    datasetKey: (params.get("dataset") || "").trim(),
    label: (params.get("label") || "").trim(),
    hasSnapshot: !!(rawSubjectId || compIds.length),
  };
}
function buildComparableSnapshotUrl({subjectId="", compIds=[], datasetKey="", label=""}={}){
  if(typeof window==="undefined") return "";
  const url = new URL(window.location.href);
  const params = url.searchParams;
  params.set("tab", "taxtools");
  params.set("tool", "neighbor");
  const normalizedSubjectId = normalizeParcelId(subjectId);
  const normalizedCompIds = [...new Set((compIds||[]).map(normalizeParcelId).filter(Boolean))];
  if(normalizedSubjectId) params.set("subject", normalizedSubjectId);
  else params.delete("subject");
  if(normalizedCompIds.length) params.set("comps", normalizedCompIds.join(","));
  else params.delete("comps");
  if(datasetKey) params.set("dataset", datasetKey);
  else params.delete("dataset");
  const labelSlug = slugifyShareLabel(label);
  if(labelSlug) params.set("label", labelSlug);
  else params.delete("label");
  return url.toString();
}
function replaceComparableSnapshotUrl(snapshot){
  const href = buildComparableSnapshotUrl(snapshot);
  if(!href || typeof window==="undefined") return "";
  try{ window.history.replaceState({}, "", href); }catch{}
  return href;
}

function extractPayloadMeta(payload){
  if(!payload || Array.isArray(payload) || typeof payload!=="object") return {};
  const meta = payload.meta && typeof payload.meta==="object" ? payload.meta : {};
  return normalizeDatasetMeta({
    ...meta,
    assessmentYear: payload.assessmentYear ?? meta.assessmentYear,
    rollType: payload.rollType ?? meta.rollType,
    swisCode: payload.swisCode ?? meta.swisCode,
    municipality: payload.municipality ?? meta.municipality,
    county: payload.county ?? meta.county,
    state: payload.state ?? meta.state,
    source: payload.source ?? meta.source ?? payload.sourceFile ?? meta.sourceFile,
    valuationDate: payload.valuationDate ?? meta.valuationDate,
    taxableStatusDate: payload.taxableStatusDate ?? meta.taxableStatusDate,
    uniformPercentOfValue: payload.uniformPercentOfValue ?? meta.uniformPercentOfValue,
  }, Array.isArray(payload.parcels) ? payload.parcels : [], payload.source || "");
}

function extractRollMetadata(text, sourceName=""){
  const raw = (text||"").toString();
  const lines = raw.split(/\r?\n/);
  const tidyName = value => value ? value.toString().trim().replace(/\s+/g, " ").replace(/\b[a-z]/g, ch => ch.toUpperCase()) : null;
  const headerLine = lines.find(line => /COUNTY/i.test(line) && /SWIS/i.test(line)) || "";
  const rollLine = lines.find(line => line.replace(/\s+/g, "").toUpperCase().includes("ASSESSMENTROLL")) || "";
  const compactRollLine = rollLine.replace(/\s+/g, "").toUpperCase();
  const county = tidyName(headerLine.match(/COUNTY\s*-\s*([A-Za-z .']+?)(?=\s+(?:CITY|TOWN|VILLAGE)\s*-|$)/i)?.[1]) || null;
  const municipality = tidyName(headerLine.match(/(?:CITY|TOWN|VILLAGE)\s*-\s*([A-Za-z .']+?)(?=\s+SWIS\s*-|$)/i)?.[1]) || null;
  const swisCode = normalizeSwisCode(headerLine.match(/SWIS\s*-\s*(\d{6})/i)?.[1] || "");
  const yearMatch = compactRollLine.match(/(20\d{2})(FINAL|TENTATIVE)ASSESSMENTROLL/i);
  const assessmentYear = yearMatch ? parseInt(yearMatch[1], 10) : inferAssessmentYearFromText(sourceName) || inferAssessmentYearFromText(raw);
  const rollType = yearMatch ? normalizeRollType(yearMatch[2]) : normalizeRollType(sourceName);
  const valuationDate = parseRollDate(raw.match(/VALUATION DATE-([A-Z]{3}\s+\d{2},\s+\d{4})/i)?.[1] || "");
  const taxableStatusDate = parseRollDate(raw.match(/TAXABLE STATUS DATE-([A-Z]{3}\s+\d{2},\s+\d{4})/i)?.[1] || "");
  const uniformPercentOfValue = raw.match(/UNIFORM PERCENT OF VALUE IS\s+([0-9.]+)/i)?.[1] || null;
  return normalizeDatasetMeta({
    assessmentYear,
    rollType,
    swisCode,
    municipality: municipality || "Albany",
    county: county || "Albany",
    state: "NY",
    source: sourceName || null,
    valuationDate,
    taxableStatusDate,
    uniformPercentOfValue,
  }, [], sourceName);
}

function parseTextRoll(text, rollMeta) {
  const datasetMeta = normalizeDatasetMeta(rollMeta || extractRollMetadata(text), [], "Albany assessment roll");
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
  const swisPattern = datasetMeta.swisCode || "010100";
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
    let ownM=blk.match(new RegExp("(?:\\t|\\n)([A-Z][^\\t\\n]+?)\\t(?:Albany|ALBANY)\\s*\\t?"+swisPattern))||
             blk.match(new RegExp("(?:\\t|\\n)([A-Z][^\\t\\n]+?)\\s{3,}(?:Albany|ALBANY)\\s*\\t?"+swisPattern));
    if(!ownM)ownM=blk.match(new RegExp("([A-Z][^0-9\\t\\n]{2,45}?)\\s+(?:Albany|ALBANY)\\s*\\t?"+swisPattern));
    let owner1=ownM?ownM[1].trim().replace(/\s*(?:BAS STAR|ENH STAR|AGED|VET|WHOLLY).*$/i,"").trim():null;
    const own2M=blk.match(/\n([A-Z][^0-9\t\n]+?)\tFRNT/)||blk.match(/[\d,]+ ([A-Z][^0-9\t\n]+?)\tFRNT/);
    let owner2=own2M?own2M[1].trim():null;
    if(owner2===owner1||owner2===address)owner2=null;
    const landM=blk.match(new RegExp(swisPattern+"\\s+([\\d,]+)\\s+(?:COUNTY|CITY)\\s+TAXABLE"));
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
    const eastCoord=coordM?parseInt(coordM[1],10):0;
    const nrthCoord=coordM?parseInt(coordM[2],10):0;
    const deedM=blk.match(/DEED BOOK\s+(\d{4})\s+PG/);
    const dy=deedM?parseInt(deedM[1],10):null;
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
      parcelId:pid,
      parcelIdNorm:normalizeParcelId(pid),
      printKey:pid,
      pinSbl:null,
      swisCode:datasetMeta.swisCode || swisPattern,
      assessmentYear:datasetMeta.assessmentYear || null,
      rollType:datasetMeta.rollType || null,
      address,
      zip,
      neighborhood:datasetMeta.municipality || "Albany",
      owner1:owner1||"Unknown",
      owner2,
      propClass,
      propClassDesc,
      parcelType,
      landValue,
      assessedValue,
      fullMarketValue,
      countyTaxable,
      cityTaxable,
      schoolTaxable,
      frontage,
      depth,
      deedYear,
      eastCoord,
      nrthCoord,
      exemptions,
      mailAddress,
      yearBuilt:null,
      municipality:datasetMeta.municipality || "Albany",
      county:datasetMeta.county || "Albany",
      state:datasetMeta.state || "NY",
      schoolDistrict:"Albany",
      acres:null,
      waterType:null,
      sewerType:null,
      parcelArea:null,
      saleDate:null,
    };
  }).filter(p=>p.parcelId&&p.assessedValue>=0);
}

const $f = v => v==null?"-":"$"+Number(v).toLocaleString();
const nf = v => v==null?"-":Number(v).toLocaleString();
const eqR = p => p.fullMarketValue>0?((p.assessedValue/p.fullMarketValue)*100).toFixed(1):"-";
const eqFlag = p => { const r=parseFloat(eqRFast(p)); if(isNaN(r))return"neutral"; if(r<80)return"under"; if(r>120)return"over"; return"fair"; };
const FC = {under:"#f59e0b",over:"#dc2626",fair:"#22c55e",neutral:"#64748b"};
const FL = {under:"Under-Assessed",over:"Over-Assessed",fair:"Fair Value",neutral:"No Data"};
const lotSqFt = p => p.frontage&&p.depth?p.frontage*p.depth:null;
const gentriIdx = p => p.assessedValue>0?(p.landValue/p.assessedValue*100).toFixed(1):0;
function normalizeStreetKeyForCompare(raw){
  if(!raw) return "";
  const DIR = {n:"n",north:"n",s:"s",south:"s",e:"e",east:"e",w:"w",west:"w",ne:"ne",northeast:"ne",nw:"nw",northwest:"nw",se:"se",southeast:"se",sw:"sw",southwest:"sw"};
  const SUF = {street:"st",st:"st",avenue:"ave",ave:"ave",road:"rd",rd:"rd",boulevard:"blvd",blvd:"blvd",drive:"dr",dr:"dr",lane:"ln",ln:"ln",court:"ct",ct:"ct",terrace:"ter",ter:"ter",place:"pl",pl:"pl",circle:"cir",cir:"cir",way:"way",highway:"hwy",hwy:"hwy",parkway:"pkwy",pkwy:"pkwy"};
  const STOP = new Set(["apt","apartment","unit","ste","suite","fl","floor","rm","room"]);
  const ROLL_NOISE = new Set(["frnt","dpth","taxable","value","county","city","school"]);
  const tokens = raw.toString().toLowerCase()
    .replace(/[\r\n,]+/g," ")
    .replace(/[^\w\s#-]/g," ")
    .replace(/\s+/g," ")
    .trim()
    .split(" ")
    .filter(Boolean);
  const isNumTok = t => /^\d+[a-z]?$/.test(t);
  const scoreCandidate = startIdx => {
    for(let j=startIdx+1;j<Math.min(tokens.length,startIdx+7);j++){
      const tj = tokens[j];
      if(/^\d{5}(?:-\d{4})?$/.test(tj) || tj==="ny") break;
      if(SUF[tj]){
        const middle = tokens.slice(startIdx+1,j);
        const alphaCount = middle.filter(x=>/[a-z]/.test(x) && !DIR[x] && !SUF[x]).length;
        const numNoise = middle.filter(x=>/^\d+$/.test(x) || isNumTok(x)).length;
        if(alphaCount<1) return null;
        return { score: (numNoise*10) + (j-startIdx), j };
      }
    }
    return null;
  };
  let startIndex = -1;
  let best = null;
  for(let i=0;i<tokens.length;i++){
    if(!isNumTok(tokens[i])) continue;
    const cand = scoreCandidate(i);
    if(!cand) continue;
    if(!best || cand.score<best.score || (cand.score===best.score && i>startIndex)){
      best = cand;
      startIndex = i;
    }
  }
  if(startIndex<0) startIndex = tokens.findIndex(isNumTok);
  const out = [];
  let started = startIndex>=0;
  for(let i=started?startIndex:0;i<tokens.length;i++){
    let t = tokens[i];
    if(!started){
      if(isNumTok(t)){ started = true; out.push(t.replace(/^0+(?=\d)/,"")); }
      continue;
    }
    if(/^\d{5}(?:-\d{4})?$/.test(t) || t==="ny") break;
    if(t==="albany" && out.length>=2) break;
    if(t==="new" && tokens[i+1]==="york") break;
    if(/^east-?\d+$/i.test(t) || /^nrth-?\d+$/i.test(t) || ROLL_NOISE.has(t)) break;
    if(t.startsWith("#") || STOP.has(t)) break;
    t = DIR[t] || SUF[t] || t;
    out.push(t);
    if(out.length>=5) break;
  }
  return out.join(" ");
}

function normalizeOwnerPortfolioKey(raw){
  return (raw||"").toString().toLowerCase().replace(/[\r\n]+/g," ").replace(/[^\w\s&-]/g," ").replace(/\s+/g," ").trim();
}

function classifyOwnerEntity(raw){
  const name = normalizeOwnerPortfolioKey(raw);
  if(!name) return null;
  if(/\b(city of|county of|state of|authority|department|school district)\b/.test(name)) return "public";
  if(/\b(church|ministry|temple|foundation|not for profit|nonprofit|historical society)\b/.test(name)) return "nonprofit";
  if(/\btrust|estate\b/.test(name)){
    if(/\bfamily\b|\birr-?trust\b|\brev(?:ocable)? trust\b|\birrevocable\b|\bliving trust\b|\bsupplemental needs\b/.test(name)) return "family_trust";
    return "trust";
  }
  if(/\b(llc|inc|incorporated|corp|corporation|company|lp|llp|ltd|holdings?|properties?|realty|associates?|management|partners?|housing|development|capital|ventures|fund|bank)\b/.test(name)) return "corporate";
  return null;
}

function ownerLooksLikeEntity(raw){
  return !!classifyOwnerEntity(raw);
}

function hasOwnerOccupancyExemption(p){
  return Array.isArray(p?.exemptions) && p.exemptions.some(ex=>{
    const label = `${ex?.name||""} ${ex?.code||""}`.toLowerCase();
    return /\bstar\b|enh star|basic star|senior|aged|disab|vet|veteran/.test(label);
  });
}

function compareAddressCandidateToProperty(candidate, propertyAddress, zip){
  const mail = (candidate||"").toString();
  if(!mail) return null;
  const mailLower = mail.toLowerCase();
  const zip5 = normalizeZip5(zip||"");
  if(/^\s*0+\b/.test(mailLower) && /\balbany\b/.test(mailLower) && (!zip5 || mailLower.includes(zip5))) return true;
  const propKey = normalizeStreetKeyForCompare(propertyAddress||"");
  if(!propKey) return null;
  const mailKey = normalizeStreetKeyForCompare(mail);
  if(!mailKey) return null;
  if(mailKey.includes(propKey) || propKey.includes(mailKey)) return true;
  const a = propKey.split(" ");
  const b = mailKey.split(" ");
  if(a.length>=2 && b.length>=2 && a[0]===b[0] && a[1]===b[1]) return true;
  const aNum = parseInt((a[0]||"").match(/\d+/)?.[0]||"",10);
  const bNum = parseInt((b[0]||"").match(/\d+/)?.[0]||"",10);
  const aStreet = a.slice(1).join(" ");
  const bStreet = b.slice(1).join(" ");
  const sameZipOrAlbany = (!zip5 || mailLower.includes(zip5)) && /\balbany\b/.test(mailLower);
  if(aStreet && bStreet && aStreet===bStreet && sameZipOrAlbany && Number.isFinite(aNum) && Number.isFinite(bNum) && Math.abs(aNum-bNum)<=2) return true;
  return false;
}

function mailingAddressMatchesProperty(p){
  const checks = [
    compareAddressCandidateToProperty(p?.mailAddress||p?.mailAddressClean||"", p?.address, p?.zip),
    compareAddressCandidateToProperty(p?.mailAddressRaw||"", p?.address, p?.zip),
  ].filter(v=>v!==null);
  if(checks.includes(true)) return true;
  if(checks.includes(false)) return false;
  return null;
}

function mailingAddressLooksSpecial(raw){
  const value = (raw||"").toString().toLowerCase();
  return /\bp\.?\s*o\.?\s*box\b|\bpo box\b|\bpmb\b|\bups\b|\bmailboxes\b|\bc\/o\b|\bcare of\b/.test(value);
}

function mailingOutsideAlbany(p){
  const mail = ((p?.mailAddressRaw||p?.mailAddress||p?.mailAddressClean)||"").toString().toLowerCase();
  if(!mail) return false;
  return !/\balbany\b/.test(mail);
}

function propertyLooksLikeOwnerOccupiedHome(p){
  return p?.parcelType === "HOMESTEAD" && ["210","215","220","230","270","280","281","482"].includes((p?.propClass||"").toString());
}

function buildAbsenteeModel(p, ownerPortfolioInfo=1){
  const positiveSignals = [];
  const negativeSignals = [];
  let score = 0;
  const mailingMatch = mailingAddressMatchesProperty(p);
  const ownerEntityType = classifyOwnerEntity(`${p?.owner1||""} ${p?.owner2||""}`.trim());
  const ownerEntity = !!ownerEntityType;
  const ownerOccupancyExemption = hasOwnerOccupancyExemption(p);
  const ownerPortfolio = typeof ownerPortfolioInfo === "object" && ownerPortfolioInfo ? ownerPortfolioInfo : { count: ownerPortfolioInfo };
  const ownerPortfolioCount = Math.max(1, parseInt(ownerPortfolio?.count, 10) || 1);
  const ownerPortfolioOffsiteCount = Math.max(0, parseInt(ownerPortfolio?.offsiteMailCount, 10) || 0);
  if(mailingMatch===false){
    score += 1;
    positiveSignals.push("mailing address differs from the property");
  }
  if(mailingAddressLooksSpecial(p?.mailAddressRaw||p?.mailAddress||p?.mailAddressClean||"")){
    score += 2;
    positiveSignals.push("mail goes to a P.O. box or commercial mail address");
  }
  if(ownerEntityType === "corporate" || ownerEntityType === "public" || ownerEntityType === "nonprofit"){
    score += 4;
    positiveSignals.push("owner appears to be an LLC, corporation, nonprofit, or public entity");
  }else if(ownerEntityType === "trust"){
    score += 1;
    positiveSignals.push("owner is held in a trust");
  }
  if(ownerPortfolioOffsiteCount>=2 && ownerPortfolioCount>=3){
    score += ownerPortfolioOffsiteCount>=4 ? 3 : 2;
    positiveSignals.push("same owner has other Albany parcels mailed to another address");
  }
  if(ownerPortfolioCount>=10){
    score += 3;
    positiveSignals.push("same owner appears on 10 or more Albany parcels");
  }else if(ownerPortfolioCount>=5){
    score += 3;
    positiveSignals.push("same owner appears on 5 or more Albany parcels");
  }else if(ownerPortfolioCount>=3){
    score += 2;
    positiveSignals.push("same owner appears on multiple Albany parcels");
  }else if(ownerPortfolioCount===2){
    score += 1;
    positiveSignals.push("same owner appears on more than one Albany parcel");
  }
  if(mailingMatch===false && mailingOutsideAlbany(p)){
    score += 1;
    positiveSignals.push("tax bill is mailed outside Albany");
  }
  if(p?.entityRegistryMatch?.propertyAddressMatch){
    score -= 4;
    negativeSignals.push("corporate filing address matches the property");
  }else if(p?.entityRegistryMatch?.matched && ownerEntityType === "corporate"){
    score += 1;
    positiveSignals.push("corporate filing address does not match the property");
  }
  if(ownerOccupancyExemption){
    score -= 4;
    negativeSignals.push("owner-occupancy exemption is on record");
  }
  if(mailingMatch===true){
    score -= 2;
    negativeSignals.push("mailing address matches the property");
  }
  if(ownerEntityType === "family_trust" && propertyLooksLikeOwnerOccupiedHome(p) && mailingMatch===true){
    score -= 3;
    negativeSignals.push("family trust ownership on a homestead parcel is common for owner-occupants");
  }
  const flag = score >= 2;
  const confidence = flag ? (score >= 4 ? "high" : "moderate") : (score > 0 ? "low" : "owner_occupied_likely");
  const label = flag ? (score >= 4 ? "Likely absentee" : "Possible absentee") : (score > 0 ? "Weak absentee signal" : "Owner-occupied likely");
  const signals = [...positiveSignals, ...negativeSignals];
  const reason = signals[0] || (flag ? "ownership pattern suggests off-site ownership" : "no strong off-site ownership signal");
  return { flag, score, confidence, label, reason, signals, positiveSignals, negativeSignals, ownerEntity, ownerEntityType, ownerPortfolioCount, ownerPortfolioOffsiteCount, ownerOccupancyExemption, mailingMatch };
}

function computeAbsenteeFlag(p, options={}){
  return buildAbsenteeModel(p, options.ownerPortfolio || options.ownerPortfolioCount).flag;
}

const isAbsentee = p => buildAbsenteeModel(p).flag;
const COLORS = ["#3b82f6","#f59e0b","#0d9488","#a78bfa","#f97316","#ec4899","#22c55e","#06b6d4","#dc2626","#facc15"];

/* Performance helpers */
function inferNeighborhoodFallback(zip){
  const z = (zip||"").toString().trim();
  if(!z) return "Albany";
  const byZip = {
    "12203":"Westland Hills",
    "12206":"West Hill / Pine Hills",
    "12207":"Downtown / Arbor Hill",
    "12208":"Pine Hills",
    "12209":"South End",
    "12210":"Center Square / Washington Park",
    "12211":"Albany",
  };
  return byZip[z] || "Albany";
}

function cleanMailAddress(raw, address="", zip=""){
  const source = (raw||"").toString().replace(/\s+/g," ").trim();
  const propKey = normalizeStreetKeyForCompare(address);
  const sourceKey = normalizeStreetKeyForCompare(source);
  const cityZip = source.match(/([A-Za-z .\'-]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/);
  if(cityZip){
    const cleaned = cityZip[1].replace(/^0+\s*/,"").replace(/\s+/g," ").trim();
    if(cleaned){
      const cleanedLower = cleaned.toLowerCase();
      if(propKey && sourceKey && sourceKey.includes(propKey) && /\balbany\b/.test(cleanedLower) && (!zip || cleanedLower.includes((zip||"").toString().toLowerCase()))) return `${address}, ${cleaned}`.trim();
      return cleaned;
    }
  }
  if(/^0+\b/i.test(source) && zip) return `Albany, NY ${zip}`;
  if(/^0+\b/i.test(source)) return "Albany, NY";
  if(/wholly,? ex|taxable value|nrth-|east-|front|dpth|school|city|county/i.test(source)){
    if(address && propKey && sourceKey && sourceKey.includes(propKey)) return `${address}, Albany, NY ${zip||""}`.replace(/,\s*$/,"").trim();
    return zip ? `Albany, NY ${zip}` : "Albany, NY";
  }
  return source || (zip ? `Albany, NY ${zip}` : "");
}
function buildCanonicalRecordKey(p, datasetMeta={}){
  const year = parseInt(p?.assessmentYear,10) || parseInt(datasetMeta?.assessmentYear,10) || "unknown";
  const rollType = normalizeRollType(p?.rollType || datasetMeta?.rollType) || "unknown";
  const swisCode = normalizeSwisCode(p?.swisCode || datasetMeta?.swisCode) || "unknown";
  const parcelIdNorm = normalizeParcelId(p?.parcelIdNorm || p?.parcelId || p?.printKey || p?.pinSbl) || "unknown";
  return [year, rollType, swisCode, parcelIdNorm].join(":");
}

function collectExistingParcelWarnings(p){
  const out = new Set();
  for(const warnings of [p?.quality?.warnings, p?.qualityWarnings, p?._qualityWarnings]){
    if(!Array.isArray(warnings)) continue;
    for(const warning of warnings){
      const value = (warning||"").toString().trim();
      if(value) out.add(value);
    }
  }
  return [...out];
}

function buildParcelQualityWarnings(p){
  const warnings = new Set(collectExistingParcelWarnings(p));
  if(!p?.parcelIdNorm) warnings.add("missing_parcel_id");
  if(!p?.swisCode) warnings.add("missing_swis_code");
  if(!(Number.isFinite(p?.fullMarketValue) && p.fullMarketValue>0)) warnings.add("missing_full_market_value");
  if(Number.isFinite(p?.assessedValue) && Number.isFinite(p?.landValue) && p.assessedValue < p.landValue) warnings.add("assessed_below_land_value");
  if(Number.isFinite(p?.fullMarketValue) && p.fullMarketValue>0 && Number.isFinite(p?.assessedValue) && p.assessedValue > p.fullMarketValue) warnings.add("assessed_above_full_market_value");
  if(!p?.mailAddressClean) warnings.add("missing_mailing_address");
  if(p?.countyReferenceJoin==="missing") warnings.add("missing_county_reference_join");
  if(p?.geometryJoin==="missing") warnings.add("missing_geometry_join");
  return [...warnings];
}

const getParcelWarnings = p => Array.isArray(p?._qualityWarnings) ? p._qualityWarnings : buildParcelQualityWarnings(p);
const hasParcelWarning = (p, warningCode) => getParcelWarnings(p).includes(warningCode);

function preprocessParcels(arr, datasetMeta={}){
  if(!Array.isArray(arr) || arr.length===0) return [];
  const alreadyPreprocessed = !!(arr[0] && typeof arr[0]._searchBlob==="string" && typeof arr[0]._absentee==="boolean" && typeof arr[0].recordKey==="string" && Array.isArray(arr[0]._qualityWarnings));
  if(alreadyPreprocessed){
    const needsNeighborhoodRepair = arr.some(p=>{
      const rawNbr = ((p&&p.neighborhood)||"").toString().trim();
      if(!rawNbr) return true;
      if(/^(albany|city of albany)$/i.test(rawNbr)){
        const inferred = inferNeighborhoodFallback((p&&p.zip)||"");
        return inferred && inferred !== "Albany";
      }
      return false;
    });
    const needsMetadataRepair = arr.some(p=>!p || !p.recordKey || !Array.isArray(p._qualityWarnings) || !p.parcelIdNorm || !p.addressJoinKey || !Object.prototype.hasOwnProperty.call(p, "assessmentYear") || !Object.prototype.hasOwnProperty.call(p, "rollType") || typeof p._absenteeScore!=="number" || !p._absenteeLabel || !Array.isArray(p._absenteeSignals) || typeof p._ownerPortfolioOffsiteCount!=="number");
    if(!needsNeighborhoodRepair && !needsMetadataRepair) return arr;
  }
  const meta = normalizeDatasetMeta(datasetMeta, arr);
  const ownerPortfolioStats = new Map();
  arr.forEach(p=>{
    const address = (p?.address||"").toString();
    const zip = normalizeZip5(p?.zip||"");
    const cleanMail = cleanMailAddress(p?.mailAddress, address, zip);
    const ownerKey = normalizeOwnerPortfolioKey(p?.owner1||"");
    if(!ownerKey) return;
    const stats = ownerPortfolioStats.get(ownerKey) || { count: 0, offsiteMailCount: 0 };
    const mailingMatch = mailingAddressMatchesProperty({
      ...p,
      address,
      zip,
      mailAddress: cleanMail,
      mailAddressRaw: p?.mailAddress || "",
      mailAddressClean: cleanMail,
    });
    stats.count += 1;
    if(mailingMatch===false) stats.offsiteMailCount += 1;
    ownerPortfolioStats.set(ownerKey, stats);
  });
  return arr.map(p=>{
    const address = (p.address||"").toString();
    const owner1 = (p.owner1||"").toString();
    const owner2 = (p.owner2||"").toString();
    const parcelIdRaw = (p.parcelId||"").toString();
    const zip = normalizeZip5(p.zip||"");
    const clsDesc = (p.propClassDesc||"").toString();
    const rawNbr = (p.neighborhood||"").toString().trim();
    const inferredNbr = inferNeighborhoodFallback(zip);
    const nbr = (!rawNbr || /^(albany|city of albany)$/i.test(rawNbr)) ? inferredNbr : rawNbr;
    const cleanMail = cleanMailAddress(p.mailAddress, address, zip);
    const parcelIdNorm = normalizeParcelId(parcelIdRaw || p.printKey || p.pinSbl);
    const swisCode = normalizeSwisCode(p.swisCode || meta.swisCode);
    const mailingZip5 = normalizeZip5(cleanMail || p.mailingZip5 || "");
    const assessmentYear = parseInt(p.assessmentYear,10) || meta.assessmentYear || null;
    const rollType = normalizeRollType(p.rollType || meta.rollType);
    const addressKeyBase = normalizeStreetKeyForCompare(address);
    const addressJoinKey = addressKeyBase ? addressKeyBase + "|" + (zip || mailingZip5 || "") : "";
    const addrLower = address.toLowerCase();
    const owner1Lower = owner1.toLowerCase();
    const owner2Lower = owner2.toLowerCase();
    const ownerPortfolioKey = normalizeOwnerPortfolioKey(owner1);
    const ownerPortfolio = ownerPortfolioKey ? (ownerPortfolioStats.get(ownerPortfolioKey)||{ count: 1, offsiteMailCount: 0 }) : { count: 1, offsiteMailCount: 0 };
    const ownerPortfolioCount = ownerPortfolio.count || 1;
    const inv = (p && p.inventory && typeof p.inventory==="object") ? p.inventory : null;
    const invStyle = (inv?.buildingStyle||"").toString().trim().toLowerCase();
    const invYear = Number.isFinite(Number(inv?.yearBuilt)) ? Number(inv.yearBuilt) : (Number.isFinite(Number(p.yearBuilt)) ? Number(p.yearBuilt) : null);
    const invSqft = Number.isFinite(Number(inv?.sqftLivingArea)) ? Number(inv.sqftLivingArea) : null;
    const invBeds = Number.isFinite(Number(inv?.bedrooms)) ? Number(inv.bedrooms) : null;
    const invFullBaths = Number.isFinite(Number(inv?.fullBaths)) ? Number(inv.fullBaths) : null;
    const invHalfBaths = Number.isFinite(Number(inv?.halfBaths)) ? Number(inv.halfBaths) : null;
    const invBaths = (Number.isFinite(invFullBaths) || Number.isFinite(invHalfBaths))
      ? (Number(invFullBaths || 0) + (Number(invHalfBaths || 0) * 0.5))
      : null;
    const next = {
      ...p,
      parcelId: parcelIdRaw || p.printKey || p.pinSbl || "",
      parcelIdNorm,
      printKey: p.printKey || parcelIdRaw || parcelIdNorm || null,
      pinSbl: p.pinSbl || null,
      swisCode,
      assessmentYear,
      rollType,
      zip: zip || normalizeZip5(cleanMail) || (p.zip||""),
      neighborhood: nbr,
      municipality: p.municipality || meta.municipality || null,
      county: p.county || meta.county || null,
      state: p.state || meta.state || "NY",
      mailAddress: cleanMail,
      mailAddressRaw: p.mailAddress || "",
      mailAddressClean: cleanMail,
      mailingZip5: mailingZip5 || null,
      addressJoinKey,
    };
    next.recordKey = buildCanonicalRecordKey(next, meta);
    const absenteeModel = buildAbsenteeModel(next, ownerPortfolio);
    const absentee = absenteeModel.flag;
    const eqRatioNum = next.fullMarketValue>0 ? (next.assessedValue/next.fullMarketValue)*100 : null;
    const eqBand = eqRatioNum==null || !isFinite(eqRatioNum) ? "neutral" : eqRatioNum<80 ? "under" : eqRatioNum>120 ? "over" : "fair";
    const warnings = buildParcelQualityWarnings(next);
    return {
      ...next,
      _addrLower: addrLower,
      _owner1Lower: owner1Lower,
      _owner2Lower: owner2Lower,
      _searchBlob: [
        addrLower,
        parcelIdNorm.toLowerCase(),
        clsDesc.toLowerCase(),
        nbr.toLowerCase(),
        (next.zip||"").toLowerCase(),
        cleanMail.toLowerCase(),
        invStyle,
        invYear != null ? String(invYear) : "",
        invSqft != null ? String(Math.round(invSqft)) : "",
        invBeds != null ? String(Math.round(invBeds)) : "",
        invBaths != null ? String(invBaths) : "",
      ].join("|"),
      _ownerBlob: [owner1Lower, owner2Lower].join("|"),
      _absentee: absentee,
      _absenteeModel: absenteeModel,
      _absenteeScore: absenteeModel.score,
      _absenteeLabel: absenteeModel.label,
      _absenteeSignals: absenteeModel.signals,
      _ownerPortfolioCount: ownerPortfolioCount,
      _ownerPortfolioOffsiteCount: absenteeModel.ownerPortfolioOffsiteCount,
      _ownerEntity: absenteeModel.ownerEntity,
      _invStyle: invStyle,
      _invYearBuilt: invYear,
      _invSqft: invSqft,
      _invBedrooms: invBeds,
      _invBaths: invBaths,
      _eqRatioNum: eqRatioNum,
      _eqBand: eqBand,
      _qualityWarnings: warnings,
      _hasQualityWarning: warnings.length>0,
    };
  });
}

function buildOwnerPortfolioGroups(parcels=[]){
  const groups = new Map();
  parcels.forEach((p, idx)=>{
    const ownerKey = normalizeOwnerPortfolioKey(p?.owner1||"");
    if(!ownerKey) return;
    let group = groups.get(ownerKey);
    if(!group){
      const slug = ownerKey.replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80) || `owner-${idx+1}`;
      group = {
        id:`owner-${slug}`,
        ownerKey,
        parcels:[],
        totalFMV:0,
        totalAssessed:0,
        totalLand:0,
        zips:new Set(),
        labels:new Map(),
      };
      groups.set(ownerKey, group);
    }
    const label = (p?.owner1||"Unknown owner").toString().trim() || "Unknown owner";
    const labelKey = label.toLowerCase();
    const existingLabel = group.labels.get(labelKey);
    if(existingLabel){
      existingLabel.count += 1;
      if(label.length > existingLabel.label.length) existingLabel.label = label;
    }else{
      group.labels.set(labelKey, { label, count: 1 });
    }
    group.parcels.push(p);
    group.totalFMV += Number(p?.fullMarketValue) || 0;
    group.totalAssessed += Number(p?.assessedValue) || 0;
    group.totalLand += Number(p?.landValue) || 0;
    if(p?.zip) group.zips.add(String(p.zip));
  });
  return [...groups.values()]
    .map(group=>{
      const displayOwner = [...group.labels.values()]
        .sort((a,b)=>b.count-a.count || b.label.length-a.label.length || a.label.localeCompare(b.label))[0]?.label || "Unknown owner";
      const parcels = [...group.parcels].sort((a,b)=>{
        const byAddress = (a?.address||"").localeCompare((b?.address||""), undefined, { numeric:true, sensitivity:"base" });
        if(byAddress) return byAddress;
        return (b?.fullMarketValue||0) - (a?.fullMarketValue||0);
      });
      return {
        id:group.id,
        ownerKey:group.ownerKey,
        name:displayOwner,
        displayOwner,
        parcels,
        propertyCount:parcels.length,
        totalFMV:group.totalFMV,
        totalAssessed:group.totalAssessed,
        totalLand:group.totalLand,
        zips:[...group.zips].sort((a,b)=>a.localeCompare(b)),
      };
    })
    .sort((a,b)=>b.propertyCount-a.propertyCount || b.totalFMV-a.totalFMV || a.displayOwner.localeCompare(b.displayOwner));
}
function getOwnerPortfolioGroupFromIndex(parcel, ownerPortfolioIndex){
  if(!parcel || !ownerPortfolioIndex) return null;
  const ownerKey = normalizeOwnerPortfolioKey(parcel?.owner1 || "");
  return ownerKey ? (ownerPortfolioIndex.get(ownerKey) || null) : null;
}

function getOwnerPortfolioCountFast(parcel){
  return Math.max(1, parseInt(parcel?._ownerPortfolioCount, 10) || 1);
}

function ownerPortfolioBadgeLabel(parcel){
  const count = getOwnerPortfolioCountFast(parcel);
  return count > 1 ? `Portfolio ${count}` : "";
}
const eqRFast = p => (typeof p?._eqRatioNum==="number" && isFinite(p._eqRatioNum))
  ? p._eqRatioNum.toFixed(1)
  : eqR(p);

const eqFlagFast = p => (p && typeof p._eqBand==="string") ? p._eqBand : eqFlag(p);

const getAbsenteeModelFast = p => (p && p._absenteeModel && typeof p._absenteeModel==="object") ? p._absenteeModel : buildAbsenteeModel(p, { count: p?._ownerPortfolioCount, offsiteMailCount: p?._ownerPortfolioOffsiteCount });
const getAbsenteeLabelFast = p => getAbsenteeModelFast(p).label;
const getAbsenteeReasonFast = p => getAbsenteeModelFast(p).reason;
const isAbsenteeFast = p => !!getAbsenteeModelFast(p).flag;

function downsampleScatterParcels(parcels, maxPoints=1800){
  if(!Array.isArray(parcels) || parcels.length<=maxPoints) return parcels;
  const step = Math.ceil(parcels.length/maxPoints);
  const out = [];
  for(let i=0;i<parcels.length;i+=step) out.push(parcels[i]);
  return out;
}

function createDataParseWorker(){
  if(typeof Worker==="undefined" || typeof Blob==="undefined" || typeof URL==="undefined") return null;
  const workerSrc = `
${parseCSV.toString()}
${normalizeParcelId.toString()}
${normalizeSwisCode.toString()}
${normalizeZip5.toString()}
${normalizeRollType.toString()}
${inferAssessmentYearFromText.toString()}
${parseRollDate.toString()}
${normalizeDatasetMeta.toString()}
${extractPayloadMeta.toString()}
${extractRollMetadata.toString()}
${parseTextRoll.toString()}
${normalizeStreetKeyForCompare.toString()}
${normalizeOwnerPortfolioKey.toString()}
${classifyOwnerEntity.toString()}
${ownerLooksLikeEntity.toString()}
${hasOwnerOccupancyExemption.toString()}
${compareAddressCandidateToProperty.toString()}
${mailingAddressMatchesProperty.toString()}
${mailingAddressLooksSpecial.toString()}
${mailingOutsideAlbany.toString()}
${propertyLooksLikeOwnerOccupiedHome.toString()}
${buildAbsenteeModel.toString()}
${computeAbsenteeFlag.toString()}
${inferNeighborhoodFallback.toString()}
${cleanMailAddress.toString()}
${buildCanonicalRecordKey.toString()}
${buildParcelQualityWarnings.toString()}
${preprocessParcels.toString()}
self.onmessage = function(ev){
  try{
    var data = ev.data || {};
    var raw = data.raw || "";
    var fname = data.fname || "";
    var lowerName = fname.toLowerCase();
    var meta = null;
    var arr = [];
    var sourceType = "csv";
    if(lowerName.slice(-5)===".json"){
      var payload = JSON.parse(raw);
      arr = payload && (payload.parcels || payload);
      if(!Array.isArray(arr) || arr.length===0) throw new Error("JSON file does not contain a parcels array.");
      meta = extractPayloadMeta(payload);
      sourceType = "json";
    } else {
      var isRoll = lowerName.slice(-4)===".txt" || raw.indexOf("HOMESTEAD PARCEL")>=0 || raw.indexOf("FULL MARKET VALUE")>=0;
      if(isRoll){
        meta = extractRollMetadata(raw, fname);
        arr = parseTextRoll(raw, meta);
        sourceType = "roll";
      } else {
        arr = parseCSV(raw);
        meta = normalizeDatasetMeta({}, arr, fname);
        sourceType = "csv";
      }
    }
    self.postMessage({ ok:true, parcels: preprocessParcels(arr, meta), meta: meta, sourceType: sourceType });
  } catch(err){
    self.postMessage({ ok:false, error: err && err.message ? err.message : String(err) });
  }
};`;
  const blob = new Blob([workerSrc], { type:"text/javascript" });
  const blobUrl = URL.createObjectURL(blob);
  const worker = new Worker(blobUrl);
  worker.__blobUrl = blobUrl;
  return worker;
}

function createDuplicateScanWorker(){
  if(typeof Worker==="undefined" || typeof Blob==="undefined" || typeof URL==="undefined") return null;
  const workerSrc = `
var __levenSim = (${levenSim.toString()});
self.onmessage = function(ev){
  try{
    var data = ev.data || {};
    var parcels = Array.isArray(data.parcels) ? data.parcels : [];
    var threshold = typeof data.threshold === "number" ? data.threshold : 0.75;
    var names = new Array(parcels.length);
    for(var i=0;i<parcels.length;i++){
      var owner = (((parcels[i]||{}).owner1)||"").toString().trim().toLowerCase();
      names[i] = owner.replace(/\\s+/g," ");
    }
    var buckets = {};
    for(var j=0;j<names.length;j++){
      var n = names[j];
      if(!n) continue;
      var key = n.slice(0,1)+"|"+n.length;
      (buckets[key]||(buckets[key]=[])).push(j);
    }
    var groups = [];
    var used = {};
    var bucketKeys = Object.keys(buckets);
    for(var b=0;b<bucketKeys.length;b++){
      var idxs = buckets[bucketKeys[b]];
      for(var x=0;x<idxs.length;x++){
        var i0 = idxs[x];
        if(used[i0]) continue;
        var baseName = names[i0];
        if(!baseName || baseName.length < 4) continue;
        var matches = [];
        for(var y=x+1;y<idxs.length;y++){
          var i1 = idxs[y];
          if(used[i1]) continue;
          var other = names[i1];
          if(!other) continue;
          if(Math.abs(baseName.length-other.length)>4) continue;
          if(__levenSim(baseName, other) > threshold) matches.push(i1);
        }
        if(matches.length){
          groups.push({baseIndex:i0, similarIndices:matches});
          used[i0]=1;
          for(var k=0;k<matches.length;k++) used[matches[k]]=1;
        }
      }
    }
    self.postMessage({ok:true, groups:groups});
  }catch(err){
    self.postMessage({ok:false, error: err && err.message ? err.message : String(err)});
  }
};`;
  const blob = new Blob([workerSrc], { type:"text/javascript" });
  const blobUrl = URL.createObjectURL(blob);
  const worker = new Worker(blobUrl);
  worker.__blobUrl = blobUrl;
  return worker;
}

const VirtualRows = ({items,rowHeight=96,height=480,overscan=4,renderRow,empty}) => {
  const [scrollTop,setScrollTop]=useState(0);
  const start=Math.max(0,Math.floor(scrollTop/rowHeight)-overscan);
  const visible=Math.ceil(height/rowHeight)+(overscan*2);
  const end=Math.min(items.length,start+visible);
  if(items.length===0) return empty||null;
  return (
    <div style={{height,overflowY:"auto"}} onScroll={e=>setScrollTop(e.currentTarget.scrollTop)}>
      <div style={{paddingTop:start*rowHeight,paddingBottom:Math.max(0,(items.length-end)*rowHeight)}}>
        {items.slice(start,end).map((item,i)=>renderRow(item,start+i))}
      </div>
    </div>
  );
};

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ SHARED UI ATOMS ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
const googleMapsHref = (address, zip, neighborhood) => {
  const q = [address, neighborhood, "Albany, NY", zip].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};
async function copyTextToClipboard(text){
  if(!text || typeof document==="undefined") return false;
  try{
    if(typeof navigator!=="undefined" && navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(text);
      return true;
    }
  }catch{}
  try{
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "readonly");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return !!ok;
  }catch{
    return false;
  }
}

const dispatchApplicationMapJump = detail => {
  if(typeof window==="undefined" || !detail?.address) return;
  try{
    window.dispatchEvent(new CustomEvent("albany:jump-to-app-map", { detail }));
    window.dispatchEvent(new CustomEvent("albany:jump-to-research-map", { detail }));
  }catch{}
};
const AddrLink = ({address, zip, neighborhood, parcelId=null, parcel=null, children, stopPropagation=true, style={}}) => {
  const label = children ?? address ?? "(no address)";
  if(!address) return <>{label}</>;
  return (
    <span style={{display:"inline-flex",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
      <a
        href={googleMapsHref(address, zip, neighborhood)}
        target="_blank"
        rel="noreferrer"
        onClick={e=>{ if(stopPropagation) e.stopPropagation(); }}
        title={`Open ${address}${neighborhood?` (${neighborhood})`:""}${zip?` ${zip}`:""} in Google Maps`}
        style={{color:"inherit",textDecoration:"underline",textDecorationColor:"rgba(59,130,246,.55)",textUnderlineOffset:2,...style}}
      >
        {label}
        {neighborhood&&<span style={{opacity:.75,fontSize:"0.9em"}}>{` | ${neighborhood}`}</span>}
      </a>
      <button
        type="button"
        onClick={e=>{ if(stopPropagation) e.stopPropagation(); dispatchApplicationMapJump({ address, zip, neighborhood, parcelId: parcelId || parcel?.parcelId || "", parcel }); }}
        title={`Open ${address} in Application Map`}
        style={{background:"transparent",border:"none",padding:0,color:"var(--teal2)",fontSize:"0.85em",fontWeight:700,cursor:"pointer",textDecoration:"underline",textUnderlineOffset:2}}
      >
        Application Map
      </button>
    </span>
  );
};
const PROP_CLASSIFICATION_MAP = (propertyTypeClassificationCodes || []).reduce((acc, row) => {
  const code = String(row?.Code || "").trim();
  if(!code) return acc;
  acc[code] = {
    title: String(row?.Title || "").trim(),
    description: String(row?.Description || "").trim(),
  };
  return acc;
}, {});
const propClassMeta = code => PROP_CLASSIFICATION_MAP[(code||"").toString().trim()] || null;
const propClassOfficialTitle = code => (propClassMeta(code)?.title || "").toString().trim();
const propClassOfficialDescription = code => (propClassMeta(code)?.description || "").toString().trim();
const formatPropClassLabel = (code, desc) => {
  const c = (code||"").toString().trim();
  const d = (desc||"").toString().trim();
  if(d && c && d!==c) return `${d} (${c})`;
  return d || c || "Unknown";
};
const formatPropClassOfficialLabel = (code, desc) => {
  const c = (code||"").toString().trim();
  const official = propClassOfficialTitle(c);
  if(official && c) return `${official} (${c})`;
  return formatPropClassLabel(code, desc);
};
const propClassLabel = p => formatPropClassLabel(p?.propClass, p?.propClassDesc);
const propClassDescLabel = p => (p?.propClassDesc||propClassOfficialTitle(p?.propClass)||p?.propClass||"Unknown");
const propClassOfficialLabel = p => formatPropClassOfficialLabel(p?.propClass, p?.propClassDesc);
const propClassMeaning = p => propClassOfficialDescription(p?.propClass);
const propClassTooltip = p => [propClassOfficialLabel(p), propClassMeaning(p)].filter(Boolean).join(" | ") || propClassLabel(p);
const parcelNeighborhoodName = p => (p?.neighborhood || p?.neighborhoodLabel || "").toString().trim();
const parcelNeighborhoodAssociation = p => (p?.neighborhoodAssociation || "").toString().trim();
const parcelAreaSummary = p => {
  const neighborhood = parcelNeighborhoodName(p);
  const association = parcelNeighborhoodAssociation(p);
  return association && association !== neighborhood ? `${neighborhood || "Neighborhood unknown"} | ${association}` : (neighborhood || association || "");
};
const inventoryOf = p => (p && p.inventory && typeof p.inventory === "object") ? p.inventory : null;
const inventoryStyle = p => {
  const raw = ((inventoryOf(p)?.buildingStyle || "").toString().trim());
  if(!raw) return "";
  if(/^style code\s+/i.test(raw)) return raw;
  return /^\d+$/.test(raw) ? `Style code ${raw}` : raw;
};
const inventoryYearBuilt = p => {
  const invYear = Number(inventoryOf(p)?.yearBuilt);
  if (Number.isFinite(invYear) && invYear > 0) return invYear;
  const baseYear = Number(p?.yearBuilt);
  return Number.isFinite(baseYear) && baseYear > 0 ? baseYear : null;
};
const inventorySqft = p => {
  const v = Number(inventoryOf(p)?.sqftLivingArea);
  return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
};
const inventoryBedrooms = p => {
  const v = Number(inventoryOf(p)?.bedrooms);
  return Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
};
const inventoryFullBaths = p => {
  const v = Number(inventoryOf(p)?.fullBaths);
  return Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
};
const inventoryHalfBaths = p => {
  const v = Number(inventoryOf(p)?.halfBaths);
  return Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
};
const inventoryBathText = p => {
  const full = inventoryFullBaths(p);
  const half = inventoryHalfBaths(p);
  if (full == null && half == null) return "-";
  if (half == null || half === 0) return String(full ?? 0);
  return `${full ?? 0} + ${half} half`;
};
const hasInventoryProfile = p => !!(
  inventoryStyle(p) ||
  inventoryYearBuilt(p) ||
  inventorySqft(p) ||
  inventoryBedrooms(p) != null ||
  inventoryFullBaths(p) != null ||
  inventoryHalfBaths(p) != null
);
const isResidentialPropClass = code => /^2\d\d$/.test((code||"").toString().trim());
const inventoryBathCount = p => {
  const full = inventoryFullBaths(p);
  const half = inventoryHalfBaths(p);
  if(full == null && half == null) return null;
  return Number(full || 0) + (Number(half || 0) * 0.5);
};
const streetNameKeyForComp = addr => {
  const k = normalizeStreetKeyForCompare(addr||"");
  if(!k) return "";
  const t = k.split(" ").filter(Boolean);
  return (t.length>1 && /^\d+[a-z]?$/i.test(t[0])) ? t.slice(1).join(" ") : t.join(" ");
};
const comparePctDelta = (a,b) => {
  if(!(Number.isFinite(a) && a>0 && Number.isFinite(b) && b>0)) return null;
  return Math.abs(a-b) / Math.max(a, 1);
};
const buildComparableProfile = p => {
  const livingArea = inventorySqft(p);
  const yearBuilt = inventoryYearBuilt(p);
  const bedrooms = inventoryBedrooms(p);
  const bathCount = inventoryBathCount(p);
  const bathText = inventoryBathText(p);
  const style = inventoryStyle(p) || null;
  const availablePhysicalFields = [];
  if(livingArea != null) availablePhysicalFields.push("Living area");
  if(yearBuilt != null) availablePhysicalFields.push("Year built");
  if(bedrooms != null) availablePhysicalFields.push("Bedrooms");
  if(bathCount != null) availablePhysicalFields.push("Baths");
  if(style) availablePhysicalFields.push("Style");
  return {
    livingArea,
    yearBuilt,
    bedrooms,
    bathCount,
    bathText: bathText === "-" ? null : bathText,
    style,
    availablePhysicalFields,
    neighborhood: parcelNeighborhoodName(p) || null,
    classLabel: propClassLabel(p),
    equity: Number.isFinite(parseFloat(eqRFast(p))) ? parseFloat(eqRFast(p)) : null,
  };
};
const buildComparableDelta = (subject, comp, subjectProfile, compProfile) => ({
  fmv: Number.isFinite(subject?.fullMarketValue) && Number.isFinite(comp?.fullMarketValue) ? comp.fullMarketValue - subject.fullMarketValue : null,
  assessed: Number.isFinite(subject?.assessedValue) && Number.isFinite(comp?.assessedValue) ? comp.assessedValue - subject.assessedValue : null,
  equity: subjectProfile?.equity != null && compProfile?.equity != null ? +(compProfile.equity - subjectProfile.equity).toFixed(1) : null,
  livingArea: subjectProfile?.livingArea != null && compProfile?.livingArea != null ? compProfile.livingArea - subjectProfile.livingArea : null,
  yearBuilt: subjectProfile?.yearBuilt != null && compProfile?.yearBuilt != null ? compProfile.yearBuilt - subjectProfile.yearBuilt : null,
  bedrooms: subjectProfile?.bedrooms != null && compProfile?.bedrooms != null ? compProfile.bedrooms - subjectProfile.bedrooms : null,
  baths: subjectProfile?.bathCount != null && compProfile?.bathCount != null ? +(compProfile.bathCount - subjectProfile.bathCount).toFixed(1) : null,
});
const comparableProfileBadgeItems = p => {
  const profile = buildComparableProfile(p);
  const items = [];
  if(profile.livingArea != null) items.push(nf(profile.livingArea) + " sq ft");
  if(profile.yearBuilt != null) items.push("Built " + profile.yearBuilt);
  if(profile.bedrooms != null) items.push(profile.bedrooms + " beds");
  if(profile.bathText) items.push(profile.bathText + " baths");
  if(profile.style) items.push(profile.style);
  return items;
};
const comparableProfileTableRows = p => {
  const profile = buildComparableProfile(p);
  return [
    ["FMV", $f(p.fullMarketValue)],
    ["Assessed", $f(p.assessedValue)],
    ["Equity %", profile.equity != null ? profile.equity + "%" : "-"],
    ["Neighborhood", profile.neighborhood || "-"],
    ["Class", profile.classLabel || "-"],
    ["Living area", profile.livingArea != null ? nf(profile.livingArea) + " sq ft" : "-"],
    ["Year built", profile.yearBuilt != null ? String(profile.yearBuilt) : "-"],
    ["Bedrooms", profile.bedrooms != null ? String(profile.bedrooms) : "-"],
    ["Baths", profile.bathText || "-"],
    ["Style", profile.style || "-"]
  ];
};
const formatSignedComparableMoney = value => {
  if(value == null || !Number.isFinite(value)) return "-";
  if(value === 0) return "$0";
  return (value > 0 ? "+" : "-") + $f(Math.abs(value));
};
const formatSignedComparableCount = (value, suffix="") => {
  if(value == null || !Number.isFinite(value)) return "-";
  if(value === 0) return "0" + suffix;
  const abs = Math.abs(value);
  const rounded = Math.abs(abs - Math.round(abs)) < 0.001 ? nf(Math.round(abs)) : abs.toFixed(1);
  return (value > 0 ? "+" : "-") + rounded + suffix;
};
const comparableDeltaTone = (value, betterWhenLower=false) => {
  if(value == null || !Number.isFinite(value)) return "var(--gray3)";
  if(value === 0) return "var(--gray2)";
  if(betterWhenLower) return value < 0 ? "var(--green2)" : "var(--red2)";
  return value > 0 ? "var(--green2)" : "var(--red2)";
};
const grievanceResourceUrls = {
  rp524FormUrl: grievanceSettings?.resources?.rp524FormUrl || "https://www.tax.ny.gov/pdf/current_forms/orpts/rp524_fill_in.pdf",
  grievanceBookletUrl: grievanceSettings?.resources?.grievanceBookletUrl || "https://www.tax.ny.gov/pdf/publications/orpts/grievancebooklet.pdf",
  exemptionFaqLabel: grievanceSettings?.resources?.exemptionFaqLabel || "Exemption: Frequently Asked Questions",
  exemptionFaqUrl: grievanceSettings?.resources?.exemptionFaqUrl || "https://www.albanyny.gov/m/faq?cat=18#question-93",
};
const classifyGrievanceComparable = (subject, comp) => {
  const subjectAssessed = Number(subject?.assessedValue);
  const compAssessed = Number(comp?.assessedValue);
  if(!Number.isFinite(subjectAssessed) || !Number.isFinite(compAssessed)) return {
    kind: "neutral",
    badge: "Neutral",
    headline: "Assessment comparison unavailable",
    detail: "This comp stays in the research list, but missing assessment data means it cannot strengthen your grievance package.",
    tone: "var(--gray2)",
    border: "rgba(100,116,139,.24)",
    background: "rgba(148,163,184,.10)",
  };
  if(compAssessed < subjectAssessed) return {
    kind: "supports",
    badge: "Supports grievance",
    headline: "Assessed lower than yours",
    detail: "Assessed lower than yours - supports an RP-524 grievance argument that your property is over-assessed.",
    tone: "var(--green2)",
    border: "rgba(34,197,94,.24)",
    background: "rgba(34,197,94,.08)",
  };
  if(compAssessed > subjectAssessed) return {
    kind: "does_not_support",
    badge: "Does not support grievance",
    headline: "Assessed higher than yours",
    detail: "Assessed higher than yours - this comp would not help your grievance. It suggests your current assessment may be reasonable relative to this similar home. This comp is shown for context because it is the type of evidence the assessor could use to refute your grievance.",
    tone: "var(--red2)",
    border: "rgba(220,38,38,.22)",
    background: "rgba(220,38,38,.07)",
  };
  return {
    kind: "neutral",
    badge: "Neutral",
    headline: "Assessed the same as yours",
    detail: "Assessed the same as yours - confirms your assessment is in line with this similar home but does not strengthen a grievance argument.",
    tone: "var(--gray2)",
    border: "rgba(100,116,139,.24)",
    background: "rgba(148,163,184,.10)",
  };
};
const buildComparableDeltaInfo = (metricKey, value) => {
  if(value == null || !Number.isFinite(value)) return "";
  if(metricKey === "assessed"){
    if(value < 0) return "This comp is assessed lower than yours, which supports a grievance argument.";
    if(value > 0) return "This comp is assessed higher than yours, so it does not support a grievance argument.";
    return "This comp is assessed the same as yours, which is neutral for a grievance.";
  }
  if(metricKey === "equity"){
    if(value < 0) return "This comp has a lower equity ratio than yours, which supports an over-assessment claim.";
    if(value > 0) return "This comp has a higher equity ratio than yours, which weakens an over-assessment claim.";
    return "This comp has the same equity ratio as yours, which is neutral for a grievance.";
  }
  if(metricKey === "fmv"){
    if(value < 0) return "This comp has a lower FMV than yours, which can support a lower value argument, but it is weaker evidence than a lower assessment.";
    if(value > 0) return "This comp has a higher FMV than yours, which weakens a lower value argument but still provides market context.";
    return "This comp has the same FMV as yours, which is neutral market context.";
  }
  if(metricKey === "livingArea"){
    if(value < 0) return "This comp is smaller than yours. That does not prove over-assessment by itself; it only affects how comparable the home is.";
    if(value > 0) return "This comp is larger than yours. That does not prove over-assessment by itself; it only affects comparability.";
    return "This comp has the same living area as yours, which strengthens comparability.";
  }
  if(metricKey === "yearBuilt"){
    if(value < 0) return "This comp is older than yours. That is comparability context, not direct grievance evidence.";
    if(value > 0) return "This comp is newer than yours. That is comparability context, not direct grievance evidence.";
    return "This comp was built in the same year as yours, which strengthens comparability.";
  }
  if(metricKey === "bedrooms"){
    if(value < 0) return "This comp has fewer bedrooms than yours. That affects comparability, not the grievance by itself.";
    if(value > 0) return "This comp has more bedrooms than yours. That affects comparability, not the grievance by itself.";
    return "This comp has the same bedroom count as yours, which strengthens comparability.";
  }
  if(metricKey === "baths"){
    if(value < 0) return "This comp has fewer baths than yours. That affects comparability, not the grievance by itself.";
    if(value > 0) return "This comp has more baths than yours. That affects comparability, not the grievance by itself.";
    return "This comp has the same bath count as yours, which strengthens comparability.";
  }
  return "";
};
const formatNarrativeCompList = (comps=[]) => {
  if(!comps.length) return "";
  const items = comps.map(parcel => `${parcel.address} is assessed at ${$f(parcel.assessedValue)}`);
  if(items.length===1) return items[0];
  if(items.length===2) return items[0] + " and " + items[1];
  return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
};
const buildGrievanceNarrative = (subject, subjectProfile, neighborResult) => {
  const supports = neighborResult?.grievanceCandidates || [];
  if(!supports.length || neighborResult?.grievanceAvgAssessed == null || neighborResult?.grievanceDeltaAssessed == null) return "";
  const comparisonFields = ["property class"].concat((subjectProfile?.availablePhysicalFields || []).map(field => field.toLowerCase()));
  const basis = comparisonFields.length > 1 ? comparisonFields.slice(0, -1).join(", ") + ", and " + comparisonFields[comparisonFields.length - 1] : comparisonFields[0];
  const compExamples = formatNarrativeCompList(supports.slice(0, 3));
  return `The subject property at ${subject.address} is currently assessed at ${$f(subject.assessedValue)}. Several physically comparable homes${subjectProfile?.neighborhood ? ` in the same ${subjectProfile.neighborhood} neighborhood` : ""} - matching in ${basis} - carry lower assessments. For example, ${compExamples}. The average assessed value across supporting comparable homes is ${$f(neighborResult.grievanceAvgAssessed)}, which is ${$f(Math.abs(neighborResult.grievanceDeltaAssessed))} less than the subject's current assessment. This disparity indicates the subject property is over-assessed relative to its peers and the assessed value should be reduced to align with comparable properties.`;
};
const grievanceDayForYear = (year) => {
  if(!Number.isFinite(year)) return null;
  const firstOfMay = new Date(Date.UTC(year, 4, 1));
  const offsetToTuesday = (2 - firstOfMay.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, 4, 1 + offsetToTuesday + 21));
};
const grievanceDayLabel = (meta={}, subject=null) => {
  const year = parseInt(subject?.assessmentYear, 10) || parseInt(meta?.assessmentYear, 10) || null;
  if(!year) return "Albany's Grievance Day is the 4th Tuesday in May. Confirm the date annually with the City of Albany Assessor's Office.";
  const deadline = grievanceDayForYear(year);
  const formatted = deadline ? deadline.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric", timeZone:"UTC" }) : null;
  return formatted
    ? `Albany's Grievance Day for ${year} is ${formatted}. Confirm the date annually with the City of Albany Assessor's Office.`
    : "Albany's Grievance Day is the 4th Tuesday in May. Confirm the date annually with the City of Albany Assessor's Office.";
};
const buildGrievanceFilingHelper = (subject, subjectProfile, neighborResult, meta={}) => {
  const comps = neighborResult?.grievanceCandidates || [];
  const mailingAddress = (subject?.mailAddressClean || subject?.mailAddress || "").trim();
  const municipality = subject?.municipality || meta?.municipality || "City of Albany";
  const county = subject?.county || meta?.county || "Albany";
  const supportingCompAssessedAverage = Number.isFinite(neighborResult?.grievanceAvgAssessed) ? $f(neighborResult.grievanceAvgAssessed) : "-";
  const checklist = [
    { label: "Owner name", value: subject?.owner1 || "-", note: "RP-524 owner or complainant field" },
    { label: "Mailing address", value: mailingAddress || "-", note: "Use the assessment roll mailing address unless it needs correction" },
    { label: "Property address", value: subject?.address || "-", note: "Location of the property being grieved" },
    { label: "Parcel / tax map ID", value: subject?.parcelId || "-", note: "Section, block, lot / parcel identifier" },
    { label: "Municipality / county", value: municipality + ", " + county + " County", note: "Complaint venue" },
    { label: "Property class", value: subjectProfile?.classLabel || "-", note: "Assessment roll property class" },
    { label: "Current assessed value", value: Number.isFinite(subject?.assessedValue) ? $f(subject.assessedValue) : "-", note: "Roll value from the assessment record" },
    { label: "Current full market value", value: Number.isFinite(subject?.fullMarketValue) ? $f(subject.fullMarketValue) : "-", note: "Roll full market value" },
    { label: "Equity ratio", value: subjectProfile?.equity != null ? subjectProfile.equity + "%" : "-", note: "Useful grievance talking point from this app" },
    { label: "Supporting comp FMV average", value: Number.isFinite(neighborResult?.grievanceAvgFMV) ? $f(neighborResult.grievanceAvgFMV) : "-", note: "Average FMV across only the comps that support your grievance" },
    { label: "Supporting comp assessed average", value: supportingCompAssessedAverage, note: "Average assessed value across only the comps that support your grievance" },
    { label: "Suggested requested assessed value", value: supportingCompAssessedAverage, note: "Use this as your requested value on RP-524 - it equals the average assessed value of your grievance-supporting comparable homes" },
    { label: "Supporting comp list", value: comps.length ? comps.map((parcel, idx) => `Comp ${idx + 1}: ${parcel.address || parcel.parcelId} | assessed ${$f(parcel.assessedValue)} | FMV ${$f(parcel.fullMarketValue)} | equity ${eqRFast(parcel)}%`).join("; ") : "-", note: "Only lower-assessed comps are included in the grievance package" },
  ];
  const missing = [
    "Select your reason for complaint on RP-524 (unequal, excessive, unlawful, or misclassification)",
    "Fill in owner contact information and any representative details",
    "Enter your requested value opinion - use the auto-generated narrative above as your draft",
    "Sign the form and note the filing date and any hearing attendance details required by the board",
  ];
  return {
    checklist,
    missing,
    narrative: buildGrievanceNarrative(subject, subjectProfile, neighborResult),
    grievanceDayDeadline: grievanceDayLabel(meta, subject),
    supportingCompCount: comps.length,
  };
};
const escapePrintableHtml = (value) => (value == null ? "" : String(value))
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");
const buildComparablePrintReportHtml = ({subject, subjectProfile, neighborResult, grievanceHelper, shareLink, includeContextComps=false}) => {
  const reportTitle = includeContextComps ? "Comparable research report" : "RP-524 grievance package";
  const comps = includeContextComps ? (neighborResult?.neighbors || []) : (neighborResult?.grievanceCandidates || []);
  const generatedAt = new Date().toLocaleString();
  const checklistRows = (grievanceHelper?.checklist || []).map(item => `
    <tr>
      <td>${escapePrintableHtml(item.label)}</td>
      <td>${escapePrintableHtml(item.value)}</td>
      <td>${escapePrintableHtml(item.note)}</td>
    </tr>`).join("");
  const missingRows = (grievanceHelper?.missing || []).map(item => `<li>${escapePrintableHtml(item)}</li>`).join("");
  const compSections = comps.map((parcel, idx) => {
    const profile = parcel?._compProfile || buildComparableProfile(parcel);
    const delta = parcel?._compDelta || {};
    const relevance = parcel?._grievanceRelevance || classifyGrievanceComparable(subject, parcel);
    const reasons = (parcel?._compReasons || []).map(reason => `<li>${escapePrintableHtml(reason)}</li>`).join("");
    return `
      <section class="comp-card ${escapePrintableHtml(relevance.kind)}">
        <div class="comp-head">
          <div>
            <div class="comp-title">Comp ${idx + 1}: ${escapePrintableHtml(parcel?.address || parcel?.parcelId || "Comparable")}</div>
            <div class="comp-meta">${escapePrintableHtml(parcel?.parcelId || "")}${parcel?.owner1 ? ` | ${escapePrintableHtml(parcel.owner1)}` : ""}</div>
          </div>
          <div class="status ${escapePrintableHtml(relevance.kind)}">${escapePrintableHtml(relevance.badge)}</div>
        </div>
        <div class="status-copy"><strong>${escapePrintableHtml(relevance.headline)}.</strong> ${escapePrintableHtml(relevance.detail)}</div>
        <table>
          <thead><tr><th>Metric</th><th>You</th><th>Comp</th><th>Delta</th></tr></thead>
          <tbody>
            <tr><td>Assessed</td><td>${escapePrintableHtml($f(subject?.assessedValue))}</td><td>${escapePrintableHtml($f(parcel?.assessedValue))}</td><td>${escapePrintableHtml(formatSignedComparableMoney(delta.assessed))}</td></tr>
            <tr><td>FMV</td><td>${escapePrintableHtml($f(subject?.fullMarketValue))}</td><td>${escapePrintableHtml($f(parcel?.fullMarketValue))}</td><td>${escapePrintableHtml(formatSignedComparableMoney(delta.fmv))}</td></tr>
            <tr><td>Equity %</td><td>${escapePrintableHtml(subjectProfile?.equity != null ? subjectProfile.equity + "%" : "-")}</td><td>${escapePrintableHtml(profile?.equity != null ? profile.equity + "%" : "-")}</td><td>${escapePrintableHtml(formatSignedComparableCount(delta.equity, "%"))}</td></tr>
            <tr><td>Living area</td><td>${escapePrintableHtml(subjectProfile?.livingArea != null ? nf(subjectProfile.livingArea) + " sq ft" : "-")}</td><td>${escapePrintableHtml(profile?.livingArea != null ? nf(profile.livingArea) + " sq ft" : "-")}</td><td>${escapePrintableHtml(delta.livingArea != null ? formatSignedComparableCount(delta.livingArea, " sq ft") : "-")}</td></tr>
            <tr><td>Year built</td><td>${escapePrintableHtml(subjectProfile?.yearBuilt != null ? String(subjectProfile.yearBuilt) : "-")}</td><td>${escapePrintableHtml(profile?.yearBuilt != null ? String(profile.yearBuilt) : "-")}</td><td>${escapePrintableHtml(delta.yearBuilt != null ? formatSignedComparableCount(delta.yearBuilt, " yrs") : "-")}</td></tr>
            <tr><td>Bedrooms</td><td>${escapePrintableHtml(subjectProfile?.bedrooms != null ? String(subjectProfile.bedrooms) : "-")}</td><td>${escapePrintableHtml(profile?.bedrooms != null ? String(profile.bedrooms) : "-")}</td><td>${escapePrintableHtml(delta.bedrooms != null ? formatSignedComparableCount(delta.bedrooms) : "-")}</td></tr>
            <tr><td>Baths</td><td>${escapePrintableHtml(subjectProfile?.bathText || "-")}</td><td>${escapePrintableHtml(profile?.bathText || "-")}</td><td>${escapePrintableHtml(delta.baths != null ? formatSignedComparableCount(delta.baths) : "-")}</td></tr>
          </tbody>
        </table>
        <div class="why-title">Why this home was selected</div>
        <ul>${reasons || "<li>No selection reasons were recorded for this comp.</li>"}</ul>
      </section>`;
  }).join("");
  const summaryHtml = neighborResult?.grievanceSupportPool?.length ? `
    <section>
      <h2>Grievance summary</h2>
      <div class="summary-grid">
        <div class="summary-box"><div class="summary-value">${escapePrintableHtml($f(neighborResult.grievanceAvgFMV))}</div><div>Supporting comp FMV average</div></div>
        <div class="summary-box"><div class="summary-value">${escapePrintableHtml($f(neighborResult.grievanceAvgAssessed))}</div><div>Supporting comp assessed average</div></div>
        <div class="summary-box"><div class="summary-value">${escapePrintableHtml(neighborResult.grievanceAvgEquity != null ? neighborResult.grievanceAvgEquity + "%" : "-")}</div><div>Supporting comp equity average</div></div>
      </div>
    </section>` : `
    <section>
      <h2>Grievance summary</h2>
      <p>No lower-assessed comps are available in the current physical match set, so the grievance package has no supporting comp evidence yet.</p>
    </section>`;
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapePrintableHtml(reportTitle)}</title>
<style>
  body{font-family:Arial,sans-serif;color:#0f172a;margin:32px;line-height:1.45}
  h1,h2,h3{margin:0 0 10px}
  h1{font-size:24px}
  h2{font-size:17px;margin-top:22px}
  p{margin:0 0 10px}
  .meta{color:#475569;font-size:12px;margin-bottom:18px}
  .links a{color:#166534;text-decoration:none;font-weight:700}
  .section{margin-top:22px}
  .hero{background:#ecfdf5;border:1px solid #86efac;border-radius:12px;padding:16px}
  .summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
  .summary-box{background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:12px}
  .summary-value{font-weight:700;font-size:18px;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th,td{border:1px solid #cbd5e1;padding:8px;vertical-align:top;text-align:left;font-size:12px}
  th{background:#f8fafc}
  ul{margin:8px 0 0 18px}
  .comp-card{border:1px solid #cbd5e1;border-radius:12px;padding:14px;margin-top:14px;page-break-inside:avoid}
  .comp-card.supports{border-color:#86efac;background:#f0fdf4}
  .comp-card.does_not_support{border-color:#fecaca;background:#fef2f2}
  .comp-card.neutral{border-color:#cbd5e1;background:#f8fafc}
  .comp-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
  .comp-title{font-size:16px;font-weight:700}
  .comp-meta{font-size:12px;color:#475569;margin-top:3px}
  .status{font-size:11px;font-weight:700;border-radius:999px;padding:5px 10px;border:1px solid currentColor}
  .status.supports{color:#166534}
  .status.does_not_support{color:#b91c1c}
  .status.neutral{color:#475569}
  .status-copy{font-size:12px;margin-top:10px}
  .why-title{font-weight:700;font-size:12px;margin-top:10px}
  @media print{
    body{margin:16px}
    a{text-decoration:none;color:inherit}
  }
</style>
</head>
<body>
  <h1>${escapePrintableHtml(reportTitle)}</h1>
  <div class="meta">Generated ${escapePrintableHtml(generatedAt)} | Subject: ${escapePrintableHtml(subject?.address || "-")} | Parcel ID: ${escapePrintableHtml(subject?.parcelId || "-")}</div>
  <section class="hero">
    <h2>Shareable comparable snapshot</h2>
    <p>${escapePrintableHtml(shareLink || "No share link available")}</p>
    <p class="links"><a href="${escapePrintableHtml(grievanceResourceUrls.rp524FormUrl)}">RP-524 form</a> | <a href="${escapePrintableHtml(grievanceResourceUrls.grievanceBookletUrl)}">Grievance booklet</a> | <a href="${escapePrintableHtml(grievanceResourceUrls.exemptionFaqUrl)}">${escapePrintableHtml(grievanceResourceUrls.exemptionFaqLabel)}</a></p>
    <p><strong>Filing deadline:</strong> ${escapePrintableHtml(grievanceHelper?.grievanceDayDeadline || "Confirm the filing deadline with the City of Albany Assessor's Office.")}</p>
    <p>Use the browser print dialog destination to print on paper or choose Save as PDF.</p>
  </section>
  ${summaryHtml}
  <section class="section">
    <h2>Auto-generated grievance narrative</h2>
    <p>${escapePrintableHtml(grievanceHelper?.narrative || "No grievance narrative is available because no lower-assessed supporting comp is currently in the match set.")}</p>
  </section>
  <section class="section">
    <h2>Data this app can fill for you</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th><th>How to use it</th></tr></thead>
      <tbody>${checklistRows}</tbody>
    </table>
  </section>
  <section class="section">
    <h2>Still needed from the homeowner</h2>
    <ul>${missingRows}</ul>
  </section>
  <section class="section">
    <h2>${includeContextComps ? "Comparable homes shown in this report" : "Supporting comparable homes in this grievance package"}</h2>
    ${compSections || "<p>No comparable homes are available for this print selection.</p>"}
  </section>
</body>
</html>`;
};const buildComparableSnapshotCandidate = (subject, comp, subjectProfile) => {
  const candidate = buildComparableCandidate(subject, comp);
  if(candidate) return candidate;
  const baseSubjectProfile = subjectProfile || buildComparableProfile(subject);
  const compProfile = buildComparableProfile(comp);
  const subjectNeighborhood = baseSubjectProfile.neighborhood;
  const compNeighborhood = compProfile.neighborhood;
  const subjectStreet = streetNameKeyForComp(subject.address);
  const compStreet = streetNameKeyForComp(comp.address);
  return {
    ...comp,
    _compScore: 0,
    _compReasons: [
      "Included from shared comparable snapshot",
      subjectNeighborhood && compNeighborhood && subjectNeighborhood===compNeighborhood ? "Same neighborhood: " + subjectNeighborhood : null,
      subjectStreet && compStreet && subjectStreet===compStreet ? "Same street: " + subjectStreet : null,
      comp.propClass===subject.propClass ? "Same residential class: " + propClassLabel(subject) : null
    ].filter(Boolean),
    _compSignals: ["Snapshot"],
    _compEvidenceCount: 0,
    _compPhysicalFieldsUsed: [],
    _compUnusedPhysicalFields: baseSubjectProfile.availablePhysicalFields,
    _compPhysicalFieldCountPossible: baseSubjectProfile.availablePhysicalFields.length,
    _compProfile: compProfile,
    _compDelta: buildComparableDelta(subject, comp, baseSubjectProfile, compProfile),
    _compSnapshotIncluded: true,
  };
};

const buildComparableCandidate = (subject, comp) => {
  if(!subject || !comp || comp.parcelId===subject.parcelId) return null;
  if(!isResidentialPropClass(subject.propClass) || comp.propClass!==subject.propClass) return null;
  const subjectProfile = buildComparableProfile(subject);
  const compProfile = buildComparableProfile(comp);
  let score = 18;
  const reasons = [];
  const allSignals = [];
  const physicalFieldsUsed = [];
  let evidenceCount = 0;
  const subjectNeighborhood = subjectProfile.neighborhood;
  const compNeighborhood = compProfile.neighborhood;
  if(subjectNeighborhood && compNeighborhood && subjectNeighborhood===compNeighborhood){
    score += 28;
    reasons.push("Same neighborhood: " + subjectNeighborhood);
    allSignals.push("Neighborhood");
  }else if(subject.zip && comp.zip===subject.zip){
    score += 10;
    reasons.push("Same ZIP: " + subject.zip);
    allSignals.push("ZIP");
  }
  const subjectStreet = streetNameKeyForComp(subject.address);
  const compStreet = streetNameKeyForComp(comp.address);
  if(subjectStreet && compStreet && subjectStreet===compStreet){
    score += 8;
    reasons.push("Same street: " + subjectStreet);
    allSignals.push("Street");
  }
  const subjectSqft = subjectProfile.livingArea;
  const compSqft = compProfile.livingArea;
  if(subjectSqft && compSqft){
    const pct = comparePctDelta(subjectSqft, compSqft);
    if(pct!=null && pct>0.6) return null;
    score += Math.max(0, 28 - ((pct || 0) * 40));
    reasons.push("Living area within " + Math.round((pct || 0) * 100) + "% (" + compSqft.toLocaleString() + " sq ft)");
    physicalFieldsUsed.push("Living area");
    evidenceCount += 1;
  }
  const subjectYear = subjectProfile.yearBuilt;
  const compYear = compProfile.yearBuilt;
  if(subjectYear && compYear){
    const diff = Math.abs(compYear-subjectYear);
    if(diff>80) return null;
    score += diff<=10 ? 16 : diff<=25 ? 10 : diff<=40 ? 5 : 1;
    reasons.push(diff===0 ? "Year built matches (" + compYear + ")" : "Year built within " + diff + " years (" + compYear + ")");
    physicalFieldsUsed.push("Year built");
    evidenceCount += 1;
  }
  const subjectBeds = subjectProfile.bedrooms;
  const compBeds = compProfile.bedrooms;
  if(subjectBeds!=null && compBeds!=null){
    const diff = Math.abs(compBeds-subjectBeds);
    if(diff>2) return null;
    score += diff===0 ? 12 : diff===1 ? 6 : 2;
    reasons.push(diff===0 ? compBeds + " bedrooms, same count" : compBeds + " bedrooms, within " + diff);
    physicalFieldsUsed.push("Bedrooms");
    evidenceCount += 1;
  }
  const subjectBaths = subjectProfile.bathCount;
  const compBaths = compProfile.bathCount;
  if(subjectBaths!=null && compBaths!=null){
    const diff = Math.abs(compBaths-subjectBaths);
    if(diff>2) return null;
    score += diff===0 ? 10 : diff<=0.5 ? 8 : diff<=1 ? 4 : 1;
    reasons.push(diff===0 ? compBaths + " baths, same count" : compBaths + " baths, within " + diff);
    physicalFieldsUsed.push("Baths");
    evidenceCount += 1;
  }
  const subjectStyle = (subjectProfile.style || "").toLowerCase();
  const compStyle = (compProfile.style || "").toLowerCase();
  if(subjectStyle && compStyle && subjectStyle===compStyle){
    score += 8;
    reasons.push("Same building style: " + subjectProfile.style);
    physicalFieldsUsed.push("Style");
    evidenceCount += 1;
  }
  const valuePct = comparePctDelta(subject.fullMarketValue, comp.fullMarketValue);
  if(valuePct!=null && valuePct<=0.35){
    score += 6;
    reasons.push("Market value within " + Math.round(valuePct * 100) + "%");
    allSignals.push("Market value");
  }
  if(hasInventoryProfile(subject) && evidenceCount===0) score -= 12;
  const delta = buildComparableDelta(subject, comp, subjectProfile, compProfile);
  const unusedPhysicalFields = subjectProfile.availablePhysicalFields.filter(label => !physicalFieldsUsed.includes(label));
  return {
    ...comp,
    _compScore: score,
    _compReasons: reasons,
    _compSignals: allSignals.concat(physicalFieldsUsed),
    _compEvidenceCount: evidenceCount,
    _compPhysicalFieldsUsed: physicalFieldsUsed,
    _compUnusedPhysicalFields: unusedPhysicalFields,
    _compPhysicalFieldCountPossible: subjectProfile.availablePhysicalFields.length,
    _compProfile: compProfile,
    _compDelta: delta
  };
};
const buildComparableResult = (subject, parcels, options={}) => {
  if(!subject) return null;
  const subjectProfile = buildComparableProfile(subject);
  const residential = isResidentialPropClass(subject.propClass);
  const exactCompIds = [...new Set((options?.exactCompIds||[]).map(normalizeParcelId).filter(Boolean))];
  const requestedDatasetKey = (options?.snapshotDatasetKey || "").trim();
  const currentDatasetKey = (options?.currentDatasetKey || "").trim();
  let neighbors = [];
  let comparableMode = "physical";
  let snapshot = {
    active: false,
    requestedCompIds: [],
    resolvedCompIds: [],
    missingCompIds: [],
    requestedDatasetKey,
    currentDatasetKey,
    datasetMismatch: false,
  };
  if(exactCompIds.length){
    comparableMode = "snapshot";
    snapshot = {
      active: true,
      requestedCompIds: exactCompIds,
      resolvedCompIds: [],
      missingCompIds: [],
      requestedDatasetKey,
      currentDatasetKey,
      datasetMismatch: !!(requestedDatasetKey && currentDatasetKey && requestedDatasetKey!==currentDatasetKey),
    };
    const parcelById = new Map();
    for(const parcel of parcels||[]){
      const key = normalizeParcelId(parcel?.parcelIdNorm || parcel?.parcelId || parcel?.printKey || parcel?.pinSbl);
      if(key && !parcelById.has(key)) parcelById.set(key, parcel);
    }
    neighbors = exactCompIds.map(compId=>{
      const comp = parcelById.get(compId);
      if(!comp || normalizeParcelId(comp.parcelIdNorm || comp.parcelId)===normalizeParcelId(subject.parcelIdNorm || subject.parcelId)) return null;
      return buildComparableSnapshotCandidate(subject, comp, subjectProfile);
    }).filter(Boolean);
    snapshot.resolvedCompIds = neighbors.map(comp=>normalizeParcelId(comp.parcelIdNorm || comp.parcelId || comp.printKey || comp.pinSbl)).filter(Boolean);
    snapshot.missingCompIds = exactCompIds.filter(compId=>!snapshot.resolvedCompIds.includes(compId));
  }else if(residential){
    neighbors = parcels
      .map(comp => buildComparableCandidate(subject, comp))
      .filter(Boolean)
      .sort((a,b)=>(b._compScore-a._compScore) || (Math.abs((a.fullMarketValue||0)-(subject.fullMarketValue||0)) - Math.abs((b.fullMarketValue||0)-(subject.fullMarketValue||0))))
      .slice(0,8);
  }
  if(!exactCompIds.length && !neighbors.length){
    comparableMode = "fallback";
    const streetKey = streetNameKeyForComp(subject.address);
    const subjectNeighborhood = subjectProfile.neighborhood;
    neighbors = parcels
      .filter(comp => comp.parcelId!==subject.parcelId)
      .filter(comp => comp.propClass===subject.propClass)
      .filter(comp => {
        if(subjectNeighborhood && parcelNeighborhoodName(comp)===subjectNeighborhood) return true;
        return streetKey && streetNameKeyForComp(comp.address)===streetKey;
      })
      .slice(0,8)
      .map(comp => {
        const compProfile = buildComparableProfile(comp);
        return {
          ...comp,
          _compScore: 0,
          _compEvidenceCount: 0,
          _compSignals: ["Neighborhood", "Street", "Class"],
          _compPhysicalFieldsUsed: [],
          _compUnusedPhysicalFields: subjectProfile.availablePhysicalFields,
          _compPhysicalFieldCountPossible: subjectProfile.availablePhysicalFields.length,
          _compProfile: compProfile,
          _compDelta: buildComparableDelta(subject, comp, subjectProfile, compProfile),
          _compReasons: [
            subjectNeighborhood && parcelNeighborhoodName(comp)===subjectNeighborhood ? "Same neighborhood: " + subjectNeighborhood : null,
            streetKey && streetNameKeyForComp(comp.address)===streetKey ? "Same street: " + streetKey : null,
            "Same residential class: " + propClassLabel(subject)
          ].filter(Boolean)
        };
      });
  }
  neighbors = neighbors.map(comp => ({
    ...comp,
    _grievanceRelevance: classifyGrievanceComparable(subject, comp),
  }));
  const grievanceSupportPool = neighbors.filter(comp => comp._grievanceRelevance?.kind === "supports");
  const grievanceCandidates = grievanceSupportPool.slice(0,4);
  const avgFMV = neighbors.length ? Math.round(neighbors.reduce((sum, comp)=>sum+(comp.fullMarketValue||0),0)/neighbors.length) : null;
  const avgAssessed = neighbors.length ? Math.round(neighbors.reduce((sum, comp)=>sum+(comp.assessedValue||0),0)/neighbors.length) : null;
  const avgEquity = neighbors.length ? +(neighbors.reduce((sum, comp)=>sum+(parseFloat(eqRFast(comp))||0),0)/neighbors.length).toFixed(1) : null;
  const grievanceAvgFMV = grievanceSupportPool.length ? Math.round(grievanceSupportPool.reduce((sum, comp)=>sum+(comp.fullMarketValue||0),0)/grievanceSupportPool.length) : null;
  const grievanceAvgAssessed = grievanceSupportPool.length ? Math.round(grievanceSupportPool.reduce((sum, comp)=>sum+(comp.assessedValue||0),0)/grievanceSupportPool.length) : null;
  const grievanceAvgEquity = grievanceSupportPool.length ? +(grievanceSupportPool.reduce((sum, comp)=>sum+(parseFloat(eqRFast(comp))||0),0)/grievanceSupportPool.length).toFixed(1) : null;
  const subjectEquity = subjectProfile.equity;
  const deltaFMV = avgFMV!=null ? subject.fullMarketValue-avgFMV : null;
  const deltaFMVPct = (avgFMV && deltaFMV!=null) ? (deltaFMV/avgFMV)*100 : null;
  const deltaAssessed = avgAssessed!=null ? subject.assessedValue-avgAssessed : null;
  const deltaEquity = (avgEquity!=null && subjectEquity!=null) ? +(subjectEquity-avgEquity).toFixed(1) : null;
  const grievanceDeltaFMV = grievanceAvgFMV!=null ? subject.fullMarketValue-grievanceAvgFMV : null;
  const grievanceDeltaFMVPct = (grievanceAvgFMV && grievanceDeltaFMV!=null) ? (grievanceDeltaFMV/grievanceAvgFMV)*100 : null;
  const grievanceDeltaAssessed = grievanceAvgAssessed!=null ? subject.assessedValue-grievanceAvgAssessed : null;
  const grievanceDeltaEquity = (grievanceAvgEquity!=null && subjectEquity!=null) ? +(subjectEquity-grievanceAvgEquity).toFixed(1) : null;
  const fairnessSignal = deltaEquity==null ? null : (deltaEquity>8 ? "Assessed above physically similar homes" : deltaEquity<-8 ? "Assessed below physically similar homes" : "Assessment is broadly in line with similar homes");
  const grievanceSignal = grievanceDeltaEquity==null ? null : (grievanceDeltaEquity>8 ? "Supporting grievance comps carry lower equity ratios than your home." : grievanceDeltaEquity<-8 ? "Supporting grievance comps carry higher equity ratios than your home." : "Supporting grievance comps show equity ratios in line with your home.");
  return {
    p: subject,
    neighbors,
    avgFMV,
    avgAssessed,
    avgEquity,
    grievanceAvgFMV,
    grievanceAvgAssessed,
    grievanceAvgEquity,
    deltaFMV,
    deltaFMVPct,
    deltaAssessed,
    deltaEquity,
    grievanceDeltaFMV,
    grievanceDeltaFMVPct,
    grievanceDeltaAssessed,
    grievanceDeltaEquity,
    fairnessSignal,
    grievanceSignal,
    comparableMode,
    usedInventory: residential && hasInventoryProfile(subject),
    scopeNeighborhood: subjectProfile.neighborhood || null,
    streetKey: streetNameKeyForComp(subject.address),
    subjectProfile,
    grievanceSupportPool,
    grievanceCandidates,
    snapshot,
  };
};

function pointInRingXY(x,y,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const xi=ring[i]?.[0], yi=ring[i]?.[1], xj=ring[j]?.[0], yj=ring[j]?.[1];
    if(!Number.isFinite(xi)||!Number.isFinite(yi)||!Number.isFinite(xj)||!Number.isFinite(yj)) continue;
    const intersect=((yi>y)!==(yj>y)) && (x < ((xj-xi)*(y-yi))/((yj-yi)||1e-12)+xi);
    if(intersect) inside=!inside;
  }
  return inside;
}
function pointInCompactMultiPoly(x,y,g){
  const polys = g?.g;
  if(!Array.isArray(polys)) return false;
  for(const poly of polys){
    if(!Array.isArray(poly) || !poly.length) continue;
    if(!pointInRingXY(x,y,poly[0])) continue;
    let inHole=false;
    for(let i=1;i<poly.length;i++){ if(pointInRingXY(x,y,poly[i])) { inHole=true; break; } }
    if(!inHole) return true;
  }
  return false;
}
function compactGeoJsonMultiPolygonCoords(geom){
  if(!geom || !geom.type || !geom.coordinates) return null;
  const src = geom.type==="MultiPolygon" ? geom.coordinates : (geom.type==="Polygon" ? [geom.coordinates] : null);
  if(!src || !Array.isArray(src)) return null;
  const out = [];
  for(const poly of src){
    if(!Array.isArray(poly) || !poly.length) continue;
    const polyOut = [];
    for(const ring of poly){
      if(!Array.isArray(ring) || !ring.length) continue;
      const ringOut = [];
      for(const pt of ring){
        if(!Array.isArray(pt) || pt.length<2) continue;
        const x = Number(pt[0]), y = Number(pt[1]);
        if(!Number.isFinite(x) || !Number.isFinite(y)) continue;
        ringOut.push([Math.round(x*10)/10, Math.round(y*10)/10]);
      }
      if(ringOut.length>=3) polyOut.push(ringOut);
    }
    if(polyOut.length) out.push(polyOut);
  }
  return out.length ? out : null;
}
function computeCompactGeometryAux(multiPoly){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,sx=0,sy=0,c=0;
  for(const poly of multiPoly){
    for(const ring of poly){
      for(const pt of ring){
        const x=pt[0], y=pt[1];
        if(!Number.isFinite(x)||!Number.isFinite(y)) continue;
        if(x<minX) minX=x; if(x>maxX) maxX=x;
        if(y<minY) minY=y; if(y>maxY) maxY=y;
        sx+=x; sy+=y; c++;
      }
    }
  }
  if(!Number.isFinite(minX) || c===0) return null;
  const round1 = n => Math.round(n*10)/10;
  return {
    b: [round1(minX), round1(minY), round1(maxX), round1(maxY)],
    c: [round1(sx/c), round1(sy/c)],
  };
}
function convertGeoJsonFeatureCollectionToCompactGeometry(payload, sourceName="uploaded.geojson"){
  if(!payload || payload.type!=="FeatureCollection" || !Array.isArray(payload.features)) return null;
  const byId = Object.create(null);
  let processed=0, skippedNoKey=0, skippedBadGeom=0, duplicateKeys=0;
  for(const ft of payload.features){
    const props = ft?.properties || {};
    const key = String(
      props.PRINT_KEY ?? props.PrintKey ?? props.print_key ?? props.parcelId ?? props.PARCELID ?? props.SBL ?? ""
    ).trim();
    if(!key){ skippedNoKey++; continue; }
    const g = compactGeoJsonMultiPolygonCoords(ft?.geometry);
    if(!g){ skippedBadGeom++; continue; }
    const aux = computeCompactGeometryAux(g);
    if(!aux){ skippedBadGeom++; continue; }
    if(byId[key]) duplicateKeys++;
    byId[key] = { g, b: aux.b, c: aux.c };
    processed++;
  }
  const count = Object.keys(byId).length;
  if(!count) return null;
  return {
    version: 1,
    source: sourceName,
    parsedAt: new Date().toISOString(),
    geometryType: "MultiPolygon",
    coordSystem: payload?.crs?.properties?.name || payload?.crs?.name || "GeoJSON-default",
    count,
    parcels: byId,
    stats: {
      inputFeatureCount: payload.features.length,
      processedFeatures: processed,
      duplicateKeys,
      skippedNoKey,
      skippedBadGeom,
    }
  };
}
function compactGeoJsonMultiLineCoords(geom){
  if(!geom || !geom.type || !geom.coordinates) return null;
  const src = geom.type==="MultiLineString" ? geom.coordinates : (geom.type==="LineString" ? [geom.coordinates] : null);
  if(!src || !Array.isArray(src)) return null;
  const out = [];
  for(const line of src){
    if(!Array.isArray(line) || line.length<2) continue;
    const lineOut = [];
    for(const pt of line){
      if(!Array.isArray(pt) || pt.length<2) continue;
      const x=Number(pt[0]), y=Number(pt[1]);
      if(!Number.isFinite(x)||!Number.isFinite(y)) continue;
      lineOut.push([Math.round(x*10)/10, Math.round(y*10)/10]);
    }
    if(lineOut.length>=2) out.push(lineOut);
  }
  return out.length ? out : null;
}
function computeCompactLineAux(lines){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  let totalLen=0, midTarget=0;
  const segs = [];
  for(const line of lines){
    for(let i=0;i<line.length;i++){
      const [x,y] = line[i];
      if(x<minX) minX=x; if(x>maxX) maxX=x;
      if(y<minY) minY=y; if(y>maxY) maxY=y;
      if(i===0) continue;
      const [x0,y0] = line[i-1];
      const dx=x-x0, dy=y-y0;
      const len=Math.hypot(dx,dy);
      if(len>0){ segs.push([x0,y0,x,y,len]); totalLen+=len; }
    }
  }
  if(!Number.isFinite(minX) || !segs.length) return null;
  midTarget = totalLen/2;
  let acc=0, cx=(minX+maxX)/2, cy=(minY+maxY)/2, angle=0;
  for(const [x0,y0,x1,y1,len] of segs){
    if(acc+len >= midTarget){
      const t=(midTarget-acc)/(len||1);
      cx = x0 + (x1-x0)*t;
      cy = y0 + (y1-y0)*t;
      angle = Math.atan2(y1-y0, x1-x0);
      break;
    }
    acc += len;
  }
  const round1 = n => Math.round(n*10)/10;
  return {
    b:[round1(minX),round1(minY),round1(maxX),round1(maxY)],
    c:[round1(cx),round1(cy)],
    a: Math.round(angle*1000)/1000,
  };
}
function inferStreetNameFromProps(props){
  if(!props || typeof props!=="object") return "";
  const keys = [
    "FULLNAME","FULL_NAME","STREET","STREETNAME","ST_NAME","STNAME","NAME","RD_NAME",
    "LABEL","FULL_STREE","FULLSTREET","ROADNAME","L_ST_NAME","R_ST_NAME"
  ];
  for(const k of keys){
    const v = props[k] ?? props[k.toLowerCase()];
    if(typeof v==="string" && v.trim()) return v.trim();
  }
  return "";
}
function isAlbanyStreetCenterlineFeature(props){
  if(!props || typeof props!=="object") return true;
  const lc = String(props.LeftCityTownName ?? props.leftcitytownname ?? "").trim().toLowerCase();
  const rc = String(props.RightCityTownName ?? props.rightcitytownname ?? "").trim().toLowerCase();
  if(!lc && !rc) return true; // Unknown schema; don't over-filter
  const isAlb = v => v==="albany" || v==="city of albany";
  return isAlb(lc) || isAlb(rc);
}
function convertGeoJsonFeatureCollectionToStreetCenterlines(payload, sourceName="uploaded.geojson"){
  if(!payload || payload.type!=="FeatureCollection" || !Array.isArray(payload.features)) return null;
  const streets = [];
  let skippedNoGeom=0, skippedNoName=0, skippedOutsideAlbany=0;
  for(const ft of payload.features){
    if(!isAlbanyStreetCenterlineFeature(ft?.properties)){ skippedOutsideAlbany++; continue; }
    const lines = compactGeoJsonMultiLineCoords(ft?.geometry);
    if(!lines){ skippedNoGeom++; continue; }
    const name = inferStreetNameFromProps(ft?.properties);
    if(!name){ skippedNoName++; continue; }
    const aux = computeCompactLineAux(lines);
    if(!aux){ skippedNoGeom++; continue; }
    streets.push({ n:name, g:lines, b:aux.b, c:aux.c, a:aux.a });
  }
  if(!streets.length) return null;
  return {
    version:1,
    kind:"streetCenterlines",
    source:sourceName,
    parsedAt:new Date().toISOString(),
    geometryType:"MultiLineString",
    coordSystem: payload?.crs?.properties?.name || payload?.crs?.name || "GeoJSON-default",
    count: streets.length,
    streets,
    stats:{
      inputFeatureCount: payload.features.length,
      skippedNoGeom,
      skippedNoName,
      skippedOutsideAlbany,
    }
  };
}
const Badge = ({children,color="#3b82f6",small}) => (
  <span style={{background:color+"22",color,border:`1px solid ${color}33`,borderRadius:5,padding:small?"1px 6px":"2px 8px",fontSize:small?10:11,fontWeight:600,fontFamily:"var(--fm)",whiteSpace:"nowrap"}}>{children}</span>
);
const AbsenteeExplain = ({parcel,compact=false}) => {
  if(!parcel) return null;
  const model = getAbsenteeModelFast(parcel);
  const details = model?.signals?.length ? model.signals : ["No strong off-site ownership signal."];
  return (
    <details style={{
      background:"rgba(249,115,22,.06)",
      border:"1px solid rgba(249,115,22,.18)",
      borderRadius:8,
      padding:compact ? "5px 8px" : "8px 10px",
      marginTop:compact ? 4 : 6,
      width:"100%"
    }}>
      <summary style={{
        cursor:"pointer",
        listStyle:"none",
        fontSize:compact ? 10 : 11,
        fontWeight:700,
        color:"#c2410c",
        fontFamily:"var(--fm)"
      }}>
        {model.flag ? "Why flagged as absentee?" : "Why not flagged as absentee?"}
      </summary>
      <div style={{display:"grid",gap:4,marginTop:compact ? 6 : 8}}>
        <div style={{fontSize:compact ? 10 : 11,color:"var(--gray2)",lineHeight:1.5}}>
          {model.label} ({model.confidence}, score {model.score})
        </div>
        {details.map((signal,idx)=>(
          <div key={`${parcel.parcelId||parcel.address||"parcel"}-absentee-${idx}`} style={{fontSize:compact ? 10 : 11,color:"var(--gray2)",lineHeight:1.45}}>
            {signal}
          </div>
        ))}
      </div>
    </details>
  );
};
const OwnerPortfolioSection = ({parcel, ownerPortfolioIndex, onSelectParcel}) => {
  const group = useMemo(()=>getOwnerPortfolioGroupFromIndex(parcel, ownerPortfolioIndex), [parcel, ownerPortfolioIndex]);
  if(!group || group.propertyCount<=1) return null;
  return (
    <details key={parcel?.parcelId||group.id} style={{background:"rgba(13,148,136,.06)",border:"1px solid rgba(13,148,136,.18)",borderRadius:8,padding:"8px 10px",marginTop:8,width:"100%"}}>
      <summary style={{cursor:"pointer",listStyle:"none",fontSize:11,fontWeight:700,color:"var(--teal2)",fontFamily:"var(--fm)"}}>
        {group.propertyCount} parcels potentially owned by same owner
      </summary>
      <div style={{display:"grid",gap:8,marginTop:8}}>
        <div style={{fontSize:11,color:"var(--gray2)",lineHeight:1.55}}>Grouped by normalized owner name across the loaded Albany roll. Verify manually before treating this as confirmed common ownership.</div>
        <div style={{display:"grid",gap:7,maxHeight:280,overflowY:"auto",paddingRight:2}}>
          {group.parcels.map(other=>{
            const current = other.parcelId===parcel.parcelId;
            return (
              <button
                key={other.parcelId}
                type="button"
                onClick={()=>onSelectParcel&&onSelectParcel(other)}
                style={{textAlign:"left",background:current?"rgba(37,99,235,.10)":"var(--card)",border:`1px solid ${current?"rgba(37,99,235,.26)":"var(--border)"}`,borderRadius:8,padding:"9px 11px",cursor:onSelectParcel?"pointer":"default",minWidth:0}}
              >
                <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start",flexWrap:"wrap",minWidth:0}}>
                  <div style={{minWidth:0,flex:"1 1 160px"}}>
                    <div style={{fontSize:12,fontWeight:700,overflowWrap:"anywhere",wordBreak:"break-word"}}>{other.address||other.parcelId}</div>
                    <div style={{fontSize:10,color:"var(--gray2)",marginTop:3,overflowWrap:"anywhere",wordBreak:"break-word"}}>{other.parcelId} | {other.neighborhood||"Neighborhood unknown"}{current?" | Current parcel":""}</div>
                  </div>
                  <div style={{textAlign:"right",minWidth:0,flex:"0 1 auto"}}>
                    <div style={{fontFamily:"var(--fm)",fontSize:11,color:"var(--amber)"}}>{$f(other.fullMarketValue)}</div>
                    <div style={{fontSize:10,color:"var(--gray3)",marginTop:3}}>{propClassLabel(other)}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </details>
  );
};
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

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ STAT CARD ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
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

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ PARCEL MINI CARD ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
const ParcelMini = ({p,onClick,selected,onCompare,inCompare}) => {
  const flag=eqFlagFast(p); const fc=FC[flag];
  const ownerPortfolioCount = getOwnerPortfolioCountFast(p);
  return (
    <div className="fi" onClick={()=>onClick&&onClick(p)} style={{
      background:selected?"rgba(37,99,235,0.12)":"var(--card)",border:`1px solid ${selected?"var(--blue)":"var(--border)"}`,
      borderRadius:11,padding:"14px 16px",cursor:onClick?"pointer":"default",transition:"all .15s",
    }}
    onMouseEnter={e=>{if(!selected&&onClick)e.currentTarget.style.background="var(--card2)"}}
    onMouseLeave={e=>{if(!selected&&onClick)e.currentTarget.style.background="var(--card)"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><AddrLink address={p.address} zip={p.zip} neighborhood={p.neighborhood} parcelId={p.parcelId}>{p.address}</AddrLink></div>
          <div style={{fontFamily:"var(--fm)",fontSize:10,color:"var(--gray)",margin:"3px 0 7px"}}>{p.parcelId} | {p.zip}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
            <Badge color="#6366f1" small>{propClassLabel(p)}</Badge>
            {ownerPortfolioCount>1&&<Badge color="#0f766e" small>{ownerPortfolioBadgeLabel(p)}</Badge>}
            {p.parcelType==="HOMESTEAD"&&<Badge color="#0d9488" small>Homestead</Badge>}
            {p.exemptions.length>0&&<Badge color="#f59e0b" small>{p.exemptions.length} Exemption{p.exemptions.length>1?"s":""}</Badge>}
            {isAbsenteeFast(p)&&<><Badge color="#f97316" small>Absentee</Badge><AbsenteeExplain parcel={p} compact /></>}
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontFamily:"var(--fm)",fontSize:15,fontWeight:600,color:"var(--amber)"}}>{$f(p.fullMarketValue)}</div>
          <div style={{fontSize:10,color:"var(--gray)",margin:"2px 0 5px"}}>FMV</div>
          <span style={{fontSize:11,color:fc,fontWeight:600}}>o {eqRFast(p)}%</span>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid var(--border)",paddingTop:8,marginTop:8}}>
        <div style={{fontSize:11,color:"var(--gray2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"65%"}}>{p.owner1}{p.owner2?` & ${p.owner2}`:""}</div>
        {onCompare&&<button onClick={e=>{e.stopPropagation();onCompare(p)}} style={{background:inCompare?"rgba(37,99,235,.25)":"rgba(255,255,255,.05)",border:`1px solid ${inCompare?"var(--blue)":"var(--border)"}`,color:inCompare?"var(--blue2)":"var(--gray)",borderRadius:5,padding:"2px 8px",fontSize:10,cursor:"pointer",fontFamily:"var(--fm)"}}>{inCompare?"Added to Compare":"+ Compare"}</button>}
      </div>
    </div>
  );
};

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ DETAIL PANEL ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
const DetailPanel = ({p,onClose,myHome,onSaveHome,ownerPortfolioIndex,onSelectParcel}) => {
  const flag=eqFlagFast(p); const fc=FC[flag]; const r=parseFloat(eqRFast(p)); const absenteeModel=getAbsenteeModelFast(p);
  const ownerPortfolioGroup = getOwnerPortfolioGroupFromIndex(p, ownerPortfolioIndex);
  const ownerPortfolioCount = ownerPortfolioGroup?.propertyCount || 0;
  const Row = ({label,value,color,mono}) => (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",marginBottom:6,gap:12,minWidth:0}}>
      <span style={{fontSize:12,color:"var(--gray)",flex:"1 1 120px",minWidth:0}}>{label}</span>
      <span style={{fontSize:12,fontFamily:mono?"var(--fm)":"inherit",fontWeight:500,color:color||"var(--white)",textAlign:"right",flex:"1 1 160px",minWidth:0,maxWidth:"100%",overflowWrap:"anywhere",wordBreak:"break-word",whiteSpace:"normal"}}>{value}</span>
    </div>
  );
  const Sec = ({title,children}) => (
    <div style={{marginBottom:18,minWidth:0}}>
      <div style={{fontSize:9,fontWeight:700,color:"var(--gray2)",letterSpacing:1.2,textTransform:"uppercase",marginBottom:8,paddingBottom:5,borderBottom:"1px solid var(--border)"}}>{title}</div>
      {children}
    </div>
  );
  const totExC=p.exemptions.reduce((s,e)=>s+e.countyAmt,0);
  const totExCI=p.exemptions.reduce((s,e)=>s+e.cityAmt,0);
  const totExS=p.exemptions.reduce((s,e)=>s+e.schoolAmt,0);
  return (
    <div className="fi" style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:14,padding:20,height:"100%",maxWidth:"100%",minWidth:0,overflowY:"auto",position:"relative"}}>
      <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:"var(--card2)",border:"1px solid var(--border)",borderRadius:6,color:"var(--gray)",width:26,height:26,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>x</button>
      <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:800,marginBottom:2,paddingRight:32,lineHeight:1.1,overflowWrap:"anywhere",wordBreak:"break-word"}}><AddrLink address={p.address} zip={p.zip} neighborhood={p.neighborhood} parcelId={p.parcelId}>{p.address}</AddrLink></div>
      <div style={{fontFamily:"var(--fm)",fontSize:11,color:"var(--gray)",marginBottom:10,overflowWrap:"anywhere",wordBreak:"break-word"}}>Parcel {p.parcelId} | Albany, NY {p.zip}{parcelAreaSummary(p)?` | ${parcelAreaSummary(p)}`:""}</div>
      {/* Save My Home button */}
      {onSaveHome&&<button onClick={()=>onSaveHome(p)} style={{
        display:"flex",alignItems:"center",gap:6,
        background:myHome?.parcelId===p.parcelId?"rgba(34,197,94,.15)":"rgba(255,255,255,.05)",
        border:`1px solid ${myHome?.parcelId===p.parcelId?"rgba(34,197,94,.4)":"var(--border)"}`,
        color:myHome?.parcelId===p.parcelId?"var(--green2)":"var(--gray)",
        borderRadius:7,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer",marginBottom:14
      }}>
        {myHome?.parcelId===p.parcelId?"Home: This is My Home (saved)":"Save as My Home"}
      </button>}
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14,minWidth:0}}>
        {ownerPortfolioCount>1&&<Badge color="#0f766e">{ownerPortfolioBadgeLabel(p)}</Badge>}
        {isAbsenteeFast(p)&&<Badge color="#f97316">Absentee</Badge>}
        {p.exemptions.length>0&&<Badge color="#f59e0b">{p.exemptions.length} exemption{p.exemptions.length===1?"":"s"}</Badge>}
      </div>
      {/* Equity meter */}
      <div style={{background:`${fc}11`,border:`1px solid ${fc}33`,borderRadius:9,padding:12,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:11,fontWeight:600,color:fc}}>{FL[flag]}</span>
          <span style={{fontFamily:"var(--fm)",fontSize:13,fontWeight:700,color:fc}}>{eqRFast(p)}%</span>
        </div>
        <div style={{height:5,background:"var(--bg)",borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${Math.min(isNaN(r)?0:r,150)/1.5}%`,background:fc,borderRadius:3,transition:"width .5s ease"}}></div>
        </div>
        <div style={{fontSize:10,color:"var(--gray2)",marginTop:5}}>Assessed / FMV | Fair range: 80-120%</div>
      </div>
      <Sec title="Ownership">
        <Row label="Primary Owner" value={p.owner1}/>
        {p.owner2&&<Row label="Co-Owner" value={p.owner2}/>}
        <Row label="Neighborhood" value={parcelNeighborhoodName(p)||"Not available"}/>
        {parcelNeighborhoodAssociation(p)&&parcelNeighborhoodAssociation(p)!==parcelNeighborhoodName(p)&&<Row label="Neighborhood Association" value={parcelNeighborhoodAssociation(p)}/>}
        <Row label="Mailing Address" value={p.mailAddress||"Not available"}/>
        {ownerPortfolioCount>1&&<Row label="Owner Portfolio" value={`${ownerPortfolioCount} parcels potentially owned by same owner`} color="var(--teal2)"/>}
        <Row label="Absentee Signal" value={absenteeModel.label+" ("+absenteeModel.confidence+", score "+absenteeModel.score+")"}  color={isAbsenteeFast(p)?"#f97316":"#22c55e"}/>
        <AbsenteeExplain parcel={p} />
        <OwnerPortfolioSection parcel={p} ownerPortfolioIndex={ownerPortfolioIndex} onSelectParcel={onSelectParcel} />
      </Sec>
      <Sec title="Valuation">
        <Row label="Full Market Value" value={$f(p.fullMarketValue)} mono color="#f59e0b"/>
        <Row label="Total Assessed Value" value={$f(p.assessedValue)} mono/>
        <Row label="Land Value" value={$f(p.landValue)} mono/>
        <Row label="Building Value" value={$f(p.assessedValue-p.landValue)} mono/>
        <Row label="Land Share" value={gentriIdx(p)+"% land-to-total"} mono color={parseFloat(gentriIdx(p))>50?"#f97316":"var(--white)"}/>
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
              <Badge color="#f59e0b" small>Sec. {ex.code}</Badge>
            </div>
            <div className="cols-3" style={{display:"grid",gap:4,fontSize:11,color:"var(--gray)"}}>
              <span>County: {$f(ex.countyAmt)}</span><span>City: {$f(ex.cityAmt)}</span><span>School: {$f(ex.schoolAmt)}</span>
            </div>
          </div>
        ))}
        <div style={{fontSize:10,color:"var(--gray2)",marginTop:4}}>Totals - County: {$f(totExC)} | City: {$f(totExCI)} | School: {$f(totExS)}</div>
      </Sec>}
      {hasInventoryProfile(p)&&<Sec title="Residential Profile">
        {inventoryStyle(p)&&<Row label="Building Style" value={inventoryStyle(p)}/>}
        {inventoryYearBuilt(p)&&<Row label="Year Built (inventory)" value={inventoryYearBuilt(p)} mono color="var(--teal2)"/>}
        {inventorySqft(p)!=null&&<Row label="Living Area" value={`${inventorySqft(p).toLocaleString()} sq ft`} mono/>}
        {inventoryBedrooms(p)!=null&&<Row label="Bedrooms" value={inventoryBedrooms(p)} mono/>}
        {(inventoryFullBaths(p)!=null || inventoryHalfBaths(p)!=null)&&<Row label="Baths" value={inventoryBathText(p)} mono/>}
        {Number.isFinite(Number(inventoryOf(p)?.inventoryTotalAssessedValue))&&<Row label="Inventory Total AV" value={$f(Number(inventoryOf(p)?.inventoryTotalAssessedValue))} mono/>}
        {inventoryOf(p)?.joinSource&&<Row label="Inventory Source" value={inventoryOf(p)?.joinSource}/>} 
      </Sec>}
      <Sec title="Property Details">
        <Row label="Class" value={propClassLabel(p)}/>
        {propClassOfficialTitle(p?.propClass)&&propClassOfficialLabel(p)!==propClassLabel(p)&&<Row label="Official Class" value={propClassOfficialLabel(p)}/>} 
        {propClassMeaning(p)&&<Row label="Class Meaning" value={propClassMeaning(p)}/>}
        <Row label="Type" value={p.parcelType}/>
        <Row label="Lot Size" value={p.frontage&&p.depth?`${p.frontage}x${p.depth} ft (${nf(p.frontage*p.depth)} sq ft)`:"-"}/>
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

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ PROPERTY LIST MODAL ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â slide-over panel for drilldown from any stat ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
const PropListModal = ({data, onClose}) => {
  if (!data) return null;
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const shown = q
    ? data.parcels.filter(p=>(p._searchBlob||"").includes(q)||(p._ownerBlob||"").includes(q))
    : data.parcels;
  const listHeight = Math.max(260, Math.min(620, (typeof window!=="undefined" ? window.innerHeight : 760) - 220));
  const renderRow = p => (
    <div key={p.parcelId} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:10,padding:"11px 14px",marginBottom:7}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><AddrLink address={p.address} zip={p.zip} neighborhood={p.neighborhood} parcelId={p.parcelId}>{p.address||"(no address)"}</AddrLink></div>
          <div style={{fontFamily:"var(--fm)",fontSize:10,color:"var(--gray)",marginTop:1}}>{p.parcelId} | {p.zip}</div>
          <div style={{fontSize:11,color:"var(--gray2)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.owner1}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:5}}>
            <Badge color="#6366f1" small>{propClassLabel(p)}</Badge>
            {p.parcelType==="HOMESTEAD"&&<Badge color="#0d9488" small>Homestead</Badge>}
            {p.exemptions?.length>0&&<Badge color="#f59e0b" small>{p.exemptions.length} Exempt</Badge>}
            {isAbsenteeFast(p)&&<><Badge color="#f97316" small>Absentee</Badge><AbsenteeExplain parcel={p} compact /></>}
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontFamily:"var(--fm)",fontSize:14,fontWeight:600,color:"var(--amber)"}}>{$f(p.fullMarketValue)}</div>
          <div style={{fontSize:10,color:"var(--gray)",marginTop:1}}>FMV</div>
          <div style={{fontSize:11,color:FC[eqFlagFast(p)],marginTop:2,fontFamily:"var(--fm)",fontWeight:600}}>{eqRFast(p)}%</div>
        </div>
      </div>
    </div>
  );
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",backdropFilter:"blur(4px)",zIndex:800,display:"flex",justifyContent:"flex-end"}} onClick={onClose}>
      <div className="fi" onClick={e=>e.stopPropagation()} style={{
        background:"var(--bg2)",borderLeft:"1px solid var(--border2)",
        width:540,maxWidth:"95vw",height:"100vh",display:"flex",flexDirection:"column",
        boxShadow:"-24px 0 70px rgba(0,0,0,.6)"
      }}>
        <div style={{padding:"18px 22px",borderBottom:"1px solid var(--border)",background:"var(--bg3)",position:"sticky",top:0,zIndex:1,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:16}}>{data.title}</div>
              <div style={{fontSize:12,color:"var(--gray2)",marginTop:2}}>{shown.length.toLocaleString()} of {data.parcels.length.toLocaleString()} propert{data.parcels.length===1?"y":"ies"}</div>
            </div>
            <button onClick={onClose} style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:7,color:"var(--gray)",width:30,height:30,cursor:"pointer",fontSize:14,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>x</button>
          </div>
          <input
            placeholder="Filter this list..."
            value={search} onChange={e=>setSearch(e.target.value)}
            style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border2)",color:"var(--white)",borderRadius:8,padding:"7px 11px",fontSize:12,fontFamily:"var(--fb)"}}
          />
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"10px 14px"}}>
          <VirtualRows
            items={shown}
            rowHeight={104}
            height={listHeight}
            renderRow={renderRow}
            empty={<div style={{textAlign:"center",padding:40,color:"var(--gray2)"}}>No matching properties.</div>}
          />
        </div>
      </div>
    </div>
  );
};

/* u{00E2}u{0080}u{009D}u{00E2}u{0082}u{00AC}u{00E2}u{0080}u{009D} DEBOUNCE HOOK ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â delays useMemo recomputation until typing stops ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

/* ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
   TAB PANELS
ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â */

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ 1. BROWSE ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
const Browse = ({parcels,meta={},compareList,onCompare,myHome,onSaveHome,onOpenHomeSetup,ownerPortfolioIndex}) => {
  const [search,setSearch]=useState("");
  const [fZip,setFZip]=useState(""); const [fCls,setFCls]=useState(""); const [fTyp,setFTyp]=useState("");
  const [fEx,setFEx]=useState(""); const [fEq,setFEq]=useState(""); const [fNbr,setFNbr]=useState("");
  const [fBeds,setFBeds]=useState(""); const [fSqft,setFSqft]=useState(""); const [fYear,setFYear]=useState(""); const [fStyle,setFStyle]=useState("");
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
  const inventoryStyles=useMemo(()=>[...new Set(parcels.map(p=>(p._invStyle||"").trim()).filter(Boolean))].sort(),[parcels]);
  const SI={background:"var(--bg3)",border:"1px solid var(--border)",color:"var(--white)",borderRadius:8,padding:"7px 11px",fontSize:12,fontFamily:"var(--fb)",cursor:"pointer"};

  // Auto-fill search from My Home
  const useMyHome = () => { if(myHome) setSearch(myHome.address.split(" ").slice(0,2).join(" ")); };
  const filtered=useMemo(()=>{
    let r=parcels.slice();
    const q=dSearch.toLowerCase();
    const oq=dOwner.toLowerCase();
    if(q)r=r.filter(p=>(p._searchBlob||"").includes(q));
    if(oq)r=r.filter(p=>(p._ownerBlob||"").includes(oq));
    if(fZip)r=r.filter(p=>p.zip===fZip);
    if(fCls)r=r.filter(p=>p.propClass===fCls);
    if(fTyp)r=r.filter(p=>p.parcelType===fTyp);
    if(fEx)r=r.filter(p=>p.exemptions.some(e=>e.name===fEx));
    if(fNbr)r=r.filter(p=>p.neighborhood===fNbr);
    if(fEq==="under")r=r.filter(p=>p._eqBand==="under");
    if(fEq==="fair")r=r.filter(p=>p._eqBand==="fair");
    if(fEq==="over")r=r.filter(p=>p._eqBand==="over");
    if(fEq==="absentee")r=r.filter(p=>p._absentee===true);
    if(fBeds==="0-1")r=r.filter(p=>(p._invBedrooms??-1)>=0&&(p._invBedrooms??-1)<=1);
    if(fBeds==="2")r=r.filter(p=>(p._invBedrooms??-1)===2);
    if(fBeds==="3")r=r.filter(p=>(p._invBedrooms??-1)===3);
    if(fBeds==="4")r=r.filter(p=>(p._invBedrooms??-1)===4);
    if(fBeds==="5+")r=r.filter(p=>(p._invBedrooms??-1)>=5);
    if(fSqft==="<1000")r=r.filter(p=>(p._invSqft??-1)>0&&(p._invSqft??-1)<1000);
    if(fSqft==="1000-1499")r=r.filter(p=>(p._invSqft??-1)>=1000&&(p._invSqft??-1)<=1499);
    if(fSqft==="1500-1999")r=r.filter(p=>(p._invSqft??-1)>=1500&&(p._invSqft??-1)<=1999);
    if(fSqft==="2000-2499")r=r.filter(p=>(p._invSqft??-1)>=2000&&(p._invSqft??-1)<=2499);
    if(fSqft==="2500+")r=r.filter(p=>(p._invSqft??-1)>=2500);
    if(fYear==="<1900")r=r.filter(p=>(p._invYearBuilt??0)>0&&(p._invYearBuilt??0)<1900);
    if(fYear==="1900-1939")r=r.filter(p=>(p._invYearBuilt??0)>=1900&&(p._invYearBuilt??0)<=1939);
    if(fYear==="1940-1969")r=r.filter(p=>(p._invYearBuilt??0)>=1940&&(p._invYearBuilt??0)<=1969);
    if(fYear==="1970-1999")r=r.filter(p=>(p._invYearBuilt??0)>=1970&&(p._invYearBuilt??0)<=1999);
    if(fYear==="2000+")r=r.filter(p=>(p._invYearBuilt??0)>=2000);
    if(fStyle)r=r.filter(p=>((p._invStyle||"").trim()===fStyle));
    r.sort((a,b)=>{
      if(sort==="fmv-desc")return b.fullMarketValue-a.fullMarketValue;
      if(sort==="fmv-asc")return a.fullMarketValue-b.fullMarketValue;
      if(sort==="address")return a.address.localeCompare(b.address);
      if(sort==="assessed")return b.assessedValue-a.assessedValue;
      if(sort==="equity")return (a._eqRatioNum??0)-(b._eqRatioNum??0);
      if(sort==="land")return b.landValue-a.landValue;
      return 0;
    });
    return r;
  },[parcels,dSearch,dOwner,fZip,fCls,fTyp,fEx,fEq,fNbr,fBeds,fSqft,fYear,fStyle,sort]);
  // Reset to page 1 whenever debounced filters or sort change
  useEffect(()=>{setPage(0);},[dSearch,dOwner,fZip,fCls,fTyp,fEx,fEq,fNbr,fBeds,fSqft,fYear,fStyle,sort]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const pageSlice=filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  const clearAll=()=>{setSearch("");setOwnerSearch("");setFZip("");setFCls("");setFTyp("");setFEx("");setFEq("");setFNbr("");setFBeds("");setFSqft("");setFYear("");setFStyle("");};
  const hasFilters=search||ownerSearch||fZip||fCls||fTyp||fEx||fEq||fNbr||fBeds||fSqft||fYear||fStyle;
  return (
    <div className={sel?"panel-split":undefined} style={!sel?{display:"grid",gridTemplateColumns:"1fr",gap:18}:undefined}>
      <div>
        {!myHome&&<div style={{background:"linear-gradient(135deg,rgba(37,99,235,.12) 0%,rgba(13,148,136,.08) 100%)",border:"1px solid rgba(37,99,235,.3)",borderRadius:12,padding:"18px 20px",marginBottom:16,display:"flex",gap:16,alignItems:"flex-start"}}>
          <span style={{fontSize:28,flexShrink:0}}>Start</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:15,marginBottom:6}}>Check Any Albany Property</div>
            <div style={{fontSize:12,color:"var(--gray2)",lineHeight:1.8,marginBottom:10}}>This dashboard lets you explore every property in Albany's 2025 Final Assessment Roll - search by address, compare neighborhoods, check if you're overpaying taxes, and understand what every number on your tax bill actually means. <b style={{color:"var(--white)"}}>No property tax experience required.</b> Each tab has plain-English explanations built in.</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={onOpenHomeSetup} style={{background:"var(--green)",color:"white",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Save My Home Address</button>
              <span style={{fontSize:12,color:"var(--gray2)",alignSelf:"center"}}>Saves your address so you never have to type it again across any tab</span>
            </div>
          </div>
        </div>}
        <InfoBox icon="Guide" title="How to Use the Property Browser" color="#3b82f6">
          Search and filter all parcels in the Albany 2025 Assessment Roll. Use the search box to find a property by street address, owner name, or parcel ID. Apply additional filters to narrow by ZIP code, neighborhood, property class (single-family, commercial, etc.), homestead status, active exemptions, and assessment equity. Click any card to open a full detail panel on the right. Use the <b style={{color:"var(--white)"}}>+ Compare</b> button to queue up to 4 parcels for side-by-side analysis in the Compare tab.
        </InfoBox>
        {myHome&&<MyHomeBanner myHome={myHome} onUse={useMyHome} label="Jump to My Home"/>}
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
          <AddressAutocompleteInput parcels={parcels} value={search} onChange={setSearch} onSelectParcel={p=>{setSearch(p.address);setSel(p);}} placeholder="Address, parcel ID, neighborhood..." inputStyle={{...SI,width:"100%",cursor:"text"}} wrapperStyle={{flex:"1 1 200px",minWidth:180}}/>
          <input placeholder="Owner name (last, first or company)..." value={ownerSearch} onChange={e=>setOwnerSearch(e.target.value)} style={{...SI,flex:"1 1 200px",minWidth:200,borderColor:ownerSearch?"rgba(59,130,246,.6)":"var(--border)",background:ownerSearch?"rgba(37,99,235,.12)":"var(--bg3)"}}/>
          <select value={fNbr} onChange={e=>setFNbr(e.target.value)} style={SI}><option value="">All Neighborhoods</option>{nbrs.map(n=><option key={n}>{n}</option>)}</select>
          <select value={fZip} onChange={e=>setFZip(e.target.value)} style={SI}><option value="">All ZIPs</option>{zips.map(z=><option key={z}>{z}</option>)}</select>
          <select value={fCls} onChange={e=>setFCls(e.target.value)} style={SI}><option value="">All Classes</option>{clss.map(c=><option key={c} value={c}>{formatPropClassOfficialLabel(c, clssDescs?.[c])}</option>)}</select>
          <select value={fTyp} onChange={e=>setFTyp(e.target.value)} style={SI}><option value="">All Types</option><option value="HOMESTEAD">Homestead</option><option value="NON-HOMESTEAD">Non-Homestead</option></select>
          {exs.length>0&&<select value={fEx} onChange={e=>setFEx(e.target.value)} style={SI}><option value="">All Exemptions</option>{exs.map(e=><option key={e}>{e}</option>)}</select>}
          <select value={fEq} onChange={e=>setFEq(e.target.value)} style={SI}><option value="">All Equity</option><option value="under">Under-Assessed</option><option value="fair">Fair Value</option><option value="over">Over-Assessed</option><option value="absentee">Absentee Owner</option></select>
          <select value={fBeds} onChange={e=>setFBeds(e.target.value)} style={SI}><option value="">Any Beds</option><option value="0-1">0-1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5+">5+</option></select>
          <select value={fSqft} onChange={e=>setFSqft(e.target.value)} style={SI}><option value="">Any Sq Ft</option><option value="<1000">&lt; 1000</option><option value="1000-1499">1000-1499</option><option value="1500-1999">1500-1999</option><option value="2000-2499">2000-2499</option><option value="2500+">2500+</option></select>
          <select value={fYear} onChange={e=>setFYear(e.target.value)} style={SI}><option value="">Any Year Built</option><option value="<1900">&lt; 1900</option><option value="1900-1939">1900-1939</option><option value="1940-1969">1940-1969</option><option value="1970-1999">1970-1999</option><option value="2000+">2000+</option></select>
          {inventoryStyles.length>0&&<select value={fStyle} onChange={e=>setFStyle(e.target.value)} style={SI}><option value="">Any Building Style</option>{inventoryStyles.map(style=><option key={style} value={style}>{style}</option>)}</select>}
          <select value={sort} onChange={e=>setSort(e.target.value)} style={SI}><option value="fmv-desc">FMV high to low</option><option value="fmv-asc">FMV low to high</option><option value="assessed">Assessed high to low</option><option value="address">Address A to Z</option><option value="equity">Equity %</option><option value="land">Land value high to low</option></select>
          {hasFilters&&<button onClick={clearAll} style={{...SI,color:"#f87171",borderColor:"rgba(220,38,38,.3)",cursor:"pointer"}}>Clear</button>}
          <div style={{display:"flex",gap:3,marginLeft:"auto"}}>
            {["grid","table"].map(m=><button key={m} onClick={()=>setView(m)} style={{background:view===m?"var(--blue)":"var(--card2)",border:"1px solid var(--border)",color:view===m?"white":"var(--gray)",borderRadius:7,width:50,height:32,cursor:"pointer",fontSize:11}}>{m==="grid"?"Grid":"List"}</button>)}
          </div>
        </div>
        <div style={{fontSize:11,color:"var(--gray2)",marginBottom:10,display:"flex",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <span>Showing <b style={{color:"var(--white)"}}>{filtered.length.toLocaleString()}</b> of {parcels.length.toLocaleString()} parcels</span>
          {pageCount>1&&<span style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}>
            <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{background:"var(--card2)",border:"1px solid var(--border)",color:page===0?"var(--gray3)":"var(--white)",borderRadius:6,width:28,height:28,cursor:page===0?"default":"pointer",fontSize:15,lineHeight:1}}>{"<"}</button>
            <span style={{fontFamily:"var(--fm)",fontSize:11}}>Page {page+1} / {pageCount}</span>
            <button onClick={()=>setPage(p=>Math.min(pageCount-1,p+1))} disabled={page===pageCount-1} style={{background:"var(--card2)",border:"1px solid var(--border)",color:page===pageCount-1?"var(--gray3)":"var(--white)",borderRadius:6,width:28,height:28,cursor:page===pageCount-1?"default":"pointer",fontSize:15,lineHeight:1}}>{">"}</button>
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
              <td style={{padding:"7px 11px",fontWeight:500}}><AddrLink address={p.address} zip={p.zip} neighborhood={p.neighborhood} parcelId={p.parcelId}>{p.address}</AddrLink></td>
              <td style={{padding:"7px 11px",color:"var(--gray2)"}}>{p.neighborhood}</td>
              <td style={{padding:"7px 11px",fontFamily:"var(--fm)",fontSize:11}}>{p.zip}</td>
              <td style={{padding:"7px 11px",color:"var(--gray2)"}}>
                <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:5,minWidth:0}}>
                  <span style={{overflowWrap:"anywhere",wordBreak:"break-word"}}>{p.owner1}</span>
                  {getOwnerPortfolioCountFast(p)>1&&<Badge color="#0f766e" small>{ownerPortfolioBadgeLabel(p)}</Badge>}
                </div>
              </td>
              <td style={{padding:"7px 11px"}}><span title={propClassTooltip(p)}><Badge color="#6366f1" small>{propClassDescLabel(p)}</Badge></span></td>
              <td style={{padding:"7px 11px",fontFamily:"var(--fm)",color:"var(--amber)"}}>{$f(p.fullMarketValue)}</td>
              <td style={{padding:"7px 11px",fontFamily:"var(--fm)"}}>{$f(p.assessedValue)}</td>
              <td style={{padding:"7px 11px"}}><span style={{color:FC[eqFlagFast(p)],fontFamily:"var(--fm)",fontWeight:600}}>{eqRFast(p)}%</span></td>
              <td style={{padding:"7px 11px"}}>{p.parcelType==="HOMESTEAD"?<Badge color="#0d9488" small>H</Badge>:<Badge color="#64748b" small>NH</Badge>}</td>
              <td style={{padding:"7px 11px"}}>{p.exemptions.map(e=><Badge key={e.code} color="#f59e0b" small>{e.name}</Badge>)}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </div>
      {sel&&<div style={{position:"sticky",top:20,maxHeight:"90vh",overflowY:"auto"}}><DetailPanel p={sel} onClose={()=>setSel(null)} myHome={myHome} onSaveHome={onSaveHome} ownerPortfolioIndex={ownerPortfolioIndex} onSelectParcel={setSel}/></div>}
    </div>
  );
};

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ 2. ANALYTICS ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
const Analytics = ({parcels}) => {
  const fmvBkts=useMemo(()=>{
    const b={"<100k":0,"100-200k":0,"200-300k":0,"300-400k":0,"400-500k":0,"500-750k":0,"750k+":0};
    parcels.forEach(p=>{const v=p.fullMarketValue;if(v<100000)b["<100k"]++;else if(v<200000)b["100-200k"]++;else if(v<300000)b["200-300k"]++;else if(v<400000)b["300-400k"]++;else if(v<500000)b["400-500k"]++;else if(v<750000)b["500-750k"]++;else b["750k+"]++;});
    return Object.entries(b).map(([range,count])=>({range,count}));
  },[parcels]);
  const eqBkts=useMemo(()=>{
    const b={"<60%":0,"60-80%":0,"80-100%":0,"100-120%":0,">120%":0};
    parcels.forEach(p=>{const r=p.fullMarketValue>0?(p.assessedValue/p.fullMarketValue)*100:null;if(!r)return;if(r<60)b["<60%"]++;else if(r<80)b["60-80%"]++;else if(r<100)b["80-100%"]++;else if(r<120)b["100-120%"]++;else b[">120%"]++;});
    return Object.entries(b).map(([range,count])=>({range,count}));
  },[parcels]);
  const clsDist=useMemo(()=>{const m={};parcels.forEach(p=>{m[p.propClassDesc]=(m[p.propClassDesc]||0)+1;});return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);},[parcels]);
  const avgByZip=useMemo(()=>{const m={};parcels.forEach(p=>{if(!m[p.zip])m[p.zip]={t:0,c:0};m[p.zip].t+=p.fullMarketValue;m[p.zip].c++;});return Object.entries(m).map(([zip,v])=>({zip,avg:Math.round(v.t/v.c)})).sort((a,b)=>b.avg-a.avg);},[parcels]);
  const exTypes=useMemo(()=>{const m={};parcels.forEach(p=>p.exemptions.forEach(e=>{m[e.name]=(m[e.name]||0)+1;}));return Object.entries(m).map(([name,count])=>({name,count}));},[parcels]);
  const deedYears=useMemo(()=>{const m={};parcels.forEach(p=>{if(p.deedYear)m[p.deedYear]=(m[p.deedYear]||0)+1;});return Object.entries(m).sort((a,b)=>a[0]-b[0]).map(([year,count])=>({year,count}));},[parcels]);
  const scatterPoints=useMemo(()=>{
    const sampled=downsampleScatterParcels(parcels, 1800);
    return sampled.map(p=>({fmv:p.fullMarketValue,assessed:p.assessedValue,name:p.address}));
  },[parcels]);
  const avgLandByClass=useMemo(()=>{
    const m=new Map();
    for(const p of parcels){
      const key=p.propClassDesc||"Unknown";
      const row=m.get(key)||{cls:key,land:0,bldg:0,count:0};
      row.land+=p.landValue||0;
      row.bldg+=Math.max(0,(p.assessedValue||0)-(p.landValue||0));
      row.count++;
      m.set(key,row);
    }
    return [...m.values()]
      .filter(x=>x.count>0)
      .map(x=>({cls:x.cls,avgLand:Math.round(x.land/x.count),avgBldg:Math.round(x.bldg/x.count),count:x.count}))
      .sort((a,b)=>b.count-a.count)
      .slice(0,6);
  },[parcels]);

  const C=({title,desc,children})=>(
    <Card>
      <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:desc?6:14}}>{title}</div>
      {desc&&<div style={{fontSize:11,color:"var(--gray2)",marginBottom:12,lineHeight:1.7}}>{desc}</div>}
      {children}
    </Card>
  );

  return (
    <div className="fi">
      <InfoBox icon="Charts" title="Understanding These Charts" color="#3b82f6">
        This tab gives you a bird's-eye view of Albany's entire property landscape. Each chart is built directly from the assessment roll data - no estimates or projections. Together they reveal how property values are distributed across the city, whether the assessment roll is fair, what types of properties dominate each area, and how active the real estate market has been over time. Hover over any bar or dot for exact numbers.
      </InfoBox>
      <div className="cols-2" style={{display:"grid",gap:14}}>
        <C title="Full Market Value Distribution"
           desc="How many properties fall into each price range. A city with healthy housing diversity shows spread across multiple buckets. Heavy concentration in one range can signal affordability pressure or lack of housing variety.">
          <ResponsiveContainer width="100%" height={200}><BarChart data={fmvBkts}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/><XAxis dataKey="range" tick={{fontSize:10,fill:"#94a3b8"}}/><YAxis tick={{fontSize:10,fill:"#94a3b8"}} allowDecimals={false}/><Tooltip {...TT}/><Bar dataKey="count" fill="#3b82f6" radius={[4,4,0,0]} name="Parcels"/></BarChart></ResponsiveContainer>
        </C>

        <C title="Assessment Equity Ratio Distribution"
           desc="The equity ratio = Assessed Value / Full Market Value x 100. A fair assessment sits between 80-120%. Bars to the left mean properties are under-assessed (paying less than their fair share). Bars to the right mean over-assessed (a candidate for a tax grievance). A perfectly fair city would show all bars in the 80-120% range.">
          <ResponsiveContainer width="100%" height={200}><BarChart data={eqBkts}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/><XAxis dataKey="range" tick={{fontSize:10,fill:"#94a3b8"}}/><YAxis tick={{fontSize:10,fill:"#94a3b8"}} allowDecimals={false}/><Tooltip {...TT}/><Bar dataKey="count" fill="#f59e0b" radius={[4,4,0,0]} name="Parcels"/></BarChart></ResponsiveContainer>
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
            <span style={{fontSize:10,color:"var(--amber)"}}>Under 80% = Under-assessed</span>
            <span style={{fontSize:10,color:"var(--green2)"}}>80-120% = Fair range</span>
            <span style={{fontSize:10,color:"var(--red2)"}}>Over 120% = Over-assessed</span>
          </div>
        </C>

        <C title="Property Class Distribution"
           desc="Property classes are NY State codes that describe what a parcel is used for - 210 is a single-family home, 411 is apartments, 400 is commercial, 300 is vacant land, etc. This pie shows the makeup of Albany's tax base. A city heavily weighted toward residential (210s) has a different fiscal profile than one with significant commercial or multi-family stock.">
          <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={clsDist} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({name,percent})=>`${name.split(" ")[0]} ${(percent*100).toFixed(0)}%`} fontSize={10}>{clsDist.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip {...TT}/></PieChart></ResponsiveContainer>
        </C>

        <C title="Average Market Value by ZIP Code"
           desc="Which ZIP codes have the highest and lowest average property values? This directly reflects neighborhood wealth and housing market strength. A large gap between ZIPs can signal uneven investment in city services, schools, and infrastructure across neighborhoods.">
          <ResponsiveContainer width="100%" height={220}><BarChart data={avgByZip} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/><XAxis type="number" tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} tick={{fontSize:10,fill:"#94a3b8"}}/><YAxis type="category" dataKey="zip" tick={{fontSize:11,fill:"#94a3b8"}} width={55}/><Tooltip {...TT} formatter={v=>[$f(v),"Avg FMV"]}/><Bar dataKey="avg" fill="#0d9488" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer>
        </C>

        {exTypes.length>0&&<C title="Tax Exemption Types - How Many Parcels Claim Each"
           desc="Exemptions reduce the taxable value of a property, lowering the owner's tax bill. STAR (School Tax Assessment Relief) is the most common - it reduces the school portion of your tax. Senior, veteran, and disability exemptions also appear here. A low count on STAR or senior exemptions in a neighborhood may indicate eligible owners who have not applied.">
          <ResponsiveContainer width="100%" height={200}><BarChart data={exTypes}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/><XAxis dataKey="name" tick={{fontSize:10,fill:"#94a3b8"}}/><YAxis tick={{fontSize:10,fill:"#94a3b8"}} allowDecimals={false}/><Tooltip {...TT}/><Bar dataKey="count" fill="#a78bfa" radius={[4,4,0,0]} name="Parcels"/></BarChart></ResponsiveContainer>
        </C>}

        {deedYears.length>0&&<C title="Sales Activity by Year (from Deed Records)"
           desc="Each parcel's deed book reference contains the year of its last recorded sale. This line shows how many properties changed hands in each year - a rough proxy for market activity. A spike indicates a hot market year. A long flat period with no sales may point to a neighborhood where turnover is low and long-term owners dominate. Note: this is derived from the deed book number, not actual MLS data.">
          <ResponsiveContainer width="100%" height={200}><LineChart data={deedYears}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/><XAxis dataKey="year" tick={{fontSize:10,fill:"#94a3b8"}}/><YAxis tick={{fontSize:10,fill:"#94a3b8"}} allowDecimals={false}/><Tooltip {...TT}/><Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} dot={{fill:"#22c55e",r:4}} name="Sales"/></LineChart></ResponsiveContainer>
        </C>}

        <C title="Assessed Value vs. Full Market Value"
           desc="Each dot is one parcel. The X-axis is its Full Market Value (what the assessor thinks it's worth). The Y-axis is its Assessed Value (what taxes are calculated on). In a perfectly fair assessment roll, every dot would fall along a straight diagonal line from bottom-left to top-right. Dots below the diagonal = under-assessed. Dots above = over-assessed. Clusters far from the line reveal systemic assessment inequities.">
          <ResponsiveContainer width="100%" height={220}><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/><XAxis type="number" dataKey="fmv" name="FMV" tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} tick={{fontSize:10,fill:"#94a3b8"}}/><YAxis type="number" dataKey="assessed" name="Assessed" tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} tick={{fontSize:10,fill:"#94a3b8"}}/><Tooltip {...TT} formatter={(v,n)=>[$f(v),n]}/><Scatter data={scatterPoints} fill="#3b82f6" opacity={.75}/></ScatterChart></ResponsiveContainer>
          {parcels.length>scatterPoints.length&&<div style={{fontSize:10,color:"var(--gray2)",marginTop:6}}>Rendering a sampled subset ({scatterPoints.length.toLocaleString()} of {parcels.length.toLocaleString()} parcels) for chart performance.</div>}
        </C>

        <C title="Average Land vs. Building Value by Property Class"
           desc="For each property class, this stacked bar shows how much of the average assessed value is in the land itself (amber) versus the building sitting on it (blue). Commercial parcels often have a higher land share because the location is the asset. Residential properties typically carry more building value. A parcel with almost all land value and almost no building value is a signal of an underutilized or vacant lot.">
          <ResponsiveContainer width="100%" height={220}><BarChart data={avgLandByClass}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/><XAxis dataKey="cls" tick={{fontSize:9,fill:"#94a3b8"}}/><YAxis tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} tick={{fontSize:10,fill:"#94a3b8"}}/><Tooltip {...TT} formatter={v=>[$f(v)]}/><Legend wrapperStyle={{fontSize:11}}/><Bar dataKey="avgLand" name="Avg Land" fill="#f59e0b" stackId="a"/><Bar dataKey="avgBldg" name="Avg Building" fill="#3b82f6" stackId="a" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
        </C>

        {(()=>{const ybData=(()=>{const b={"Pre-1900":0,"1900s":0,"1920s":0,"1940s":0,"1960s":0,"1980s":0,"2000s+":0};parcels.forEach(p=>{if(!p.yearBuilt)return;const y=p.yearBuilt;if(y<1900)b["Pre-1900"]++;else if(y<1920)b["1900s"]++;else if(y<1940)b["1920s"]++;else if(y<1960)b["1940s"]++;else if(y<1980)b["1960s"]++;else if(y<2000)b["1980s"]++;else b["2000s+"]++;});return Object.entries(b).filter(([,v])=>v>0).map(([decade,count])=>({decade,count}));})();return ybData.length>1?<C title="Building Age by Decade" desc="How old is Albany's housing stock? Available when the Albany County CSV (which includes YEARBLT) is uploaded. Pre-1900 row houses dominate Center Square and Arbor Hill. Newer stock appears in the suburbs and redevelopment sites."><ResponsiveContainer width="100%" height={200}><BarChart data={ybData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/><XAxis dataKey="decade" tick={{fontSize:10,fill:"#94a3b8"}}/><YAxis tick={{fontSize:10,fill:"#94a3b8"}} allowDecimals={false}/><Tooltip {...TT}/><Bar dataKey="count" fill="#0d9488" radius={[4,4,0,0]} name="Properties"/></BarChart></ResponsiveContainer></C>:null;})()}
      </div>
    </div>
  );
};

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ 3. OWNERSHIP INTELLIGENCE ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
const Ownership = ({parcels, onDrill, ownerPortfolioGroups=[]}) => {
  const [view,setView]=useState("portfolio");
  const [selOwner,setSelOwner]=useState(null);
  const [showAllAbs,setShowAllAbs]=useState(false);
  const [showAllDupes,setShowAllDupes]=useState(false);
  const [openDupes,setOpenDupes]=useState({});
  const LIST_LIMIT=50;

  const ownerGroups=useMemo(()=>ownerPortfolioGroups.length?ownerPortfolioGroups:buildOwnerPortfolioGroups(parcels),[ownerPortfolioGroups,parcels]);
  const portfolio=useMemo(()=>[...ownerGroups].sort((a,b)=>b.totalFMV-a.totalFMV || b.propertyCount-a.propertyCount || a.displayOwner.localeCompare(b.displayOwner)),[ownerGroups]);

  const absentees=useMemo(()=>parcels.filter(p=>isAbsenteeFast(p)).sort((a,b)=>(b._absenteeScore||0)-(a._absenteeScore||0) || b.fullMarketValue-a.fullMarketValue),[parcels]);

  const deedData=useMemo(()=>{
    const m={};
    parcels.forEach(p=>{if(p.deedYear){if(!m[p.deedYear])m[p.deedYear]={year:p.deedYear,count:0,totalFMV:0,parcels:[]};m[p.deedYear].count++;m[p.deedYear].totalFMV+=p.fullMarketValue;m[p.deedYear].parcels.push(p);}});
    return Object.values(m).sort((a,b)=>a.year-b.year);
  },[parcels]);

  const duplicateOwnerGroups=useMemo(()=>ownerGroups.filter(g=>g.propertyCount>1),[ownerGroups]);

  useEffect(()=>{
    setShowAllDupes(false);
    setOpenDupes(duplicateOwnerGroups.length?{[duplicateOwnerGroups[0].id]:true}:{});
  },[duplicateOwnerGroups]);

  const BtnTab=({id,label})=><button onClick={()=>setView(id)} style={{background:view===id?"var(--blue)":"transparent",color:view===id?"white":"var(--gray)",border:"none",borderRadius:7,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer"}}>{label}</button>;

  return (
    <div className="fi">
      <SectionTitle>Ownership Intelligence</SectionTitle>
      <Sub>Portfolio mapper, absentee owner detection, deed book timeline, and precomputed owner groups</Sub>
      <InfoBox icon="Owners" title="What Is This Tab For?" color="#3b82f6">
        This tab looks at who owns Albany properties - not just what the properties are worth. You can discover which individuals or companies own multiple parcels across the city, identify properties where the owner does not live on-site (absentee owners), trace when parcels changed hands, and review owner groups that load automatically from normalized owner names instead of waiting on a manual scan.
      </InfoBox>
      <div style={{display:"flex",gap:4,background:"var(--card)",borderRadius:9,padding:4,border:"1px solid var(--border)",width:"fit-content",marginBottom:18}}>
        <BtnTab id="portfolio" label="Portfolio Mapper"/>
        <BtnTab id="absentee" label="Absentee Owners"/>
        <BtnTab id="deed" label="Deed Timeline"/>
        <BtnTab id="dupes" label="Owner Groups"/>
      </div>

      {view==="portfolio"&&<div>
        <InfoBox icon="Portfolio" title="Portfolio Mapper - Who Owns the Most?" color="#3b82f6">
          This list ranks every owner in the dataset by total property portfolio value using the same normalized owner grouping that powers the parcel inspector. Click any owner to expand and see every parcel in that portfolio.
        </InfoBox>
        <div style={{display:"grid",gap:10}}>
          {portfolio.slice(0,15).map((own,i)=>(
            <div key={own.id} onClick={()=>setSelOwner(selOwner===own.ownerKey?null:own.ownerKey)} style={{background:"var(--card2)",border:`1px solid ${selOwner===own.ownerKey?"var(--blue)":"var(--border)"}`,borderRadius:11,padding:"14px 18px",cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:36,height:36,borderRadius:8,background:`${COLORS[i%COLORS.length]}22`,border:`1px solid ${COLORS[i%COLORS.length]}44`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--fm)",fontSize:14,fontWeight:700,color:COLORS[i%COLORS.length],flexShrink:0}}>{i+1}</div>
                  <div>
                    <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:15}}>{own.displayOwner}</div>
                    <div style={{fontSize:11,color:"var(--gray2)",marginTop:2}}>{own.propertyCount} parcel{own.propertyCount>1?"s":""} | ZIPs: {own.zips.join(", ")}</div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"var(--fm)",fontSize:16,fontWeight:600,color:"var(--amber)"}}>{$f(own.totalFMV)}</div>
                  <div style={{fontSize:10,color:"var(--gray)",marginTop:2}}>total FMV</div>
                </div>
              </div>
              {selOwner===own.ownerKey&&<div style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--border)",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:8}}>
                {own.parcels.map(p=><div key={p.parcelId} style={{background:"var(--card)",borderRadius:8,padding:"10px 12px",border:"1px solid var(--border)"}}>
                  <div style={{fontWeight:600,fontSize:13}}><AddrLink address={p.address} zip={p.zip} neighborhood={p.neighborhood} parcelId={p.parcelId}>{p.address}</AddrLink></div>
                  <div style={{fontFamily:"var(--fm)",fontSize:10,color:"var(--gray)",marginTop:2}}>{p.parcelId} | {p.propClassDesc}</div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                    <span style={{fontSize:12,color:"var(--amber)"}}>{$f(p.fullMarketValue)}</span>
                    <Badge color={FC[eqFlagFast(p)]} small>{eqRFast(p)}%</Badge>
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
        <InfoBox icon="Mail" title="What Is an Absentee Owner?" color="#f97316">
          This flag is now a scored signal, not a simple mailing-address mismatch. The model combines mailing-address differences with stronger parcel-level evidence such as LLC or trust ownership, repeated ownership across multiple Albany parcels, and owner-occupancy exemptions like STAR or senior exemptions. A parcel is only flagged when multiple signals point toward off-site ownership.
        </InfoBox>
        <div className="cols-2" style={{display:"grid",gap:12,marginBottom:18}}>
          <StatCard label="Absentee-Owned Parcels" value={absentees.length} icon="Home" color="#f97316" sub={`${Math.round(absentees.length/parcels.length*100)}% of all parcels`} onClick={()=>onDrill&&onDrill({title:`All Absentee-Owned Parcels (${absentees.length})`,parcels:absentees})}/>
          <StatCard label="Total Absentee FMV" value={"$"+(absentees.reduce((s,p)=>s+p.fullMarketValue,0)/1000000).toFixed(1)+"M"} icon="Tax" color="#f59e0b"/>
        </div>
        <div style={{display:"grid",gap:10}}>
          <VirtualRows
            items={absentees.slice(0,showAllAbs?absentees.length:LIST_LIMIT)}
            rowHeight={116}
            height={showAllAbs ? 620 : Math.min(620, Math.max(240, absentees.length*116))}
            renderRow={p=>(
              <div key={p.parcelId} style={{background:"var(--card2)",border:"1px solid rgba(249,115,22,.2)",borderRadius:11,padding:"14px 16px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:15}}><AddrLink address={p.address} zip={p.zip} neighborhood={p.neighborhood} parcelId={p.parcelId}>{p.address}</AddrLink></div>
                    <div style={{fontSize:11,color:"var(--gray2)",marginTop:2}}>{p.propClassDesc} | {p.zip} | {getAbsenteeLabelFast(p)} | score {getAbsenteeModelFast(p).score}</div>
                    <div style={{marginTop:8}}>
                      <div style={{fontSize:11,color:"var(--gray)"}}>Property at: <span style={{color:"var(--white)"}}><AddrLink address={p.address} zip={p.zip} neighborhood={p.neighborhood} parcelId={p.parcelId}>{p.address}</AddrLink>, Albany NY {p.zip}</span></div>
                      <div style={{fontSize:11,color:"#f97316",marginTop:3}}>Mail to: {p.mailAddress}</div>
                      <div style={{fontSize:11,color:"var(--gray2)",marginTop:4}}>{getAbsenteeModelFast(p).signals.join(" | ")}</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"var(--fm)",fontSize:15,fontWeight:600,color:"var(--amber)"}}>{$f(p.fullMarketValue)}</div>
                    <Badge color="#f97316" small>{getAbsenteeLabelFast(p)}</Badge>
                  </div>
                </div>
              </div>
            )}
            empty={null}
          />
          {absentees.length===0&&<div style={{textAlign:"center",padding:40,color:"var(--gray2)"}}>No absentee owners detected in current dataset. Upload full roll to see results.</div>}
          {absentees.length>LIST_LIMIT&&<button onClick={()=>setShowAllAbs(x=>!x)} style={{background:"var(--card2)",border:"1px solid var(--border)",color:"var(--gray2)",borderRadius:8,padding:"10px",fontSize:12,cursor:"pointer",width:"100%"}}>{showAllAbs?`Show top ${LIST_LIMIT}`:`Show all ${absentees.length.toLocaleString()} absentee owners`}</button>}
        </div>
      </div>}

      {view==="deed"&&<div>
        <InfoBox icon="Deed" title="Deed Book Timeline - Reading Property History" color="#22c55e">
          Every time a property is sold in New York, the transaction is recorded at the county clerk's office and assigned a deed book and page number. The year embedded in that reference tells us approximately when the last sale occurred. This timeline shows how many properties in the dataset changed hands each year - a rough but useful measure of neighborhood market activity. Years with many sales often correspond to broader economic events: low interest rate periods, urban renewal pushes, or post-COVID migration patterns.
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
                {yr.parcels.slice(0,10).map(p=><Badge key={p.parcelId} color="#0d9488" small><AddrLink address={p.address} zip={p.zip} neighborhood={p.neighborhood} parcelId={p.parcelId}>{p.address}</AddrLink></Badge>)}
                {yr.parcels.length>10&&<Badge color="#475569" small>+{yr.parcels.length-10} more</Badge>}
              </div>
            </div>
          ))}
        </div>
      </div>}

      {view==="dupes"&&<div>
        <InfoBox icon="Search" title="Owner Groups - Loaded Automatically" color="#a78bfa">
          These groups are precomputed as soon as the Albany roll loads, so you do not need to run a separate scan. Parcels are grouped by normalized owner name to surface likely common ownership quickly. Treat these as potential matches until you manually verify trusts, family members, and related LLC structures.
        </InfoBox>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
            <span style={{fontSize:11,color:"var(--gray2)"}}>{duplicateOwnerGroups.length.toLocaleString()} owner group{duplicateOwnerGroups.length===1?"":"s"} with more than one parcel</span>
            <span style={{fontSize:11,color:"var(--gray2)"}}>Sorted by parcel count, then total portfolio market value.</span>
          </div>
          {duplicateOwnerGroups.length>0&&<div>
            {duplicateOwnerGroups.slice(0,showAllDupes?duplicateOwnerGroups.length:LIST_LIMIT).map(g=>(
              <div key={g.id} style={{background:"var(--card2)",border:"1px solid rgba(220,38,38,.2)",borderRadius:11,marginBottom:10,overflow:"hidden"}}>
                <button
                  type="button"
                  onClick={()=>setOpenDupes(prev=>({...prev,[g.id]:!prev[g.id]}))}
                  style={{width:"100%",background:"transparent",border:"none",padding:"14px 16px",cursor:"pointer",textAlign:"left",color:"inherit"}}
                >
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:15}}>{`Owner with multiple properties: ${g.displayOwner}: ${g.propertyCount}`}</div>
                      <div style={{display:"flex",gap:8,marginTop:6,alignItems:"center",flexWrap:"wrap"}}>
                        <Badge color="#dc2626">Potential common owner</Badge>
                        <span style={{fontSize:12,color:"var(--gray)"}}>Normalized owner name appears across {g.propertyCount} Albany parcels</span>
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontFamily:"var(--fm)",fontSize:12,color:"var(--amber)"}}>{$f(g.totalFMV)}</div>
                      <div style={{fontSize:18,color:"var(--gray2)",fontFamily:"monospace",marginTop:6}}>{openDupes[g.id]?"v":">"}</div>
                    </div>
                  </div>
                </button>
                {openDupes[g.id]&&<div style={{padding:"0 16px 16px"}}>
                  <div style={{fontSize:11,color:"var(--gray2)",lineHeight:1.6,marginBottom:10}}>Use the parcel list below to jump into each record. The Application Map link on each address opens that parcel in the map workspace.</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:8}}>
                    {g.parcels.map(p=><div key={p.parcelId} style={{background:"var(--card)",borderRadius:8,padding:"10px 12px",border:"1px solid var(--border)",minWidth:0}}>
                      <div style={{fontFamily:"var(--fd)",fontWeight:600,fontSize:13,overflowWrap:"anywhere",wordBreak:"break-word"}}>{p.owner1}</div>
                      <div style={{fontSize:11,color:"var(--gray)",marginTop:3,overflowWrap:"anywhere",wordBreak:"break-word"}}><AddrLink address={p.address} zip={p.zip} neighborhood={p.neighborhood} parcelId={p.parcelId}>{p.address}</AddrLink></div>
                      <div style={{fontSize:11,color:"var(--gray2)",marginTop:4}}>{p.parcelId} | {p.propClassDesc}</div>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,marginTop:6,alignItems:"center",flexWrap:"wrap"}}>
                        <div style={{fontFamily:"var(--fm)",fontSize:12,color:"var(--amber)"}}>{$f(p.fullMarketValue)}</div>
                        <Badge color={FC[eqFlagFast(p)]} small>{eqRFast(p)}%</Badge>
                      </div>
                    </div>)}
                  </div>
                </div>}
              </div>
            ))}
            {duplicateOwnerGroups.length>LIST_LIMIT&&<button onClick={()=>setShowAllDupes(x=>!x)} style={{background:"var(--card2)",border:"1px solid var(--border)",color:"var(--gray2)",borderRadius:8,padding:"10px",fontSize:12,cursor:"pointer",width:"100%"}}>{showAllDupes?`Show top ${LIST_LIMIT} groups`:`Show all ${duplicateOwnerGroups.length.toLocaleString()} owner groups`}</button>}
          </div>}
          {duplicateOwnerGroups.length===0&&<div style={{textAlign:"center",padding:40,color:"var(--gray2)"}}>
            <div style={{fontSize:32,marginBottom:10}}>OK</div>
            <div>No multi-parcel owner groups were found in the current dataset.</div>
            <div style={{fontSize:11,marginTop:8}}>Load the full Albany roll to surface larger owner portfolios.</div>
          </div>}
        </div>
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

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ 4. EQUITY & JUSTICE ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
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
      <SectionTitle>Tax Fairness & Equity</SectionTitle>
      <Sub>Exemption deserts, assessment burden by ZIP, exemption revenue impact on tax base</Sub>
      <InfoBox icon="Equity" title="Why Does Property Tax Equity Matter?" color="#22c55e">
        Property taxes are the primary way Albany funds its schools, city services, and county government. When assessments are unequal - charging some neighborhoods more relative to their actual property values - it creates a hidden tax on those communities. This tab examines three equity dimensions: where homeowners are missing out on exemptions they likely qualify for, which ZIP codes carry a disproportionate share of the tax burden, and how much revenue the city foregoes through exemptions each year. None of this requires any prior knowledge of tax law - the explanations are built in.
      </InfoBox>
      <div style={{display:"flex",gap:4,background:"var(--card)",borderRadius:9,padding:4,border:"1px solid var(--border)",width:"fit-content",marginBottom:18}}>
        <BtnTab id="desert" label="Missing Exemptions"/>
        <BtnTab id="burden" label="Assessment Burden"/>
        <BtnTab id="revenue" label="Revenue Impact"/>
      </div>

      {view==="desert"&&<div>
        <Card style={{marginBottom:16,background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.2)"}}>
          <div style={{fontSize:13,fontWeight:600,color:"var(--amber2)",marginBottom:6}}>What does missing exemptions mean?</div>
          <div style={{fontSize:12,color:"var(--gray2)",lineHeight:1.7}}>A zone where homestead property owners are not claiming exemptions they likely qualify for - such as STAR, senior, or veteran exemptions. Owners in lower-income neighborhoods often leave money on the table because they do not know to apply. The table below flags ZIPs with the highest share of homesteads with zero exemptions.</div>
        </Card>
        <div style={{display:"grid",gap:10}}>
          {desertByZip.map(z=>(
            <div key={z.zip} style={{background:"var(--card2)",border:`1px solid ${z.pct>60?"rgba(245,158,11,.3)":"var(--border)"}`,borderRadius:11,padding:"14px 18px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div>
                  <span style={{fontFamily:"var(--fm)",fontSize:18,fontWeight:700,color:"var(--white)"}}>{z.zip}</span>
                  <span style={{fontSize:12,color:"var(--gray)",marginLeft:12}}>{z.total} homestead parcel{z.total>1?"s":""} | {z.noExempt} with no exemptions</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontFamily:"var(--fm)",fontSize:20,fontWeight:700,color:z.pct>60?"var(--amber)":z.pct>30?"#f97316":"var(--green2)"}}>{z.pct}%</span>
                  {z.pct>60&&<Badge color="#f59e0b">Warning: high missed-savings risk</Badge>}
                </div>
              </div>
              <div style={{height:6,background:"var(--bg)",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${z.pct}%`,background:z.pct>60?"var(--amber)":z.pct>30?"#f97316":"var(--green2)",borderRadius:3}}></div>
              </div>
              {z.pct>50&&<div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:5}}>
                {z.parcels.slice(0,3).map(p=><div key={p.parcelId} style={{background:"rgba(245,158,11,.08)",borderRadius:6,padding:"4px 8px",fontSize:11,color:"var(--amber2)"}}><AddrLink address={p.address} zip={p.zip} neighborhood={p.neighborhood} parcelId={p.parcelId}>{p.address}</AddrLink> - {p.owner1}</div>)}
                {z.parcels.length>3&&onDrill&&<button onClick={e=>{e.stopPropagation();onDrill({title:`ZIP ${z.zip} - Homesteads Without Exemptions (${z.noExempt})`,parcels:z.parcels});}} style={{background:"rgba(245,158,11,.12)",border:"1px solid rgba(245,158,11,.3)",color:"var(--amber2)",borderRadius:7,padding:"5px 12px",fontSize:11,cursor:"pointer",fontWeight:600}}>View all {z.parcels.length} properties -&gt;</button>}
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
          <div style={{fontSize:10,color:"var(--gray2)",marginTop:6}}>Red = over-assessed (paying too much tax relative to market). Amber = under-assessed. Green = fair range (90-110%).</div>
        </Card>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
          {burdenByZip.map(z=>{const r=parseFloat(z.avgRatio);const color=r>110?"var(--red2)":r<90?"var(--amber)":"var(--green2)";return(
            <Card key={z.zip}>
              <div style={{fontFamily:"var(--fm)",fontSize:22,fontWeight:700,color}}>{z.avgRatio}%</div>
              <div style={{fontSize:13,fontWeight:600,marginTop:2}}>ZIP {z.zip}</div>
              <div style={{fontSize:11,color:"var(--gray2)",marginTop:4}}>
                {r>110?"Over-assessed":r<90?"Under-assessed":"Fair value"}
              </div>
              {onDrill&&<button onClick={()=>onDrill({title:`ZIP ${z.zip} - All ${z.count} Parcels (Avg Ratio: ${z.avgRatio}%)`,parcels:parcels.filter(p=>p.zip===z.zip&&p.fullMarketValue>0)})} style={{background:"rgba(37,99,235,.1)",border:"1px solid rgba(37,99,235,.25)",color:"var(--blue3)",borderRadius:5,padding:"3px 9px",fontSize:11,cursor:"pointer",marginTop:6,fontWeight:600}}>View {z.count} parcels -&gt;</button>}
              <div style={{fontSize:10,color,marginTop:8,fontWeight:500}}>{r>110?"Warning: owners here may have grounds for assessment grievance":r<90?"Info: land here carries lighter relative tax burden":"Assessment aligned with market values"}</div>
            </Card>
          );})}
        </div>
      </div>}

      {view==="revenue"&&<div>
        <InfoBox icon="Revenue" title="What Is Revenue Impact - And Why Does It Matter to the City?" color="#22c55e">
          Every property tax exemption reduces the amount of assessed value that can be taxed - meaning the city, county, and school district collect less revenue. The numbers here show exactly how much taxable value has been removed from the base by each exemption type. This is not waste - exemptions like STAR and Senior Citizen exemptions are deliberate policy choices to reduce the burden on homeowners and veterans. But understanding the scale of these reductions helps explain why tax rates must remain high enough to fund services: fewer dollars in the taxable base means each remaining dollar is taxed more heavily.
        </InfoBox>
        <div className="cols-3" style={{display:"grid",gap:12,marginBottom:18}}>
          <StatCard label="Total County Exemptions" value={"$"+(revenueImpact.reduce((s,e)=>s+e.totalCounty,0)/1000).toFixed(0)+"K"} icon="County" color="#3b82f6" sub="Removed from county tax base"/>
          <StatCard label="Total City Exemptions" value={"$"+(revenueImpact.reduce((s,e)=>s+e.totalCity,0)/1000).toFixed(0)+"K"} icon="City" color="#0d9488" sub="Removed from city tax base"/>
          <StatCard label="Total School Exemptions" value={"$"+(revenueImpact.reduce((s,e)=>s+e.totalSchool,0)/1000).toFixed(0)+"K"} icon="School" color="#a78bfa" sub="Removed from school tax base"/>
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
                <div className="cols-3" style={{display:"grid",gap:8}}>
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

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ 5. OPPORTUNITY FINDER ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
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
      const modeDesc = ps.find(p=>p.propClass===mode)?.propClassDesc || "";
      ps.forEach(p=>{if(p.propClass!==mode)results.push({...p,expectedClass:mode,expectedClassDesc:modeDesc,street:st});});
    });
    return results;
  },[parcels]);

  const BtnTab=({id,label})=><button onClick={()=>setView(id)} style={{background:view===id?"var(--teal)":"transparent",color:view===id?"white":"var(--gray)",border:"none",borderRadius:7,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer"}}>{label}</button>;

  return (
    <div className="fi">
      <SectionTitle>Neighborhood Change & Opportunity</SectionTitle>
      <Sub>Underused land, neighborhood pressure, under-assessed parcels, and class anomalies</Sub>
      <InfoBox icon="Land" title="What Are We Looking For Here?" color="#0d9488">
        This tab helps residents, advocates, and researchers spot neighborhood change, underused land, and parcels whose assessments look out of step with the market. It surfaces four different types of insights: underutilized lots where the land is worth more than what is built on it; signs of rising land prices that can precede displacement; properties whose assessments have not kept up with their market value (a potential buyer advantage); and parcels whose use type does not match the surrounding street - which may reflect an error, a holdover use, or a coming change. No real estate experience needed - each section explains what the numbers mean in plain English.
      </InfoBox>
      <div style={{display:"flex",gap:4,background:"var(--card)",borderRadius:9,padding:4,border:"1px solid var(--border)",width:"fit-content",marginBottom:18,flexWrap:"wrap"}}>
        <BtnTab id="lots" label="Lot Opportunities"/>
        <BtnTab id="gentrifi" label="Neighborhood Pressure"/>
        <BtnTab id="arb" label="Under-Assessed Parcels"/>
        <BtnTab id="anomaly" label="Class Anomalies"/>
      </div>

      {view==="lots"&&<div>
        <Card style={{marginBottom:14,background:"rgba(13,148,136,.07)",border:"1px solid rgba(13,148,136,.2)"}}>
          <div style={{fontSize:12,color:"var(--teal2)",fontWeight:600,marginBottom:4}}>How to Read This</div>
          <div style={{fontSize:12,color:"var(--gray2)",lineHeight:1.7}}>Parcels are ranked by building-to-total ratio. A low ratio means most of the assessed value is in the land - the building may be small, aging, or underutilized relative to the lot size. These are potential infill development, demolition, or renovation opportunities.</div>
        </Card>
        <div style={{display:"grid",gap:10}}>
          {lotOpps.slice(0,15).map((p,i)=>(
            <div key={p.parcelId} style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:11,padding:"14px 18px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:15}}><AddrLink address={p.address} zip={p.zip} neighborhood={p.neighborhood} parcelId={p.parcelId}>{p.address}</AddrLink></div>
                  <div style={{fontSize:11,color:"var(--gray2)",marginTop:2}}>{p.propClassDesc} | {p.zip} | Lot: {p.frontage}x{p.depth} ft</div>
                  <div style={{display:"flex",gap:8,marginTop:8}}>
                    <div style={{background:"rgba(13,148,136,.12)",borderRadius:7,padding:"6px 10px",textAlign:"center"}}>
                      <div style={{fontFamily:"var(--fm)",fontSize:13,fontWeight:600,color:"var(--teal2)"}}>{nf(p.sqft)} sq ft</div>
                      <div style={{fontSize:10,color:"var(--gray)"}}>Lot Size</div>
                    </div>
                    <div style={{background:"rgba(245,158,11,.12)",borderRadius:7,padding:"6px 10px",textAlign:"center"}}>
                      <div style={{fontFamily:"var(--fm)",fontSize:13,fontWeight:600,color:"var(--amber)"}}>${p.landPerSqFt.toFixed(2)}/sq ft</div>
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
              <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:14}}><AddrLink address={p.address} zip={p.zip} neighborhood={p.neighborhood} parcelId={p.parcelId}>{p.address}</AddrLink></div>
              <div style={{fontSize:11,color:"var(--gray2)",marginTop:2}}>{p.neighborhood} | {p.zip}</div>
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
          <div style={{fontSize:12,color:"var(--green2)",fontWeight:600,marginBottom:4}}>Assessment Arbitrage - What This Means</div>
          <div style={{fontSize:12,color:"var(--gray2)",lineHeight:1.7}}>Parcels where assessed value is significantly below full market value. The owner effectively pays taxes on a smaller base than the property's true worth. These represent hidden value - for buyers, lower carrying costs; for policy makers, potential tax base leakage.</div>
        </Card>
        {arbitrage.length>0?<div style={{display:"grid",gap:10}}>
          {arbitrage.slice(0,showAllArb?arbitrage.length:OPP_LIMIT).map(p=>(
            <div key={p.parcelId} style={{background:"var(--card2)",border:"1px solid rgba(34,197,94,.2)",borderRadius:11,padding:"14px 18px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:15}}><AddrLink address={p.address} zip={p.zip} neighborhood={p.neighborhood} parcelId={p.parcelId}>{p.address}</AddrLink></div>
                  <div style={{fontSize:11,color:"var(--gray2)",marginTop:2}}>{p.propClassDesc} | {p.zip} | Owner: {p.owner1}</div>
                  <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                    <div style={{background:"rgba(34,197,94,.1)",borderRadius:7,padding:"6px 10px"}}>
                      <div style={{fontFamily:"var(--fm)",fontSize:13,fontWeight:600,color:"var(--green2)"}}>{$f(p.taxGap)}</div>
                      <div style={{fontSize:10,color:"var(--gray)"}}>Value gap (FMV - Assessed)</div>
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
          {arbitrage.length>OPP_LIMIT&&<button onClick={()=>setShowAllArb(x=>!x)} style={{background:"var(--card2)",border:"1px solid var(--border)",color:"var(--gray2)",borderRadius:8,padding:"10px",fontSize:12,cursor:"pointer",width:"100%"}}>{showAllArb?`Show top ${OPP_LIMIT}`:`Show all ${arbitrage.length.toLocaleString()} arbitrage candidates`}</button>}
        </div>:<div style={{textAlign:"center",padding:40,color:"var(--gray2)"}}>No strong arbitrage candidates in current sample. Upload full roll to discover hidden opportunities.</div>}
      </div>}

      {view==="anomaly"&&<div>
        <InfoBox icon="Analysis" title="Property Class Anomaly Detector - What's Out of Place?" color="#a78bfa">
          Every parcel in Albany is assigned a property class code that describes how it is used - 210 for single-family homes, 220 for two-family, 400 for commercial, 300 for vacant land, etc. This tool looks at each street and identifies parcels whose class code is different from the majority of their neighbors. A commercial property surrounded by single-family homes, or a vacant lot on a block of apartments, may represent a holdover use, a recent conversion, or a data entry error. Either way, it is a flag worth investigating.
        </InfoBox>
        {anomalies.length>0?<div>
          {anomalies.slice(0,showAllAnom?anomalies.length:OPP_LIMIT).map(p=>(
            <div key={p.parcelId} style={{background:"var(--card2)",border:"1px solid rgba(167,139,250,.25)",borderRadius:11,padding:"14px 18px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:15}}><AddrLink address={p.address} zip={p.zip} neighborhood={p.neighborhood} parcelId={p.parcelId}>{p.address}</AddrLink></div>
                  <div style={{fontSize:11,color:"var(--gray2)",marginTop:2}}>on {p.street} | {p.zip}</div>
                  <div style={{display:"flex",gap:8,marginTop:8}}>
                    <div><span style={{fontSize:11,color:"var(--gray)"}}>This parcel: </span><Badge color="#a78bfa">{propClassLabel(p)}</Badge></div>
                    <div><span style={{fontSize:11,color:"var(--gray)"}}>Street mode: </span><Badge color="#22c55e">{formatPropClassLabel(p.expectedClass, p.expectedClassDesc)}</Badge></div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}><div style={{fontFamily:"var(--fm)",fontSize:14,color:"var(--amber)"}}>{$f(p.fullMarketValue)}</div></div>
              </div>
            </div>
          ))}
          {anomalies.length>OPP_LIMIT&&<button onClick={()=>setShowAllAnom(x=>!x)} style={{background:"var(--card2)",border:"1px solid var(--border)",color:"var(--gray2)",borderRadius:8,padding:"10px",fontSize:12,cursor:"pointer",width:"100%"}}>{showAllAnom?`Show top ${OPP_LIMIT}`:`Show all ${anomalies.length.toLocaleString()} anomalies`}</button>}
        </div>:<div style={{textAlign:"center",padding:40,color:"var(--gray2)"}}>
          <div style={{fontSize:32,marginBottom:10}}>Info</div>
          No class anomalies detected. Streets need 3+ parcels to run anomaly detection. Upload full roll for complete analysis.
        </div>}
      </div>}
    </div>
  );
};

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ 6. TAX TOOLS ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
const TaxTools = ({parcels, myHome, meta={}, ownerPortfolioIndex=null, dataSource="sample", autoloadPhase="idle", uploading=false}) => {
  const grievanceHelperLinks = grievanceResourceUrls;
  const [view,setView]=useState("estimator");
  const [query,setQuery]=useState("");
  const [found,setFound]=useState(null);
  const [neighborAddr,setNeighborAddr]=useState("");
  const [neighborResult,setNeighborResult]=useState(null);
  const [compareSnapshotMessage,setCompareSnapshotMessage]=useState("");
  const [copiedShareLink,setCopiedShareLink]=useState(false);
  const [printMessage,setPrintMessage]=useState("");
  const [compareScrollTick,setCompareScrollTick]=useState(0);
  const requestedSnapshotRef = useRef(parseComparableSnapshotSearch(typeof window!=="undefined" ? window.location.search : ""));
  const hydratedSnapshotRef = useRef(false);
  const compareResultRef = useRef(null);
  const streetNameKey = useCallback((addr)=>{
    const k = normalizeStreetKeyForCompare(addr||"");
    if(!k) return "";
    const t = k.split(" ").filter(Boolean);
    return (t.length>1 && /^\d+[a-z]?$/i.test(t[0])) ? t.slice(1).join(" ") : t.join(" ");
  },[]);
  const isGenericNbr = useCallback((n)=>/^(albany|city of albany)$/i.test((n||"").toString().trim()),[]);
  const datasetKey = useMemo(()=>buildComparableDatasetKey(meta, parcels), [meta, parcels]);

  const matchedHomeDetailsLabel = useCallback(parcel=>{
    const possible = Number(parcel?._compPhysicalFieldCountPossible || 0);
    const used = Array.isArray(parcel?._compPhysicalFieldsUsed) ? parcel._compPhysicalFieldsUsed.length : 0;
    if(!possible) return "Matched by class and location";
    return `Matched ${used} of ${possible} home details`;
  },[]);

  const fillMyHome = useCallback((setter) => {
    if(myHome) setter(myHome.address.split(" ").slice(0,3).join(" "));
  },[myHome]);

  const lookupParcel = useCallback(value => findBestAddressMatch(parcels, value), [parcels]);
  const buildNeighborResult = useCallback((parcel, options={}) => buildComparableResult(parcel, parcels, {
    ...options,
    currentDatasetKey: datasetKey,
  }), [datasetKey, parcels]);
  const focusNeighborParcel = useCallback((parcel, options={}) => {
    if(!parcel) return null;
    const nextResult = buildNeighborResult(parcel, options);
    setNeighborAddr(parcel.address || "");
    setNeighborResult(nextResult);
    setCopiedShareLink(false);
    setPrintMessage("");
    setView("neighbor");
    const warnings = [];
    if(nextResult?.snapshot?.datasetMismatch){
      warnings.push(`This share link was created for ${nextResult.snapshot.requestedDatasetKey || "another dataset"} but this app is using ${nextResult.snapshot.currentDatasetKey || "the current dataset"}.`);
    }
    if(nextResult?.snapshot?.missingCompIds?.length){
      const count = nextResult.snapshot.missingCompIds.length;
      warnings.push(`${count} shared comparable ${count===1?"parcel was":"parcels were"} not found in the current dataset.`);
    }
    if(options?.message) warnings.unshift(options.message);
    setCompareSnapshotMessage(warnings.join(" "));
    setCompareScrollTick(t=>t+1);
    return nextResult;
  }, [buildNeighborResult]);
  const lookup = useCallback(() => {
    setFound(lookupParcel(query) || null);
  }, [lookupParcel, query]);
  const lookupNeighbor = useCallback(() => {
    const parcel = lookupParcel(neighborAddr);
    if(!parcel){
      setNeighborResult(null);
      setCompareSnapshotMessage("");
      setPrintMessage("");
      return;
    }
    focusNeighborParcel(parcel);
  }, [focusNeighborParcel, lookupParcel, neighborAddr]);
  const shareLink = useMemo(()=>{
    if(!neighborResult?.p) return "";
    return buildComparableSnapshotUrl({
      subjectId: neighborResult.p.parcelId,
      compIds: (neighborResult.neighbors||[]).map(parcel=>parcel.parcelId),
      datasetKey,
      label: neighborResult.p.address,
    });
  }, [datasetKey, neighborResult]);
  const copyShareLink = useCallback(async () => {
    if(!shareLink) return;
    const ok = await copyTextToClipboard(shareLink);
    setCopiedShareLink(!!ok);
  }, [shareLink]);
  const openPrintableReport = useCallback((includeContextComps=false) => {
    if(!neighborResult?.p) return;
    const subject = neighborResult.p;
    const subjectProfile = neighborResult.subjectProfile || buildComparableProfile(subject);
    const grievanceHelper = buildGrievanceFilingHelper(subject, subjectProfile, neighborResult, meta);
    const reportHtml = buildComparablePrintReportHtml({ subject, subjectProfile, neighborResult, grievanceHelper, shareLink, includeContextComps });
    const printWindow = typeof window!=="undefined" ? window.open("", "_blank") : null;
    if(!printWindow){
      setPrintMessage("The print window was blocked. Allow pop-ups for this site, then try again.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => printWindow.print();
    setPrintMessage(includeContextComps ? "Opened a printable report with both grievance-supporting and context comps. Use the print destination to print or Save as PDF." : "Opened a grievance-only print package. Use the print destination to print or Save as PDF.");
  }, [meta, neighborResult, shareLink]);

  useEffect(()=>{
    const requestedSnapshot = requestedSnapshotRef.current;
    if(requestedSnapshot?.tool==="neighbor") setView("neighbor");
    if(hydratedSnapshotRef.current) return;
    if(!requestedSnapshot?.hasSnapshot){
      hydratedSnapshotRef.current = true;
      return;
    }
    const waitingForAutoload = dataSource==="sample" && (uploading || autoloadPhase==="idle" || autoloadPhase==="running");
    if(!parcels.length || waitingForAutoload) return;
    if(!requestedSnapshot.subjectId){
      hydratedSnapshotRef.current = true;
      setCompareSnapshotMessage("This shared comparable snapshot could not be opened because the subject parcel is missing.");
      return;
    }
    const subjectParcel = parcels.find(parcel=>normalizeParcelId(parcel?.parcelIdNorm || parcel?.parcelId || parcel?.printKey || parcel?.pinSbl)===requestedSnapshot.subjectId) || null;
    if(!subjectParcel){
      hydratedSnapshotRef.current = true;
      setCompareSnapshotMessage("This shared comparable snapshot could not be opened because the subject parcel was not found in the current dataset.");
      return;
    }
    hydratedSnapshotRef.current = true;
    focusNeighborParcel(subjectParcel, {
      exactCompIds: requestedSnapshot.compIds,
      snapshotDatasetKey: requestedSnapshot.datasetKey,
    });
  }, [autoloadPhase, dataSource, focusNeighborParcel, parcels, uploading]);

  useEffect(()=>{
    if(view!=="neighbor" || !neighborResult?.p) return;
    replaceComparableSnapshotUrl({
      subjectId: neighborResult.p.parcelId,
      compIds: (neighborResult.neighbors||[]).map(parcel=>parcel.parcelId),
      datasetKey,
      label: neighborResult.p.address,
    });
  }, [datasetKey, neighborResult, view]);

  useEffect(()=>{
    if(!copiedShareLink) return;
    const id = setTimeout(()=>setCopiedShareLink(false), 1800);
    return ()=>clearTimeout(id);
  }, [copiedShareLink]);

  useEffect(()=>{
    if(!compareScrollTick || !neighborResult) return;
    const runner = ()=>compareResultRef.current?.scrollIntoView({behavior:"smooth", block:"start"});
    const id = typeof window!=="undefined" && window.requestAnimationFrame ? window.requestAnimationFrame(runner) : setTimeout(runner,0);
    return ()=>{
      if(typeof id==="number" && typeof window!=="undefined" && window.cancelAnimationFrame) window.cancelAnimationFrame(id);
      else clearTimeout(id);
    };
  }, [compareScrollTick, neighborResult]);

  const DeltaInfoNote = ({text, tone="var(--gray3)"}) => {
    if(!text) return null;
    return <div style={{display:"flex",alignItems:"flex-start",gap:6,fontSize:10,color:tone,lineHeight:1.45,minWidth:0}}><span style={{fontFamily:"var(--fm)",fontWeight:700}}>(i)</span><span style={{overflowWrap:"anywhere",wordBreak:"break-word"}}>{text}</span></div>;
  };
  const CompareMetricCard = ({label, youValue, compValue, deltaValue, deltaTone="var(--gray2)", deltaInfo=""}) => (
    <div style={{background:"rgba(15,23,42,.04)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 12px",display:"grid",gap:6,minWidth:0}}>
      <div style={{fontSize:10,fontWeight:700,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:.6}}>{label}</div>
      <div style={{display:"grid",gap:4,minWidth:0}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,fontSize:11,minWidth:0}}><span style={{color:"var(--gray)"}}>You</span><span style={{fontWeight:700,textAlign:"right",minWidth:0,overflowWrap:"anywhere",wordBreak:"break-word"}}>{youValue}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,fontSize:11,minWidth:0}}><span style={{color:"var(--gray)"}}>Comp</span><span style={{fontWeight:700,textAlign:"right",minWidth:0,overflowWrap:"anywhere",wordBreak:"break-word"}}>{compValue}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,fontSize:11,minWidth:0}}><span style={{color:"var(--gray)"}}>Delta</span><span style={{fontWeight:700,textAlign:"right",color:deltaTone,minWidth:0,overflowWrap:"anywhere",wordBreak:"break-word"}}>{deltaValue}</span></div>
        <DeltaInfoNote text={deltaInfo} tone={deltaTone} />
      </div>
    </div>
  );
  const CompareProfileRow = ({label, youValue, compValue}) => (
    <div style={{background:"rgba(255,255,255,.03)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 10px",display:"grid",gap:4,minWidth:0}}>
      <div style={{fontSize:10,fontWeight:700,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:.6}}>{label}</div>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,fontSize:11,minWidth:0}}><span style={{color:"var(--gray)"}}>You</span><span style={{fontWeight:700,textAlign:"right",minWidth:0,overflowWrap:"anywhere",wordBreak:"break-word"}}>{youValue}</span></div>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,fontSize:11,minWidth:0}}><span style={{color:"var(--gray)"}}>Comp</span><span style={{fontWeight:700,textAlign:"right",minWidth:0,overflowWrap:"anywhere",wordBreak:"break-word"}}>{compValue}</span></div>
    </div>
  );
  const ComparableOwnershipBadges = ({parcel, small=false}) => {
    if(!parcel) return null;
    const absentee = isAbsenteeFast(parcel);
    const portfolioCount = getOwnerPortfolioCountFast(parcel);
    if(!absentee && portfolioCount<=1) return null;
    return (
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {absentee&&<Badge color="#f97316" small={small}>Absentee</Badge>}
        {portfolioCount>1&&<Badge color="#0f766e" small={small}>{ownerPortfolioBadgeLabel(parcel)}</Badge>}
      </div>
    );
  };

  const schoolBurden=useMemo(()=>[...parcels].map(p=>({...p,schoolBurden:p.fullMarketValue>0?(p.schoolTaxable/p.fullMarketValue*100).toFixed(1):"-",schoolGap:p.assessedValue-p.schoolTaxable})).sort((a,b)=>parseFloat(b.schoolBurden||0)-parseFloat(a.schoolBurden||0)),[parcels]);

  const BtnTab=({id,label})=><button onClick={()=>setView(id)} style={{background:view===id?"var(--purple)":"transparent",color:view===id?"white":"var(--gray)",border:"none",borderRadius:7,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer"}}>{label}</button>;
  const SI={background:"var(--bg3)",border:"1px solid var(--border)",color:"var(--white)",borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"var(--fb)"};

  return (
    <div className="fi">
      <SectionTitle>Tax Tools</SectionTitle>
      <Sub>Tax savings estimator, neighbor value comparison, school tax burden analysis</Sub>
      <InfoBox icon="Tax" title="How Albany Property Taxes Work - The Basics" color="#a78bfa">
        Albany property owners pay taxes to three separate entities: the <b style={{color:"var(--white)"}}>County</b>, the <b style={{color:"var(--white)"}}>City</b>, and the <b style={{color:"var(--white)"}}>Albany City School District</b>. Each calculates your tax bill using its own tax rate multiplied by your taxable assessed value. Exemptions can reduce your taxable value separately for each entity - which is why you might see three different "taxable" numbers on your record. This tab helps you estimate what you could be saving, compare your assessment to your neighbors', and understand the school tax burden specifically.
      </InfoBox>
      <div style={{display:"flex",gap:4,background:"var(--card)",borderRadius:9,padding:4,border:"1px solid var(--border)",width:"fit-content",marginBottom:18}}>
        <BtnTab id="estimator" label="Savings Estimator"/>
        <BtnTab id="neighbor" label="Neighbor Compare"/>
        <BtnTab id="school" label="School Tax Burden"/>
      </div>

      {view==="estimator"&&<div>
        <InfoBox icon="Relief" title="Tax Savings Estimator - What Exemptions Could You Be Missing?" color="#a78bfa">
          Many Albany homeowners qualify for exemptions they have never applied for. The most common is <b style={{color:"var(--white)"}}>STAR (School Tax Assessment Relief)</b> - a New York State program that reduces the school-taxable portion of your assessed value by up to $30,000, saving most homeowners $600-$1,000/year. Senior homeowners (65+) may qualify for the <b style={{color:"var(--white)"}}>Enhanced STAR</b> or <b style={{color:"var(--white)"}}>Senior Citizen Exemption</b>, which can cut the taxable value in half. Veterans have their own exemption too. Look up your address below - if exemptions are missing from your record that you likely qualify for, the tool will flag them.
        </InfoBox>
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:12}}>Look Up a Property</div>
          <MyHomeBanner myHome={myHome} onUse={()=>{if(myHome){setQuery(myHome.address.split(" ").slice(0,3).join(" "));setFound(myHome.parcel||null);}}} label="Load My Home"/>
          <div style={{display:"flex",gap:10,marginBottom:14}}>
            <AddressAutocompleteInput parcels={parcels} value={query} onChange={setQuery} onSelectParcel={p=>{setQuery(p.address);setFound(p);}} onEnter={lookup} placeholder="Enter address or parcel ID..." inputStyle={{...SI,width:"100%",cursor:"text"}} wrapperStyle={{flex:1}}/>
            <button onClick={lookup} style={{background:"var(--purple)",color:"white",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:13}}>Look Up</button>
          </div>
          {found&&<div className="fi">
            <div style={{fontFamily:"var(--fd)",fontSize:16,fontWeight:700,marginBottom:10}}><AddrLink address={found.address} zip={found.zip} neighborhood={found.neighborhood} parcelId={found.parcelId}>{found.address}</AddrLink></div>
            <div className="cols-2" style={{display:"grid",gap:10,marginBottom:14}}>
              <div style={{background:"var(--card)",borderRadius:9,padding:"12px 14px",border:"1px solid var(--border)"}}>
                <div style={{fontSize:11,color:"var(--gray)",marginBottom:4}}>Current Exemptions on Record</div>
                {found.exemptions.length>0?found.exemptions.map(e=><div key={e.code} style={{fontSize:12,marginBottom:3}}><Badge color="#f59e0b" small>{e.name}</Badge> - saves up to {$f(e.schoolAmt||e.countyAmt||e.cityAmt)}</div>):<div style={{fontSize:12,color:"var(--gray2)"}}>None on file</div>}
              </div>
              <div style={{background:"rgba(34,197,94,.07)",borderRadius:9,padding:"12px 14px",border:"1px solid rgba(34,197,94,.2)"}}>
                <div style={{fontSize:11,color:"var(--green2)",marginBottom:4}}>Potential Opportunities Worth Exploring</div>
                {found.parcelType==="HOMESTEAD"&&!found.exemptions.some(e=>e.name.includes("STAR"))&&<div style={{fontSize:12,marginBottom:5,color:"var(--white)"}}>Recommended: <b>STAR Exemption</b> - up to $30,000 off school taxable value (~$600-900/yr savings). Apply at NYS Tax Dept.</div>}
                {found.parcelType==="HOMESTEAD"&&!found.exemptions.some(e=>e.name.includes("SR"))&&<div style={{fontSize:12,marginBottom:5,color:"var(--gray2)"}}>Info: <b>Senior Citizen Exemption</b> - if owner 65+, may reduce assessed value 10-50%.</div>}
                {found.parcelType==="HOMESTEAD"&&!found.exemptions.some(e=>e.name.includes("VET"))&&<div style={{fontSize:12,marginBottom:5,color:"var(--gray2)"}}>Info: <b>Veteran Exemption</b> - if owner served, up to $30,000 off. Apply at city assessor's office.</div>}
                {found.parcelType!=="HOMESTEAD"&&<div style={{fontSize:12,color:"var(--gray2)"}}>Non-homestead parcels have limited exemption options. Commercial and rental properties generally do not qualify for residential exemptions.</div>}
                {found.exemptions.length>1&&<div style={{fontSize:12,color:"var(--green2)"}}>This property already has multiple exemptions and appears well-optimized.</div>}
              </div>
            </div>
            <div style={{background:"var(--card)",borderRadius:9,padding:"14px 16px",border:"1px solid var(--border)"}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:4}}>Your Current Tax Reduction vs. Full Assessed Value</div>
              <div style={{fontSize:11,color:"var(--gray2)",marginBottom:10}}>These figures show how much your taxable value is already reduced below the assessed value - your existing tax relief. A value of $0 means you are paying taxes on the full assessed amount with no reduction for that jurisdiction.</div>
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
        <InfoBox icon="Compare" title="Comparable Homes for an Assessment Grievance" color="#a78bfa">
          This tool ranks <b style={{color:"var(--white)"}}>physically similar homes</b> and now creates a <b style={{color:"var(--white)"}}>shareable snapshot link</b> that opens the same parcel and the same comparable set on GitHub Pages or locally. Each comparable card shows value, home details, absentee context, and owner-portfolio context so residents can evaluate the evidence without leaving this view.
          <div style={{fontSize:10,color:"var(--gray3)",marginTop:10}}>Document URLs are managed in <b style={{color:"var(--gray2)"}}>grievance-settings.json</b>.</div>
        </InfoBox>
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:12}}>Enter Your Address to Compare</div>
          <MyHomeBanner myHome={myHome} onUse={()=>{if(myHome){setNeighborAddr(myHome.address.split(" ").slice(0,3).join(" "));setNeighborResult(null);setCompareSnapshotMessage("");setCopiedNarrative(false);setFilingChecklistState({});setPrintMessage("");}}} label="Load My Home"/>
          <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
            <AddressAutocompleteInput parcels={parcels} value={neighborAddr} onChange={setNeighborAddr} onSelectParcel={parcel=>{setNeighborAddr(parcel.address);focusNeighborParcel(parcel);}} onEnter={lookupNeighbor} placeholder="Enter your address..." inputStyle={{...SI,width:"100%",cursor:"text"}} wrapperStyle={{flex:"1 1 320px"}}/>
            <button onClick={lookupNeighbor} style={{background:"var(--purple)",color:"white",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:13}}>Compare</button>
          </div>
          {neighborResult&&(()=>{
            const subject = neighborResult.p;
            const subjectProfile = neighborResult.subjectProfile || buildComparableProfile(subject);
            const grievanceComparisons = [{kind:"subject", parcel:subject, label:"Your parcel"}].concat(
              (neighborResult.grievanceCandidates||[]).map((parcel, idx)=>({kind:"comp", parcel, label:"Comp " + (idx+1)}))
            );
            const grievanceHelper = buildGrievanceFilingHelper(subject, subjectProfile, neighborResult, meta);
            return <div ref={compareResultRef} className="fi">
              <div className="print-hide" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}>
                <div>
                  <div style={{fontSize:11,color:"var(--gray2)",fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Shareable comparable snapshot</div>
                  <div style={{fontSize:11,color:"var(--gray3)",marginTop:4,maxWidth:760}}>Use this link to reopen the same subject parcel and this same comparable set on another device or in GitHub Pages.</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  {copiedShareLink&&<span style={{fontSize:11,color:"var(--green2)",fontWeight:700}}>Link copied</span>}
                  <button onClick={copyShareLink} disabled={!shareLink} style={{background:shareLink?"var(--blue)":"rgba(148,163,184,.18)",color:shareLink?"white":"var(--gray3)",border:"none",borderRadius:8,padding:"8px 14px",cursor:shareLink?"pointer":"not-allowed",fontWeight:700,fontSize:12}}>Copy share link</button>
                  <button onClick={()=>openPrintableReport(false)} disabled={!neighborResult?.p} style={{background:"var(--green2)",color:"white",border:"none",borderRadius:8,padding:"8px 14px",cursor:neighborResult?.p?"pointer":"not-allowed",fontWeight:700,fontSize:12}}>Print grievance package</button>
                  <button onClick={()=>openPrintableReport(true)} disabled={!neighborResult?.p} style={{background:"rgba(15,23,42,.06)",color:"var(--gray)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 14px",cursor:neighborResult?.p?"pointer":"not-allowed",fontWeight:700,fontSize:12}}>Print with context comps</button>
                </div>
              </div>

              {(compareSnapshotMessage || printMessage)&&<div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.24)",borderRadius:10,padding:"11px 13px",fontSize:11,color:"var(--amber2)",lineHeight:1.6,marginBottom:12,display:"grid",gap:6}}>{compareSnapshotMessage&&<div>{compareSnapshotMessage}</div>}{printMessage&&<div>{printMessage}</div>}</div>}

              <div className="cols-2" style={{display:"grid",gap:14,marginBottom:14}}>
                <div style={{background:"rgba(37,99,235,.1)",border:"1px solid rgba(37,99,235,.25)",borderRadius:10,padding:"14px 16px",minWidth:0}}>
                  <div style={{fontSize:11,color:"var(--blue3)",marginBottom:4,fontWeight:600}}>Your Property</div>
                  <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:16,overflowWrap:"anywhere",wordBreak:"break-word"}}><AddrLink address={subject.address} zip={subject.zip} neighborhood={subject.neighborhood} parcelId={subject.parcelId}>{subject.address}</AddrLink></div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>
                    <Badge color="#2563eb" small>{propClassLabel(subject)}</Badge>
                    {comparableProfileBadgeItems(subject).map(item=><Badge key={subject.parcelId + item} color="#64748b" small>{item}</Badge>)}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                    <ComparableOwnershipBadges parcel={subject} small />
                  </div>
                  {isAbsenteeFast(subject)&&<AbsenteeExplain parcel={subject} compact />}
                  <OwnerPortfolioSection parcel={subject} ownerPortfolioIndex={ownerPortfolioIndex} onSelectParcel={focusNeighborParcel} />
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8,marginTop:12}}>
                    <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.18)",borderRadius:8,padding:"8px 10px",minWidth:0}}><div style={{fontFamily:"var(--fm)",fontSize:15,color:"var(--amber)",fontWeight:700}}>{$f(subject.fullMarketValue)}</div><div style={{fontSize:10,color:"var(--gray)"}}>Your FMV</div></div>
                    <div style={{background:"rgba(15,23,42,.04)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 10px",minWidth:0}}><div style={{fontFamily:"var(--fm)",fontSize:15,fontWeight:700}}>{$f(subject.assessedValue)}</div><div style={{fontSize:10,color:"var(--gray)"}}>Your Assessed</div></div>
                    <div style={{background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.18)",borderRadius:8,padding:"8px 10px",minWidth:0}}><div style={{fontFamily:"var(--fm)",fontSize:15,fontWeight:700,color:FC[eqFlagFast(subject)]}}>{eqRFast(subject)}%</div><div style={{fontSize:10,color:"var(--gray)"}}>Your Equity %</div></div>
                  </div>
                  <div style={{fontSize:10,color:"var(--gray3)",marginTop:10,lineHeight:1.55}}>
                    {subjectProfile.availablePhysicalFields.length
                      ? <>Available home details for matching: <b style={{color:"var(--gray2)"}}>{subjectProfile.availablePhysicalFields.join(", ")}</b>.</>
                      : <>Residential inventory detail was not available on your parcel, so the comparison relied on class and nearby location signals.</>}
                  </div>
                </div>
                <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px",minWidth:0}}>
                  <div style={{fontSize:11,color:"var(--gray2)",marginBottom:4,fontWeight:600}} title="Best-match comparable homes ranked by class, neighborhood, living area, year built, beds, baths, and style when available.">
                    Best Comparable Homes ({neighborResult.neighbors.length} comps)
                  </div>
                  <div style={{fontSize:10,color:"var(--gray3)",lineHeight:1.5,marginBottom:8}}>
                    {neighborResult.comparableMode==="snapshot"
                      ? <>These homes were loaded from a <b style={{color:"var(--gray2)"}}>shared comparable snapshot</b>. The order is frozen from the saved link.</>
                      : neighborResult.comparableMode==="physical"
                        ? <>These homes were ranked for <b style={{color:"var(--gray2)"}}>physical similarity</b> to your parcel, with <b style={{color:"var(--gray2)"}}>{neighborResult.scopeNeighborhood||"Albany"}</b> preferred first.</>
                        : <>Inventory detail was too thin for a physical match set, so this view is using a lighter nearby fallback for the same residential class.</>}
                    {neighborResult.usedInventory&&<><br/>Your parcel has residential inventory data, so living area, year built, beds, baths, and style were used where available.</>}
                  </div>
                  <div style={{fontSize:10,color:"var(--gray3)",lineHeight:1.55,marginBottom:10}}>{neighborResult.grievanceSupportPool.length
                    ? <>Only <b style={{color:"var(--green2)"}}>{neighborResult.grievanceSupportPool.length}</b> of these physically similar homes support an RP-524 grievance because they are assessed lower than your home. The rest remain below for market context.</>
                    : <>These are physical matches for research, but none of the current comps are assessed lower than your home, so the grievance package will stay empty until a supportive comp is found.</>}</div>
                  {neighborResult.grievanceSupportPool.length>0 ? <>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
                      <div title="Average Full Market Value across the grievance-supporting comparable homes."><div style={{fontFamily:"var(--fm)",fontSize:16,color:"var(--gray)"}}>{$f(neighborResult.grievanceAvgFMV)}</div><div style={{fontSize:10,color:"var(--gray)"}}>Supporting comp FMV avg</div></div>
                      <div title="Average assessed value across the grievance-supporting comparable homes."><div style={{fontFamily:"var(--fm)",fontSize:16,color:"var(--gray)"}}>{$f(neighborResult.grievanceAvgAssessed)}</div><div style={{fontSize:10,color:"var(--gray)"}}>Supporting comp assessed avg</div></div>
                      <div title="Average equity ratio across the grievance-supporting comparable homes."><div style={{fontFamily:"var(--fm)",fontSize:16,color:(neighborResult.grievanceDeltaEquity??0)>8?"var(--red2)":(neighborResult.grievanceDeltaEquity??0)<-8?"var(--green2)":"var(--gray)"}}>{neighborResult.grievanceAvgEquity!=null?neighborResult.grievanceAvgEquity + "%":"-"}</div><div style={{fontSize:10,color:"var(--gray)"}}>Supporting comp equity avg</div></div>
                    </div>
                    <div style={{fontSize:10,color:"var(--gray3)",marginTop:8,lineHeight:1.55,display:"grid",gap:6}}>
                      {neighborResult.grievanceDeltaFMV!=null&&<div>Your FMV is <b style={{color:(neighborResult.grievanceDeltaFMV??0)>=0?"var(--green2)":"var(--red2)"}}>{(neighborResult.grievanceDeltaFMV>=0?"+":"-") + $f(Math.abs(neighborResult.grievanceDeltaFMV))}</b>{neighborResult.grievanceDeltaFMVPct!=null&&<> ({neighborResult.grievanceDeltaFMVPct>=0?"+":""}{neighborResult.grievanceDeltaFMVPct.toFixed(1)}%)</>} versus the grievance-supporting comp average.<DeltaInfoNote text={buildComparableDeltaInfo("fmv", -neighborResult.grievanceDeltaFMV)} tone={(neighborResult.grievanceDeltaFMV??0)>=0?"var(--green2)":"var(--red2)"} /></div>}
                      {neighborResult.grievanceDeltaAssessed!=null&&<div>Your assessed value is <b style={{color:neighborResult.grievanceDeltaAssessed>=0?"var(--red2)":"var(--green2)"}}>{(neighborResult.grievanceDeltaAssessed>=0?"+":"-") + $f(Math.abs(neighborResult.grievanceDeltaAssessed))}</b> relative to the grievance-supporting assessed average.<DeltaInfoNote text={buildComparableDeltaInfo("assessed", -neighborResult.grievanceDeltaAssessed)} tone={neighborResult.grievanceDeltaAssessed>=0?"var(--red2)":"var(--green2)"} /></div>}
                      {neighborResult.grievanceDeltaEquity!=null&&<div>Your equity ratio is <b style={{color:neighborResult.grievanceDeltaEquity>8?"var(--red2)":neighborResult.grievanceDeltaEquity<-8?"var(--green2)":"var(--gray2)"}}>{neighborResult.grievanceDeltaEquity>=0?"+":""}{neighborResult.grievanceDeltaEquity}%</b> relative to the grievance-supporting comp average. {neighborResult.grievanceSignal}<DeltaInfoNote text={buildComparableDeltaInfo("equity", -neighborResult.grievanceDeltaEquity)} tone={neighborResult.grievanceDeltaEquity>8?"var(--red2)":neighborResult.grievanceDeltaEquity<-8?"var(--green2)":"var(--gray2)"} /></div>}
                    </div>
                  </> : <div style={{background:"rgba(148,163,184,.10)",border:"1px solid rgba(148,163,184,.18)",borderRadius:8,padding:"10px 12px",fontSize:10,color:"var(--gray3)",lineHeight:1.55}}>No lower-assessed comps are available in this physical match set, so the grievance summary uses no evidence yet. Review the physical matches below for context, but do not include them in an RP-524 package unless they are assessed lower than your home.</div>}
                </div>
              </div>

              <div style={{background:"rgba(255,255,255,.03)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px",marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:600,color:"var(--gray2)",marginBottom:6}}>How To Read These Numbers</div>
                <div style={{fontSize:11,color:"var(--gray3)",lineHeight:1.65}}>
                  <b style={{color:"var(--gray2)"}}>Comparable homes</b> are the strongest matches in the current dataset for your parcel's residential class and home details. Each card now shows <b style={{color:"var(--gray2)"}}>You</b>, <b style={{color:"var(--gray2)"}}>Comp</b>, and <b style={{color:"var(--gray2)"}}>Delta</b> together so you can judge whether a lower-assessed home is truly similar to yours. <b style={{color:"var(--gray2)"}}>Equity %</b> = Assessed / FMV x 100.
                </div>
              </div>

              <div style={{background:"linear-gradient(180deg,rgba(22,163,74,.18) 0%,rgba(22,163,74,.10) 100%)",border:"1px solid rgba(21,128,61,.30)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <div style={{fontSize:12,fontWeight:800,color:"var(--green2)"}}>RP-524 filing helper</div>
                    <span style={{background:grievanceHelper.supportingCompCount>0?"rgba(21,128,61,.14)":"rgba(245,158,11,.16)",border:`1px solid ${grievanceHelper.supportingCompCount>0?"rgba(21,128,61,.26)":"rgba(245,158,11,.28)"}`,color:grievanceHelper.supportingCompCount>0?"var(--green2)":"var(--amber2)",borderRadius:999,padding:"5px 10px",fontSize:10,fontWeight:700}}>{grievanceHelper.supportingCompCount>0 ? `${grievanceHelper.supportingCompCount} supporting comps` : "0 supporting comps - grievance may be difficult to support"}</span>
                  </div>
                </div>
                <div style={{background:"rgba(245,158,11,.16)",border:"1px solid rgba(245,158,11,.30)",borderRadius:10,padding:"10px 12px",marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:800,color:"var(--amber2)",marginBottom:4}}>Filing Deadline: Grievance Day - 4th Tuesday of May</div>
                  <div style={{fontSize:11,color:"var(--gray)",lineHeight:1.6}}>{grievanceHelper.grievanceDayDeadline}</div>
                </div>
                <div style={{fontSize:11,color:"var(--gray)",lineHeight:1.65,maxWidth:920,marginBottom:10}}>Based on the RP-524 form and the New York grievance booklet, the app can supply the roll values, parcel identity, and only the lower-assessed comparable evidence below. Higher-assessed comps stay visible later for research, but they are excluded from the grievance package automatically.</div>
                <div className="print-hide" style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
                  <a href={grievanceHelperLinks.rp524FormUrl} target="_blank" rel="noreferrer" style={{background:"rgba(21,128,61,.14)",border:"1px solid rgba(21,128,61,.26)",color:"var(--green2)",textDecoration:"none",borderRadius:999,padding:"8px 12px",fontSize:11,fontWeight:700}}>Open RP-524 form</a>
                  <a href={grievanceHelperLinks.grievanceBookletUrl} target="_blank" rel="noreferrer" style={{background:"rgba(21,128,61,.10)",border:"1px solid rgba(21,128,61,.22)",color:"var(--green2)",textDecoration:"none",borderRadius:999,padding:"8px 12px",fontSize:11,fontWeight:700}}>Open grievance booklet</a>
                  <a href={grievanceHelperLinks.exemptionFaqUrl} target="_blank" rel="noreferrer" style={{background:"rgba(21,128,61,.10)",border:"1px solid rgba(21,128,61,.22)",color:"var(--green2)",textDecoration:"none",borderRadius:999,padding:"8px 12px",fontSize:11,fontWeight:700}}>{grievanceHelperLinks.exemptionFaqLabel}</a>
                </div>
                <div style={{fontSize:10,color:"var(--gray2)",marginBottom:12}}>These links are included here because this is the section the homeowner will use to complete RP-524. Document URLs are managed in <b style={{color:"var(--gray)"}}>grievance-settings.json</b>.</div>
                {grievanceHelper.narrative ? <div style={{background:"rgba(255,255,255,.86)",border:"1px solid rgba(21,128,61,.18)",borderRadius:8,padding:"10px 12px",fontSize:11,color:"var(--gray)",lineHeight:1.65,marginBottom:12}}>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--green2)",textTransform:"uppercase",letterSpacing:.6,marginBottom:8}}>Auto-generated grievance narrative</div>
                  <div>{grievanceHelper.narrative}</div>
                  <div className="print-hide" style={{marginTop:10}}>
                    <button onClick={()=>copyNarrative(grievanceHelper.narrative)} style={{background:"rgba(21,128,61,.10)",border:"1px solid rgba(21,128,61,.22)",color:"var(--green2)",borderRadius:999,padding:"8px 12px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{copiedNarrative?"Copied!":"Copy Narrative"}</button>
                  </div>
                </div> : <div style={{background:"rgba(255,255,255,.86)",border:"1px solid rgba(21,128,61,.18)",borderRadius:8,padding:"10px 12px",fontSize:11,color:"var(--gray)",lineHeight:1.55,marginBottom:12}}>No narrative is generated yet because the current physical match set does not contain a lower-assessed comp that supports your grievance.</div>}
                <div className="cols-2" style={{display:"grid",gap:12}}>
                  <div style={{background:"rgba(255,255,255,.86)",border:"1px solid rgba(21,128,61,.18)",borderRadius:8,padding:"10px 12px"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"var(--green2)",textTransform:"uppercase",letterSpacing:.6,marginBottom:8}}>Data this app can fill for you</div>
                    <div style={{display:"grid",gap:6}}>
                      {grievanceHelper.checklist.map((item, idx)=><div key={item.label + idx} style={{display:"grid",gap:2}}>
                        <div style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:11}}><span style={{color:"var(--gray)"}}>{item.label}</span><span style={{fontWeight:700,textAlign:"right",maxWidth:"62%",overflowWrap:"anywhere",wordBreak:"break-word"}}>{item.value}</span></div>
                        <div style={{fontSize:10,color:"var(--gray2)",lineHeight:1.45}}>{item.note}</div>
                      </div>)}
                    </div>
                  </div>
                  <div style={{background:"rgba(255,255,255,.86)",border:"1px solid rgba(21,128,61,.18)",borderRadius:8,padding:"10px 12px"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"var(--green2)",textTransform:"uppercase",letterSpacing:.6,marginBottom:8}}>Still needed from the homeowner</div>
                    <div style={{display:"grid",gap:8}}>
                      {grievanceHelper.missing.map((item, idx)=>{
                        const key = `homeowner-step-${idx}`;
                        const checked = !!filingChecklistState[key];
                        return <label key={item + idx} style={{display:"grid",gridTemplateColumns:"auto auto 1fr",alignItems:"flex-start",gap:10,fontSize:11,color:"var(--gray)",lineHeight:1.5,cursor:"pointer"}}>
                          <input type="checkbox" checked={checked} onChange={()=>toggleChecklistItem(key)} style={{marginTop:2,accentColor:"#15803d",cursor:"pointer"}} />
                          <span style={{fontWeight:700,color:"var(--green2)",minWidth:16}}>{idx + 1}.</span>
                          <span style={{textDecoration:checked?"line-through":"none",color:checked?"var(--gray2)":"var(--gray)"}}>{item}</span>
                        </label>;
                      })}
                    </div>
                    <div style={{fontSize:10,color:"var(--gray2)",lineHeight:1.55,marginTop:10}}>For the requested value narrative, the draft paragraph above is already prepared for the homeowner to use as-is or edit before filing.</div>
                  </div>
                </div>
              </div>

              {neighborResult.grievanceCandidates.length>0&&<>
                <div style={{background:"rgba(168,85,247,.06)",border:"1px solid rgba(168,85,247,.18)",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--purple)",marginBottom:5}}>Side-by-Side Grievance Table</div>
                  <div style={{fontSize:10,color:"var(--gray3)",lineHeight:1.55}}>Subject parcel plus the top {Math.min(4, neighborResult.grievanceCandidates.length)} strongest grievance-supporting comps. Only lower-assessed comps appear here.</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,marginBottom:14}}>
                  {grievanceComparisons.map(entry=>{
                    const parcel = entry.parcel;
                    const isSubject = entry.kind==="subject";
                    const profileRows = comparableProfileTableRows(parcel);
                    const delta = parcel._compDelta || null;
                    return <div key={parcel.parcelId} style={{background:isSubject?"rgba(37,99,235,.08)":"var(--card)",border:isSubject?"1px solid rgba(37,99,235,.26)":"1px solid var(--border)",borderRadius:10,padding:"12px 14px",minWidth:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:8}}>
                        <div style={{minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                            <Badge color={isSubject?"#2563eb":"#8b5cf6"} small>{entry.label}</Badge>
                            {!isSubject&&<Badge color="#0d9488" small>{matchedHomeDetailsLabel(parcel)}</Badge>}
                          </div>
                          <div style={{fontSize:13,fontWeight:700,marginTop:8,overflowWrap:"anywhere",wordBreak:"break-word"}}><AddrLink address={parcel.address} zip={parcel.zip} neighborhood={parcel.neighborhood} parcelId={parcel.parcelId}>{parcel.address}</AddrLink></div>
                          <div style={{fontSize:10,color:"var(--gray2)",marginTop:3,overflowWrap:"anywhere",wordBreak:"break-word"}}>{parcel.owner1}</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
                            <ComparableOwnershipBadges parcel={parcel} small />
                          </div>
                        </div>
                      </div>
                      <div style={{display:"grid",gap:6}}>
                        {profileRows.map(([label, value])=><div key={label} style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:11,minWidth:0}}><span style={{color:"var(--gray)"}}>{label}</span><span style={{fontWeight:600,textAlign:"right",minWidth:0,overflowWrap:"anywhere",wordBreak:"break-word"}}>{value}</span></div>)}
                        {!isSubject&&<><div style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:11}}><span style={{color:"var(--gray)"}}>Assessed vs you</span><span style={{fontWeight:700,color:comparableDeltaTone(delta?.assessed, true)}}>{formatSignedComparableMoney(delta?.assessed)}</span></div><DeltaInfoNote text={buildComparableDeltaInfo("assessed", delta?.assessed)} tone={comparableDeltaTone(delta?.assessed, true)} /></>}
                        {!isSubject&&<><div style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:11}}><span style={{color:"var(--gray)"}}>Equity vs you</span><span style={{fontWeight:700,color:comparableDeltaTone(delta?.equity, true)}}>{formatSignedComparableCount(delta?.equity, "%")}</span></div><DeltaInfoNote text={buildComparableDeltaInfo("equity", delta?.equity)} tone={comparableDeltaTone(delta?.equity, true)} /></>}
                      </div>
                    </div>;
                  })}
                </div>
              </>}

              {neighborResult.neighbors.length>0?<div style={{display:"grid",gap:12}}>
                <div style={{fontSize:11,color:"var(--gray2)",marginBottom:2}} title="These parcels drive the comparable-home summary above.">Best Comparable Parcels ({neighborResult.neighbors.length} comps)</div>
                {neighborResult.neighbors.map((parcel, idx)=>{
                  const compProfile = parcel._compProfile || buildComparableProfile(parcel);
                  const delta = parcel._compDelta || {};
                  return <div key={parcel.parcelId} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px",display:"grid",gap:12,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
                      <div style={{minWidth:0,flex:"1 1 320px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                          <div style={{fontSize:15,fontWeight:700,overflowWrap:"anywhere",wordBreak:"break-word"}}><AddrLink address={parcel.address} zip={parcel.zip} neighborhood={parcel.neighborhood} parcelId={parcel.parcelId}>{parcel.address}</AddrLink></div>
                          <Badge color="#8b5cf6" small>{"Comp " + (idx+1)}</Badge>
                          <Badge color="#0d9488" small>{matchedHomeDetailsLabel(parcel)}</Badge>
                          <ComparableOwnershipBadges parcel={parcel} small />
                        </div>
                        <div style={{background:parcel._grievanceRelevance.background,border:`1px solid ${parcel._grievanceRelevance.border}`,borderRadius:8,padding:"9px 10px",marginTop:10,display:"grid",gap:4}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                            <Badge color={parcel._grievanceRelevance.kind==="supports"?"#16a34a":parcel._grievanceRelevance.kind==="does_not_support"?"#dc2626":"#64748b"} small>{parcel._grievanceRelevance.badge}</Badge>
                            <span style={{fontSize:11,fontWeight:700,color:parcel._grievanceRelevance.tone}}>{parcel._grievanceRelevance.headline}</span>
                          </div>
                          <div style={{fontSize:10,color:parcel._grievanceRelevance.tone,lineHeight:1.5}}>{parcel._grievanceRelevance.detail}</div>
                        </div>
                        <div style={{fontSize:11,color:"var(--gray2)",marginTop:4,overflowWrap:"anywhere",wordBreak:"break-word"}}>{parcel.owner1} | {parcel.parcelId} | {parcelNeighborhoodName(parcel)||"Neighborhood unknown"}</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                          <Badge color="#6366f1" small>{propClassLabel(parcel)}</Badge>
                          {comparableProfileBadgeItems(parcel).map(item=><Badge key={parcel.parcelId + item} color="#64748b" small>{item}</Badge>)}
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,flex:"1 1 320px",minWidth:260}}>
                        <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.18)",borderRadius:8,padding:"8px 10px",textAlign:"right"}}><div style={{fontFamily:"var(--fm)",fontSize:13,color:"var(--amber)",fontWeight:700}}>{$f(parcel.fullMarketValue)}</div><div style={{fontSize:10,color:"var(--gray)"}}>Comp FMV</div></div>
                        <div style={{background:"rgba(15,23,42,.04)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 10px",textAlign:"right"}}><div style={{fontFamily:"var(--fm)",fontSize:13,fontWeight:700}}>{$f(parcel.assessedValue)}</div><div style={{fontSize:10,color:"var(--gray)"}}>Comp assessed</div></div>
                        <div style={{background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.18)",borderRadius:8,padding:"8px 10px",textAlign:"right"}}><div style={{fontFamily:"var(--fm)",fontSize:13,fontWeight:700,color:FC[eqFlagFast(parcel)]}}>{eqRFast(parcel)}%</div><div style={{fontSize:10,color:"var(--gray)"}}>Comp equity</div></div>
                      </div>
                    </div>

                    {isAbsenteeFast(parcel)&&<AbsenteeExplain parcel={parcel} compact />}
                    <OwnerPortfolioSection parcel={parcel} ownerPortfolioIndex={ownerPortfolioIndex} onSelectParcel={focusNeighborParcel} />

                    <div style={{display:"grid",gap:10}}>
                      <div style={{fontSize:11,fontWeight:700,color:"var(--gray2)"}}>Value comparison</div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}>
                        <CompareMetricCard label="FMV" youValue={$f(subject.fullMarketValue)} compValue={$f(parcel.fullMarketValue)} deltaValue={formatSignedComparableMoney(delta.fmv)} deltaTone={comparableDeltaTone(delta.fmv)} deltaInfo={buildComparableDeltaInfo("fmv", delta.fmv)} />
                        <CompareMetricCard label="Assessed" youValue={$f(subject.assessedValue)} compValue={$f(parcel.assessedValue)} deltaValue={formatSignedComparableMoney(delta.assessed)} deltaTone={comparableDeltaTone(delta.assessed, true)} deltaInfo={buildComparableDeltaInfo("assessed", delta.assessed)} />
                        <CompareMetricCard label="Equity %" youValue={subjectProfile.equity != null ? subjectProfile.equity + "%" : "-"} compValue={compProfile.equity != null ? compProfile.equity + "%" : "-"} deltaValue={formatSignedComparableCount(delta.equity, "%")} deltaTone={comparableDeltaTone(delta.equity, true)} deltaInfo={buildComparableDeltaInfo("equity", delta.equity)} />
                      </div>
                    </div>

                    <div style={{display:"grid",gap:10}}>
                      <div style={{fontSize:11,fontWeight:700,color:"var(--gray2)"}}>Physical comparison</div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}>
                        <CompareMetricCard label="Living area" youValue={subjectProfile.livingArea != null ? nf(subjectProfile.livingArea) + " sq ft" : "-"} compValue={compProfile.livingArea != null ? nf(compProfile.livingArea) + " sq ft" : "-"} deltaValue={delta.livingArea != null ? formatSignedComparableCount(delta.livingArea, " sq ft") : "-"} deltaTone={comparableDeltaTone(delta.livingArea)} deltaInfo={buildComparableDeltaInfo("livingArea", delta.livingArea)} />
                        <CompareMetricCard label="Year built" youValue={subjectProfile.yearBuilt != null ? String(subjectProfile.yearBuilt) : "-"} compValue={compProfile.yearBuilt != null ? String(compProfile.yearBuilt) : "-"} deltaValue={delta.yearBuilt != null ? formatSignedComparableCount(delta.yearBuilt, " yrs") : "-"} deltaTone={comparableDeltaTone(delta.yearBuilt)} deltaInfo={buildComparableDeltaInfo("yearBuilt", delta.yearBuilt)} />
                        <CompareMetricCard label="Bedrooms" youValue={subjectProfile.bedrooms != null ? String(subjectProfile.bedrooms) : "-"} compValue={compProfile.bedrooms != null ? String(compProfile.bedrooms) : "-"} deltaValue={delta.bedrooms != null ? formatSignedComparableCount(delta.bedrooms) : "-"} deltaTone={comparableDeltaTone(delta.bedrooms)} deltaInfo={buildComparableDeltaInfo("bedrooms", delta.bedrooms)} />
                        <CompareMetricCard label="Baths" youValue={subjectProfile.bathText || "-"} compValue={compProfile.bathText || "-"} deltaValue={delta.baths != null ? formatSignedComparableCount(delta.baths) : "-"} deltaTone={comparableDeltaTone(delta.baths)} deltaInfo={buildComparableDeltaInfo("baths", delta.baths)} />
                      </div>
                    </div>

                    <div style={{display:"grid",gap:10}}>
                      <div style={{fontSize:11,fontWeight:700,color:"var(--gray2)"}}>Profile match</div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}>
                        <CompareProfileRow label="Neighborhood" youValue={subjectProfile.neighborhood || "-"} compValue={compProfile.neighborhood || "-"} />
                        <CompareProfileRow label="Class" youValue={subjectProfile.classLabel || "-"} compValue={compProfile.classLabel || "-"} />
                        <CompareProfileRow label="Style" youValue={subjectProfile.style || "-"} compValue={compProfile.style || "-"} />
                      </div>
                    </div>

                    <div style={{background:"rgba(37,99,235,.05)",border:"1px solid rgba(37,99,235,.14)",borderRadius:8,padding:"10px 12px",minWidth:0}}>
                      <div style={{fontSize:10,fontWeight:700,color:"var(--blue3)",marginBottom:6}}>Why this home was selected</div>
                      <div style={{display:"grid",gap:4}}>
                        {(parcel._compReasons||[]).map((reason, reasonIdx)=><div key={parcel.parcelId + "-reason-" + reasonIdx} style={{fontSize:10,color:"var(--gray3)",lineHeight:1.5,overflowWrap:"anywhere"}}>- {reason}</div>)}
                      </div>
                      <div style={{fontSize:10,color:"var(--gray3)",marginTop:8,lineHeight:1.55}}>
                        {(parcel._compPhysicalFieldsUsed||[]).length
                          ? <>Matched using: <b style={{color:"var(--gray2)"}}>{parcel._compPhysicalFieldsUsed.join(", ")}</b>{(parcel._compUnusedPhysicalFields||[]).length?<> | Not used: <b style={{color:"var(--gray2)"}}>{parcel._compUnusedPhysicalFields.join(", ")}</b></>:null}.</>
                          : <>This match relied on residential class and nearby location because detailed home characteristics were not available on both parcels.</>}
                      </div>
                    </div>
                  </div>;
                })}
              </div>:<div style={{fontSize:12,color:"var(--gray2)",textAlign:"center",padding:20}}>No suitable comparable homes were found in the current dataset for this parcel. Try another address or load a fuller roll and inventory file set.</div>}
            </div>;
          })()}
          {neighborAddr&&!neighborResult&&<div style={{fontSize:12,color:"var(--gray2)",marginTop:8}}>No parcel found. Try a partial address like "Academy" or a parcel ID like "75.44-2-50".</div>}
        </Card>
      </div>}

      {view==="school"&&<div>
        <InfoBox icon="School" title="What Is School Tax Burden - And Why Does It Matter?" color="#a78bfa">
          <b style={{color:"var(--white)"}}>School taxes are typically the largest single component of your Albany property tax bill</b> - often 60-70% of the total. They fund the Albany City School District: teacher salaries, building maintenance, transportation, special education, and more. Your school tax is calculated by multiplying the school district's tax rate by your <b style={{color:"var(--white)"}}>school taxable value</b> - which is different from your assessed value if you have any school-specific exemptions.<br/><br/>
          The <b style={{color:"var(--white)"}}>School Tax Burden %</b> shown here is: School Taxable Value / Full Market Value x 100. A result of 100% means you have zero school tax relief - you are paying on the full assessed value. A result of 75% means exemptions (like STAR) have reduced your school-taxable amount by 25% of market value. Lower is better for the homeowner. <b style={{color:"var(--white)"}}>Every homeowner who lives in their primary residence should have at minimum the Basic STAR exemption reducing this number.</b> If yours shows 100%, you may be leaving money on the table.
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
                  <div style={{fontWeight:600,fontSize:14}}><AddrLink address={p.address} zip={p.zip} neighborhood={p.neighborhood} parcelId={p.parcelId}>{p.address}</AddrLink></div>
                  {myHome?.parcelId===p.parcelId&&<Badge color="#22c55e" small>My Home</Badge>}
                </div>
                <div style={{fontSize:11,color:"var(--gray2)",marginTop:2}}>{p.owner1} | School taxable: {$f(p.schoolTaxable)}</div>
                <div style={{fontSize:11,color:"var(--gray3)",marginTop:3}}>
                  {parseFloat(p.schoolBurden)>95&&p.parcelType==="HOMESTEAD"?"Warning: homestead with no school tax relief - may qualify for STAR":
                   parseFloat(p.schoolBurden)<80?"School exemptions are reducing taxable value below 80% of market":
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
/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ 7. COORDINATE MAP (Canvas renderer ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â smooth 60fps pan/zoom) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
const LegacyCanvasMapView = ({parcels, parcelGeometry, streetCenterlines, onDrill, advanced=true}) => {
  const canvasRef=useRef();
  const msRef=useRef({zoom:1,pan:{x:0,y:0},drag:null,justDragged:false});
  const [colorBy,setColorBy]=useState(advanced?"fmv":"equity");
  const [viewPreset,setViewPreset]=useState("fairness");
  const [tooltip,setTooltip]=useState(null);
  const [tooltipPos,setTooltipPos]=useState({x:14,y:14});
  const [addrSearch,setAddrSearch]=useState("");
  const [zoomDisplay,setZoomDisplay]=useState(100);
  const [selectedParcelId,setSelectedParcelId]=useState(null);
  const [showParcelPoints,setShowParcelPoints]=useState(true);
  const [showPropertyOverlay,setShowPropertyOverlay]=useState(true);
  const [showStreetLabels,setShowStreetLabels]=useState(!advanced);
  const [showStreetNetwork,setShowStreetNetwork]=useState(advanced);
  const W=960,H=560,PAD=44;
  const MAX_ZOOM=40;
  const residentPresetMap={fairness:"equity",tax_relief:"exemption",ownership:"absentee",market:"fmv"};

  useEffect(()=>{
    if(advanced){
      setShowStreetLabels(false);
      setShowStreetNetwork(true);
      return;
    }
    setColorBy(residentPresetMap[viewPreset] || "equity");
    setShowStreetLabels(true);
    setShowStreetNetwork(false);
  },[advanced,viewPreset]);

  const geomByIdRaw = parcelGeometry?.parcels && !Array.isArray(parcelGeometry.parcels) ? parcelGeometry.parcels : null;
  const geomByNorm = useMemo(()=>{
    if(!geomByIdRaw) return null;
    const map = new Map();
    for(const [rawKey, geom] of Object.entries(geomByIdRaw)){
      const key = normalizeParcelId(rawKey);
      if(key) map.set(key, geom);
    }
    return map;
  },[geomByIdRaw]);
  const hasParcelGeometry = !!geomByNorm;
  const uploadedStreetLines = Array.isArray(streetCenterlines?.streets) ? streetCenterlines.streets : null;
  const hasStreetCenterlines = !!(uploadedStreetLines && uploadedStreetLines.length);
  const useUploadedStreetCenterlines = hasStreetCenterlines && hasParcelGeometry;

  const mapped=useMemo(()=>{
    const out=[];
    for(const p of parcels){
      const key = normalizeParcelId(p.parcelIdNorm || p.parcelId || p.printKey || p.pinSbl);
      const geom = hasParcelGeometry && key ? geomByNorm.get(key) : null;
      const c=geom?.c;
      if(Array.isArray(c)&&Number.isFinite(c[0])&&Number.isFinite(c[1])){
        out.push({p,x:c[0],y:c[1],geom,pointFallback:false});
        continue;
      }
      if(p.eastCoord>0&&p.nrthCoord>0) out.push({p,x:p.eastCoord,y:p.nrthCoord,geom:null,pointFallback:true});
    }
    return out;
  },[parcels,hasParcelGeometry,geomByNorm]);
  const mappedById=useMemo(()=>new Map(mapped.map(item=>[item.p.parcelId,item])),[mapped]);
  const selectedItem=selectedParcelId ? mappedById.get(selectedParcelId) || null : null;
  const selectedParcel=selectedItem?.p || parcels.find(p=>p.parcelId===selectedParcelId) || null;
  const polygonCount=useMemo(()=>mapped.filter(item=>!!item.geom).length,[mapped]);
  const pointFallbackCount=Math.max(0,mapped.length-polygonCount);
  const hiddenCount=Math.max(0,parcels.length-mapped.length);

  const bounds=useMemo(()=>{
    if(!mapped.length) return {minX:630000,maxX:660000,minY:955000,maxY:985000};
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const item of mapped){
      const b=item.geom?.b;
      if(Array.isArray(b)&&b.length===4){
        if(b[0]<minX)minX=b[0]; if(b[2]>maxX)maxX=b[2];
        if(b[1]<minY)minY=b[1]; if(b[3]>maxY)maxY=b[3];
      } else {
        if(item.x<minX)minX=item.x; if(item.x>maxX)maxX=item.x;
        if(item.y<minY)minY=item.y; if(item.y>maxY)maxY=item.y;
      }
    }
    if(minX===maxX){minX-=1;maxX+=1;}
    if(minY===maxY){minY-=1;maxY+=1;}
    return {minX,maxX,minY,maxY};
  },[mapped]);

  const hlSet=useMemo(()=>{
    const q=addrSearch.trim().toLowerCase(); if(!q) return null;
    const s=new Set();
    for(const item of mapped){
      const p=item.p;
      if((p._searchBlob||"").includes(q)||(p._ownerBlob||"").includes(q)) s.add(p.parcelId);
    }
    return s.size?s:null;
  },[addrSearch,mapped]);
  const searchMatches=useMemo(()=>{
    if(!hlSet) return [];
    const out=[];
    for(const item of mapped){
      if(hlSet.has(item.p.parcelId)) out.push(item.p);
      if(out.length>=8) break;
    }
    return out;
  },[hlSet,mapped]);
  useEffect(()=>{
    if(selectedParcelId && !parcels.some(p=>p.parcelId===selectedParcelId)) setSelectedParcelId(null);
  },[parcels,selectedParcelId]);

  const streetLabels = useMemo(()=>{
    if(useUploadedStreetCenterlines){
      const out = [];
      for(const s of uploadedStreetLines){
        const c=s?.c, b=s?.b;
        if(!Array.isArray(c) || c.length<2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
        const label=(s?.n||"").toString().trim();
        if(!label) continue;
        const rank = Array.isArray(b)&&b.length===4 ? ((b[2]-b[0])**2 + (b[3]-b[1])**2) : 0;
        out.push({ label, x:c[0], y:c[1], a:Number.isFinite(s?.a)?s.a:0, n:rank });
      }
      out.sort((a,b)=>b.n-a.n || a.label.localeCompare(b.label));
      return out;
    }
    const groups = new Map();
    const streetFromAddr = (addr) => {
      const s = (addr||"").toString().trim();
      if(!s) return null;
      const noNum = s.replace(/^\s*\d+[A-Za-z\-]*\s+/,"").trim();
      if(!noNum) return null;
      return noNum.replace(/\s+/g," ").trim();
    };
    const normStreet = (street) => street
      .toLowerCase()
      .replace(/\b(street|st)\b/g,"st")
      .replace(/\b(avenue|ave)\b/g,"ave")
      .replace(/\b(road|rd)\b/g,"rd")
      .replace(/\b(place|pl)\b/g,"pl")
      .replace(/\b(court|ct)\b/g,"ct")
      .replace(/\b(terrace|ter)\b/g,"ter")
      .replace(/\b(boulevard|blvd)\b/g,"blvd")
      .replace(/\b(drive|dr)\b/g,"dr")
      .replace(/\b(lane|ln)\b/g,"ln")
      .replace(/\b(circle|cir)\b/g,"cir")
      .replace(/\s+/g," ")
      .trim();
    for(const item of mapped){
      const street = streetFromAddr(item.p.address);
      if(!street) continue;
      const norm = normStreet(street);
      if(!norm) continue;
      const scope = item.p.neighborhood || item.p.zip || "";
      const key = `${norm}|${scope}`;
      let g = groups.get(key);
      if(!g){
        g = {label: street, x:0, y:0, n:0, zipCounts:new Map()};
        groups.set(key,g);
      }
      g.x += item.x;
      g.y += item.y;
      g.n += 1;
      const z = item.p.zip || "";
      if(z) g.zipCounts.set(z, (g.zipCounts.get(z)||0)+1);
      if(street.length < g.label.length) g.label = street;
    }
    const out = [];
    for(const [,g] of groups){
      if(g.n < 4) continue;
      out.push({
        label: g.label,
        x: g.x / g.n,
        y: g.y / g.n,
        n: g.n,
      });
    }
    out.sort((a,b)=>b.n-a.n || a.label.localeCompare(b.label));
    return out;
  },[mapped,useUploadedStreetCenterlines,uploadedStreetLines]);

  const draw=useCallback(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d");
    const {zoom,pan}=msRef.current;
    const {minX,maxX,minY,maxY}=bounds;
    const spanX=maxX-minX||1, spanY=maxY-minY||1;
    const rx=x=>PAD+(x-minX)/spanX*(W-PAD*2);
    const ry=y=>H-PAD-(y-minY)/spanY*(H-PAD*2);
    const mapXToDataX=mx=>minX+((mx-PAD)/(W-PAD*2))*spanX;
    const mapYToDataY=my=>minY+((H-PAD-my)/(H-PAD*2))*spanY;
    const allowPolygons = hasParcelGeometry && showPropertyOverlay;
    const colorForParcel=p=>{
      if(colorBy==="fmv"){const v=p.fullMarketValue; return v>500000?"#f59e0b":v>300000?"#3b82f6":v>150000?"#0d9488":"#64748b";}
      if(colorBy==="equity") return FC[eqFlagFast(p)];
      if(colorBy==="class") return ({"210":"#3b82f6","220":"#0d9488","230":"#06b6d4","411":"#a78bfa","400":"#f97316","300":"#64748b","330":"#94a3b8"})[p.propClass]||"#94a3b8";
      if(colorBy==="exemption") return p.exemptions?.length>0?"#f59e0b":"#475569";
      if(colorBy==="absentee") return isAbsenteeFast(p)?"#f97316":"#22c55e";
      return "#3b82f6";
    };

    ctx.clearRect(0,0,W,H);
    ctx.fillStyle="#0d1829"; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle="rgba(255,255,255,0.025)"; ctx.lineWidth=1;
    for(let gx=0;gx<W;gx+=40){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,H);ctx.stroke();}
    for(let gy=0;gy<H;gy+=40){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke();}

    ctx.save(); ctx.translate(pan.x,pan.y); ctx.scale(zoom,zoom);

    if(showStreetNetwork && useUploadedStreetCenterlines && zoom>=0.95){
      const viewMinMapX=(0-pan.x)/zoom, viewMaxMapX=(W-pan.x)/zoom;
      const viewMinMapY=(0-pan.y)/zoom, viewMaxMapY=(H-pan.y)/zoom;
      const vx0=Math.min(mapXToDataX(viewMinMapX),mapXToDataX(viewMaxMapX));
      const vx1=Math.max(mapXToDataX(viewMinMapX),mapXToDataX(viewMaxMapX));
      const vy0=Math.min(mapYToDataY(viewMinMapY),mapYToDataY(viewMaxMapY));
      const vy1=Math.max(mapYToDataY(viewMinMapY),mapYToDataY(viewMaxMapY));
      const lineStep = zoom<1.15 ? 4 : zoom<1.45 ? 3 : zoom<1.9 ? 2 : 1;
      ctx.strokeStyle="rgba(255,255,255,0.10)";
      ctx.lineWidth=Math.max(0.35,0.9/zoom);
      ctx.lineCap="round";
      for(let i=0;i<uploadedStreetLines.length;i+=lineStep){
        const s=uploadedStreetLines[i];
        const b=s?.b, lines=s?.g;
        if(!Array.isArray(b)||!Array.isArray(lines)) continue;
        if(b[2]<vx0||b[0]>vx1||b[3]<vy0||b[1]>vy1) continue;
        ctx.beginPath();
        for(const line of lines){
          if(!Array.isArray(line)||line.length<2) continue;
          ctx.moveTo(rx(line[0][0]),ry(line[0][1]));
          for(let j=1;j<line.length;j++) ctx.lineTo(rx(line[j][0]),ry(line[j][1]));
        }
        ctx.stroke();
      }
    }

    if(allowPolygons && zoom>=1.6){
      const viewMinMapX=(0-pan.x)/zoom, viewMaxMapX=(W-pan.x)/zoom;
      const viewMinMapY=(0-pan.y)/zoom, viewMaxMapY=(H-pan.y)/zoom;
      const vx0=Math.min(mapXToDataX(viewMinMapX),mapXToDataX(viewMaxMapX));
      const vx1=Math.max(mapXToDataX(viewMinMapX),mapXToDataX(viewMaxMapX));
      const vy0=Math.min(mapYToDataY(viewMinMapY),mapYToDataY(viewMaxMapY));
      const vy1=Math.max(mapYToDataY(viewMinMapY),mapYToDataY(viewMaxMapY));
      let polyStep=1;
      if(!hlSet){
        if(mapped.length>25000 && zoom<2.2) polyStep=5;
        else if(mapped.length>25000 && zoom<2.8) polyStep=3;
        else if(mapped.length>12000 && zoom<3.4) polyStep=2;
      }
      const strokeW=Math.max(0.35,1/zoom);
      for(let i=0;i<mapped.length;i+=polyStep){
        const item=mapped[i];
        const geom=item.geom; const b=geom?.b;
        if(!geom||!Array.isArray(b)) continue;
        if(b[2]<vx0||b[0]>vx1||b[3]<vy0||b[1]>vy1) continue;
        const isHl=hlSet?hlSet.has(item.p.parcelId):false;
        const isSelected=selectedParcelId===item.p.parcelId;
        if((hlSet || selectedParcelId) && !isHl && !isSelected){ ctx.globalAlpha=0.10; ctx.fillStyle="#334155"; }
        else if(isSelected){ ctx.globalAlpha=0.72; ctx.fillStyle="#f8fafc"; }
        else { ctx.globalAlpha=isHl?0.58:0.24; ctx.fillStyle=isHl?"#fbbf24":colorForParcel(item.p); }
        ctx.beginPath();
        const polys=geom.g;
        for(let pi=0;pi<polys.length;pi++){
          const poly=polys[pi];
          for(let ri=0;ri<poly.length;ri++){
            const ring=poly[ri];
            if(!ring||!ring.length) continue;
            ctx.moveTo(rx(ring[0][0]),ry(ring[0][1]));
            for(let j=1;j<ring.length;j++) ctx.lineTo(rx(ring[j][0]),ry(ring[j][1]));
            ctx.closePath();
          }
        }
        ctx.fill("evenodd");
        if(zoom>=2.2 || isSelected){
          ctx.globalAlpha=isSelected?0.98:(isHl?0.95:0.35);
          ctx.strokeStyle=isSelected?"#f8fafc":(isHl?"#ffffff":"rgba(255,255,255,0.28)");
          ctx.lineWidth=isSelected?Math.max(1.2,1.6/zoom):strokeW;
          ctx.stroke();
        }
        ctx.globalAlpha=1;
      }
    }

    const r=Math.max(1.5,4.5/zoom);
    const suppressCentroidDots = allowPolygons && zoom>=1.5;
    let step = 1;
    if(!hlSet && !selectedParcelId){
      if(mapped.length>60000 && zoom<1.2) step=8;
      else if(mapped.length>30000 && zoom<1.35) step=6;
      else if(mapped.length>15000 && zoom<1.7) step=4;
      else if(mapped.length>6000 && zoom<2.1) step=2;
    }
    if(showParcelPoints){
      for(let i=0;i<mapped.length;i+=step){
        const item=mapped[i]; const p=item.p;
        const x=rx(item.x),y=ry(item.y);
        const isHl=hlSet?hlSet.has(p.parcelId):false;
        const isSelected=selectedParcelId===p.parcelId;
        if(suppressCentroidDots && item.geom && !isHl && !isSelected) continue;
        if((hlSet || selectedParcelId) && !isHl && !isSelected){
          ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle="rgba(100,116,139,0.18)"; ctx.fill();
          continue;
        }
        const color=isSelected?"#f8fafc":(isHl?"#fbbf24":colorForParcel(p));
        ctx.globalAlpha=isSelected?1:(item.pointFallback?0.88:(suppressCentroidDots?0.52:0.82));
        ctx.beginPath();
        ctx.arc(x,y,isSelected?r*2.3:(isHl?r*1.8:r),0,Math.PI*2);
        ctx.fillStyle=color;
        ctx.fill();
        ctx.globalAlpha=1;
        if(item.pointFallback){
          ctx.strokeStyle="rgba(255,255,255,0.55)";
          ctx.lineWidth=Math.max(0.6,0.9/zoom);
          ctx.stroke();
        }
      }
    }

    const minStreetLabelZoom = useUploadedStreetCenterlines ? 1.05 : 1.95;
    if(showStreetLabels && zoom>=minStreetLabelZoom){
      const fontPx = useUploadedStreetCenterlines ? Math.max(4.5, 6.8/zoom) : Math.max(6.2, 9.2/zoom);
      const cellPx = useUploadedStreetCenterlines ? Math.max(20, 44/Math.max(zoom,1)) : Math.max(42, 88/Math.max(zoom,1));
      const usedCells = new Set();
      ctx.font=`600 ${fontPx}px sans-serif`;
      ctx.textAlign="center";
      ctx.textBaseline="middle";
      for(const s of streetLabels){
        const x = rx(s.x), y = ry(s.y);
        if(x < -24 || y < -24 || x > W+24 || y > H+24) continue;
        const cx = Math.floor(x / cellPx), cy = Math.floor(y / cellPx);
        const cellKey = `${cx},${cy}`;
        if(usedCells.has(cellKey)) continue;
        usedCells.add(cellKey);
        ctx.strokeStyle="rgba(8,15,30,0.86)";
        ctx.lineWidth=Math.max(0.14,0.9/zoom);
        ctx.fillStyle="rgba(255,255,255,0.82)";
        if(useUploadedStreetCenterlines && Number.isFinite(s.a)){
          ctx.save();
          ctx.translate(x,y);
          ctx.rotate(-s.a);
          if(zoom>1.25) ctx.strokeText(s.label, 0, 0);
          ctx.fillText(s.label, 0, 0);
          ctx.restore();
        } else {
          if(zoom>2) ctx.strokeText(s.label, x, y);
          ctx.fillText(s.label, x, y);
        }
      }
    }

    ctx.restore();
  },[mapped,bounds,hlSet,colorBy,hasParcelGeometry,selectedParcelId,showPropertyOverlay,showParcelPoints,showStreetLabels,showStreetNetwork,streetLabels,useUploadedStreetCenterlines,uploadedStreetLines]);

  useEffect(()=>{draw();},[draw]);

  useEffect(()=>{
    if(!hlSet||!hlSet.size) return;
    const first=mapped.find(item=>hlSet.has(item.p.parcelId)); if(!first) return;
    const {minX,maxX,minY,maxY}=bounds;
    const sx=PAD+(first.x-minX)/(maxX-minX||1)*(W-PAD*2);
    const sy=H-PAD-(first.y-minY)/(maxY-minY||1)*(H-PAD*2);
    const nz=Math.max(3,msRef.current.zoom);
    msRef.current.zoom=nz; msRef.current.pan={x:W/2-sx*nz,y:H/2-sy*nz};
    setZoomDisplay(Math.round(nz*100)); draw();
  },[hlSet]); // eslint-disable-line

  const eventToCanvasPoint=useCallback((clientX,clientY)=>{
    const rect=canvasRef.current.getBoundingClientRect();
    const scaleX=W/Math.max(rect.width,1);
    const scaleY=H/Math.max(rect.height,1);
    return {mx:(clientX-rect.left)*scaleX,my:(clientY-rect.top)*scaleY};
  },[]);

  const handleWheel=useCallback(e=>{
    e.preventDefault();
    const {mx,my}=eventToCanvasPoint(e.clientX,e.clientY);
    const factor=e.deltaY<0?1.18:0.847;
    const ms=msRef.current;
    const nz=Math.min(MAX_ZOOM,Math.max(0.3,ms.zoom*factor));
    ms.pan.x=mx-(mx-ms.pan.x)*(nz/ms.zoom); ms.pan.y=my-(my-ms.pan.y)*(nz/ms.zoom);
    ms.zoom=nz; draw(); setZoomDisplay(Math.round(nz*100));
  },[draw,eventToCanvasPoint]);

  useEffect(()=>{
    const c=canvasRef.current; if(!c) return;
    c.addEventListener("wheel",handleWheel,{passive:false});
    return ()=>c.removeEventListener("wheel",handleWheel);
  },[handleWheel]);

  const hitTest=useCallback((mx,my,hitPx=16)=>{
    const {zoom,pan}=msRef.current;
    const {minX,maxX,minY,maxY}=bounds;
    const spanX=maxX-minX||1, spanY=maxY-minY||1;
    const mapX=(mx-pan.x)/zoom, mapY=(my-pan.y)/zoom;
    const dataX=minX+((mapX-PAD)/(W-PAD*2))*spanX;
    const dataY=minY+((H-PAD-mapY)/(H-PAD*2))*spanY;

    if(hasParcelGeometry && showPropertyOverlay && zoom>=1.35){
      const hitMapRadius=Math.max(hitPx/zoom,6/zoom);
      const hitX=hitMapRadius*(spanX/(W-PAD*2));
      const hitY=hitMapRadius*(spanY/(H-PAD*2));
      for(let i=0;i<mapped.length;i++){
        const item=mapped[i]; const geom=item.geom; const b=geom?.b;
        if(!b) continue;
        if(dataX<b[0]-hitX||dataX>b[2]+hitX||dataY<b[1]-hitY||dataY>b[3]+hitY) continue;
        if(pointInCompactMultiPoly(dataX,dataY,geom)) return item.p;
      }
    }

    const hr=Math.max(hitPx/zoom,hitPx);
    let best=null,bestD=Infinity;
    const step = (hlSet || selectedParcelId) ? 1 : (zoom<0.9?6:zoom<1.3?4:zoom<1.8?2:1);
    for(let i=0;i<mapped.length;i+=step){
      const item=mapped[i];
      const dx=PAD+(item.x-minX)/spanX*(W-PAD*2)-mapX;
      const dy=H-PAD-(item.y-minY)/spanY*(H-PAD*2)-mapY;
      if(Math.abs(dx)>hr||Math.abs(dy)>hr) continue;
      const d=dx*dx+dy*dy; if(d<bestD){bestD=d;best=item.p;}
    }
    return (best&&bestD<hr*hr)?best:null;
  },[mapped,bounds,hlSet,selectedParcelId,hasParcelGeometry,showPropertyOverlay]);

  const handleMouseDown=useCallback(e=>{
    if(e.button!==0) return;
    const ms=msRef.current;
    ms.justDragged=false;
    ms.drag={sx:e.clientX,sy:e.clientY,px:ms.pan.x,py:ms.pan.y};
    if(canvasRef.current) canvasRef.current.style.cursor="grabbing";
  },[]);
  const handleMouseMove=useCallback(e=>{
    const ms=msRef.current;
    if(ms.drag){
      const dx=e.clientX-ms.drag.sx;
      const dy=e.clientY-ms.drag.sy;
      if(Math.abs(dx)+Math.abs(dy)>5) ms.justDragged=true;
      ms.pan.x=ms.drag.px+dx;ms.pan.y=ms.drag.py+dy;draw();setTooltip(null);return;
    }
    const {mx,my}=eventToCanvasPoint(e.clientX,e.clientY);
    const hit=hitTest(mx,my,18);
    if(hit){setTooltip(hit);setTooltipPos({x:Math.min(mx+14,W-285),y:Math.max(my-10,8)});} else setTooltip(null);
  },[draw,eventToCanvasPoint,hitTest]);
  const handleMouseUp=useCallback(()=>{
    msRef.current.drag=null;
    if(canvasRef.current) canvasRef.current.style.cursor="grab";
  },[]);
  const handleClick=useCallback(e=>{
    if(msRef.current.justDragged){ msRef.current.justDragged=false; return; }
    const {mx,my}=eventToCanvasPoint(e.clientX,e.clientY);
    const hit=hitTest(mx,my,18);
    if(hit) setSelectedParcelId(hit.parcelId);
  },[eventToCanvasPoint,hitTest]);

  const stepZoom=useCallback(factor=>{
    const ms=msRef.current;
    const nz=Math.min(MAX_ZOOM,Math.max(0.3,ms.zoom*factor));
    ms.pan.x=W/2-(W/2-ms.pan.x)*(nz/ms.zoom); ms.pan.y=H/2-(H/2-ms.pan.y)*(nz/ms.zoom);
    ms.zoom=nz; draw(); setZoomDisplay(Math.round(nz*100));
  },[draw]);
  const resetView=useCallback(()=>{msRef.current.zoom=1;msRef.current.pan={x:0,y:0};setSelectedParcelId(null);draw();setZoomDisplay(100);},[draw]);

  const LEGEND={
    fmv:[[">$500k","#f59e0b"],["$300-500k","#3b82f6"],["$150-300k","#0d9488"],["<$150k","#64748b"]],
    equity:[["Under (<80%)","#f59e0b"],["Fair (80-120%)","#22c55e"],["Over (>120%)","#dc2626"],["No data","#64748b"]],
    class:[["210 Single Family","#3b82f6"],["220 Two Family","#0d9488"],["230 Three Family","#06b6d4"],["411 Apartment","#a78bfa"],["400 Commercial","#f97316"],["300/330 Vacant","#64748b"]],
    exemption:[["Has Exemption","#f59e0b"],["No Exemption","#475569"]],
    absentee:[["Owner-Occupied","#22c55e"],["Absentee Owner","#f97316"]],
  };
  const SI={background:"var(--bg3)",border:"1px solid var(--border)",color:"var(--white)",borderRadius:8,padding:"7px 11px",fontSize:12,cursor:"pointer"};

  const focusParcel=useCallback((parcelId, zoomTarget)=>{
    const item=mappedById.get(parcelId);
    if(!item) return;
    const {minX,maxX,minY,maxY}=bounds;
    const spanX=maxX-minX||1, spanY=maxY-minY||1;
    const sx=PAD+(item.x-minX)/spanX*(W-PAD*2);
    const sy=H-PAD-(item.y-minY)/spanY*(H-PAD*2);
    const ms=msRef.current;
    let targetZoom=zoomTarget || (item.geom?.b ? 2.8 : 2.2);
    if(item.geom?.b){
      const bw=((item.geom.b[2]-item.geom.b[0])/spanX)*(W-PAD*2);
      const bh=((item.geom.b[3]-item.geom.b[1])/spanY)*(H-PAD*2);
      const fitZoom=Math.min((W*0.42)/Math.max(bw,18),(H*0.42)/Math.max(bh,18));
      if(Number.isFinite(fitZoom)) targetZoom=Math.min(4.8,Math.max(targetZoom,fitZoom));
    }
    const nz=Math.min(MAX_ZOOM,Math.max(ms.zoom,1.2,targetZoom));
    ms.zoom=nz;
    ms.pan={x:W/2-sx*nz,y:H/2-sy*nz};
    setSelectedParcelId(parcelId);
    setZoomDisplay(Math.round(nz*100));
    draw();
  },[bounds,draw,mappedById]);

  const openSelectedRecord=useCallback(()=>{
    if(!selectedParcel || !onDrill) return;
    onDrill({title:`Map selection: ${selectedParcel.address || selectedParcel.parcelId}`,parcels:[selectedParcel]});
  },[selectedParcel,onDrill]);

  const handleDoubleClick=useCallback(e=>{
    e.preventDefault();
    const {mx,my}=eventToCanvasPoint(e.clientX,e.clientY);
    const hit=hitTest(mx,my,18);
    if(hit){
      focusParcel(hit.parcelId, hasParcelGeometry ? 3.1 : 2.4);
      return;
    }
    stepZoom(1.35);
  },[eventToCanvasPoint,hitTest,focusParcel,hasParcelGeometry,stepZoom]);

  const selectedWarnings = selectedParcel ? getParcelWarnings(selectedParcel) : [];
  const legendItems = LEGEND[colorBy] || [];

  return (
    <div className="fi">
      <SectionTitle>Application Map</SectionTitle>
      <Sub>{advanced
        ? (hasParcelGeometry
          ? "Parcel boundaries and centroids for the loaded Albany assessment roll. Use the application map for detailed spatial inspection, parcel selection, and data-quality checks."
          : "Parcel points are plotted from EAST/NRTH coordinates because parcel boundary geometry is not loaded yet.")
        : "Search an address or owner, click a parcel, and use the side panel for details in the unified application map."}</Sub>
      <InfoBox icon={advanced?"DATA":"MAP"} title="How to use the application map" color={advanced?"#0d9488":"#2563eb"}>
        {advanced
          ? <>The unified application map keeps the full parcel attribute palette in one place. <b style={{color:"var(--white)"}}>Scroll to zoom, drag to pan, click to inspect, double-click to center.</b> Parcel boundaries are used when geometry is loaded; otherwise the map falls back to point locations.</>
          : <>Use the application map to move between Fairness, Tax Relief, Ownership, Market Value, and parcel inspection without switching modes. <b style={{color:"var(--white)"}}>Click any parcel to inspect it.</b></>}
      </InfoBox>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10,marginBottom:14}}>
        <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 14px"}}>
          <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Loaded parcels</div>
          <div style={{fontFamily:"var(--fd)",fontSize:24,fontWeight:800,marginTop:6}}>{parcels.length.toLocaleString()}</div>
          <div style={{fontSize:12,color:"var(--gray2)",marginTop:4}}>Parcels available for map selection</div>
        </div>
        <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 14px"}}>
          <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Parcel polygons</div>
          <div style={{fontFamily:"var(--fd)",fontSize:24,fontWeight:800,marginTop:6,color:polygonCount?"var(--teal2)":"var(--gray3)"}}>{polygonCount.toLocaleString()}</div>
          <div style={{fontSize:12,color:"var(--gray2)",marginTop:4}}>{hasParcelGeometry?"Records drawn with parcel boundaries":"No parcel boundary file loaded"}</div>
        </div>
        <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 14px"}}>
          <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Point fallback</div>
          <div style={{fontFamily:"var(--fd)",fontSize:24,fontWeight:800,marginTop:6,color:pointFallbackCount?"var(--amber2)":"var(--gray3)"}}>{pointFallbackCount.toLocaleString()}</div>
          <div style={{fontSize:12,color:"var(--gray2)",marginTop:4}}>Mapped with coordinates but without a polygon match</div>
        </div>
        <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 14px"}}>
          <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Hidden records</div>
          <div style={{fontFamily:"var(--fd)",fontSize:24,fontWeight:800,marginTop:6,color:hiddenCount?"var(--amber2)":"var(--green2)"}}>{hiddenCount.toLocaleString()}</div>
          <div style={{fontSize:12,color:"var(--gray2)",marginTop:4}}>{hiddenCount?"Missing geometry and map coordinates":"All loaded parcels are mappable"}</div>
        </div>
      </div>

      <Card style={{marginBottom:14,padding:0,overflow:"hidden"}}>
        <div style={{padding:"14px 16px",display:"grid",gap:10,borderBottom:"1px solid var(--border)"}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:12,color:"var(--gray)",fontWeight:700}}>{advanced?"Color parcels by":"Resident map view"}</span>
            {advanced
              ? [["fmv","Market Value"],["equity","Assessment Fairness"],["class","Property Class"],["exemption","Exemptions"],["absentee","Absentee Ownership"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setColorBy(k)} style={{background:colorBy===k?"var(--teal)":"var(--card2)",border:`1px solid ${colorBy===k?"var(--teal)":"var(--border)"}`,color:colorBy===k?"white":"var(--gray)",borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{l}</button>
                ))
              : [["fairness","Assessment Fairness"],["tax_relief","Tax Relief"],["ownership","Ownership"],["market","Market Value"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setViewPreset(k)} style={{background:viewPreset===k?"var(--blue)":"var(--card2)",border:`1px solid ${viewPreset===k?"var(--blue)":"var(--border)"}`,color:viewPreset===k?"white":"var(--gray)",borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{l}</button>
                ))}
            <div style={{display:"flex",gap:6,marginLeft:"auto",alignItems:"center"}}>
              <button onClick={()=>stepZoom(1.3)} style={{...SI,width:34,height:34,padding:0,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>+</button>
              <button onClick={()=>stepZoom(1/1.3)} style={{...SI,width:34,height:34,padding:0,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>-</button>
              <button onClick={resetView} style={{...SI,fontSize:11,padding:"7px 11px"}}>Reset view</button>
              <span style={{fontSize:11,color:"var(--gray2)",fontFamily:"var(--fm)",minWidth:42,textAlign:"right"}}>{zoomDisplay}%</span>
            </div>
          </div>

          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:12,color:"var(--gray)",fontWeight:700}}>Layers</span>
            <button
              onClick={()=>setShowParcelPoints(v=>!v)}
              style={{background:showParcelPoints?"rgba(37,99,235,.16)":"var(--card2)",border:`1px solid ${showParcelPoints?"rgba(37,99,235,.35)":"var(--border)"}`,color:showParcelPoints?"var(--blue3)":"var(--gray)",borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}
            >
              Parcel points
            </button>
            <button
              onClick={()=>hasParcelGeometry&&setShowPropertyOverlay(v=>!v)}
              disabled={!hasParcelGeometry}
              style={{background:(hasParcelGeometry&&showPropertyOverlay)?"rgba(13,148,136,.16)":"var(--card2)",border:`1px solid ${(hasParcelGeometry&&showPropertyOverlay)?"rgba(13,148,136,.35)":"var(--border)"}`,color:hasParcelGeometry?(showPropertyOverlay?"var(--teal2)":"var(--gray)"):"var(--gray3)",borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:hasParcelGeometry?"pointer":"not-allowed",opacity:hasParcelGeometry?1:.72}}
            >
              Parcel boundaries
            </button>
            <button
              onClick={()=>setShowStreetLabels(v=>!v)}
              style={{background:showStreetLabels?"rgba(245,158,11,.16)":"var(--card2)",border:`1px solid ${showStreetLabels?"rgba(245,158,11,.35)":"var(--border)"}`,color:showStreetLabels?"var(--amber2)":"var(--gray)",borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}
            >
              Street names
            </button>
            {advanced&&useUploadedStreetCenterlines&&(
              <button
                onClick={()=>setShowStreetNetwork(v=>!v)}
                style={{background:showStreetNetwork?"rgba(148,163,184,.18)":"var(--card2)",border:`1px solid ${showStreetNetwork?"rgba(148,163,184,.35)":"var(--border)"}`,color:showStreetNetwork?"var(--white)":"var(--gray)",borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}
              >
                Street centerlines
              </button>
            )}
          </div>

          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <input
              value={addrSearch}
              onChange={e=>setAddrSearch(e.target.value)}
              placeholder="Search address, owner, or parcel ID"
              style={{flex:1,minWidth:220,background:"var(--bg3)",border:"1px solid var(--border)",color:"var(--white)",borderRadius:8,padding:"10px 12px",fontSize:13,outline:"none"}}
            />
            {addrSearch&&<button onClick={()=>setAddrSearch("")} style={{...SI,fontSize:11,padding:"7px 11px",background:"rgba(220,38,38,.15)",borderColor:"rgba(220,38,38,.30)"}}>Clear</button>}
            <span style={{fontSize:12,color:hlSet?"var(--amber2)":"var(--gray3)",whiteSpace:"nowrap"}}>{hlSet?`${hlSet.size.toLocaleString()} matches`:"No active search"}</span>
          </div>

          {!advanced&&(
            <div style={{fontSize:12,color:"var(--gray2)",lineHeight:1.7}}>
              The application map keeps public-interest views and deeper parcel controls together so you can inspect parcels, ownership, and boundaries without switching modes.
            </div>
          )}
        </div>
      </Card>

      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(320px,360px)",gap:14,alignItems:"start"}}>
        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",borderBottom:"1px solid var(--border)"}}>
            <div>
              <div style={{fontSize:11,color:advanced?"var(--teal2)":"var(--blue3)",fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>{advanced?"Detailed parcel inspection":"Resident-friendly parcel map"}</div>
              <div style={{fontSize:12,color:"var(--gray2)",marginTop:4}}>{hasParcelGeometry?"Parcel boundaries are active where available. Point markers remain for fast navigation and unmatched parcels.":"This map is currently using point locations from the roll because no parcel boundary file is active."}</div>
            </div>
            <div style={{fontSize:12,color:"var(--gray2)"}}>{selectedParcel?`Selected parcel ${selectedParcel.parcelId}`:"No parcel selected"}</div>
          </div>
          <div style={{position:"relative",borderTop:"none"}}>
            <canvas
              ref={canvasRef} width={W} height={H}
              style={{display:"block",width:"100%",height:"auto",cursor:"grab",touchAction:"none",background:"#0d1829"}}
              onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={handleClick}
              onDoubleClick={handleDoubleClick}
            />
            {tooltip&&(
              <div style={{position:"absolute",top:tooltipPos.y,left:tooltipPos.x,background:"rgba(8,15,30,0.96)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"12px 14px",maxWidth:280,pointerEvents:"none",zIndex:10,boxShadow:"0 8px 30px rgba(0,0,0,.5)"}}>
                <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:13}}>{tooltip.address||"Address unavailable"}{parcelAreaSummary(tooltip)?` | ${parcelAreaSummary(tooltip)}`:""}</div>
                <div style={{fontFamily:"var(--fm)",fontSize:10,color:"var(--gray)",marginTop:2}}>{tooltip.parcelId}{tooltip.zip?` | ${tooltip.zip}`:""}</div>
                <div style={{marginTop:8,display:"grid",gap:3}}>
                  <div style={{fontSize:12}}>FMV: <span style={{color:"var(--amber)",fontFamily:"var(--fm)",fontWeight:600}}>{$f(tooltip.fullMarketValue)}</span></div>
                  <div style={{fontSize:12}}>Assessed: <span style={{fontFamily:"var(--fm)"}}>{$f(tooltip.assessedValue)}</span></div>
                  <div style={{fontSize:12}}>Equity: <span style={{color:FC[eqFlagFast(tooltip)],fontFamily:"var(--fm)",fontWeight:600}}>{eqRFast(tooltip)}%</span></div>
                  <div style={{fontSize:12}}>Owner: <span style={{color:"var(--gray2)"}}>{tooltip.owner1||"Unknown"}</span></div>
                  {tooltip.exemptions?.length>0&&<div style={{fontSize:11,color:"var(--amber2)"}}>{tooltip.exemptions.length} exemption{tooltip.exemptions.length>1?"s":""}</div>}
                  {isAbsenteeFast(tooltip)&&<div style={{fontSize:11,color:"#f97316",lineHeight:1.45}}>Absentee: {getAbsenteeReasonFast(tooltip)}</div>}
                </div>
                <div style={{fontSize:10,color:"var(--gray3)",marginTop:7}}>Click to inspect. Double-click to center.</div>
              </div>
            )}
            <div style={{position:"absolute",bottom:10,left:12,right:12,display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",pointerEvents:"none"}}>
              <div style={{background:"rgba(8,15,30,0.88)",border:"1px solid rgba(255,255,255,0.10)",borderRadius:10,padding:"8px 10px",fontSize:11,color:"#d5dde8"}}>
                {hasParcelGeometry
                  ? `${mapped.length.toLocaleString()} parcels mapped | ${polygonCount.toLocaleString()} polygons | ${pointFallbackCount.toLocaleString()} point fallback`
                  : `${mapped.length.toLocaleString()} parcels mapped from coordinates | ${hiddenCount.toLocaleString()} still missing map coordinates`}
              </div>
              <div style={{background:"rgba(8,15,30,0.88)",border:"1px solid rgba(255,255,255,0.10)",borderRadius:10,padding:"8px 10px",fontSize:11,color:"#d5dde8"}}>
                Scroll to zoom | Drag to pan | Click to inspect | Double-click to center
              </div>
            </div>
          </div>
        </Card>

        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid var(--border)"}}>
            <div style={{fontSize:11,color:advanced?"var(--teal2)":"var(--blue3)",fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>{selectedParcel?"Selected parcel":"Map inspector"}</div>
            <div style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:800,marginTop:6}}>{selectedParcel?(selectedParcel.address||selectedParcel.parcelId):(addrSearch?"Search results":"Use the map")}</div>
            <div style={{fontSize:12,color:"var(--gray2)",marginTop:6,lineHeight:1.7}}>{selectedParcel
              ? "Parcel details are pinned here so you can pan and zoom without losing context."
              : (addrSearch
                ? "Search results stay in this panel so you can jump between matching parcels without hunting on the map."
                : "Search an address or owner, or click directly on a parcel boundary or point. The map favors parcel boundaries when geometry is available and falls back to point locations otherwise.")}</div>
          </div>
          <div style={{padding:"14px 16px",display:"grid",gap:14}}>
            {selectedParcel ? <>
              <div>
                <div style={{fontSize:12,color:"var(--gray2)"}}>{parcelAreaSummary(selectedParcel)||selectedParcel.zip||"Albany"} | Parcel {selectedParcel.parcelId}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
                  <Badge color="#6366f1">{propClassLabel(selectedParcel)}</Badge>
                  <Badge color={selectedItem?.geom?"#0d9488":"#f59e0b"}>{selectedItem?.geom?"Parcel boundary loaded":"Point location only"}</Badge>
                  <Badge color={FC[eqFlagFast(selectedParcel)]}>{FL[eqFlagFast(selectedParcel)]}</Badge>
                  {isAbsenteeFast(selectedParcel)&&<><Badge color="#f97316">Absentee</Badge><AbsenteeExplain parcel={selectedParcel} compact /></>}
                  {selectedParcel.exemptions.length>0&&<Badge color="#f59e0b">{selectedParcel.exemptions.length} exemption{selectedParcel.exemptions.length===1?"":"s"}</Badge>}
                </div>
              </div>

              <div className="metric-grid-2" style={{display:"grid",gap:10}}>
                <div style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Full market value</div>
                  <div style={{fontFamily:"var(--fd)",fontSize:21,fontWeight:800,marginTop:5}}>{$f(selectedParcel.fullMarketValue)}</div>
                </div>
                <div style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Assessed value</div>
                  <div style={{fontFamily:"var(--fd)",fontSize:21,fontWeight:800,marginTop:5}}>{$f(selectedParcel.assessedValue)}</div>
                </div>
                <div style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Land value</div>
                  <div style={{fontFamily:"var(--fd)",fontSize:21,fontWeight:800,marginTop:5}}>{$f(selectedParcel.landValue)}</div>
                </div>
                <div style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Equity ratio</div>
                  <div style={{fontFamily:"var(--fd)",fontSize:21,fontWeight:800,marginTop:5,color:FC[eqFlagFast(selectedParcel)]}}>{eqRFast(selectedParcel)}%</div>
                </div>
              </div>

              <div style={{display:"grid",gap:10}}>
                <div>
                  <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Owner</div>
                  <div style={{fontSize:14,fontWeight:700,marginTop:4}}>{selectedParcel.owner1||"Unknown owner"}{selectedParcel.owner2?` and ${selectedParcel.owner2}`:""}</div>
                </div>
                <div>
                  <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Mailing address</div>
                  <div style={{fontSize:13,color:"var(--gray2)",marginTop:4,lineHeight:1.6}}>{selectedParcel.mailAddress||"Not available"}</div>
                </div>
                <div>
                  <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Exemptions</div>
                  <div style={{fontSize:13,color:"var(--gray2)",marginTop:4,lineHeight:1.6}}>{selectedParcel.exemptions.length?selectedParcel.exemptions.map(e=>e.name).join(", "):"None on record"}</div>
                </div>
              </div>

              {selectedWarnings.length>0&&(
                <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.22)",borderRadius:10,padding:"12px 14px"}}>
                  <div style={{fontSize:11,color:"var(--amber2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Data warnings</div>
                  <div style={{display:"grid",gap:6,marginTop:8}}>
                    {selectedWarnings.slice(0,4).map(w=><div key={w} style={{fontSize:12,color:"var(--gray2)"}}>{w.replace(/_/g," ")}</div>)}
                    {selectedWarnings.length>4&&<div style={{fontSize:11,color:"var(--gray3)"}}>{selectedWarnings.length-4} more warning{selectedWarnings.length-4===1?"":"s"}</div>}
                  </div>
                </div>
              )}

              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button onClick={()=>focusParcel(selectedParcel.parcelId)} style={{background:advanced?"var(--teal)":"var(--blue)",color:"white",border:"none",borderRadius:9,padding:"9px 13px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Center on parcel</button>
                <button onClick={openSelectedRecord} style={{background:"var(--card2)",border:"1px solid var(--border)",color:"var(--gray)",borderRadius:9,padding:"9px 13px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Open full record</button>
                <button onClick={()=>setSelectedParcelId(null)} style={{background:"rgba(220,38,38,.12)",border:"1px solid rgba(220,38,38,.22)",color:"var(--red2)",borderRadius:9,padding:"9px 13px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Clear selection</button>
              </div>
            </> : addrSearch ? <>
              <div style={{display:"grid",gap:8}}>
                {searchMatches.length>0 ? searchMatches.map(p=>(
                  <button key={p.parcelId} onClick={()=>focusParcel(p.parcelId)} style={{textAlign:"left",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 14px",cursor:"pointer"}}>
                    <div style={{fontSize:14,fontWeight:700}}>{p.address||"Address unavailable"}</div>
                    <div style={{fontSize:11,color:"var(--gray2)",marginTop:3}}>{p.owner1||"Unknown owner"} | Parcel {p.parcelId}</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
                      <Badge color={FC[eqFlagFast(p)]} small>{eqRFast(p)}%</Badge>
                      {p.exemptions.length>0&&<Badge color="#f59e0b" small>{p.exemptions.length} exemption{p.exemptions.length===1?"":"s"}</Badge>}
                      {isAbsenteeFast(p)&&<><Badge color="#f97316" small>Absentee</Badge><AbsenteeExplain parcel={p} compact /></>}
                    </div>
                  </button>
                )) : <div style={{fontSize:13,color:"var(--gray2)",lineHeight:1.7}}>No mapped parcels match that search. If you expected a result, check whether the full Albany roll finished loading and whether the parcel is missing geometry or coordinates.</div>}
              </div>
              {hlSet&&hlSet.size>searchMatches.length&&<div style={{fontSize:11,color:"var(--gray3)"}}>Showing the first {searchMatches.length} mapped matches out of {hlSet.size.toLocaleString()} total.</div>}
            </> : <>
              <div style={{display:"grid",gap:10}}>
                <div style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 14px"}}>
                  <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Start here</div>
                  <div style={{fontSize:13,color:"var(--gray2)",lineHeight:1.7,marginTop:6}}>Search an address or owner name, or click directly on the map. The inspector will keep your selection pinned while you continue to pan and zoom.</div>
                </div>
                <div style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 14px"}}>
                  <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Current coloring</div>
                  <div style={{display:"grid",gap:7,marginTop:8}}>
                    {legendItems.map(([label,color])=>(
                      <div key={label} style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:10,height:10,borderRadius:"50%",background:color,border:"1px solid rgba(255,255,255,.18)",flexShrink:0}} />
                        <span style={{fontSize:12,color:"var(--gray2)"}}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 14px"}}>
                  <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Map coverage</div>
                  <div style={{fontSize:13,color:"var(--gray2)",lineHeight:1.7,marginTop:6}}>{polygonCount.toLocaleString()} parcels have polygon boundaries, {pointFallbackCount.toLocaleString()} are shown as point fallback, and {hiddenCount.toLocaleString()} cannot be mapped from the currently loaded files.</div>
                </div>
              </div>
            </>}
          </div>
        </Card>
      </div>
    </div>
  );
};
const MapView = ({ownerPortfolioIndex=null, ...props}) => {
  const getOwnerPortfolioGroup = useCallback(parcel=>{
    if(!parcel || !ownerPortfolioIndex) return null;
    const ownerKey = normalizeOwnerPortfolioKey(parcel.owner1 || "");
    return ownerKey ? (ownerPortfolioIndex.get(ownerKey) || null) : null;
  },[ownerPortfolioIndex]);
  return (
    <LeafletMapView
      {...props}
      utils={{
        normalizeParcelId,
        FC,
        FL,
        eqFlagFast,
        eqRFast,
        propClassLabel,
        isAbsenteeFast,
        getAbsenteeModelFast,
        getParcelWarnings,
        inventoryStyle,
        inventoryYearBuilt,
        inventorySqft,
        inventoryBedrooms,
        inventoryBathText,
        hasInventoryProfile,
        getOwnerPortfolioGroup,
        $f,
        SectionTitle,
        Sub,
        Card,
        Badge,
      }}
    />
  );
};
/* 8. DATA QUALITY */
const DataQuality = ({parcels, meta, onDrill}) => {
  const [showAllInconsist,setShowAllInconsist]=useState(false);
  const [showAllNoCoords,setShowAllNoCoords]=useState(false);
  const [showAllWarnings,setShowAllWarnings]=useState(false);
  const DQ_LIMIT=50;
  const warningLabels={
    missing_county_reference_join:"Missing county parcel join",
    missing_geometry_join:"Missing geometry match",
    missing_full_market_value:"Missing full market value",
    missing_parcel_id:"Missing parcel ID",
    missing_swis_code:"Missing SWIS code",
    assessed_below_land_value:"Assessed value below land value",
    assessed_above_full_market_value:"Assessed above full market value",
    missing_mailing_address:"Missing mailing address",
  };
  const fields=[
    {key:"address",label:"Address"},{key:"zip",label:"ZIP Code"},{key:"owner1",label:"Owner Name"},
    {key:"propClass",label:"Property Class"},{key:"fullMarketValue",label:"Full Market Value"},
    {key:"assessedValue",label:"Assessed Value"},{key:"landValue",label:"Land Value"},
    {key:"pinSbl",label:"County PIN/SBL"},{key:"acres",label:"Lot Acres"},
    {key:"waterType",label:"Water Type"},{key:"sewerType",label:"Sewer Type"},
    {key:"frontage",label:"Frontage"},{key:"depth",label:"Depth"},{key:"deedYear",label:"Deed Year"},
    {key:"eastCoord",label:"E Coordinate"},{key:"mailAddress",label:"Mailing Address"},
  ];
  const completeness=useMemo(()=>fields.map(f=>{
    const filled=parcels.filter(p=>{const v=p[f.key];return v!=null&&v!==""&&v!==0&&v!=="UNKNOWN";}).length;
    return {...f,filled,pct:Math.round(filled/Math.max(parcels.length,1)*100)};
  }),[parcels]);
  const warningSummary=useMemo(()=>{
    const counts=new Map();
    for(const p of parcels){
      for(const warning of getParcelWarnings(p)) counts.set(warning,(counts.get(warning)||0)+1);
    }
    return [...counts.entries()].map(([code,count])=>({code,label:warningLabels[code]||code.replace(/_/g," "),count})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
  },[parcels]);
  const parcelsWithWarnings=useMemo(()=>parcels.filter(p=>getParcelWarnings(p).length>0),[parcels]);
  const countyJoin=meta?.countyReference||null;
  const geometryJoin=meta?.geometryReference||null;

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
      const avg=vals.reduce((a,b)=>a+b,0)/vals.length;
      const std=Math.sqrt(vals.reduce((a,v)=>a+(v-avg)**2,0)/vals.length);
      sameCls.forEach(p=>{if(Math.abs(p.fullMarketValue-avg)>std*1.5&&std>10000)flags.push({...p,streetAvg:Math.round(avg),deviation:Math.round(p.fullMarketValue-avg)});});
    });
    return flags;
  },[parcels]);

  const mappingGaps=useMemo(()=>parcels.filter(p=>hasParcelWarning(p,"missing_geometry_join")||!p.eastCoord||p.eastCoord===0),[parcels]);
  const overall=Math.round(completeness.reduce((s,f)=>s+f.pct,0)/completeness.length);

  return (
    <div className="fi">
      <SectionTitle>Data Quality Scorecard</SectionTitle>
      <Sub>Field completeness, county joins, geometry coverage, and parcel-level warnings</Sub>
      <InfoBox icon="DQ" title="What this scorecard now checks" color="#3b82f6">
        This panel no longer stops at blank-field percentages. It also tracks whether each parcel joins to the Albany County parcel reference, whether it matches the parcel geometry layer, and whether the record carries structural warning flags such as impossible value relationships or missing market value. That makes it much easier to tell the difference between a true policy signal and a thin-data artifact.
      </InfoBox>
      <div className="summary-grid" style={{marginBottom:18}}>
        <Card>
          <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Overall Completeness</div>
          <div style={{fontFamily:"var(--fd)",fontSize:30,fontWeight:800,marginTop:6,color:overall>90?"var(--green2)":overall>75?"var(--amber)":"var(--red2)"}}>{overall}%</div>
          <div style={{fontSize:12,color:"var(--gray2)",marginTop:4}}>Average fill rate across the key parcel fields used by the app</div>
        </Card>
        <Card>
          <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>County Join</div>
          <div style={{fontFamily:"var(--fd)",fontSize:30,fontWeight:800,marginTop:6,color:countyJoin?"var(--blue3)":"var(--gray2)"}}>{countyJoin?`${countyJoin.joinRatePct}%`:"N/A"}</div>
          <div style={{fontSize:12,color:"var(--gray2)",marginTop:4}}>{countyJoin?`${nf(countyJoin.matched)} parcels linked to county reference rows`:"County parcel reference not loaded into this dataset"}</div>
        </Card>
        <Card>
          <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Geometry Match</div>
          <div style={{fontFamily:"var(--fd)",fontSize:30,fontWeight:800,marginTop:6,color:geometryJoin?"var(--teal2)":"var(--gray2)"}}>{geometryJoin?`${geometryJoin.joinRatePct}%`:"N/A"}</div>
          <div style={{fontSize:12,color:"var(--gray2)",marginTop:4}}>{geometryJoin?`${nf(geometryJoin.matched)} parcels matched to map geometry`:"Geometry join summary not available in this dataset"}</div>
        </Card>
        <Card>
          <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Warning Flags</div>
          <div style={{fontFamily:"var(--fd)",fontSize:30,fontWeight:800,marginTop:6,color:parcelsWithWarnings.length?"var(--red2)":"var(--green2)"}}>{nf(parcelsWithWarnings.length)}</div>
          <div style={{fontSize:12,color:"var(--gray2)",marginTop:4}}>Parcels carrying at least one join, geometry, or value warning</div>
        </Card>
      </div>
      <div className="cols-2" style={{display:"grid",gap:18}}>
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
          <Card>
            <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:12}}>Prepared Warning Flags</div>
            <div style={{fontSize:11,color:"var(--gray2)",marginBottom:12}}>These flags are carried with the prepared dataset and then rechecked at runtime. They highlight missing county joins, geometry gaps, and structurally suspect value records.</div>
            {warningSummary.length>0 ? <div>
              {warningSummary.slice(0,showAllWarnings?warningSummary.length:DQ_LIMIT).map(item=>(
                <div key={item.code} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:"var(--card)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 10px",marginBottom:7}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600}}>{item.label}</div>
                    <div style={{fontSize:10,color:"var(--gray3)",marginTop:2}}>{item.code}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Badge color={item.code.includes("missing")?"#f59e0b":"#dc2626"} small>{nf(item.count)}</Badge>
                    {onDrill&&<button onClick={()=>onDrill({title:`${item.label} (${item.count} parcels)`,parcels:parcels.filter(p=>hasParcelWarning(p,item.code))})} style={{background:"rgba(37,99,235,.1)",border:"1px solid rgba(37,99,235,.25)",color:"var(--blue3)",borderRadius:4,padding:"3px 7px",fontSize:10,cursor:"pointer"}}>View</button>}
                  </div>
                </div>
              ))}
              {warningSummary.length>DQ_LIMIT&&<button onClick={()=>setShowAllWarnings(x=>!x)} style={{background:"var(--card2)",border:"1px solid var(--border)",color:"var(--gray2)",borderRadius:8,padding:"9px",fontSize:12,cursor:"pointer",width:"100%",marginTop:4}}>{showAllWarnings?`Show top ${DQ_LIMIT}`:`Show all ${warningSummary.length.toLocaleString()} warning types`}</button>}
            </div> : <div style={{textAlign:"center",padding:20,color:"var(--gray2)",fontSize:12}}>No parcel-level warning flags in the current dataset</div>}
          </Card>
        </div>
        <div>
          <Card style={{marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:12}}>Assessment Consistency Flags</div>
            <div style={{fontSize:11,color:"var(--gray2)",marginBottom:12}}>Properties on the same street, same class, whose FMV deviates more than 1.5 standard deviations from street peers. These may be genuine outliers, data entry issues, or reassessment lags worth investigating.</div>
            {inconsistent.length>0?<div>
              {inconsistent.slice(0,showAllInconsist?inconsistent.length:DQ_LIMIT).map(p=>(
                <div key={p.parcelId} style={{background:"rgba(220,38,38,.07)",border:"1px solid rgba(220,38,38,.2)",borderRadius:9,padding:"11px 14px",marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}><AddrLink address={p.address} zip={p.zip} neighborhood={p.neighborhood} parcelId={p.parcelId}>{p.address}</AddrLink></div>
                      <div style={{fontSize:11,color:"var(--gray2)",marginTop:2}}>{p.propClassDesc} | Parcel {p.parcelId}</div>
                      <div style={{fontSize:11,marginTop:6}}>Street avg: <span style={{fontFamily:"var(--fm)",color:"var(--gray)"}}>{$f(p.streetAvg)}</span> | Deviation: <span style={{fontFamily:"var(--fm)",color:p.deviation>0?"var(--red2)":"var(--amber)"}}>{p.deviation>0?"+":""}{$f(p.deviation)}</span></div>
                    </div>
                    <div style={{textAlign:"right"}}><div style={{fontFamily:"var(--fm)",fontSize:14,color:"var(--amber)"}}>{$f(p.fullMarketValue)}</div></div>
                  </div>
                </div>
              ))}
              {inconsistent.length>DQ_LIMIT&&<button onClick={()=>setShowAllInconsist(x=>!x)} style={{background:"var(--card2)",border:"1px solid var(--border)",color:"var(--gray2)",borderRadius:8,padding:"9px",fontSize:12,cursor:"pointer",width:"100%",marginTop:4}}>{showAllInconsist?`Show top ${DQ_LIMIT}`:`Show all ${inconsistent.length.toLocaleString()} consistency flags`}</button>}
            </div>:<div style={{textAlign:"center",padding:30,color:"var(--gray2)"}}>
              <div style={{fontSize:18,fontWeight:700,marginBottom:8}}>OK</div>
              <div style={{fontSize:12}}>No major consistency issues in the current dataset.</div>
            </div>}
          </Card>
          <Card>
            <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:12}}>Mapping Gaps</div>
            <div style={{fontSize:11,color:"var(--gray2)",marginBottom:10}}>These parcels either do not match the parcel geometry layer or still lack the raw EAST/NRTH coordinates needed for point fallback mapping.</div>
            {mappingGaps.length>0?<div>
              {mappingGaps.slice(0,showAllNoCoords?mappingGaps.length:DQ_LIMIT).map(p=>(
                <div key={p.parcelId} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:7,padding:"8px 12px",marginBottom:6,display:"flex",justifyContent:"space-between",gap:10}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600}}><AddrLink address={p.address} zip={p.zip} neighborhood={p.neighborhood} parcelId={p.parcelId}>{p.address}</AddrLink></div>
                    <div style={{fontSize:10,color:"var(--gray2)"}}>{p.parcelId}</div>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
                    {hasParcelWarning(p,"missing_geometry_join")&&<Badge color="#64748b" small>No geometry</Badge>}
                    {(!p.eastCoord||p.eastCoord===0)&&<Badge color="#94a3b8" small>No coords</Badge>}
                  </div>
                </div>
              ))}
              {mappingGaps.length>DQ_LIMIT&&<button onClick={()=>setShowAllNoCoords(x=>!x)} style={{background:"var(--card2)",border:"1px solid var(--border)",color:"var(--gray2)",borderRadius:8,padding:"9px",fontSize:12,cursor:"pointer",width:"100%",marginTop:4}}>{showAllNoCoords?`Show top ${DQ_LIMIT}`:`Show all ${mappingGaps.length.toLocaleString()} mapping gaps`}</button>}
            </div>:<div style={{textAlign:"center",padding:20,color:"var(--gray2)",fontSize:12}}>Every parcel in the current dataset has geometry or coordinate fallback</div>}
          </Card>
        </div>
      </div>
    </div>
  );
};

const Compare = ({parcels,compareList,onRemove,onAdd}) => {
  const [pick,setPick]=useState("");
  const addBySearch=()=>{
    const p=findBestAddressMatch(parcels, pick);
    if(p && !compareList.some(x=>x.parcelId===p.parcelId) && compareList.length<4){
      if(typeof onAdd==="function") onAdd(null,p);
      setPick("");
    }
  };
  const fields=[
    {label:"Address",v:p=>p.address},{label:"Parcel ID",v:p=>p.parcelId,mono:true},
    {label:"Owner",v:p=>p.owner1},{label:"Class",v:p=>propClassLabel(p)},
    {label:"Neighborhood",v:p=>p.neighborhood||"-"},
    {label:"Building Style",v:p=>inventoryStyle(p)||"-"},
    {label:"Year Built",v:p=>inventoryYearBuilt(p)||"-",mono:true},
    {label:"Living Area",v:p=>inventorySqft(p)!=null?`${inventorySqft(p).toLocaleString()} sq ft`:"-",num:p=>inventorySqft(p)||0},
    {label:"Bedrooms",v:p=>inventoryBedrooms(p)!=null?inventoryBedrooms(p):"-",mono:true},
    {label:"Baths",v:p=>inventoryBathText(p),mono:true},
    {label:"Full Market Value",v:p=>$f(p.fullMarketValue),hi:true,num:p=>p.fullMarketValue},
    {label:"Assessed Value",v:p=>$f(p.assessedValue),num:p=>p.assessedValue},
    {label:"Land Value",v:p=>$f(p.landValue),num:p=>p.landValue},
    {label:"Equity Ratio",v:p=>eqRFast(p)+"%",hi:true,num:p=>parseFloat(eqRFast(p))||0},
    {label:"County Taxable",v:p=>$f(p.countyTaxable)},{label:"City Taxable",v:p=>$f(p.cityTaxable)},{label:"School Taxable",v:p=>$f(p.schoolTaxable)},
    {label:"Lot Size",v:p=>p.frontage?`${p.frontage}x${p.depth} ft`:"-"},
    {label:"Gentrifi. Index",v:p=>gentriIdx(p)+"%"},{label:"Absentee?",v:p=>isAbsenteeFast(p)?"Yes":"No"},
    {label:"Exemptions",v:p=>p.exemptions.map(e=>e.name).join(", ")||"None"},
    {label:"Last Sale Year",v:p=>p.deedYear||"-"},
  ];
  const SI={background:"var(--bg3)",border:"1px solid var(--border)",color:"var(--white)",borderRadius:8,padding:"7px 11px",fontSize:12,fontFamily:"var(--fb)"};
  return (
    <div className="fi">
      <SectionTitle>Side-by-Side Comparison</SectionTitle>
      <Sub>Compare up to 4 parcels. Add via Browse tab or search below. Highest values highlighted in amber.</Sub>
      <InfoBox icon="Compare" title="How to Use the Comparison Tool" color="#3b82f6">
        Select up to four properties to view every key data field side-by-side in a single table. This is useful for verifying whether similar properties on the same street have consistent assessments, evaluating investment options against each other, or preparing for an assessment grievance by documenting disparities between comparable parcels. The <b style={{color:"var(--amber2)"}}>amber highlight</b> shows whichever property has the highest value for each numeric field - helping you quickly spot outliers. Add properties from the Browse tab using the "+ Compare" button on any card, or search directly here.
      </InfoBox>
      <div style={{display:"flex",gap:8,marginBottom:18}}>
        <AddressAutocompleteInput parcels={parcels} value={pick} onChange={setPick} onSelectParcel={p=>{if(!compareList.some(x=>x.parcelId===p.parcelId) && compareList.length<4){if(typeof onAdd==="function") onAdd(null,p);setPick("");}else{setPick(p.address);}}} onEnter={addBySearch} placeholder="Search address or parcel ID to add..." inputStyle={{...SI,width:"100%",cursor:"text"}} wrapperStyle={{flex:1}}/>
        <button onClick={addBySearch} style={{background:"var(--blue)",color:"white",border:"none",borderRadius:8,padding:"7px 16px",cursor:"pointer",fontSize:12,fontWeight:600}}>+ Add</button>
      </div>
      {compareList.length===0?<div style={{textAlign:"center",padding:60,color:"var(--gray2)"}}>
        <div style={{fontSize:40,marginBottom:12}}>Compare</div>
        Search above or go to Browse, then click "+ Compare" on any property card to begin comparing.
      </div>:<div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>
            <th style={{padding:"10px 14px",textAlign:"left",color:"var(--gray2)",fontSize:11,textTransform:"uppercase",letterSpacing:.5,width:160,background:"var(--bg2)"}}>Field</th>
            {compareList.map(p=>(
              <th key={p.parcelId} style={{padding:"10px 14px",textAlign:"left",borderLeft:"1px solid var(--border)",background:"var(--bg2)"}}>
                <div style={{fontFamily:"var(--fd)",fontWeight:700,fontSize:13}}><AddrLink address={p.address} zip={p.zip} neighborhood={p.neighborhood} parcelId={p.parcelId}>{p.address}</AddrLink></div>
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
                return <td key={p.parcelId} style={{padding:"9px 14px",borderLeft:"1px solid var(--border)",fontFamily:f.mono?"var(--fm)":"inherit",color:isMax?"var(--amber)":"var(--white)",fontWeight:isMax?600:400}}>
                  {f.label==="Address" ? <AddrLink address={p.address} zip={p.zip} neighborhood={p.neighborhood} parcelId={p.parcelId} stopPropagation={false}>{val}</AddrLink> : val}
                </td>;
              })}
            </tr>
          ))}</tbody>
        </table>
      </div>}
    </div>
  );
};

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ 10. HOMEBUYER GUIDE ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
const HomebuyerGuide = ({parcels, myHome}) => {
  const [address,setAddress]=useState("");
  const [found,setFound]=useState(null);
  const lookup=()=>{const p=findBestAddressMatch(parcels, address);setFound(p||null);};

  // Auto-load myHome if available
  const loadMyHome=()=>{
    if(!myHome)return;
    setAddress(myHome.address.split(" ").slice(0,3).join(" "));
    setFound(myHome.parcel||null);
  };
  const terms=[
    {term:"Full Market Value (FMV)",def:"The assessor's estimate of what the property would sell for on the open market today. This is NOT necessarily what you'd pay for it - actual sale prices can differ."},
    {term:"Assessed Value",def:"The value the city officially uses to calculate your property tax bill. In New York, this is typically a percentage of the Full Market Value - set by the municipality's equalization rate."},
    {term:"Equity Ratio",def:"Assessed Value / Full Market Value x 100. A fair ratio is roughly 80-120%. If your ratio is too high, you may be paying more than your fair share of taxes and have grounds for an assessment grievance."},
    {term:"Land Value",def:"The assessed value of the land only - not counting the building. High land value relative to total value means the location itself is what's valuable. Useful for spotting infill development potential."},
    {term:"Homestead Parcel",def:"A property used as a primary residence. Homestead parcels often qualify for more exemptions than non-homestead (investment, rental, commercial) properties."},
    {term:"STAR Exemption (41854)",def:"School Tax Assessment Relief - New York's Basic STAR reduces the school-taxable value by up to $30,000 for owner-occupied homes. Enhanced STAR is available for seniors and offers even greater relief. Apply at NYS Tax Department if you do not see it on your record."},
    {term:"Senior Citizen Exemption (41801)",def:"If you're 65 or older and meet income limits, you may qualify for a reduction of 10-50% on your assessed value. This applies to county, city, AND school taxes."},
    {term:"Veteran Exemption (41834)",def:"Veterans and certain family members can receive a reduction in assessed value based on military service. Must be applied for at the city assessor's office."},
    {term:"CHG LVL CT (41001)",def:"Challenge Level Court - this indicates the owner successfully challenged their assessment through the legal system and won a reduction. The exemption reflects the court-ordered reduction."},
    {term:"SWIS Code",def:"A 6-digit code identifying the municipality (Albany = 010100). Used by the state to categorize and track assessment rolls across New York."},
    {term:"Frontage x Depth",def:"The physical dimensions of the lot. Frontage is how wide the lot is at the street. Depth is how far back it goes. Multiply them together to get approximate square footage."},
    {term:"Deed Book / Page",def:"The legal reference to where the last recorded sale of the property is documented at the county clerk's office. The year embedded in the deed number often tells you when the property last changed hands."},
    {term:"County / City / School Taxable",def:"Three separate taxable values - one for each taxing jurisdiction. They can differ because some exemptions only apply to specific jurisdictions (for example, STAR only reduces school taxable value)."},
    {term:"Absentee Owner",def:"A scored signal for likely off-site ownership. The app combines mailing-address differences with stronger evidence such as LLC/trust ownership, repeated ownership across multiple Albany parcels, and owner-occupancy exemptions like STAR before flagging a parcel."},
  ];
  const SI={background:"var(--bg3)",border:"1px solid var(--border)",color:"var(--white)",borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"var(--fb)"};
  return (
    <div className="fi">
      <SectionTitle>First-Time Homebuyer Guide</SectionTitle>
      <Sub>Plain-English explanations of every field in the Albany assessment roll</Sub>
      <InfoBox icon="Guide" title="Who Is This Guide For?" color="#f59e0b">
        The Albany assessment roll is a public document - but it was designed for government administrators, not homeowners. This guide exists to bridge that gap. Whether you just bought your first home, are thinking about buying, or have lived in Albany for decades and never quite understood your tax bill, this tab explains every field, every number, and every code in language that makes sense. Look up any address to get a plain-English walkthrough of that specific property's record, or scroll down for the complete glossary.
      </InfoBox>
      <Card style={{marginBottom:18,background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.2)"}}>
        <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:10,color:"var(--amber2)"}}>Look Up Any Address - We'll Explain Everything in Plain English</div>
        <MyHomeBanner myHome={myHome} onUse={loadMyHome} label="Look Up My Home"/>
        <div style={{display:"flex",gap:10}}>
          <AddressAutocompleteInput parcels={parcels} value={address} onChange={setAddress} onSelectParcel={p=>{setAddress(p.address);setFound(p);}} onEnter={lookup} placeholder="Enter an address or parcel ID..." inputStyle={{...SI,width:"100%",cursor:"text"}} wrapperStyle={{flex:1}}/>
          <button onClick={lookup} style={{background:"var(--blue)",color:"white",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,fontSize:13}}>Look Up</button>
        </div>
        {found&&<div className="fi" style={{marginTop:16}}>
          <div style={{fontFamily:"var(--fd)",fontSize:16,fontWeight:700,marginBottom:14}}><AddrLink address={found.address} zip={found.zip} neighborhood={found.neighborhood} parcelId={found.parcelId}>{found.address}</AddrLink> - Here's What It All Means</div>
          {[
            ["What is the Full Market Value?",`The city assessor estimates this property is worth ${$f(found.fullMarketValue)} on the open market. This is their professional opinion of what a willing buyer and seller would agree on today.`],
            ["What is the Assessed Value?",`The city uses ${$f(found.assessedValue)} to calculate the property tax bill - not the full market value. Albany uses a specific percentage of market value for assessments.`],
            ["Is this assessment fair?",`The equity ratio is ${eqRFast(found)}%. ${eqFlagFast(found)==="fair"?"This falls in the fair range (80-120%) and the assessment appears proportional to market value.":eqFlagFast(found)==="under"?"Warning: this is below 80%, meaning the property may be under-assessed. The owner pays taxes on less than the standard share of market value.":"Alert: this is above 120%, meaning the owner may be paying more than their fair share. They may have grounds to file an assessment grievance."}`],
            ["Who owns this property?",`${found.owner1}${found.owner2?` and ${found.owner2}`:""}. ${getAbsenteeLabelFast(found)}: ${getAbsenteeReasonFast(found)}.`],
            ["What tax exemptions are active?",found.exemptions.length>0?`This property has ${found.exemptions.length} active exemption(s): ${found.exemptions.map(e=>`${e.name} (code ${e.code})`).join(", ")}. These reduce the taxable value, lowering the annual tax bill.`:`No active exemptions were found on this record. If this is a homestead, the owner may qualify for STAR (up to $30,000 off school taxes) and should check with the city assessor.`],
            ["How big is the lot?",found.frontage&&found.depth?`The lot is ${found.frontage} feet wide (frontage) by ${found.depth} feet deep - approximately ${nf(found.frontage*found.depth)} square feet total.`:"Lot dimensions are not available in this record."],
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
      <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--fd)",marginBottom:12}}>Assessment Roll Glossary - Every Term Explained</div>
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

/* ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â
   ROOT APP
ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â */
export default function App() {
  const SUPPORTED_UPLOAD_EXTENSIONS = [".csv", ".txt", ".json", ".geojson"];
  const AUTOLOAD_FILES = {
    parcels:["albany-roll.json","Albany 2025 Final Roll conv.txt","Albany_County_Parcels_2024_-1728787929616575091.csv","albany_parcels.json"],
    geometry:["albany-parcel-geometry.json"],
    streets:["albany_street_centerlines.geojson"],
    neighborhoods:["albany.geojson"],
    associations:["__na_query.json"],
  };
  const APP_UI_VERSION = "2026-03-08-leaflet-transition";
  const [parcels,setParcels]=useState(()=>preprocessParcels(SAMPLE));
  const [meta,setMeta]=useState({});
  const [parcelGeometry,setParcelGeometry]=useState(null);
  const [streetCenterlines,setStreetCenterlines]=useState(null);
  const [neighborhoodBoundaries,setNeighborhoodBoundaries]=useState(null);
  const [neighborhoodAssociations,setNeighborhoodAssociations]=useState(null);
  const [dataSource,setDataSource]=useState("sample");
  const [autoloadState,setAutoloadState]=useState({phase:"idle",entries:[]});
  const mode="app";
  const initialUrlSnapshotRef = useRef(parseComparableSnapshotSearch(typeof window!=="undefined" ? window.location.search : ""));
  const requestedUrlTab = initialUrlSnapshotRef.current?.tab || "";
  const [tab,setTab]=useState(()=>{
    if(APP_TAB_IDS.has(requestedUrlTab)) return requestedUrlTab;
    try{
      const savedVersion = localStorage.getItem("albany_app_ui_version");
      if(savedVersion!==APP_UI_VERSION) return "home";
      return localStorage.getItem("albany_app_tab") || "home";
    }catch{
      return "home";
    }
  });
  const [compareList,setCompareList]=useState([]);
  const [mobileNavOpen,setMobileNavOpen]=useState(false);
  const [pendingScrollTab,setPendingScrollTab]=useState("");
  const contentTopRef=useRef(null);
  const navigateToTab = useCallback((nextTab, options={})=>{
    const shouldScroll = options.scroll !== false;
    setTab(nextTab);
    setMobileNavOpen(false);
    if(shouldScroll) setPendingScrollTab(nextTab);
  },[]);
  const [uploading,setUploading]=useState(false);
  const [myHome,setMyHome]=useState(()=>{try{const s=localStorage.getItem("albany_my_home");return s?JSON.parse(s):null;}catch{return null;}});
  const [showHomeSetup,setShowHomeSetup]=useState(false);
  const [homeSetupAddr,setHomeSetupAddr]=useState("");
  const [drillList,setDrillList]=useState(null);
  const [showWhatsNew,setShowWhatsNew]=useState(false);
  const [mapJumpRequest,setMapJumpRequest]=useState(null);
  const fileRef=useRef();
  const geomCoverage=useMemo(()=>{
    const gp = parcelGeometry?.parcels;
    if(!gp || Array.isArray(gp)) return null;
    const keys = new Set(Object.keys(gp).map(normalizeParcelId).filter(Boolean));
    let matched=0;
    for(const p of parcels){
      const key = normalizeParcelId(p.parcelIdNorm || p.parcelId || p.printKey || p.pinSbl);
      if(key && keys.has(key)) matched++;
    }
    return {
      matched,
      parcelCount: parcels.length,
      geomCount: parcelGeometry.count || Object.keys(gp).length,
      pct: Math.round((matched/Math.max(1,parcels.length))*1000)/10,
      coordSystem: parcelGeometry.coordSystem || null,
    };
  },[parcelGeometry,parcels]);
  const ownerPortfolioGroups=useMemo(()=>buildOwnerPortfolioGroups(parcels),[parcels]);
  const ownerPortfolioIndex=useMemo(()=>new Map(ownerPortfolioGroups.map(group=>[group.ownerKey,group])),[ownerPortfolioGroups]);

  const loadDataFromText=useCallback((raw,fname,opts={})=>new Promise(resolve=>{
  const silent = !!opts.silent;
  const exactName = (fname||"").trim();
  const lowerName = exactName.toLowerCase();
  setUploading(true);
  setTimeout(()=>{
    const finish=(nextParcels, sourceType, nextMeta)=>{
      const datasetMeta = normalizeDatasetMeta(nextMeta||{}, nextParcels, exactName || lowerName);
      setParcels(preprocessParcels(nextParcels, datasetMeta));
      setMeta(datasetMeta||{});
      setDataSource(sourceType||"json");
      setUploading(false);
      resolve(true);
    };
    const done=ok=>{ setUploading(false); resolve(ok); };
    const fail=msg=>{
      setUploading(false);
      if(!silent) alert(msg);
      else console.warn(msg);
      resolve(false);
    };
    const isJsonLike=lowerName.endsWith(".json")||lowerName.endsWith(".geojson")||raw.trim().startsWith("{")||raw.trim().startsWith("[");
    const parseOnMainThread=()=>{
      if(isJsonLike){
        try{
          const payload=JSON.parse(raw);
          const isGeometryPayload = payload && payload.geometryType==="MultiPolygon" && payload.parcels && !Array.isArray(payload.parcels);
          if(isGeometryPayload){
            setParcelGeometry(payload);
            done(true);
            return;
          }
          const isStreetCenterlinePayload = payload && (payload.kind==="streetCenterlines" || payload.geometryType==="MultiLineString") && Array.isArray(payload.streets);
          if(isStreetCenterlinePayload){
            setStreetCenterlines(payload);
            done(true);
            return;
          }
          const isNeighborhoodAssociationPayload = payload && payload.geometryType==="esriGeometryPolygon" && Array.isArray(payload.features) && payload.features.some(ft=>ft?.attributes?.Assoc_Name || ft?.attributes?.Label);
          if(isNeighborhoodAssociationPayload){
            setNeighborhoodAssociations(payload);
            done(true);
            return;
          }
          const isNeighborhoodBoundaryPayload = payload && payload.type==="FeatureCollection" && Array.isArray(payload.features) && payload.features.some(ft=>{
            const geomType = ft?.geometry?.type;
            return (geomType==="Polygon" || geomType==="MultiPolygon") && !!(ft?.properties?.name || ft?.properties?.Name || ft?.properties?.label || ft?.properties?.Label);
          });
          if(isNeighborhoodBoundaryPayload){
            setNeighborhoodBoundaries(payload);
            done(true);
            return;
          }
          const compactFromGeoJson = convertGeoJsonFeatureCollectionToCompactGeometry(payload, exactName || lowerName);
          if(compactFromGeoJson){
            setParcelGeometry(compactFromGeoJson);
            done(true);
            return;
          }
          const compactStreetFromGeoJson = convertGeoJsonFeatureCollectionToStreetCenterlines(payload, exactName || lowerName);
          if(compactStreetFromGeoJson){
            setStreetCenterlines(compactStreetFromGeoJson);
            done(true);
            return;
          }
          const arr=payload.parcels||payload;
          if(Array.isArray(arr)&&arr.length>0) finish(arr,"json",extractPayloadMeta(payload));
          else fail("JSON/GeoJSON file does not contain a parcels array (or supported parcel/street geometry payload).");
        }catch(err){ fail("Could not parse JSON: "+err.message); }
        return;
      }
      const isRoll=lowerName.endsWith(".txt")||raw.includes("HOMESTEAD PARCEL")||raw.includes("FULL MARKET VALUE");
      if(isRoll){
        const rollMeta = extractRollMetadata(raw, exactName || lowerName);
        const parsed = parseTextRoll(raw, rollMeta);
        if(parsed.length>0) finish(parsed,"roll",rollMeta);
        else fail("Could not parse file - ensure it is an Albany CSV, Final Roll .txt, or converted .json file.");
        return;
      }
      const parsed=parseCSV(raw);
      if(parsed.length>0) finish(parsed,"csv",normalizeDatasetMeta({}, parsed, exactName || lowerName));
      else fail("Could not parse file - ensure it is an Albany CSV, Final Roll .txt, or converted .json file.");
    };
    const looksLikeGeometryJson = isJsonLike && (
      raw.includes('"geometryType"') ||
      (raw.includes("FeatureCollection") && raw.includes('"features"'))
    );
    if(looksLikeGeometryJson){ parseOnMainThread(); return; }
    const worker=createDataParseWorker();
    if(!worker){ parseOnMainThread(); return; }
    const cleanup=()=>{ try{worker.terminate();}catch{} try{if(worker.__blobUrl)URL.revokeObjectURL(worker.__blobUrl);}catch{} };
    worker.onmessage=(msgEv)=>{
      const msg=msgEv.data||{};
      if(!msg.ok){ cleanup(); parseOnMainThread(); return; }
      finish(Array.isArray(msg.parcels)?msg.parcels:[], msg.sourceType||"csv", msg.meta||{});
      cleanup();
    };
    worker.onerror=()=>{ cleanup(); parseOnMainThread(); };
    worker.postMessage({raw,fname:lowerName});
  },50);
}),[]);

const handleFile=useCallback(e=>{
    const f=e.target.files[0];
    if(!f) return;
    const exactName = (f.name||"").trim();
    const fname = exactName.toLowerCase();
    const hasSupportedExt = SUPPORTED_UPLOAD_EXTENSIONS.some(ext => fname.endsWith(ext));
    if(!hasSupportedExt){
      alert(
        "Supported uploads:\n\n" +
        "1. Property roll CSV files\n" +
        "2. Final roll TXT exports\n" +
        "3. Parcel JSON exports\n" +
        "4. Parcel geometry JSON/GeoJSON\n" +
        "5. Street centerline JSON/GeoJSON\n" +
        "6. Neighborhood boundary GeoJSON\n" +
        "7. Neighborhood association boundary JSON\n\n" +
        `You selected: ${exactName || "(unnamed file)"}`
      );
      e.target.value="";
      return;
    }
    const r=new FileReader();
    r.onload=()=>{ loadDataFromText((r.result||"").toString(), exactName); };
    r.readAsText(f);
    e.target.value="";
  },[loadDataFromText]);

  const autoloadStartedRef=useRef(false);
  useEffect(()=>{
    if(autoloadStartedRef.current) return;
    autoloadStartedRef.current=true;
    let cancelled=false;
    setUploading(true);
    setAutoloadState({phase:"running",entries:[]});
    const updateAutoloadEntry = (kind, name, status, message="") => {
      if(cancelled) return;
      setAutoloadState(prev=>{
        const nextEntries = Array.isArray(prev.entries) ? [...prev.entries] : [];
        const idx = nextEntries.findIndex(entry => entry.kind===kind && entry.name===name);
        const nextEntry = { kind, name, status, message };
        if(idx>=0) nextEntries[idx]=nextEntry;
        else nextEntries.push(nextEntry);
        return { ...prev, entries: nextEntries };
      });
    };
    const fetchText = async (kind, name) => {
      updateAutoloadEntry(kind, name, "checking", "Requesting local file");
      try{
        const res = await fetch(encodeURI(name), { cache:"no-store" });
        if(!res.ok){
          updateAutoloadEntry(kind, name, "not_found", `HTTP ${res.status}`);
          return null;
        }
        const raw = await res.text();
        if(!raw || !raw.trim()){
          updateAutoloadEntry(kind, name, "not_found", "Empty file");
          return null;
        }
        updateAutoloadEntry(kind, name, "fetched", `${Math.max(1, Math.round(raw.length/1024))} KB fetched`);
        return raw;
      }catch(err){
        updateAutoloadEntry(kind, name, "fetch_error", err?.message || "Request failed");
        return null;
      }
    };
    const loadFirstAvailable = async (kind, names) => {
      for(const name of names){
        const raw = await fetchText(kind, name);
        if(cancelled || !raw) continue;
        updateAutoloadEntry(kind, name, "parsing", "Parsing file contents");
        const ok = await loadDataFromText(raw, name, { silent:true });
        if(cancelled) return null;
        if(ok){
          updateAutoloadEntry(kind, name, "loaded", "Loaded into the app");
          return name;
        }
        updateAutoloadEntry(kind, name, "parse_failed", "File was found but could not be parsed");
      }
      return null;
    };
    (async()=>{
      const parcelFile = await loadFirstAvailable("parcels", AUTOLOAD_FILES.parcels);
      if(cancelled) return;
      if(parcelFile){
        await loadFirstAvailable("geometry", AUTOLOAD_FILES.geometry);
        if(!cancelled) await loadFirstAvailable("streets", AUTOLOAD_FILES.streets);
        if(!cancelled) await loadFirstAvailable("neighborhoods", AUTOLOAD_FILES.neighborhoods);
        if(!cancelled) await loadFirstAvailable("associations", AUTOLOAD_FILES.associations);
      }else{
        AUTOLOAD_FILES.geometry.forEach(name=>updateAutoloadEntry("geometry", name, "skipped", "Waiting for a parcel roll to load first"));
        AUTOLOAD_FILES.streets.forEach(name=>updateAutoloadEntry("streets", name, "skipped", "Waiting for a parcel roll to load first"));
        AUTOLOAD_FILES.neighborhoods.forEach(name=>updateAutoloadEntry("neighborhoods", name, "skipped", "Waiting for a parcel roll to load first"));
        AUTOLOAD_FILES.associations.forEach(name=>updateAutoloadEntry("associations", name, "skipped", "Waiting for a parcel roll to load first"));
      }
      if(!cancelled){
        setUploading(false);
        setAutoloadState(prev=>({ ...prev, phase: parcelFile ? "complete" : "failed" }));
      }
    })();
    return ()=>{ cancelled=true; };
  },[loadDataFromText]);
  const toggleCompare=p=>{if(!p)return;setCompareList(prev=>prev.some(x=>x.parcelId===p.parcelId)?prev.filter(x=>x.parcelId!==p.parcelId):prev.length<4?[...prev,p]:prev);};
  const removeCompare=p=>{if(p)setCompareList(prev=>prev.filter(x=>x.parcelId!==p.parcelId));};
  const addToCompare=(p1,p2)=>{if(p2)toggleCompare(p2);};
  const saveHome=p=>{
    const next=p?{address:p.address,parcelId:p.parcelId,parcel:p}:null;
    setMyHome(next);
    try{if(next)localStorage.setItem("albany_my_home",JSON.stringify(next));else localStorage.removeItem("albany_my_home");}catch{}
  };
  const setupHomeFromAddr=()=>{
    const p=findBestAddressMatch(parcels, homeSetupAddr);
    if(p){saveHome(p);setShowHomeSetup(false);setHomeSetupAddr("");}
  };

  const currentHome = useMemo(()=>{
    if(!myHome?.parcelId) return null;
    return parcels.find(p=>p.parcelId===myHome.parcelId) || myHome.parcel || null;
  },[myHome,parcels]);
  const openApplicationMapForParcel=useCallback(detail=>{
    const rawAddress=(detail?.address||detail?.parcel?.address||"").toString().trim();
    const directParcelId=(detail?.parcelId||detail?.parcel?.parcelId||"").toString().trim();
    const matchedParcel=directParcelId
      ? parcels.find(p=>p.parcelId===directParcelId) || null
      : (rawAddress ? findBestAddressMatch(parcels, rawAddress) : null);
    const nextParcel=matchedParcel || detail?.parcel || null;
    const nextAddress=nextParcel?.address || rawAddress;
    if(!nextAddress && !directParcelId) return;
    navigateToTab("mapview");
    try{
      localStorage.setItem("albany_app_tab","mapview");
      localStorage.setItem("albany_app_ui_version", APP_UI_VERSION);
    }catch{}
    setMapJumpRequest({
      token:Date.now(),
      address:nextAddress || "",
      parcelId:nextParcel?.parcelId || directParcelId || "",
    });
  },[APP_UI_VERSION,navigateToTab,parcels]);

  useEffect(()=>{
    const handler=ev=>openApplicationMapForParcel(ev?.detail||{});
    window.addEventListener("albany:jump-to-app-map", handler);
    window.addEventListener("albany:jump-to-research-map", handler);
    return ()=>{
      window.removeEventListener("albany:jump-to-app-map", handler);
      window.removeEventListener("albany:jump-to-research-map", handler);
    };
  },[openApplicationMapForParcel]);

  const stats=useMemo(()=>(
    {
      total:parcels.length,
      totalFMV:parcels.reduce((s,p)=>s+p.fullMarketValue,0),
      avgFMV:parcels.length>0?Math.round(parcels.reduce((s,p)=>s+p.fullMarketValue,0)/parcels.length):0,
      exemptCount:parcels.filter(p=>p.exemptions.length>0).length,
      homesteadPct:parcels.length>0?Math.round(parcels.filter(p=>p.parcelType==="HOMESTEAD").length/parcels.length*100):0,
      absenteeCount:parcels.filter(p=>isAbsenteeFast(p)).length,
      overAssessedCount:parcels.filter(p=>eqFlagFast(p)==="over").length,
      missingExemptionCount:parcels.filter(p=>p.parcelType==="HOMESTEAD" && (!p.exemptions || p.exemptions.length===0)).length,
      underusedLotCount:parcels.filter(p=>p.frontage&&p.depth&&p.assessedValue>0&&((p.assessedValue-p.landValue)/Math.max(p.assessedValue,1))<0.4).length,
      publicOwnershipCount:parcels.filter(p=>/city of albany|county of albany|state of new york|albany housing authority/i.test(`${p.owner1||""} ${p.owner2||""}`)).length,
    }
  ),[parcels]);

  const moneyCompact = amt => amt>=1e9?`$${(amt/1e9).toFixed(1)}B`:amt>=1e6?`$${(amt/1e6).toFixed(1)}M`:amt>=1e3?`$${(amt/1e3).toFixed(0)}K`:`$${amt}`;
  const rollDescriptor = [meta?.assessmentYear, meta?.rollType ? `${meta.rollType.charAt(0).toUpperCase()}${meta.rollType.slice(1)}` : null].filter(Boolean).join(" ");
  const heroSubtitle = rollDescriptor
    ? `${rollDescriptor} Assessment Roll | City of Albany property assessment records`
    : "City of Albany property assessment records";
  const dataStatusLabel = uploading && dataSource==="sample"
    ? "Checking local Albany data files..."
    : dataSource==="roll"
      ? `${rollDescriptor || "Albany assessment"} roll loaded | ${parcels.length.toLocaleString()} parcels`
      : dataSource==="json" || dataSource==="csv"
        ? `${rollDescriptor ? `${rollDescriptor} dataset` : "Custom dataset"} | ${parcels.length.toLocaleString()} parcels loaded`
        : `Sample data only | ${parcels.length.toLocaleString()} parcels`;
  const dataStatusColor = uploading && dataSource==="sample" ? "#2563eb" : dataSource==="sample" ? "#f59e0b" : "#22c55e";
  const autoloadEntries = autoloadState.entries || [];
  const autoloadSummary = autoloadState.phase==="running"
    ? "Autoload is checking the Albany files in this folder."
    : autoloadEntries.some(entry=>entry.status==="loaded")
      ? `Autoload loaded ${autoloadEntries.filter(entry=>entry.status==="loaded").map(entry=>entry.kind).join(", ")} from local files.`
      : dataSource==="sample"
        ? "Autoload did not find a usable Albany parcel file, so the app stayed on sample data."
        : "The current dataset did not come from startup autoload.";
  const autoloadStatusTone = status => ({
    checking:"#2563eb",
    fetched:"#2563eb",
    parsing:"#0d9488",
    loaded:"#22c55e",
    skipped:"#64748b",
    not_found:"#f59e0b",
    fetch_error:"#dc2626",
    parse_failed:"#dc2626",
  }[status]||"var(--gray2)");
  const autoloadStatusLabel = status => ({
    checking:"Checking",
    fetched:"Fetched",
    parsing:"Parsing",
    loaded:"Loaded",
    skipped:"Skipped",
    not_found:"Not found",
    fetch_error:"Fetch failed",
    parse_failed:"Parse failed",
  }[status]||status);
  const tabs=[
    {id:"home",label:"Home"},
    {id:"browse",label:"Property Search"},
    {id:"mapview",label:"Application Map"},
    {id:"equity",label:"Fairness"},
    {id:"taxtools",label:"Tax Relief"},
    {id:"compare",label:`Compare${compareList.length>0?` (${compareList.length})`:""}`},
    {id:"ownership",label:"Ownership"},
    {id:"analytics",label:"Analytics"},
    {id:"opportunity",label:"Change Signals"},
    {id:"dataquality",label:"Data Quality"},
    {id:"guide",label:"Guide"},
  ];
  const currentTabMeta = tabs.find(t=>t.id===tab) || tabs[0];
  useEffect(()=>{
    try{
      const savedVersion = localStorage.getItem("albany_app_ui_version");
      if(savedVersion!==APP_UI_VERSION){
        localStorage.setItem("albany_app_ui_version", APP_UI_VERSION);
        if(APP_TAB_IDS.has(requestedUrlTab)){
          localStorage.setItem("albany_app_tab", requestedUrlTab);
          setTab(requestedUrlTab);
        }else{
          localStorage.setItem("albany_app_tab","home");
          setTab("home");
        }
      }else if(APP_TAB_IDS.has(requestedUrlTab)){
        localStorage.setItem("albany_app_tab", requestedUrlTab);
        setTab(requestedUrlTab);
      }
    }catch{}
    setShowWhatsNew(false);
  },[APP_UI_VERSION,requestedUrlTab]);

  useEffect(()=>{ try{localStorage.setItem("albany_app_tab",tab);}catch{} },[tab]);
  useEffect(()=>{
    const allowed = new Set(tabs.map(t=>t.id));
    if(!allowed.has(tab)) setTab("home");
  },[tab,tabs]);
  useEffect(()=>{
    if(!pendingScrollTab || pendingScrollTab!==tab) return;
    const runner = ()=>contentTopRef.current?.scrollIntoView({behavior:"smooth",block:"start"});
    const id = typeof window!=="undefined" && window.requestAnimationFrame ? window.requestAnimationFrame(runner) : setTimeout(runner,0);
    setPendingScrollTab("");
    return ()=>{
      if(typeof id==="number" && typeof window!=="undefined" && window.cancelAnimationFrame) window.cancelAnimationFrame(id);
      else clearTimeout(id);
    };
  },[pendingScrollTab,tab]);

  const dismissWhatsNew = () => {
    setShowWhatsNew(false);
    try{localStorage.setItem("albany_app_ui_whats_new_dismissed", APP_UI_VERSION);}catch{}
  };

  const appQuickActions = [
    {id:"browse", title:"Search a property", body:"Look up an address, parcel ID, or owner and open the full parcel record."},
    {id:"mapview", title:"Open the application map", body:"Inspect parcel boundaries, neighborhoods, ownership patterns, and thematic layers in one map."},
    {id:"equity", title:"Check tax fairness", body:"Review equity ratios, over-assessment signals, and comparable parcels."},
    {id:"taxtools", title:"Find tax relief", body:"Check exemptions, missed savings, and homeowner tax-relief opportunities."},
    {id:"ownership", title:"Study ownership", body:"Find absentee owners, duplicate owners, and larger property portfolios."},
    {id:"analytics", title:"See citywide patterns", body:"Review class mix, market values, and trend summaries across Albany."},
    {id:"dataquality", title:"Check data quality", body:"Review joins, missing geometry, and record issues before drawing conclusions."},
    {id:"guide", title:"Understand the roll", body:"Use the glossary and parcel explainer to make sense of assessment fields."},
  ];
  const renderHome = () => (
    <div className="fi">
      <div className="summary-grid" style={{marginBottom:18}}>
        <Card>
          <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Likely Over-Assessed</div>
          <div style={{fontFamily:"var(--fd)",fontSize:30,fontWeight:800,marginTop:6,color:"var(--red2)"}}>{nf(stats.overAssessedCount)}</div>
          <div style={{fontSize:12,color:"var(--gray2)",marginTop:4}}>Parcels above the fair 120% threshold</div>
          <button onClick={()=>navigateToTab("equity")} style={{marginTop:10,background:"rgba(220,38,38,.12)",border:"1px solid rgba(220,38,38,.25)",color:"var(--red2)",borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer",fontWeight:700}}>Review fairness -&gt;</button>
        </Card>
        <Card>
          <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Missing Exemptions</div>
          <div style={{fontFamily:"var(--fd)",fontSize:30,fontWeight:800,marginTop:6,color:"var(--amber2)"}}>{nf(stats.missingExemptionCount)}</div>
          <div style={{fontSize:12,color:"var(--gray2)",marginTop:4}}>Homestead parcels with no exemption on record</div>
          <button onClick={()=>navigateToTab("taxtools")} style={{marginTop:10,background:"rgba(245,158,11,.12)",border:"1px solid rgba(245,158,11,.25)",color:"var(--amber2)",borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer",fontWeight:700}}>Find savings -&gt;</button>
        </Card>
        <Card>
          <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Absentee Owners</div>
          <div style={{fontFamily:"var(--fd)",fontSize:30,fontWeight:800,marginTop:6,color:"#f97316"}}>{nf(stats.absenteeCount)}</div>
          <div style={{fontSize:12,color:"var(--gray2)",marginTop:4}}>Parcels flagged for likely off-site ownership</div>
          <button onClick={()=>navigateToTab("ownership")} style={{marginTop:10,background:"rgba(249,115,22,.12)",border:"1px solid rgba(249,115,22,.25)",color:"#c2410c",borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer",fontWeight:700}}>See owners -&gt;</button>
        </Card>
        <Card>
          <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Parcel Geometry</div>
          <div style={{fontFamily:"var(--fd)",fontSize:30,fontWeight:800,marginTop:6,color:"var(--teal2)"}}>{geomCoverage?`${geomCoverage.pct}%`:"None"}</div>
          <div style={{fontSize:12,color:"var(--gray2)",marginTop:4}}>{geomCoverage?`${geomCoverage.matched.toLocaleString()} parcels linked to boundaries`:"Parcel boundaries are not loaded yet"}</div>
          <button onClick={()=>navigateToTab("mapview")} style={{marginTop:10,background:"rgba(13,148,136,.12)",border:"1px solid rgba(13,148,136,.25)",color:"var(--teal2)",borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer",fontWeight:700}}>Open map -&gt;</button>
        </Card>
      </div>

      {currentHome ? (
        <Card style={{marginBottom:18,background:"linear-gradient(135deg,rgba(34,197,94,.08) 0%,rgba(37,99,235,.06) 100%)",border:"1px solid rgba(34,197,94,.22)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:11,color:"var(--green2)",fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Saved property snapshot</div>
              <div style={{fontFamily:"var(--fd)",fontSize:24,fontWeight:800,marginTop:6}}>{currentHome.address}</div>
              <div style={{fontSize:12,color:"var(--gray2)",marginTop:4}}>{parcelAreaSummary(currentHome)} | Parcel {currentHome.parcelId}</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
                <Badge color={eqFlagFast(currentHome)==="over"?"#dc2626":eqFlagFast(currentHome)==="under"?"#f59e0b":"#22c55e"}>{FL[eqFlagFast(currentHome)]}</Badge>
                <Badge color="#3b82f6">FMV {$f(currentHome.fullMarketValue)}</Badge>
                <Badge color="#a78bfa">{currentHome.exemptions.length} exemption{currentHome.exemptions.length===1?"":"s"}</Badge>
                {isAbsenteeFast(currentHome)&&<><Badge color="#f97316">Absentee flag</Badge><AbsenteeExplain parcel={currentHome} compact /></>}
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={()=>navigateToTab("browse")} style={{background:"var(--green)",color:"white",border:"none",borderRadius:9,padding:"9px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Open saved property</button>
              <button onClick={()=>openApplicationMapForParcel({ parcel: currentHome })} style={{background:"var(--card2)",color:"var(--gray)",border:"1px solid var(--border)",borderRadius:9,padding:"9px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Open on map</button>
              <button onClick={()=>saveHome(null)} style={{background:"rgba(220,38,38,.12)",color:"var(--red2)",border:"1px solid rgba(220,38,38,.22)",borderRadius:9,padding:"9px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Clear saved property</button>
            </div>
          </div>
        </Card>
      ) : (
        <Card style={{marginBottom:18,border:"1px solid rgba(37,99,235,.22)",background:"linear-gradient(135deg,rgba(37,99,235,.08) 0%,rgba(13,148,136,.05) 100%)"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",flexWrap:"wrap"}}>
            <div>
              <div style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:800}}>Save a property once</div>
              <div style={{fontSize:12,color:"var(--gray2)",marginTop:6,maxWidth:620}}>Save a home or target property once, then reuse it across search, fairness checks, tax tools, comparison, and the map.</div>
            </div>
            <button onClick={()=>setShowHomeSetup(true)} style={{background:"var(--blue)",color:"white",border:"none",borderRadius:10,padding:"10px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Save a Property</button>
          </div>
        </Card>
      )}

      <div className="quick-grid" style={{marginBottom:18}}>
        {appQuickActions.map(card=>(
          <Card key={card.id} style={{display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
            <div>
              <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:800,marginBottom:6}}>{card.title}</div>
              <div style={{fontSize:12,color:"var(--gray2)",lineHeight:1.7}}>{card.body}</div>
            </div>
            <button onClick={()=>navigateToTab(card.id)} style={{marginTop:14,alignSelf:"flex-start",background:"var(--card2)",border:"1px solid var(--border)",color:"var(--blue3)",borderRadius:9,padding:"8px 12px",fontSize:12,cursor:"pointer",fontWeight:700}}>Open -&gt;</button>
          </Card>
        ))}
      </div>

      <InfoBox icon="Guide" title="How to use this application" color="#2563eb">
        Start with <b style={{color:"var(--white)"}}>Property Search</b> if you know an address. Use <b style={{color:"var(--white)"}}>Application Map</b> when you want to inspect parcels, neighborhoods, and ownership spatially. Use <b style={{color:"var(--white)"}}>Fairness</b> and <b style={{color:"var(--white)"}}>Tax Relief</b> for homeowner questions, then move to <b style={{color:"var(--white)"}}>Analytics</b>, <b style={{color:"var(--white)"}}>Change Signals</b>, and <b style={{color:"var(--white)"}}>Data Quality</b> when you need deeper citywide analysis.
      </InfoBox>
    </div>
  );
  const renderTab = () => {
    if(tab==="home") return renderHome();
    if(tab==="browse") return <Browse parcels={parcels} meta={meta} compareList={compareList} onCompare={toggleCompare} myHome={myHome} onSaveHome={saveHome} onOpenHomeSetup={()=>setShowHomeSetup(true)} ownerPortfolioIndex={ownerPortfolioIndex}/>;
    if(tab==="mapview") return <MapView parcels={parcels} parcelGeometry={parcelGeometry} streetCenterlines={streetCenterlines} neighborhoodBoundaries={neighborhoodBoundaries} neighborhoodAssociations={neighborhoodAssociations} compareList={compareList} onCompare={toggleCompare} onDrill={setDrillList} jumpRequest={mapJumpRequest} advanced={true} ownerPortfolioIndex={ownerPortfolioIndex}/>;
    if(tab==="equity") return <Equity parcels={parcels} onDrill={setDrillList}/>;
    if(tab==="taxtools") return <TaxTools parcels={parcels} myHome={myHome} meta={meta} ownerPortfolioIndex={ownerPortfolioIndex} dataSource={dataSource} autoloadPhase={autoloadState.phase} uploading={uploading}/>;
    if(tab==="compare") return <Compare parcels={parcels} compareList={compareList} onRemove={removeCompare} onAdd={addToCompare}/>;
    if(tab==="ownership") return <Ownership parcels={parcels} onDrill={setDrillList} ownerPortfolioGroups={ownerPortfolioGroups}/>;
    if(tab==="analytics") return <Analytics parcels={parcels} onDrill={setDrillList}/>;
    if(tab==="opportunity") return <Opportunity parcels={parcels} onDrill={setDrillList}/>;
    if(tab==="dataquality") return <DataQuality parcels={parcels} meta={meta} onDrill={setDrillList}/>;
    if(tab==="guide") return <HomebuyerGuide parcels={parcels} myHome={myHome}/>;
    return null;
  };
  return (
    <>
      <GS/>
      <div style={{minHeight:"100vh",background:"linear-gradient(180deg,var(--bg) 0%,#edf3f9 38%,var(--bg) 100%)"}}>
        <div style={{background:"linear-gradient(135deg,var(--bg2) 0%,var(--bg3) 55%,#d8e3f0 100%)",borderBottom:"1px solid var(--border)",padding:"0 0 24px"}}>
          <div className="app-shell" style={{paddingTop:16}}>
            <div className="app-header-row">
              <div className="app-brand">
                <div style={{width:48,height:48,background:"linear-gradient(135deg,var(--blue) 0%,var(--teal) 100%)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,boxShadow:"0 12px 24px rgba(37,99,235,.18)"}}>ALB</div>
                <div>
                  <div className="app-title">Albany Property Tax Explorer</div>
                  <div style={{fontSize:12,color:"var(--gray)",marginTop:2}}>{heroSubtitle}</div>
                </div>
              </div>
              <div className="app-toolbar">
                <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.7)",border:"1px solid var(--border)",borderRadius:999,padding:"6px 12px"}}>
                  <span className="pulse" style={{width:7,height:7,borderRadius:"50%",background:dataStatusColor,display:"inline-block"}}></span>
                  <span style={{fontSize:11,color:"var(--gray)",fontFamily:"var(--fm)"}}>{dataStatusLabel}</span>
                </div>
                {currentHome&&(
                  <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.25)",borderRadius:999,padding:"6px 12px",cursor:"pointer"}} onClick={()=>navigateToTab("browse")} title="Open my property">
                    <span style={{fontSize:12}}>Home</span>
                    <span style={{fontSize:11,color:"var(--green2)",fontWeight:700,maxWidth:170,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{currentHome.address}</span>
                    <button onClick={e=>{e.stopPropagation();saveHome(null);}} style={{background:"none",border:"none",color:"var(--gray3)",cursor:"pointer",fontSize:12,padding:0}}>X</button>
                  </div>
                )}
                <button onClick={()=>setShowHomeSetup(true)} style={{background:currentHome?"rgba(34,197,94,.15)":"rgba(255,255,255,.8)",color:currentHome?"var(--green2)":"var(--gray)",border:`1px solid ${currentHome?"rgba(34,197,94,.35)":"var(--border)"}`,borderRadius:999,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  {currentHome?"My Home":"Set My Home"}
                </button>
                <button onClick={()=>fileRef.current?.click()} disabled={uploading} style={{background:"var(--blue)",color:"white",border:"none",borderRadius:999,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}} title="Load a roll CSV/TXT/JSON or map geometry JSON/GeoJSON">
                  {uploading?"Parsing...":"Load Data Files"}
                </button>
                <input ref={fileRef} type="file" accept=".json,.geojson,.txt,.csv" style={{display:"none"}} onChange={handleFile}/>
              </div>
            </div>


            <div className="hero-grid" style={{marginTop:18}}>
              <Card style={{background:"linear-gradient(135deg,rgba(255,255,255,.92) 0%,rgba(248,250,252,.92) 100%)",border:"1px solid rgba(37,99,235,.16)",boxShadow:"0 18px 40px rgba(15,23,42,.06)"}}>
                <div style={{fontSize:11,color:"var(--blue3)",fontWeight:700,textTransform:"uppercase",letterSpacing:1.1}}>One application for Albany property intelligence</div>
                <div className="hero-title">Search, map, and analyze the 2025 Albany assessment roll in one place.</div>
                <div style={{fontSize:14,color:"var(--gray2)",lineHeight:1.8,marginTop:12,maxWidth:760}}>This version merges resident and research workflows into one interface. You can move from address lookup to parcel mapping, fairness checks, ownership review, analytics, and data-quality review without switching modes.</div>
                {dataSource==="sample"&&<div style={{fontSize:12,color:"#7c2d12",lineHeight:1.7,marginTop:10,maxWidth:760,background:"rgba(245,158,11,.14)",border:"1px solid rgba(245,158,11,.28)",borderRadius:12,padding:"10px 12px"}}>Sample data is still active. The full Albany roll did not load at startup. Check the <b style={{color:"#431407"}}>Startup autoload</b> panel for the exact file-by-file result, or use <b style={{color:"#431407"}}>Load Data Files</b> to load the Albany files manually.</div>}
                <div className="hero-actions">
                  <button onClick={()=>navigateToTab("browse")} style={{background:"var(--blue)",color:"white",border:"none",borderRadius:10,padding:"11px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Search a parcel</button>
                  <button onClick={()=>navigateToTab("mapview")} style={{background:"rgba(255,255,255,.78)",color:"var(--gray)",border:"1px solid var(--border)",borderRadius:10,padding:"11px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Open Application Map</button>
                </div>
              </Card>

              <Card style={{background:"linear-gradient(180deg,rgba(13,148,136,.08) 0%,rgba(255,255,255,.88) 72%)",border:"1px solid rgba(13,148,136,.14)"}}>
                <div style={{fontSize:11,color:"var(--gray2)",textTransform:"uppercase",letterSpacing:1.1,fontWeight:700}}>Current dataset</div>
                <div style={{marginTop:12,display:"grid",gap:12}}>
                  <div style={{background:"rgba(255,255,255,.75)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 14px"}}>
                    <div style={{fontFamily:"var(--fd)",fontSize:15,fontWeight:800}}>Roll status</div>
                    <div style={{fontSize:12,color:"var(--gray2)",marginTop:4,lineHeight:1.7}}>{dataStatusLabel}</div>
                  </div>
                  <div style={{background:"rgba(255,255,255,.75)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 14px"}}>
                    <div style={{fontFamily:"var(--fd)",fontSize:15,fontWeight:800}}>Startup autoload</div>
                    <div style={{fontSize:12,color:"var(--gray2)",marginTop:4,lineHeight:1.7}}>{autoloadSummary}</div>
                    {autoloadEntries.length>0 && <div style={{display:"grid",gap:8,marginTop:10}}>
                      {autoloadEntries.map(entry=>(
                        <div key={`${entry.kind}:${entry.name}`} style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,padding:"8px 10px",border:"1px solid rgba(15,23,42,.08)",borderRadius:10,background:"rgba(248,250,252,.8)"}}>
                          <div style={{minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:700,color:"var(--gray)",wordBreak:"break-word"}}>{entry.name}</div>
                            <div style={{fontSize:11,color:"var(--gray2)",marginTop:3}}>{entry.message || entry.kind}</div>
                          </div>
                          <div style={{fontSize:11,fontWeight:700,color:autoloadStatusTone(entry.status),whiteSpace:"nowrap"}}>{autoloadStatusLabel(entry.status)}</div>
                        </div>
                      ))}
                    </div>}
                  </div>
                  <div style={{background:"rgba(255,255,255,.75)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 14px"}}>
                    <div style={{fontFamily:"var(--fd)",fontSize:15,fontWeight:800}}>Map coverage</div>
                    <div style={{fontSize:12,color:"var(--gray2)",marginTop:4,lineHeight:1.7}}>{geomCoverage?`${geomCoverage.pct}% of loaded parcels are linked to parcel geometry.`:(uploading?"Checking for parcel geometry files.":"Parcel boundaries are not loaded yet. The map will fall back to point locations where coordinates exist.")}</div>
                  </div>
                  <div style={{background:"rgba(255,255,255,.75)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 14px"}}>
                    <div style={{fontFamily:"var(--fd)",fontSize:15,fontWeight:800}}>Next step</div>
                    <div style={{fontSize:12,color:"var(--gray2)",marginTop:4,lineHeight:1.7}}>{dataSource==="sample"?"Load the Albany roll and geometry files to unlock the full parcel inventory and parcel-boundary mapping.":"Start with Property Search or open the Application Map, then move into Ownership, Fairness, Analytics, and Data Quality as needed."}</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <div style={{background:"rgba(255,255,255,.55)",borderBottom:"1px solid var(--border)",backdropFilter:"blur(8px)"}}>
          <div className="app-shell desktop-tab-rail">
            <div className="tab-rail">
              {tabs.map(t=>(
                <button key={t.id} onClick={()=>navigateToTab(t.id)} style={{
                  background:tab===t.id?"var(--blue)":"transparent",
                  color:tab===t.id?"white":"var(--gray2)",
                  border:"none",
                  borderRadius:"10px 10px 0 0",
                  padding:"11px 16px",
                  fontSize:12,
                  fontWeight:700,
                  cursor:"pointer",
                  whiteSpace:"nowrap",
                  borderBottom:tab===t.id?"2px solid var(--blue2)":"2px solid transparent"
                }} className="tab-chip">{t.icon?<span style={{marginRight:6}}>{t.icon}</span>:null}{t.label}</button>
              ))}
            </div>
          </div>
          <div className="app-shell mobile-tab-shell" style={{paddingTop:10,paddingBottom:10}}>
            <button type="button" className="mobile-tab-trigger" onClick={()=>setMobileNavOpen(v=>!v)} aria-expanded={mobileNavOpen}>
              <span>{currentTabMeta?.label || "Menu"}</span>
              <span style={{fontFamily:"var(--fm)",fontSize:12,color:"var(--gray2)"}}>{mobileNavOpen?"Close":"Menu"}</span>
            </button>
            {mobileNavOpen&&<div className="mobile-tab-list">
              {tabs.map(t=>(
                <button key={t.id} type="button" onClick={()=>navigateToTab(t.id)} className="mobile-tab-item" style={{background:tab===t.id?"rgba(37,99,235,.12)":"rgba(255,255,255,.92)",borderColor:tab===t.id?"rgba(37,99,235,.28)":"var(--border)",color:tab===t.id?"var(--blue3)":"var(--gray)"}}>{t.label}</button>
              ))}
            </div>}
          </div>
        </div>

        <div ref={contentTopRef} className="app-shell" style={{paddingTop:22,paddingBottom:40}}>
          {renderTab()}
        </div>


        <div style={{borderTop:"1px solid var(--border)",padding:"14px 24px",textAlign:"center",color:"var(--gray3)",fontSize:11}}>
          Albany Property Tax Explorer | 2025 Final Assessment Roll | City of Albany, NY | Unified property search, mapping, fairness, ownership, and analytics
        </div>
        </div>

      {drillList&&<PropListModal data={drillList} onClose={()=>setDrillList(null)}/>}
      {showHomeSetup&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(4px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setShowHomeSetup(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:16,padding:28,maxWidth:520,width:"100%",boxShadow:"0 25px 60px rgba(0,0,0,.5)"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
              <span style={{fontSize:28}}>Home</span>
              <div>
                <div style={{fontFamily:"var(--fd)",fontWeight:800,fontSize:20}}>Set My Home</div>
                <div style={{fontSize:12,color:"var(--gray)",marginTop:1}}>Save your address once - use it everywhere</div>
              </div>
            </div>
            <div style={{fontSize:12,color:"var(--gray2)",lineHeight:1.8,marginBottom:18,paddingBottom:18,borderBottom:"1px solid var(--border)"}}>
              Once saved, your home address will be ready in the property browser, tax-savings tools, comparison workflow, and guide views. It stays in this browser only and is never sent anywhere.
            </div>
            {currentHome&&(
              <div style={{background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.25)",borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:"var(--green2)"}}>Currently Saved Home</div>
                  <div style={{fontSize:14,fontWeight:600,marginTop:2}}>{currentHome.address}{currentHome.neighborhood?` | ${currentHome.neighborhood}`:""}</div>
                  <div style={{fontFamily:"var(--fm)",fontSize:10,color:"var(--gray)",marginTop:1}}>Parcel {currentHome.parcelId}</div>
                </div>
                <button onClick={()=>saveHome(null)} style={{background:"rgba(220,38,38,.15)",border:"1px solid rgba(220,38,38,.3)",color:"#f87171",borderRadius:8,padding:"6px 12px",fontSize:11,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>Clear</button>
              </div>
            )}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:600,color:"var(--gray)",marginBottom:8}}>Search for your address in the dataset:</div>
              <div style={{display:"flex",gap:10}}>
                <AddressAutocompleteInput parcels={parcels} value={homeSetupAddr} onChange={setHomeSetupAddr} onSelectParcel={p=>setHomeSetupAddr(p.address)} onEnter={setupHomeFromAddr} placeholder="e.g. 77 Academy, 15 Quail..." inputStyle={{flex:1,width:"100%",background:"var(--bg3)",border:"1px solid var(--border2)",color:"var(--white)",borderRadius:9,padding:"10px 14px",fontSize:14,fontFamily:"var(--fb)",cursor:"text"}} wrapperStyle={{flex:1}} autoFocus/>
                <button onClick={setupHomeFromAddr} style={{background:"var(--green)",color:"white",border:"none",borderRadius:9,padding:"10px 18px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Save</button>
              </div>
              {homeSetupAddr&&!findBestAddressMatch(parcels, homeSetupAddr)&&(
                <div style={{fontSize:11,color:"var(--red2)",marginTop:8}}>No matching address found. Try a partial address like "Academy" or "Willett". Make sure the full roll file is loaded if your address is not in the demo.</div>
              )}
            </div>
            <div style={{fontSize:11,color:"var(--gray3)",marginTop:14}}>Tip: you can also save your home from the property detail panel after opening any parcel.</div>
            <button onClick={()=>setShowHomeSetup(false)} style={{marginTop:18,width:"100%",background:"var(--card2)",border:"1px solid var(--border)",color:"var(--gray)",borderRadius:9,padding:"9px",fontSize:13,cursor:"pointer"}}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}

























































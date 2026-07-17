import { G } from "../theme.jsx";

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Ic=({d,size=16,stroke=1.5,color="currentColor",fill="none"})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d)?d.map((p,i)=><path key={i} d={p}/>):<path d={d}/>}
  </svg>
);
const ICON={
  menu:"M3 12h18M3 6h18M3 18h18",
  home:"M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  card:"M1 4h22v16H1zM1 9h22",
  wallet:"M3 6h18a2 2 0 012 2v8a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2zM16 12h.01",
  chart:"M3 3v18h18M7 16l4-4 4 4 4-8",
  bell:"M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  user:"M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  link:"M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  plus:"M12 5v14M5 12h14",
  minus:"M5 12h14",
  check:"M20 6L9 17l-5-5",
  x:"M18 6L6 18M6 6l12 12",
  edit:"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  import:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  camera:"M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z",
  share:"M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13",
  calendar:"M3 4h18v18H3zM16 2v4M8 2v4M3 10h18",
  clock:"M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  arrow_up:"M12 19V5M5 12l7-7 7 7",
  arrow_down:"M12 5v14M19 12l-7 7-7-7",
  repeat:"M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3",
  warning:"M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  divide:"M8 6h8M12 3v18M8 18h8",
  handshake:"M20.42 4.58a5.4 5.4 0 00-7.65 0l-.77.78-.77-.78a5.4 5.4 0 00-7.65 7.65l.77.77L12 21.23l7.65-7.65.77-.77a5.4 5.4 0 000-7.23z",
  logout:"M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  sun:"M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 5a7 7 0 100 14A7 7 0 0012 5z",
  moon:"M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  target:"M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z",
  briefcase:"M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  ai:"M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 010 2h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 010-2h1a7 7 0 017-7h1V5.73A2 2 0 0110 4a2 2 0 012-2zM9 11a1 1 0 000 2 1 1 0 000-2zm6 0a1 1 0 000 2 1 1 0 000-2z",
  search:"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  help:"M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm2-1.645V13h-2v-1.5a1 1 0 011-1 1.5 1.5 0 10-1.471-1.794l-1.962-.393A3.5 3.5 0 1113 13.355z",
chip:["M5 6h14v12H5z","M5 10h4a2 2 0 002-2V6M19 10h-4a2 2 0 01-2-2V6M5 14h4a2 2 0 011 2v2M19 14h-4a2 2 0 00-1 2v2"],
contactless:["M8.5 8.5a5 5 0 010 7","M11.5 6a9 9 0 010 12","M5.5 11a2 2 0 010 2"],
arrowRight:"M5 12h14M13 6l6 6-6 6"
};

const Tag=({children,color=G.muted})=>(
  <span style={{display:"inline-flex",alignItems:"center",padding:"1px 8px",borderRadius:20,fontSize:10,fontWeight:600,whiteSpace:"nowrap",background:color+"22",color,border:`1px solid ${color}33`}}>{children}</span>
);
const Spinner=({size=20,color=G.accent})=>(
  <div style={{width:size,height:size,border:`2px solid ${color}33`,borderTop:`2px solid ${color}`,borderRadius:"50%",animation:"spin .7s linear infinite",flexShrink:0}}/>
);
const Lbl=({children,opt})=>(
  <div style={{fontSize:11,fontWeight:600,letterSpacing:.8,textTransform:"uppercase",color:G.muted,marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
    {children}{opt&&<span style={{fontWeight:400,textTransform:"none",letterSpacing:0,fontSize:11,color:G.muted}}>(opcional)</span>}
  </div>
);

export { Ic, ICON, Tag, Spinner, Lbl };

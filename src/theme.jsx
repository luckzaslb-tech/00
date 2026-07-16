// ─── DESIGN ────────────────────────────────────────────────────────────────────
// ─── THEME ────────────────────────────────────────────────────────────────────
const DARK ={bg:"#0A0A0F",card:"#111118",card2:"#16161F",border:"#1E1E2A",border2:"#2A2A3A",text:"#F0EEF8",muted:"#6B6880",accent:"#7C6AF7",accentL:"#7C6AF720",green:"#2ECC8E",greenL:"#2ECC8E18",red:"#FF5C6A",redL:"#FF5C6A18",yellow:"#F5C842",blue:"#4A9EFF",orange:"#FB923C"};
const LIGHT={bg:"#F5F5FA",card:"#FFFFFF",card2:"#F0EFF8",border:"#E2E0EF",border2:"#CCC9E0",text:"#1A1830",muted:"#8A87A0",accent:"#7C6AF7",accentL:"#7C6AF715",green:"#1CA870",greenL:"#1CA87015",red:"#E5334A",redL:"#E5334A15",yellow:"#D4920A",blue:"#2B7FE0",orange:"#E07020"};
let _theme="dark";
const setThemeVar=t=>{_theme=t;};
const G=new Proxy({},{get:(_,k)=>(_theme==="light"?LIGHT:DARK)[k]});
const NH=62,HH=52;

const getCSS=(theme)=>`
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700&family=Figtree:wght@400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html{height:100%;overflow:hidden;width:100%;max-width:100vw;padding-top:env(safe-area-inset-top,0px)}
  body{background:${theme==="light"?LIGHT.bg:DARK.bg};color:${theme==="light"?LIGHT.text:DARK.text};font-family:'Figtree',sans-serif;-webkit-tap-highlight-color:transparent;-webkit-font-smoothing:antialiased;height:100%;overflow:hidden;width:100%;max-width:100vw;overscroll-behavior:none;transition:background .2s,color .2s;margin:0;padding:0}
  #root{height:100%;height:100dvh;overflow:hidden;width:100%;max-width:100vw;display:flex;flex-direction:column}
  input,select,button,textarea{font-family:inherit;-webkit-appearance:none;appearance:none}
  input[type=date]::-webkit-calendar-picker-indicator{filter:${theme==="light"?"invert(.3)":"invert(.55)"}}
  input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
  *{scrollbar-width:none}*::-webkit-scrollbar{display:none}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
  @keyframes popIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}
  @keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes slideInLeft{from{transform:translateX(-100%)}to{transform:translateX(0)}}
  .press:active{opacity:.7;transform:scale(.97)}
  @supports(padding:max(0px)){
    .safe-bottom{padding-bottom:max(8px,env(safe-area-inset-bottom))}
  .nav-bar{position:fixed;bottom:0;left:0;right:0;z-index:200;background:${theme==="light"?LIGHT.card:DARK.card};border-top:1px solid ${theme==="light"?LIGHT.border:DARK.border};display:flex;min-height:${NH}px;padding-bottom:max(8px,env(safe-area-inset-bottom));box-sizing:border-box}
  .safe-top{padding-top:max(0px,env(safe-area-inset-top))}
  :root{--sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px);--hh:calc(${HH}px + var(--sat));--nh:calc(${NH}px + var(--sab))}
  }
  .inp{width:100%;padding:12px 14px;background:${theme==="light"?LIGHT.card2:DARK.card2};border:1px solid ${theme==="light"?LIGHT.border2:DARK.border2};border-radius:12px;color:${theme==="light"?LIGHT.text:DARK.text};font-size:15px;outline:none;transition:background .2s,border .2s,color .2s}
  .inp:focus{border-color:#7C6AF7}
`;

export { DARK, LIGHT, G, NH, HH, getCSS, setThemeVar };

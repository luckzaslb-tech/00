// ─── THEME — "verde dinheiro": esmeralda de marca, neutros limpos ──────────────
// Escala de radius: 8 (chips) / 12 (inputs/botões) / 16 (cards) / 20 (cartão/sheet)
// accent = verde de MARCA (esmeralda); green = verde de RECEITA (mais claro, p/ distinguir no extrato)
const DARK ={bg:"#0B0E0C",card:"#141815",card2:"#1B211D",border:"#262E28",border2:"#333D36",text:"#F2F5F3",muted:"#8B948E",accent:"#10B981",accentL:"#10B9811F",green:"#4ADE80",greenL:"#4ADE8018",red:"#F87171",redL:"#F8717118",yellow:"#FBBF24",blue:"#60A5FA",orange:"#FB923C",cardGrad1:"#047857",cardGrad2:"#0F766E",onCard:"#FFFFFF"};
const LIGHT={bg:"#F4F7F5",card:"#FFFFFF",card2:"#EDF2EF",border:"#E1E8E3",border2:"#CDD6D0",text:"#121814",muted:"#67716B",accent:"#059669",accentL:"#05966914",green:"#16A34A",greenL:"#16A34A14",red:"#DC2626",redL:"#DC262612",yellow:"#B45309",blue:"#2563EB",orange:"#C2570C",cardGrad1:"#047857",cardGrad2:"#0F766E",onCard:"#FFFFFF"};
let _theme="dark";
const setThemeVar=t=>{_theme=t;};
const getTheme=()=>_theme;
const G=new Proxy({},{get:(_,k)=>(_theme==="light"?LIGHT:DARK)[k]});
const NH=62,HH=52;

const getCSS=(theme)=>`
  @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html{height:100%;overflow:hidden;width:100%;max-width:100vw;padding-top:env(safe-area-inset-top,0px)}
  body{background:${theme==="light"?LIGHT.bg:DARK.bg};color:${theme==="light"?LIGHT.text:DARK.text};font-family:'Figtree',sans-serif;-webkit-tap-highlight-color:transparent;-webkit-font-smoothing:antialiased;height:100%;overflow:hidden;width:100%;max-width:100vw;overscroll-behavior:none;transition:background .2s,color .2s;margin:0;padding:0}
  #root{height:100%;height:100dvh;overflow:hidden;width:100%;max-width:100vw;display:flex;flex-direction:column}
  input,select,button,textarea{font-family:inherit;-webkit-appearance:none;appearance:none}
  input[type=date]::-webkit-calendar-picker-indicator{filter:${theme==="light"?"invert(.3)":"invert(.55)"}}
  input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
  *{scrollbar-width:none}*::-webkit-scrollbar{display:none}
  .num{font-variant-numeric:tabular-nums;letter-spacing:-.02em}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
  @keyframes popIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}
  @keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes slideInLeft{from{transform:translateX(-100%)}to{transform:translateX(0)}}
  .press:active{opacity:.7;transform:scale(.97)}
  @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
  @supports(padding:max(0px)){
    .safe-bottom{padding-bottom:max(8px,env(safe-area-inset-bottom))}
  .nav-bar{position:fixed;bottom:0;left:0;right:0;z-index:200;background:${theme==="light"?LIGHT.card:DARK.card};border-top:1px solid ${theme==="light"?LIGHT.border:DARK.border};display:flex;min-height:${NH}px;padding-bottom:max(8px,env(safe-area-inset-bottom));box-sizing:border-box}
  .safe-top{padding-top:max(0px,env(safe-area-inset-top))}
  :root{--sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px);--hh:calc(${HH}px + var(--sat));--nh:calc(${NH}px + var(--sab))}
  }
  .inp{width:100%;padding:12px 14px;background:${theme==="light"?LIGHT.card2:DARK.card2};border:1px solid ${theme==="light"?LIGHT.border2:DARK.border2};border-radius:12px;color:${theme==="light"?LIGHT.text:DARK.text};font-size:15px;outline:none;transition:background .2s,border .2s,color .2s}
  .inp:focus{border-color:${theme==="light"?LIGHT.accent:DARK.accent}}
`;

export { DARK, LIGHT, G, NH, HH, getCSS, setThemeVar, getTheme };

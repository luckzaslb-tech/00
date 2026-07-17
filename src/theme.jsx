// ─── THEME — "banco limpo": neutros sem tinta azulada, roxo único de marca ─────
// Escala de radius: 8 (chips) / 12 (inputs/botões) / 16 (cards) / 20 (hero/sheet)
const DARK ={bg:"#0B0B0E",card:"#15151A",card2:"#1C1C22",border:"#26262E",border2:"#33333D",text:"#F4F4F6",muted:"#8E8E99",accent:"#A78BFA",accentL:"#A78BFA1F",green:"#34D399",greenL:"#34D39918",red:"#F87171",redL:"#F8717118",yellow:"#FBBF24",blue:"#60A5FA",orange:"#FB923C"};
const LIGHT={bg:"#F6F6F8",card:"#FFFFFF",card2:"#F0F0F3",border:"#E4E4E9",border2:"#D1D1D9",text:"#18181D",muted:"#6E6E78",accent:"#7C3AED",accentL:"#7C3AED14",green:"#0E9F6E",greenL:"#0E9F6E14",red:"#DC2626",redL:"#DC262612",yellow:"#B45309",blue:"#2563EB",orange:"#C2570C"};
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

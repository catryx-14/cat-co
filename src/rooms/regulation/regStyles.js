// All styling for the Regulation Plan room, ported from the two locked
// prototypes (regulation-routine-card-v2.html + routine-editor-prototype.html)
// and scoped under `.reg-room` so the generic class names (chip, seg, dose…)
// can't collide with the rest of the app. Band colour is driven per-subtree by
// the `--rb` / `--rb-deep` CSS variables, set inline where the band is known.

export const REG_STYLES = `
.reg-room{
  --panel:#16203c; --panel2:#1b2748; --line:#2b3a60;
  --r-ink:#e9edf8; --r-dim:#9eaacb; --r-faint:#6b779b;
  --r-gold:#e6c878; --r-gold-soft:#f2dfa6;
  --rb:#2FBE86; --rb-deep:#163f30;
  color:var(--r-ink);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
}
.reg-body{max-width:600px;margin:0 auto;padding:6px 16px 70px;}
.reg-lede{color:var(--r-faint);font-size:12.5px;font-style:italic;text-align:center;line-height:1.6;margin:2px 0 22px;}
.reg-loading{color:var(--r-faint);text-align:center;font-style:italic;padding:36px 0;}

/* ── Gallery ─────────────────────────────────────────────────────────────── */
.reg-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:13px;}
.reg-tile{display:flex;flex-direction:column;align-items:flex-start;gap:5px;text-align:left;
  background:linear-gradient(180deg,var(--panel) 0%,#121b34 100%);border:1px solid #283659;
  border-radius:16px;padding:15px 16px 14px;cursor:pointer;transition:.16s;min-height:118px;color:var(--r-ink);}
.reg-tile:hover{border-color:#46598f;transform:translateY(-1px);box-shadow:0 10px 26px rgba(0,0,0,.34);}
.reg-tile-dots{display:flex;gap:6px;margin-bottom:3px;}
.reg-tile-dot{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.07);
  border:1px solid var(--line);}
.reg-tile-dot.on{border-color:transparent;}
.reg-tile-name{font-family:Georgia,"Times New Roman",serif;font-size:18px;color:var(--r-gold-soft);font-weight:600;line-height:1.2;}
.reg-tile-sub{font-size:12px;color:var(--r-dim);line-height:1.4;}
.reg-tile-span{font-size:10.5px;letter-spacing:.04em;color:var(--r-faint);font-style:italic;margin-top:auto;}
.reg-tile-new{align-items:center;justify-content:center;text-align:center;border-style:dashed;
  border-color:#39477099;background:rgba(18,27,48,.4);gap:7px;}
.reg-tile-new:hover{border-color:#56689c;}
.reg-tile-new .reg-tile-name{color:var(--r-dim);}
.reg-plus{font-size:26px;color:var(--r-faint);line-height:1;}

/* ── Back / breadcrumb ───────────────────────────────────────────────────── */
.reg-back{background:none;border:none;color:var(--r-faint);font-size:13px;cursor:pointer;padding:0;margin-bottom:14px;}
.reg-back:hover{color:var(--r-ink);}

/* ── Band pills (read card) ──────────────────────────────────────────────── */
.bands{display:flex;gap:8px;justify-content:center;margin-bottom:20px;}
.bandpill{background:rgba(20,29,54,.6);border:1px solid var(--line);color:var(--r-dim);
  border-radius:999px;padding:7px 15px;font-size:13px;cursor:pointer;transition:.18s;}
.bandpill:hover{color:var(--r-ink);border-color:#46598f;}
.bandpill.on{color:#0a0f1e;font-weight:600;border-color:transparent;}
.bandpill.absent{opacity:.4;}

/* ── Read card ───────────────────────────────────────────────────────────── */
.card{background:linear-gradient(180deg,var(--panel) 0%,#121b34 100%);
  border:1px solid #283659;border-radius:20px;overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,.5);}
.headband{background:linear-gradient(180deg,var(--rb),var(--rb-deep));padding:18px 20px 16px;transition:.25s;}
.headband .bl{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(8,12,24,.62);font-weight:600;}
.headband h1{font-family:Georgia,"Times New Roman",serif;font-size:30px;font-weight:600;margin:3px 0 0;color:#0c1020;}
.headband .sub{font-size:13px;color:rgba(8,12,24,.6);margin-top:3px;font-style:italic;}
.cardbody{padding:20px;}

.anat{margin-bottom:6px;}
.seg{margin-bottom:15px;}
.seg .l{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--rb);margin-bottom:5px;transition:.25s;font-weight:600;}
.seg p{margin:0;font-size:13.5px;line-height:1.62;color:#dbe2f4;white-space:pre-wrap;}
.seg p.empty{color:var(--r-faint);font-style:italic;}

.rule{height:1px;background:linear-gradient(90deg,transparent,var(--line),transparent);margin:20px 0;}
.seclab{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--r-faint);margin:0 0 9px;}

.tier{margin-bottom:14px;}
.tierlab{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--r-faint);margin-bottom:7px;}
.tierlab .hint{text-transform:none;letter-spacing:0;font-style:italic;opacity:.8;}
.chips{display:flex;flex-wrap:wrap;gap:7px;}
.chip{display:inline-flex;align-items:center;gap:7px;border-radius:11px;padding:7px 11px;font-size:13px;
  border:1px solid;background:rgba(255,255,255,.02);transition:.15s;color:var(--r-ink);}
.chip.tap{cursor:pointer;}
.chip.tap:hover{background:rgba(255,255,255,.06);}
.chip.opt{border-style:dashed;opacity:.92;}
.chip .mk{width:16px;height:16px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex:0 0 auto;}
.chip.do{border-color:rgba(191,230,214,.4);color:#dff3ea;} .chip.do .mk{background:rgba(47,190,134,.2);color:#bfe6d6;}
.chip.dont{border-color:rgba(217,184,236,.42);color:#efe2f8;} .chip.dont .mk{background:rgba(166,115,228,.2);color:#d9b8ec;}
.chip.tool{border-color:rgba(207,224,255,.4);color:#e6eeff;} .chip.tool .mk{background:rgba(120,150,220,.2);color:#cfe0ff;}
.chip.coreg{border-color:rgba(255,217,176,.42);color:#ffe9d2;} .chip.coreg .mk{background:rgba(255,180,120,.18);color:#ffd9b0;}
.chip .arrow{opacity:.38;font-size:11px;}
.chip .rm{opacity:.5;font-size:13px;margin-left:1px;}
.chip .rm:hover{opacity:1;}
.tier-empty{font-size:12px;color:var(--r-faint);font-style:italic;}

.doses{display:flex;gap:9px;margin-top:9px;flex-wrap:wrap;}
.dose{flex:1;min-width:96px;border:1px solid var(--line);border-radius:13px;padding:13px 10px;text-align:center;background:rgba(20,29,54,.4);}
.dose .dn{font-size:12.5px;color:var(--r-dim);margin-bottom:10px;min-height:32px;display:flex;align-items:center;justify-content:center;line-height:1.32;}
.pts{font-family:Georgia,serif;font-size:22px;color:var(--rb);font-weight:600;line-height:1;}
.pts .u{font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--r-faint);font-family:inherit;display:block;margin-top:3px;font-weight:400;}
.pts .blank{color:var(--r-faint);}
.split{font-size:10.5px;color:var(--r-dim);margin-top:7px;line-height:1.45;}
.split b{color:var(--rb);font-weight:600;}
.dosenote{font-size:11.5px;color:var(--r-faint);font-style:italic;margin-top:11px;text-align:center;line-height:1.5;}
.capnote{font-size:11px;color:var(--r-faint);font-style:italic;margin-top:3px;text-align:center;}

.editrow{margin-top:20px;display:flex;justify-content:center;}
.editbtn{background:rgba(230,200,120,.14);border:1px solid rgba(230,200,120,.4);color:var(--r-gold-soft);
  border-radius:10px;padding:9px 18px;font-size:13px;cursor:pointer;}
.editbtn:hover{background:rgba(230,200,120,.22);}

.foot{color:var(--r-faint);font-size:11.5px;text-align:center;margin-top:22px;line-height:1.6;}

/* ── Science overlay ─────────────────────────────────────────────────────── */
.ov{position:fixed;inset:0;background:rgba(4,7,15,.74);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:20px;z-index:60;}
.sci{background:linear-gradient(180deg,#172139,#141d38);border:1px solid #2c3a60;border-radius:18px;max-width:420px;width:100%;max-height:82vh;overflow-y:auto;padding:22px;box-shadow:0 30px 70px rgba(0,0,0,.6);}
.sci .x{float:right;background:none;border:none;color:var(--r-faint);font-size:20px;cursor:pointer;line-height:1;}
.sci .x:hover{color:var(--r-ink);}
.sci .kind{font-size:10px;letter-spacing:.14em;text-transform:uppercase;}
.sci h2{font-family:Georgia,serif;font-size:22px;margin:6px 0 12px;color:var(--r-gold-soft);font-weight:600;}
.sci .lab{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--r-faint);margin:16px 0 5px;}
.sci p{font-size:13.5px;line-height:1.62;color:var(--r-ink);margin:0;white-space:pre-wrap;}
.sci .desc{color:#d4dcf0;}
.sci .none{color:var(--r-faint);font-style:italic;font-size:12.5px;margin-top:14px;}

/* ── Editor ──────────────────────────────────────────────────────────────── */
.ed-name{display:flex;align-items:center;gap:10px;margin-bottom:5px;}
.ed-name input{background:none;border:none;border-bottom:1px solid transparent;font-family:Georgia,serif;font-size:27px;color:var(--r-gold-soft);font-weight:600;outline:none;padding:2px 0;width:100%;}
.ed-name input:focus{border-bottom-color:#3a4a72;}
.ed-sub input{background:none;border:none;border-bottom:1px solid transparent;font-size:14px;color:var(--r-dim);font-style:italic;outline:none;padding:2px 0;width:100%;margin-bottom:4px;}
.ed-sub input:focus{border-bottom-color:#3a4a72;}
.ed-tag{font-size:10px;color:var(--r-faint);letter-spacing:.1em;text-transform:uppercase;}

.facetabs{display:flex;gap:7px;margin:16px 0 18px;flex-wrap:wrap;}
.ftab{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:11.5px;border:1px solid var(--line);border-radius:11px;padding:8px 13px;cursor:pointer;color:var(--r-dim);background:rgba(20,29,54,.4);transition:.15s;}
.ftab:hover{border-color:#46598f;}
.ftab.on{color:#0a0f1e;font-weight:600;border-color:transparent;}
.ftab .st{font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;opacity:.85;}
.ftab.seed{border-style:dashed;opacity:.82;}

.panel{background:linear-gradient(180deg,#141d34,#111a30);border:1px solid #283659;border-radius:16px;padding:18px;}
.seedpanel{text-align:center;padding:26px 18px;}
.seedpanel .icn{font-size:26px;margin-bottom:10px;opacity:.8;}
.seedpanel h3{font-family:Georgia,serif;font-size:19px;margin:0 0 8px;color:var(--r-gold-soft);font-weight:600;}
.seedpanel p{font-size:13px;color:var(--r-dim);line-height:1.6;margin:0 auto 16px;max-width:380px;}
.seedpanel .when{font-size:12px;color:var(--r-faint);font-style:italic;margin-bottom:18px;}
.startbtn{border:none;color:#0a0f1e;font-weight:600;border-radius:10px;padding:9px 18px;font-size:13px;cursor:pointer;background:var(--rb);}

.bandhdr{border-radius:11px;padding:11px 14px;margin-bottom:16px;background:linear-gradient(180deg,var(--rb),var(--rb-deep));}
.bandhdr .bl{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(8,12,24,.6);font-weight:600;}
.bandhdr .nm{color:#0c1020;font-size:13px;font-weight:600;margin-top:1px;}

.eseg{margin-bottom:15px;}
.eseg .l{font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--rb);font-weight:600;margin-bottom:4px;display:flex;justify-content:space-between;align-items:baseline;gap:10px;}
.eseg .l .hint{text-transform:none;letter-spacing:0;color:var(--r-faint);font-weight:400;font-style:italic;font-size:10.5px;}
.eseg textarea,.eseg input.line{width:100%;background:#0c1428;border:1px solid var(--line);color:var(--r-ink);border-radius:9px;padding:9px 11px;font-size:13px;font-family:inherit;line-height:1.5;resize:vertical;min-height:42px;outline:none;}
.eseg input.line{min-height:0;}
.eseg textarea:focus,.eseg input.line:focus{border-color:#3c4d80;}

.ilab{font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--r-faint);margin:18px 0 9px;}
.chip.add{border:1px dashed #3a4a72;color:var(--r-faint);cursor:pointer;background:none;}
.chip.add:hover{color:var(--r-ink);border-color:#56689c;}
.addrow{display:flex;gap:6px;margin-top:9px;}
.addrow input{flex:1;background:#0c1428;border:1px solid var(--line);color:var(--r-ink);border-radius:9px;padding:8px 10px;font-size:13px;outline:none;}
.addrow button{border:none;color:#0a0f1e;border-radius:9px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;background:var(--rb);}

.addpanel{margin-top:10px;border:1px solid var(--line);border-radius:11px;padding:11px;background:rgba(12,20,40,.5);}
.markpick{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--r-faint);margin-bottom:9px;}
.markbtn{width:27px;height:27px;border-radius:7px;border:1px solid var(--line);background:rgba(255,255,255,.02);color:var(--r-dim);font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;}
.markbtn.on.do{border-color:rgba(191,230,214,.6);color:#bfe6d6;background:rgba(47,190,134,.16);}
.markbtn.on.dont{border-color:rgba(217,184,236,.6);color:#d9b8ec;background:rgba(166,115,228,.16);}
.markbtn.on.tool{border-color:rgba(207,224,255,.6);color:#cfe0ff;background:rgba(120,150,220,.16);}
.markbtn.on.coreg{border-color:rgba(255,217,176,.6);color:#ffd9b0;background:rgba(255,180,120,.16);}
.toolmatches{display:flex;flex-direction:column;gap:5px;margin-top:9px;max-height:188px;overflow-y:auto;}
.toolmatch{text-align:left;background:rgba(20,29,54,.5);border:1px solid var(--line);color:var(--r-ink);border-radius:8px;padding:7px 10px;font-size:12.5px;cursor:pointer;display:flex;align-items:center;gap:8px;}
.toolmatch:hover{border-color:#46598f;background:rgba(255,255,255,.05);}
.toolmatch .tm{width:16px;height:16px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex:0 0 auto;background:rgba(120,150,220,.2);color:#cfe0ff;}
.toolmatch .tg{margin-left:auto;opacity:.45;font-size:11px;flex:0 0 auto;}
.freetext{margin-top:9px;width:100%;text-align:left;background:none;border:1px dashed #3a4a72;color:var(--r-dim);border-radius:8px;padding:8px 10px;font-size:12.5px;cursor:pointer;}
.freetext:hover{color:var(--r-ink);border-color:#56689c;}
.delface{background:none;border:none;color:#c98a8a;font-size:12px;cursor:pointer;margin-top:18px;opacity:.82;}
.delface:hover{opacity:1;text-decoration:underline;}

.doslab{font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--r-faint);margin:18px 0 9px;display:flex;justify-content:space-between;}
.doslab .hint{text-transform:none;letter-spacing:0;font-style:italic;}
.dvrow{display:flex;align-items:center;gap:9px;border:1px solid var(--line);border-radius:10px;padding:9px 11px;margin-bottom:7px;background:rgba(20,29,54,.4);}
.dvrow input.nm{flex:1;min-width:60px;background:none;border:none;color:var(--r-ink);font-size:13px;outline:none;border-bottom:1px solid transparent;}
.dvrow input.nm:focus{border-bottom-color:#3a4a72;}
.dvrow .num{display:flex;flex-direction:column;align-items:center;gap:2px;}
.dvrow .num input{width:46px;background:#0c1428;border:1px solid var(--line);color:var(--rb);font-family:Georgia,serif;font-size:15px;font-weight:600;text-align:center;border-radius:7px;padding:4px 2px;outline:none;}
.dvrow .num input:focus{border-color:#3c4d80;}
.dvrow .num .nl{font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:var(--r-faint);}
.dvrow .rm{background:none;border:none;color:var(--r-faint);font-size:16px;cursor:pointer;padding:0 2px;}
.dvrow .rm:hover{color:var(--r-ink);}
.addv{background:none;border:1px dashed #3a4a72;color:var(--r-faint);border-radius:9px;padding:8px 12px;font-size:12px;cursor:pointer;width:100%;}
.addv:hover{color:var(--r-dim);border-color:#56689c;}

.ed-actions{display:flex;gap:10px;margin-top:20px;align-items:center;}
.donebtn{flex:1;background:rgba(230,200,120,.15);border:1px solid rgba(230,200,120,.45);color:var(--r-gold-soft);border-radius:10px;padding:11px;font-size:13.5px;cursor:pointer;}
.donebtn:hover{background:rgba(230,200,120,.24);}
.delbtn{background:none;border:1px solid rgba(217,120,120,.4);color:#e0a0a0;border-radius:10px;padding:11px 15px;font-size:13px;cursor:pointer;}
.delbtn:hover{background:rgba(217,120,120,.12);}
.savemark{font-size:11.5px;color:var(--rb);font-style:italic;min-height:16px;text-align:center;margin-top:10px;transition:.2s;}

/* ===== 3-tab shell (Shelf · Routines · Actions) — ported from regulation-room-prototype, rr- prefixed ===== */
.reg-room .rr-tabs{display:flex;gap:8px;margin:2px 0 22px;border-bottom:1px solid var(--line2);}
.reg-room .rr-tab{font-size:14px;padding:9px 4px;margin-right:14px;color:var(--r-faint);cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;transition:.15s;position:relative;top:1px;font-family:inherit;}
.reg-room .rr-tab:hover{color:var(--r-dim);}
.reg-room .rr-tab.on{color:var(--r-gold-soft);border-bottom-color:var(--r-gold);}

.reg-room .rr-legend{display:flex;flex-wrap:wrap;gap:9px 10px;align-items:center;background:rgba(18,27,48,.5);border:1px solid var(--line2);border-radius:12px;padding:10px 12px;margin-bottom:8px;font-size:11.5px;}
.reg-room .rr-li{display:inline-flex;align-items:center;gap:6px;color:var(--r-dim);border:1px solid transparent;border-radius:8px;padding:4px 8px;cursor:pointer;transition:.13s;}
.reg-room .rr-li:hover{background:rgba(255,255,255,.04);}
.reg-room .rr-li.act{border-color:var(--r-gold);background:rgba(230,200,120,.12);color:var(--r-gold-soft);}
.reg-room .rr-hintrow{flex-basis:100%;font-size:11px;color:var(--r-faint);font-style:italic;padding:1px 2px 0;}
.reg-room .rr-mk{width:16px;height:16px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex:none;}
.reg-room .rr-mk.do{background:rgba(47,190,134,.18);color:#8fe6c0;}
.reg-room .rr-mk.dont{background:rgba(166,115,228,.2);color:#cba6ec;}
.reg-room .rr-mk.tool{background:rgba(90,169,207,.2);color:#a8d4ec;}
.reg-room .rr-mk.coreg{background:rgba(227,145,176,.2);color:#f0b6cf;}
.reg-room .rr-dot{width:6px;height:6px;border-radius:50%;background:var(--r-gold);flex:none;box-shadow:0 0 5px rgba(230,200,120,.6);}
.reg-room .rr-actdot{width:6px;height:6px;border-radius:50%;background:#5aa9cf;flex:none;box-shadow:0 0 5px rgba(90,169,207,.5);}
.reg-room .rr-legdash{width:18px;height:0;border-top:1.5px dashed var(--r-faint);flex:none;}

.reg-room .rr-count{font-size:11.5px;color:var(--r-faint);margin:0 2px 16px;letter-spacing:.02em;}
.reg-room .rr-count b{color:var(--r-dim);font-weight:600;}
.reg-room .rr-search{display:flex;align-items:center;gap:9px;background:rgba(18,27,48,.5);border:1px solid var(--line2);border-radius:11px;padding:9px 13px;margin-bottom:14px;transition:border-color .15s;}
.reg-room .rr-search:focus-within{border-color:#3c4d80;}
.reg-room .rr-search .si{color:var(--r-faint);font-size:15px;line-height:1;}
.reg-room .rr-search input{flex:1;background:none;border:none;color:var(--r-ink);font-size:14px;outline:none;font-family:inherit;}
.reg-room .rr-search input::placeholder{color:var(--r-faint);}
.reg-room .rr-search .sx{color:var(--r-faint);cursor:pointer;font-size:19px;line-height:1;padding:0 2px;}
.reg-room .rr-nomatch{color:var(--r-faint);font-style:italic;font-size:13px;padding:22px 4px;text-align:center;}

.reg-room .rr-aisle{margin-bottom:8px;}
.reg-room .rr-ahdr{display:flex;align-items:center;gap:9px;cursor:pointer;padding:13px 2px 11px;border-bottom:1px solid var(--line2);}
.reg-room .rr-chev{color:var(--r-faint);font-size:11px;transition:transform .2s;width:10px;display:inline-block;}
.reg-room .rr-aisle.open .rr-chev{transform:rotate(90deg);}
.reg-room .rr-anm{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--r-gold);font-weight:600;}
.reg-room .rr-ahdr .rr-acount{margin-left:auto;font-size:11px;color:var(--r-faint);}
.reg-room .rr-abody{display:none;padding:6px 0 14px;}
.reg-room .rr-aisle.open .rr-abody{display:block;}
.reg-room .rr-chan{margin:14px 0 4px;}
.reg-room .rr-chdr{display:flex;align-items:baseline;gap:8px;margin-bottom:9px;}
.reg-room .rr-cnm{font-size:13.5px;color:var(--r-ink);font-weight:600;}
.reg-room .rr-cnt{font-size:10.5px;color:var(--r-faint);background:rgba(255,255,255,.04);border:1px solid var(--line2);border-radius:20px;padding:1px 8px;}
.reg-room .rr-rule{flex:1;height:1px;background:linear-gradient(90deg,var(--line2),transparent);}
.reg-room .rr-cnote{font-size:11.5px;color:var(--r-faint);font-style:italic;line-height:1.5;margin:-3px 0 9px;border-left:2px solid rgba(166,115,228,.4);padding-left:9px;}
.reg-room .rr-chan.empty .rr-cnm{color:var(--r-faint);}
.reg-room .rr-cardrow{display:flex;flex-wrap:wrap;gap:7px;}
.reg-room .rr-card{font-size:12.5px;border:1px solid var(--line);border-radius:10px;padding:6px 11px 6px 8px;display:inline-flex;gap:7px;align-items:center;cursor:pointer;background:rgba(20,29,54,.45);transition:.13s;color:#dbe2f4;position:relative;}
.reg-room .rr-card:hover{border-color:#46598f;background:rgba(28,39,68,.6);}
.reg-room .rr-card.draft{border-style:dashed;border-color:#33405f;color:#aeb8d4;}
.reg-room .rr-card.sel{border-color:var(--r-gold);background:rgba(230,200,120,.1);}
.reg-room .rr-card .rr-fa{width:6px;height:6px;border-radius:50%;background:var(--r-gold);box-shadow:0 0 5px rgba(230,200,120,.55);flex:none;}
.reg-room .rr-card.add{border:1px dashed #3a4a72;color:var(--r-faint);background:none;}
.reg-room .rr-card.add:hover{color:#5aa9cf;border-color:rgba(90,169,207,.45);}
.reg-room .rr-emptyshelf{border:1px dashed #2c3856;border-radius:10px;padding:10px 13px;color:var(--r-faint2);font-size:12px;font-style:italic;display:flex;align-items:center;justify-content:space-between;gap:10px;}
.reg-room .rr-emptyshelf .ros{font-style:normal;color:#5aa9cf;font-size:12px;cursor:pointer;border:1px solid rgba(90,169,207,.35);border-radius:8px;padding:4px 10px;white-space:nowrap;}

.reg-room .rr-intro{color:var(--r-dim);font-size:13px;line-height:1.6;margin-bottom:16px;}
.reg-room .rr-agroup{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--r-gold);font-weight:600;margin:20px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--line2);display:flex;align-items:baseline;gap:9px;}
.reg-room .rr-agroup .as{font-size:11px;letter-spacing:0;text-transform:none;color:var(--r-faint);font-weight:400;font-style:italic;}
.reg-room .rr-acard{background:linear-gradient(180deg,#141d34,#111a30);border:1px solid #283659;border-radius:14px;padding:14px 16px;margin-bottom:10px;cursor:pointer;transition:.13s;}
.reg-room .rr-acard:hover{border-color:#46598f;}
.reg-room .rr-acard .rt{font-family:Georgia,serif;font-size:18px;color:var(--r-gold-soft);font-weight:600;margin-bottom:2px;}
.reg-room .rr-acard .rs{font-size:12px;color:var(--r-dim);font-style:italic;margin-bottom:10px;}
.reg-room .rr-acard .rfoot{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.reg-room .rr-atype{font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;border-radius:6px;padding:3px 8px;border:1px solid;}
.reg-room .rr-atype.allday{color:var(--r-gold-soft);border-color:rgba(230,200,120,.45);background:rgba(230,200,120,.1);}
.reg-room .rr-atype.oneoff{color:#5aa9cf;border-color:rgba(90,169,207,.4);background:rgba(90,169,207,.1);}
.reg-room .rr-alink{font-size:11px;color:var(--r-dim);border:1px solid var(--line);border-radius:7px;padding:2px 9px;display:inline-flex;gap:6px;align-items:center;}
.reg-room .rr-alink .lk{color:var(--r-faint);}
.reg-room .rr-alink.none{border-style:dashed;color:var(--r-faint2);}
.reg-room .rr-acard .pts{margin-left:auto;font-family:Georgia,serif;font-size:15px;color:var(--r-gold-soft);}
.reg-room .rr-acard .pts .u{font-size:9px;color:var(--r-faint);text-transform:uppercase;letter-spacing:.08em;margin-left:2px;font-family:inherit;}
.reg-room .rr-addnew{width:100%;background:none;border:1px dashed #3a4a72;color:var(--r-faint);border-radius:12px;padding:13px;font-size:13px;cursor:pointer;margin-top:4px;font-family:inherit;}
.reg-room .rr-addnew:hover{color:var(--r-dim);border-color:#56689c;}

.rr-dock{position:fixed;left:0;right:0;bottom:0;background:linear-gradient(180deg,#141d34,#0e1626);border-top:1px solid #2f3e63;padding:16px 18px calc(18px + env(safe-area-inset-bottom));transform:translateY(110%);transition:transform .22s cubic-bezier(.3,.7,.3,1);z-index:55;max-height:82vh;overflow-y:auto;color:#e9edf8;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}
.rr-dock.up{transform:translateY(0);}
.rr-dock .dwrap{max-width:600px;margin:0 auto;position:relative;}
.rr-dock .dx{position:absolute;top:-4px;right:0;color:#65718f;font-size:22px;cursor:pointer;line-height:1;background:none;border:none;}
.rr-dock .dn{font-family:Georgia,serif;font-size:20px;color:#f2dfa6;font-weight:600;margin-bottom:8px;padding-right:26px;}
.rr-dock .meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px;}
.rr-dock .tag{font-size:11px;border:1px solid #243150;border-radius:20px;padding:3px 10px;color:#9eaacb;}
.rr-dock .tag.gold{border-color:rgba(230,200,120,.45);color:#f2dfa6;}
.rr-dock .tag.dash{border-style:dashed;}
.rr-dsec{margin-top:13px;}
.rr-dsec .dl{font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:#e6c878;font-weight:600;margin-bottom:3px;}
.rr-dsec .dt{font-size:13px;color:#e9edf8;line-height:1.55;white-space:pre-wrap;}
.rr-dsec .dt.empty{color:#65718f;font-style:italic;}
.rr-dsci{margin-top:14px;font-size:12px;color:#9eaacb;border-top:1px solid #1c2742;padding-top:11px;line-height:1.5;}
.rr-dsci b{color:#f2dfa6;}
.rr-ptsedit{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#65718f;letter-spacing:.04em;}
.rr-pb{width:auto;padding:0 11px;height:27px;border-radius:6px;border:1px solid #243150;background:rgba(20,29,54,.5);color:#9eaacb;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;}
.rr-pb.num{width:29px;padding:0;font-family:Georgia,serif;font-size:14px;}
.rr-pb.on{background:rgba(230,200,120,.15);border-color:rgba(230,200,120,.5);color:#f2dfa6;}
.rr-pb:hover{border-color:#46598f;}
.rr-nameinput{background:none;border:none;border-bottom:1px solid #3a4a72;font-family:Georgia,serif;font-size:20px;color:#f2dfa6;font-weight:600;outline:none;width:100%;padding:0 0 3px;margin-bottom:10px;}
.rr-nameinput:focus{border-bottom-color:#e6c878;}
.rr-ta{width:100%;background:#0c1428;border:1px solid #243150;color:#e9edf8;border-radius:8px;padding:7px 9px;font-size:13px;font-family:inherit;line-height:1.5;resize:vertical;min-height:34px;outline:none;margin-top:2px;}
.rr-ta:focus{border-color:#3c4d80;}
.rr-field{margin-top:13px;}
.rr-flabel{font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:#e6c878;font-weight:600;margin-bottom:6px;}
.rr-linkbox{border:1px solid #243150;border-radius:10px;padding:11px;background:rgba(12,20,40,.5);}
.rr-linkcur{display:flex;align-items:center;gap:8px;font-size:13px;color:#e9edf8;flex-wrap:wrap;}
.rr-linkcur .ch{color:#65718f;font-size:11.5px;}
.rr-matchlist{display:flex;flex-direction:column;gap:5px;margin-top:9px;max-height:210px;overflow-y:auto;}
.rr-match{text-align:left;background:rgba(20,29,54,.5);border:1px solid #243150;color:#e9edf8;border-radius:8px;padding:7px 10px;font-size:12.5px;cursor:pointer;display:flex;align-items:center;gap:8px;font-family:inherit;}
.rr-match:hover{border-color:#46598f;background:rgba(255,255,255,.05);}
.rr-match .ch{margin-left:auto;opacity:.6;font-size:11px;}
.rr-mini{background:none;border:none;color:#5aa9cf;font-size:12px;cursor:pointer;padding:0;font-family:inherit;}
.rr-mini:hover{text-decoration:underline;}
.rr-select{width:100%;background:#0c1428;border:1px solid #243150;color:#e9edf8;border-radius:8px;padding:8px 9px;font-size:13px;font-family:inherit;outline:none;margin-top:6px;}
.rr-savebtn{width:100%;margin-top:18px;background:rgba(230,200,120,.16);border:1px solid rgba(230,200,120,.45);color:#f2dfa6;border-radius:10px;padding:11px;font-size:13.5px;cursor:pointer;font-family:inherit;}
.rr-savebtn:disabled{opacity:.4;cursor:default;}
.rr-savebtn:hover:not(:disabled){background:rgba(230,200,120,.24);}
.rr-delbtn{background:none;border:none;color:#c98a8a;font-size:12px;cursor:pointer;margin-top:14px;font-family:inherit;}
.rr-delbtn:hover{text-decoration:underline;}
.rr-scrim{position:fixed;inset:0;background:rgba(4,7,15,.5);z-index:54;}
`

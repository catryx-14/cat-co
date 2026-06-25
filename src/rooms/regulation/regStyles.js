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
`

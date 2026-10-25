import fs from "fs";

const list = await (await fetch("http://127.0.0.1:9333/json")).json();
const page = list.find((t) => t.type === "page" && t.url.includes("localhost:5173"));
if (!page) {
  console.error("no page", list.map((t) => t.url));
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
function send(method, params = {}) {
  const msgId = ++id;
  return new Promise((resolve, reject) => {
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
});

const expr = `(() => {
  const back = document.querySelector(".auth-brand-panel .auth-page-back");
  const side = document.querySelector(".auth-page-back--side");
  const logo = document.querySelector(".auth-brand-logo");
  const mobileLogo = document.querySelector(".auth-logo--mobile");
  const ad = document.querySelector(".partner-strip--compact");
  const card = document.querySelector(".auth-card");
  const right = document.querySelector(".auth-wrap--panel");
  const box = (el) => (el ? el.getBoundingClientRect().toJSON() : null);
  const b = box(back);
  const l = box(logo);
  const a = box(ad);
  const c = box(card);
  const r = box(right);
  const shown = (el) => !!el && getComputedStyle(el).display !== "none";
  const overlap = (x, y) => x && y ? !(x.right < y.left || x.left > y.right || x.bottom < y.top || y.top > x.bottom && false || x.bottom < y.top || x.top > y.bottom) : null;
  return {
    vw: innerWidth,
    backShown: shown(back),
    sideShown: shown(side),
    gapLogo: b && l ? Math.round(l.top - b.bottom) : null,
    back: b,
    logo: l,
    adW: a ? Math.round(a.width) : null,
    rightW: r ? Math.round(r.width) : null,
    adLeft: a ? Math.round(a.left) : null,
    rightLeft: r ? Math.round(r.left) : null,
    adRight: a ? Math.round(a.right) : null,
    rightRight: r ? Math.round(r.right) : null,
    adCardOverlap: overlap(a, c),
    backLogoOverlap: overlap(b, l),
    sideLogoOverlap: overlap(box(side), box(mobileLogo)),
  };
})()`;

ws.addEventListener("open", async () => {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.clearDeviceMetricsOverride");
  await send("Page.navigate", { url: "http://localhost:5173/register" });
  await new Promise((r) => setTimeout(r, 1400));
  const desk = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  console.log("DESK", JSON.stringify(desk.result.value, null, 2));
  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("C:/Users/lepsa/Downloads/MedTer-main (1)/MedTer/reg-desktop.png", Buffer.from(shot.data, "base64"));

  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await new Promise((r) => setTimeout(r, 400));
  const mob = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  console.log("MOB", JSON.stringify(mob.result.value, null, 2));
  const shotM = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("C:/Users/lepsa/Downloads/MedTer-main (1)/MedTer/reg-mobile.png", Buffer.from(shotM.data, "base64"));
  ws.close();
});

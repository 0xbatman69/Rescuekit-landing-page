/* ------------------------------------------------------------------
   Hand-sketched card borders.
   Each side is drawn as its own slightly-wobbly stroke whose ends
   OVERSHOOT past the corners, so the corner lines cross and stick out
   a little — like a rectangle drawn by hand in a technical notebook.
   ------------------------------------------------------------------ */

const SVGNS = "http://www.w3.org/2000/svg";

// small deterministic pseudo-random so each card looks hand-drawn but stable
function makeRand(seed){
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function sidePath(x1, y1, x2, y2, bow, rand){
  // midpoint pushed perpendicular by a small "bow" for a hand-drawn curve
  const mx = (x1 + x2) / 2 + (rand() - 0.5) * 3;
  const my = (y1 + y2) / 2 + (rand() - 0.5) * 3;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;      // perpendicular
  const b = (rand() - 0.5) * bow;
  const cx = mx + nx * b, cy = my + ny * b;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function drawSketch(holder, seed){
  const rect = holder.getBoundingClientRect();
  const w = rect.width, h = rect.height;
  if (w < 4 || h < 4) return;

  holder.innerHTML = "";
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("preserveAspectRatio", "none");

  const soon = holder.parentElement.classList.contains("is-soon");
  const stroke = soon ? "#8c8577" : "#17140F";
  const sw = soon ? 2 : 2.6;

  const rand = makeRand(seed);
  const inset = 5;               // how far the frame sits inside the box
  const o = 11;                  // overshoot length past each corner
  const bow = 5;                 // hand-drawn curvature

  const L = inset, R = w - inset, T = inset, B = h - inset;

  const sides = [
    sidePath(L - o, T, R + o, T, bow, rand),   // top  (overshoots left & right)
    sidePath(R, T - o, R, B + o, bow, rand),   // right(overshoots top & bottom)
    sidePath(R + o, B, L - o, B, bow, rand),   // bottom
    sidePath(L, B + o, L, T - o, bow, rand),   // left
  ];

  for (const d of sides){
    const p = document.createElementNS(SVGNS, "path");
    p.setAttribute("d", d);
    p.setAttribute("fill", "none");
    p.setAttribute("stroke", stroke);
    p.setAttribute("stroke-width", sw);
    p.setAttribute("stroke-linecap", "round");
    if (soon) p.setAttribute("stroke-dasharray", "10 7");
    svg.appendChild(p);
  }
  holder.appendChild(svg);
}

function drawAll(){
  document.querySelectorAll(".sketch-holder").forEach((holder, i) => {
    drawSketch(holder, (i + 1) * 9173 + 41);
  });
}

let raf;
function scheduleDraw(){
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(drawAll);
}

window.addEventListener("load", drawAll);
window.addEventListener("resize", scheduleDraw);
// redraw once fonts settle (card heights can shift)
if (document.fonts && document.fonts.ready){
  document.fonts.ready.then(drawAll);
}


/* ------------------------------------------------------------------
   FAQ accordion: keep only one answer open at a time.
   ------------------------------------------------------------------ */
const faqItems = document.querySelectorAll(".faq-item");
faqItems.forEach((item) => {
  item.addEventListener("toggle", () => {
    if (item.open){
      faqItems.forEach((other) => { if (other !== item) other.open = false; });
    }
  });
});


/* ------------------------------------------------------------------
   Reveal figures as they scroll into view (subtle fade / scale in).
   ------------------------------------------------------------------ */
(function () {
  const targets = document.querySelectorAll(".reveal");
  if (!targets.length) return;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    targets.forEach((t) => t.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.18 });
  targets.forEach((t) => io.observe(t));
})();


/* ------------------------------------------------------------------
   How-it-works: draw converging connector lines from the three steps
   to a single meeting point, then on to the "1 instant transaction"
   label. Redraws on resize / font load so it always lines up.
   ------------------------------------------------------------------ */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  function mk(name, attrs) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function draw() {
    const flow = document.querySelector(".mock-flow");
    if (!flow) return;
    const svg = flow.querySelector(".mock-conn");
    const stepsWrap = flow.querySelector(".mock-steps");
    const result = flow.querySelector(".mock-result");
    const steps = flow ? [...flow.querySelectorAll(".mock-step")] : [];
    if (!svg || !stepsWrap || !result || !steps.length) return;

    const fr = flow.getBoundingClientRect();
    const ow = flow.offsetWidth, oh = flow.offsetHeight;
    if (ow < 10 || oh < 10) return;
    // undo any CSS transform (reveal scale) so coords map to the layout box
    const sx = fr.width / ow || 1, sy = fr.height / oh || 1;
    const toX = (px) => (px - fr.left) / sx;
    const toY = (px) => (px - fr.top) / sy;

    svg.setAttribute("viewBox", `0 0 ${ow} ${oh}`);
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const ink = "#17140F";
    const sc = stepsWrap.getBoundingClientRect();
    const rr = result.getBoundingClientRect();
    const originX = toX(sc.right) + 8;
    const resX = toX(rr.left) - 5;
    const meetX = originX + (resX - originX) * 0.45;
    const meetY = toY((rr.top + rr.bottom) / 2);

    steps.forEach((s) => {
      const b = s.getBoundingClientRect();
      const y = toY((b.top + b.bottom) / 2);
      svg.appendChild(mk("path", {
        d: `M ${originX.toFixed(1)} ${y.toFixed(1)} L ${meetX.toFixed(1)} ${meetY.toFixed(1)}`,
        fill: "none", stroke: ink, "stroke-width": 2, "stroke-linecap": "round"
      }));
    });
    // meeting point
    svg.appendChild(mk("circle", { cx: meetX.toFixed(1), cy: meetY.toFixed(1), r: 3.6, fill: ink }));
    // meeting point -> result label, with arrowhead
    svg.appendChild(mk("path", {
      d: `M ${meetX.toFixed(1)} ${meetY.toFixed(1)} L ${resX.toFixed(1)} ${meetY.toFixed(1)}`,
      fill: "none", stroke: ink, "stroke-width": 2.4, "stroke-linecap": "round"
    }));
    svg.appendChild(mk("path", {
      d: `M ${(resX - 7).toFixed(1)} ${(meetY - 5).toFixed(1)} L ${resX.toFixed(1)} ${meetY.toFixed(1)} L ${(resX - 7).toFixed(1)} ${(meetY + 5).toFixed(1)}`,
      fill: "none", stroke: ink, "stroke-width": 2.4, "stroke-linecap": "round", "stroke-linejoin": "round"
    }));
  }
  let raf;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
  window.addEventListener("load", () => setTimeout(draw, 60));
  window.addEventListener("resize", schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(draw, 30));
  if ("ResizeObserver" in window) {
    const flow = document.querySelector(".mock-flow");
    if (flow) new ResizeObserver(schedule).observe(flow);
  }
  setTimeout(draw, 900); // after reveal transition settles
})();

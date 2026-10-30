/** Curvas de nivel decorativas de la cabecera. */
export function drawContours(svg: SVGSVGElement): void {
  const cx = 190, cy = 95;
  let html = "";
  for (let r = 1; r <= 9; r++) {
    const base = r * 13;
    let d = "";
    for (let t = 0; t <= 64; t++) {
      const a = (t / 64) * Math.PI * 2;
      const wob = 1 + 0.12 * Math.sin(a * 3 + r * 0.7) + 0.07 * Math.cos(a * 5 - r);
      const x = cx + Math.cos(a) * base * 1.35 * wob;
      const y = cy + Math.sin(a) * base * wob;
      d += (t ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }
    html += `<path d="${d}Z"${r % 4 === 0 ? ' style="stroke-width:2"' : ""}/>`;
  }
  svg.innerHTML = html;
}

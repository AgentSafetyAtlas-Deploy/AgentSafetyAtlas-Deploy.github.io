// Drop-down menus of the top navigation open on hover (owner, 2026-10-26): Findings, Observations and More. On a device
// without hover the menus keep opening on tap. The navigation is redrawn on every view change, so the listeners are delegated.
const canHover = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
const menuOf = el => el && el.closest ? el.closest('details.site-nav-more') : null;
document.addEventListener('mouseover', e => {
  if (!canHover()) return;
  const d = menuOf(e.target);
  for (const x of document.querySelectorAll('details.site-nav-more[open]')) if (x !== d) x.open = false;
  if (d && !d.open) d.open = true;
});
document.addEventListener('mouseout', e => {
  if (!canHover()) return;
  const d = menuOf(e.target);
  if (d && !d.contains(e.relatedTarget)) d.open = false;
});
// with hover, a click on the menu title must not close the menu the pointer just opened
document.addEventListener('click', e => {
  if (canHover() && e.target.closest && e.target.closest('details.site-nav-more > summary')) e.preventDefault();
});
// keep an open menu inside the window: when the navigation wraps, a right-anchored panel could run off the left edge
function place(d) {
  const p = d.querySelector('.site-nav-panel');
  if (!p) return;
  p.style.left = ''; p.style.right = '';
  const r = p.getBoundingClientRect(), dr = d.getBoundingClientRect(), m = 8;
  const want = Math.min(Math.max(r.left, m), innerWidth - m - r.width);
  if (Math.abs(want - r.left) > 0.5) { p.style.right = 'auto'; p.style.left = `${want - dr.left}px`; }
}
document.addEventListener('toggle', e => { if (e.target.matches && e.target.matches('details.site-nav-more') && e.target.open) place(e.target); }, true);
addEventListener('resize', () => { for (const d of document.querySelectorAll('details.site-nav-more[open]')) place(d); });

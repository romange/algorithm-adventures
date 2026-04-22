export const SVG_NS = 'http://www.w3.org/2000/svg';
export const TILE = 80;
export const GRID = 6;

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

export function createBoard(parent) {
  const svg = el('svg', {
    xmlns: SVG_NS,
    viewBox: `0 0 ${GRID * TILE} ${GRID * TILE}`,
    width: GRID * TILE,
    height: GRID * TILE,
    class: 'board'
  });
  const bg = el('rect', {
    x: 0, y: 0, width: GRID * TILE, height: GRID * TILE, fill: '#E8F5E9'
  });
  svg.appendChild(bg);
  for (let i = 1; i < GRID; i++) {
    svg.appendChild(el('line', {
      x1: i * TILE, y1: 0, x2: i * TILE, y2: GRID * TILE,
      stroke: '#C8E6C9', 'stroke-width': 1
    }));
    svg.appendChild(el('line', {
      x1: 0, y1: i * TILE, x2: GRID * TILE, y2: i * TILE,
      stroke: '#C8E6C9', 'stroke-width': 1
    }));
  }
  parent.appendChild(svg);
  return svg;
}

export function makeWall(x, y) {
  const g = el('g', { class: 'wall' });
  g.appendChild(el('rect', {
    x: x * TILE, y: y * TILE, width: TILE, height: TILE,
    fill: '#6D4C41', stroke: '#3E2723', 'stroke-width': 2
  }));
  for (let i = 0; i < 3; i++) {
    g.appendChild(el('line', {
      x1: x * TILE, y1: y * TILE + (i + 1) * TILE / 3,
      x2: (x + 1) * TILE, y2: y * TILE + (i + 1) * TILE / 3,
      stroke: '#3E2723', 'stroke-width': 1.5
    }));
  }
  return g;
}

export function makeHome(x, y) {
  return el('rect', {
    x: x * TILE + 6, y: y * TILE + 6,
    width: TILE - 12, height: TILE - 12,
    fill: '#FFF59D', stroke: '#F9A825', 'stroke-width': 3,
    'stroke-dasharray': '8,4', rx: 10, class: 'home'
  });
}

export function makeLettuce(x, y) {
  const cx = x * TILE + TILE / 2;
  const cy = y * TILE + TILE / 2;
  const g = el('g', {
    class: 'lettuce',
    transform: `translate(${cx} ${cy})`
  });
  g.appendChild(el('circle', { cx: 0, cy: 4, r: 28, fill: '#66BB6A', stroke: '#2E7D32', 'stroke-width': 2 }));
  g.appendChild(el('circle', { cx: -10, cy: -6, r: 16, fill: '#81C784' }));
  g.appendChild(el('circle', { cx: 10, cy: -4, r: 14, fill: '#A5D6A7' }));
  g.appendChild(el('circle', { cx: 0, cy: 10, r: 14, fill: '#81C784' }));
  g.appendChild(el('circle', { cx: -4, cy: 0, r: 8, fill: '#C8E6C9' }));
  return g;
}

export function makeTurtle() {
  const g = el('g', { class: 'turtle' });
  g.appendChild(el('circle', { cx: 0, cy: 0, r: 26, fill: '#388E3C', stroke: '#1B5E20', 'stroke-width': 2 }));
  g.appendChild(el('circle', { cx: 0, cy: 0, r: 20, fill: '#43A047' }));
  g.appendChild(el('path', {
    d: 'M 0 -18 L -10 0 L 0 18 L 10 0 Z',
    fill: '#2E7D32', opacity: 0.5
  }));
  g.appendChild(el('circle', { cx: -22, cy: -16, r: 8, fill: '#558B2F' }));
  g.appendChild(el('circle', { cx: 22, cy: -16, r: 8, fill: '#558B2F' }));
  g.appendChild(el('circle', { cx: -22, cy: 16, r: 8, fill: '#558B2F' }));
  g.appendChild(el('circle', { cx: 22, cy: 16, r: 8, fill: '#558B2F' }));
  g.appendChild(el('circle', { cx: 0, cy: -26, r: 11, fill: '#558B2F', stroke: '#1B5E20', 'stroke-width': 1.5 }));
  g.appendChild(el('circle', { cx: -4, cy: -30, r: 1.8, fill: '#000' }));
  g.appendChild(el('circle', { cx: 4, cy: -30, r: 1.8, fill: '#000' }));
  return g;
}

export function positionTurtle(turtleEl, x, y, facing) {
  const cx = x * TILE + TILE / 2;
  const cy = y * TILE + TILE / 2;
  const deg = { up: 0, right: 90, down: 180, left: 270 }[facing];
  turtleEl.setAttribute('transform', `translate(${cx} ${cy}) rotate(${deg})`);
}

export function makeStar() {
  const g = el('g', { class: 'star' });
  g.appendChild(el('path', {
    d: 'M 0 -8 L 1.8 -2.5 L 7.6 -2.5 L 2.9 0.9 L 4.7 6.5 L 0 3 L -4.7 6.5 L -2.9 0.9 L -7.6 -2.5 L -1.8 -2.5 Z',
    fill: '#FFD54F',
    stroke: '#F57F17',
    'stroke-width': 1,
    'stroke-linejoin': 'round'
  }));
  g.appendChild(el('circle', { cx: -1.5, cy: -3, r: 1.2, fill: '#FFF9C4', opacity: 0.9 }));
  return g;
}

export function makeTear() {
  const g = el('g', { class: 'tear' });
  g.appendChild(el('path', {
    d: 'M 0 -10 C -6 -2 -6 4 0 10 C 6 4 6 -2 0 -10 Z',
    fill: '#42A5F5',
    stroke: '#1565C0',
    'stroke-width': 1
  }));
  g.appendChild(el('ellipse', {
    cx: -2, cy: -4, rx: 2, ry: 3.2,
    fill: '#E3F2FD', opacity: 0.85
  }));
  return g;
}

export function turtleCenter(x, y) {
  return { cx: x * TILE + TILE / 2, cy: y * TILE + TILE / 2 };
}

export function commandIcon(direction, count) {
  const arrow = { up: '↑', right: '→', down: '↓', left: '←' }[direction];
  const div = document.createElement('div');
  div.className = 'cmd-icon';
  div.innerHTML = `<span class="cmd-arrow">${arrow}</span><span class="cmd-count">${count}</span>`;
  return div;
}

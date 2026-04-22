const DIRECTION_WORDS = {
  'ימינה': 'right',
  'שמאלה': 'left',
  'למעלה': 'up',
  'למטה': 'down'
};

const NUMBER_WORDS = {
  'אחד': 1, 'אחת': 1,
  'שניים': 2, 'שתיים': 2, 'שני': 2, 'שתי': 2,
  'שלושה': 3, 'שלוש': 3,
  'ארבעה': 4, 'ארבע': 4,
  'חמישה': 5, 'חמש': 5,
  'שישה': 6, 'שש': 6,
  'שבעה': 7, 'שבע': 7,
  'שמונה': 8,
  'תשעה': 9, 'תשע': 9,
  'עשרה': 10, 'עשר': 10
};

const DIRECTION_LABEL_HE = {
  right: 'ימינה',
  left: 'שמאלה',
  up: 'למעלה',
  down: 'למטה'
};

const COUNT_LABEL_HE = {
  1: 'צעד אחד',
  2: 'שני צעדים',
  3: 'שלושה צעדים',
  4: 'ארבעה צעדים',
  5: 'חמישה צעדים',
  6: 'שישה צעדים',
  7: 'שבעה צעדים',
  8: 'שמונה צעדים',
  9: 'תשעה צעדים',
  10: 'עשרה צעדים'
};

function normalize(text) {
  return text
    .replace(/[֑-ׇ]/g, '')
    .replace(/[.,!?;:'"()\[\]]/g, ' ')
    .trim();
}

function tokenNumber(tok) {
  if (NUMBER_WORDS[tok] !== undefined) return NUMBER_WORDS[tok];
  if (/^\d+$/.test(tok)) {
    const n = parseInt(tok, 10);
    if (n >= 1 && n <= 10) return n;
  }
  return null;
}

export function parseCommands(transcript) {
  if (!transcript) return [];
  const tokens = normalize(transcript).split(/\s+/).filter(Boolean);
  const commands = [];
  let pendingDir = null;
  let pendingCount = null;

  const flush = () => {
    if (pendingDir) {
      commands.push({ direction: pendingDir, count: pendingCount ?? 1 });
    }
    pendingDir = null;
    pendingCount = null;
  };

  for (const tok of tokens) {
    if (DIRECTION_WORDS[tok]) {
      if (pendingDir) flush();
      pendingDir = DIRECTION_WORDS[tok];
    } else {
      const n = tokenNumber(tok);
      if (n !== null) {
        if (pendingDir && pendingCount !== null) flush();
        pendingCount = n;
      }
    }
  }
  flush();
  return commands;
}

export function parseCommand(transcript) {
  const cmds = parseCommands(transcript);
  return cmds[0] ?? null;
}

export function describeCommandHebrew({ direction, count }) {
  return `${COUNT_LABEL_HE[count]} ${DIRECTION_LABEL_HE[direction]}`;
}

export const DIRECTION_VECTORS = {
  up:    { dx:  0, dy: -1 },
  down:  { dx:  0, dy:  1 },
  left:  { dx: -1, dy:  0 },
  right: { dx:  1, dy:  0 }
};

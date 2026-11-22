import {
  applyListEdit,
  breakLine,
  indentLine,
  MARKERS,
  outdentLine,
  rebaseEdit,
  stripBullets,
  type ListEdit,
} from './list-text';

const [TOP, SUB] = MARKERS;
const TOP_GLYPH = TOP.trimEnd();
const SUB_GLYPH = SUB.trim();
const GLYPH_WITHOUT_SELECTOR = TOP_GLYPH.slice(0, 1);

function marked(source: string): ListEdit {
  const first = source.indexOf('|');
  const last = source.lastIndexOf('|');
  return {
    text: source.replaceAll('|', ''),
    selection: { start: first, end: first === last ? first : last - 1 },
  };
}

function pressReturn(source: string) {
  const { text, selection } = marked(source);
  return breakLine(text, selection);
}

function pressTab(source: string) {
  const { text, selection } = marked(source);
  return indentLine(text, selection.start);
}

function pressShiftTab(source: string) {
  const { text, selection } = marked(source);
  return outdentLine(text, selection.start);
}

describe('breakLine', () => {
  it('continues the list from the end of a bullet at the same tier', () => {
    expect(pressReturn(`${TOP}a|`)).toEqual(marked(`${TOP}a\n${TOP}|`));
    expect(pressReturn(`${SUB}a|`)).toEqual(marked(`${SUB}a\n${SUB}|`));
  });

  it('splits a bullet in two from the middle of its text', () => {
    expect(pressReturn(`${TOP}a|b`)).toEqual(marked(`${TOP}a\n${TOP}|b`));
  });

  it('replaces a selected range with the break', () => {
    expect(pressReturn(`${TOP}a|bc|d`)).toEqual(marked(`${TOP}a\n${TOP}|d`));
  });

  it('opens an empty bullet above when pressed before or inside the marker', () => {
    expect(pressReturn(`|${TOP}a`)).toEqual(marked(`${TOP}\n${TOP}|a`));
    expect(pressReturn(`${TOP_GLYPH}| a`)).toEqual(marked(`${TOP}\n${TOP}|a`));
  });

  it('outdents an empty indented bullet, then ends the list from an empty bullet', () => {
    expect(pressReturn(`${TOP}a\n${SUB}|`)).toEqual(marked(`${TOP}a\n${TOP}|`));
    expect(pressReturn(`${TOP}a\n${TOP}|`)).toEqual(marked(`${TOP}a\n|`));
    expect(pressReturn(`${TOP}|`)).toEqual(marked('|'));
  });

  it('is a plain break on a prose line', () => {
    expect(pressReturn('note|')).toEqual(marked('note\n|'));
    expect(pressReturn('no|te')).toEqual(marked('no\n|te'));
  });
});

describe('indentLine', () => {
  it('indents a top-level bullet one tier, keeping the caret in its text', () => {
    expect(pressTab(`${TOP}a|b`)).toEqual(marked(`${SUB}a|b`));
    expect(pressTab(`x\n${TOP}a|b`)).toEqual(marked(`x\n${SUB}a|b`));
  });

  it('puts a caret from inside the marker after the new marker', () => {
    expect(pressTab(`|${TOP}ab`)).toEqual(marked(`${SUB}|ab`));
  });

  it('does nothing on an indented bullet or a prose line', () => {
    expect(pressTab(`${SUB}a|`)).toBeUndefined();
    expect(pressTab('no|te')).toBeUndefined();
  });
});

describe('outdentLine', () => {
  it('outdents an indented bullet one tier, keeping the caret in its text', () => {
    expect(pressShiftTab(`${SUB}a|b`)).toEqual(marked(`${TOP}a|b`));
    expect(pressShiftTab(`x\n${SUB}a|b`)).toEqual(marked(`x\n${TOP}a|b`));
  });

  it('takes a top-level bullet off the list', () => {
    expect(pressShiftTab(`${TOP}a|b`)).toEqual(marked('a|b'));
    expect(pressShiftTab(`${TOP}a\n${TOP}|`)).toEqual(marked(`${TOP}a\n|`));
  });

  it('puts a caret from inside the marker at the start of the text', () => {
    expect(pressShiftTab(`|${SUB}ab`)).toEqual(marked(`${TOP}|ab`));
    expect(pressShiftTab(`|${TOP}ab`)).toEqual(marked('|ab'));
  });

  it('does nothing on a prose line', () => {
    expect(pressShiftTab('no|te')).toBeUndefined();
  });
});

describe('applyListEdit', () => {
  describe('a break the platform inserted', () => {
    it('continues the list at the same tier', () => {
      expect(applyListEdit(`${TOP}a`, `${TOP}a\n`)).toEqual(marked(`${TOP}a\n${TOP}|`));
      expect(applyListEdit(`${SUB}a`, `${SUB}a\n`)).toEqual(marked(`${SUB}a\n${SUB}|`));
    });

    it('splits a bullet in two from the middle of its text', () => {
      expect(applyListEdit(`${TOP}ab`, `${TOP}a\nb`)).toEqual(marked(`${TOP}a\n${TOP}|b`));
    });

    it('opens an empty bullet above when pressed before or inside the marker', () => {
      expect(applyListEdit(`${TOP}a`, `${TOP}\na`)).toEqual(marked(`${TOP}\n${TOP}|a`));
      expect(applyListEdit(`${TOP}a`, `\n${TOP}a`)).toEqual(marked(`${TOP}\n${TOP}|a`));
    });

    it('ends the list from an empty bullet, dropping that bullet', () => {
      expect(applyListEdit(`${TOP}a\n${TOP}`, `${TOP}a\n${TOP}\n`)).toEqual(marked(`${TOP}a\n|`));
      expect(applyListEdit(`${TOP}a\n${TOP}\n${TOP}b`, `${TOP}a\n${TOP}\n\n${TOP}b`)).toEqual(
        marked(`${TOP}a\n|\n${TOP}b`),
      );
      expect(applyListEdit(`${TOP}\nx`, `${TOP}\n\nx`)).toEqual(marked('|\nx'));
    });

    it('outdents an empty indented bullet', () => {
      expect(applyListEdit(`${TOP}a\n${SUB}`, `${TOP}a\n${SUB}\n`)).toEqual(
        marked(`${TOP}a\n${TOP}|`),
      );
    });

    it('empties the text from the only bullet', () => {
      expect(applyListEdit(TOP, `${TOP}\n`)).toEqual(marked('|'));
    });

    it('stays a plain break on a prose line', () => {
      expect(applyListEdit('note', 'note\n')).toEqual(marked('note\n|'));
      expect(applyListEdit(`x\n${TOP}b`, `x\n\n${TOP}b`)).toEqual(marked(`x\n\n|${TOP}b`));
    });

    it('stays a plain break on the blank lines below a list', () => {
      expect(applyListEdit(`${TOP}a\n`, `${TOP}a\n\n`)).toEqual(marked(`${TOP}a\n\n|`));
      expect(applyListEdit(`${TOP}a\n\n${TOP}b`, `${TOP}a\n\n\n${TOP}b`)).toEqual(
        marked(`${TOP}a\n\n\n|${TOP}b`),
      );
      expect(applyListEdit(`${TOP}a\n${TOP}\n\n${TOP}b`, `${TOP}a\n${TOP}\n\n\n${TOP}b`)).toEqual(
        marked(`${TOP}a\n${TOP}\n\n\n|${TOP}b`),
      );
    });

    it('inserts a bullet between two bullets', () => {
      expect(applyListEdit(`${TOP}a\n${TOP}b`, `${TOP}a\n\n${TOP}b`)).toEqual(
        marked(`${TOP}a\n${TOP}|\n${TOP}b`),
      );
    });
  });

  describe('a tab the platform inserted', () => {
    it('indents a top-level bullet instead of keeping the tab', () => {
      expect(applyListEdit(`${TOP}ab`, `${TOP}a\tb`)).toEqual(marked(`${SUB}a|b`));
    });

    it('is swallowed on an indented bullet', () => {
      expect(applyListEdit(`${SUB}a`, `${SUB}a\t`)).toEqual(marked(`${SUB}a|`));
    });

    it('stays a tab on a prose line', () => {
      expect(applyListEdit('x', 'x\t')).toEqual(marked('x\t|'));
    });
  });

  describe('Backspace and Delete', () => {
    it('removes the bullet from the start of its text', () => {
      expect(applyListEdit(`${TOP}a\n${TOP}b`, `${TOP}a\n${TOP_GLYPH}b`)).toEqual(
        marked(`${TOP}a\n|b`),
      );
      expect(applyListEdit(`${TOP} x`, `${TOP}x`)).toEqual(marked('| x'));
    });

    it('outdents an indented bullet from the start of its text', () => {
      expect(applyListEdit(`${SUB}a`, `${SUB.trimEnd()}a`)).toEqual(marked(`${TOP}|a`));
      expect(applyListEdit(`${SUB}a`, `${SUB.slice(1)}a`)).toEqual(marked(`${TOP}|a`));
    });

    it('removes the bullet when its marker glyph is deleted, whole or by its selector', () => {
      expect(applyListEdit(`${TOP}a`, ' a')).toEqual(marked('|a'));
      expect(applyListEdit(`${TOP}a`, `${GLYPH_WITHOUT_SELECTOR} a`)).toEqual(marked('|a'));
    });

    it('outdents an indented bullet when its marker glyph is deleted', () => {
      expect(applyListEdit(`${SUB}a`, SUB.replace(SUB_GLYPH, '') + 'a')).toEqual(
        marked(`${TOP}|a`),
      );
    });

    it('empties the text when the only bullet is deleted', () => {
      expect(applyListEdit(TOP, TOP_GLYPH)).toEqual(marked('|'));
    });

    it('joins a bullet onto the line above without its bullet', () => {
      expect(applyListEdit(`${TOP}a\n${TOP}b`, `${TOP}a${TOP}b`)).toEqual(marked(`${TOP}a|b`));
      expect(applyListEdit(`${TOP}a\n${SUB}b`, `${TOP}a${SUB}b`)).toEqual(marked(`${TOP}a|b`));
      expect(applyListEdit(`p\n${TOP}b`, `p${TOP}b`)).toEqual(marked('p|b'));
    });

    it('removes a blank line between bullets and keeps the bullet below', () => {
      expect(applyListEdit(`${TOP}a\n\n${TOP}b`, `${TOP}a\n${TOP}b`)).toEqual(
        marked(`${TOP}a\n|${TOP}b`),
      );
    });

    it('passes a deletion inside bullet text through', () => {
      expect(applyListEdit(`${TOP}ab`, `${TOP}a`)).toEqual(marked(`${TOP}a|`));
    });
  });

  describe('typed markers', () => {
    it('turns "- " or "* " at a line start into a bullet', () => {
      expect(applyListEdit('-', '- ')).toEqual(marked(`${TOP}|`));
      expect(applyListEdit(`${TOP}a\n*`, `${TOP}a\n* `)).toEqual(marked(`${TOP}a\n${TOP}|`));
      expect(applyListEdit('-abc', '- abc')).toEqual(marked(`${TOP}|abc`));
    });

    it('leaves a dash inside a line alone', () => {
      expect(applyListEdit('a -', 'a - ')).toEqual(marked('a - |'));
    });
  });

  it('passes pastes, selection deletes and replacements through', () => {
    expect(applyListEdit(`${TOP}a`, `${TOP}a\nx\ny`)).toEqual(marked(`${TOP}a\nx\ny|`));
    expect(applyListEdit(`${TOP}ab`, TOP)).toEqual(marked(`${TOP}|`));
    expect(applyListEdit(`${TOP}teh`, `${TOP}the`)).toEqual(marked(`${TOP}the|`));
  });
});

describe('rebaseEdit', () => {
  it('passes a key typed on the current text through', () => {
    expect(rebaseEdit(['- '], TOP, `${TOP}a`)).toBe(`${TOP}a`);
    expect(rebaseEdit([`${TOP}a`], `${TOP}a\n${TOP}`, `${TOP}a\n${TOP_GLYPH}`)).toBe(
      `${TOP}a\n${TOP_GLYPH}`,
    );
  });

  it('replays a key typed on the text from before a rewrite', () => {
    expect(rebaseEdit(['- '], TOP, '- a')).toBe(`${TOP}a`);
    expect(rebaseEdit([`${TOP}a`], `${TOP}a\n${TOP}`, `${TOP}ab`)).toBe(`${TOP}a\n${TOP}b`);
    expect(rebaseEdit([`${TOP}a\n${TOP}`], `${TOP}a\n`, `${TOP}a\n${TOP}b`)).toBe(`${TOP}a\nb`);
    expect(rebaseEdit(['x\n- '], `x\n${TOP}`, 'yx\n- ')).toBe(`yx\n${TOP}`);
  });

  it('replays a key typed on a rewrite that a later one has replaced', () => {
    expect(
      rebaseEdit([`${TOP}ab`, `${TOP}a\n${TOP}b`], `${TOP}a\n${TOP}b\n${TOP}`, `${TOP}a\n${TOP}bc`),
    ).toBe(`${TOP}a\n${TOP}b\n${TOP}c`);
  });

  it('passes an edit that undoes a rewrite through', () => {
    expect(rebaseEdit(['ab'], 'ab\n', 'ab')).toBe('ab');
    expect(rebaseEdit([`${TOP}a`, `${TOP}a\n${TOP}`], `${TOP}a\n`, '')).toBe('');
  });

  it('passes a key typed inside the rewritten text through', () => {
    expect(rebaseEdit([`a\n${TOP}`], 'a\n', `a\n${TOP_GLYPH}x `)).toBe(`a\n${TOP_GLYPH}x `);
  });
});

describe('stripBullets', () => {
  it('drops the marker from every line that has one', () => {
    expect(stripBullets(`${TOP}a\n${SUB}b`)).toBe('a\nb');
    expect(stripBullets(`${TOP}\n${SUB}`)).toBe('\n');
    expect(stripBullets('plain\n- dash')).toBe('plain\n- dash');
  });
});

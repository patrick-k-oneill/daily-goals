import {
  applyListEdit,
  breakLine,
  indentLine,
  rebaseEdit,
  stripBullets,
  type ListEdit,
} from './list-text';

function edit(text: string, caret: number): ListEdit {
  return { text, selection: { start: caret, end: caret } };
}

function caret(at: number) {
  return { start: at, end: at };
}

describe('breakLine', () => {
  it('continues the list from the end of a bullet at the same tier', () => {
    expect(breakLine('● a', caret(3))).toEqual(edit('● a\n● ', 6));
    expect(breakLine('  ○ a', caret(5))).toEqual(edit('  ○ a\n  ○ ', 10));
  });

  it('splits a bullet in two from the middle of its text', () => {
    expect(breakLine('● ab', caret(3))).toEqual(edit('● a\n● b', 6));
  });

  it('replaces a selected range with the break', () => {
    expect(breakLine('● abcd', { start: 3, end: 5 })).toEqual(edit('● a\n● d', 6));
  });

  it('opens an empty bullet above when pressed before or inside the marker', () => {
    expect(breakLine('● a', caret(0))).toEqual(edit('● \n● a', 5));
    expect(breakLine('● a', caret(1))).toEqual(edit('● \n● a', 5));
  });

  it('outdents an empty indented bullet, then ends the list from an empty bullet', () => {
    expect(breakLine('● a\n  ○ ', caret(8))).toEqual(edit('● a\n● ', 6));
    expect(breakLine('● a\n● ', caret(6))).toEqual(edit('● a\n', 4));
    expect(breakLine('● ', caret(2))).toEqual(edit('', 0));
  });

  it('is a plain break on a prose line', () => {
    expect(breakLine('note', caret(4))).toEqual(edit('note\n', 5));
    expect(breakLine('note', caret(2))).toEqual(edit('no\nte', 3));
  });
});

describe('indentLine', () => {
  it('indents a top-level bullet one tier, keeping the caret in its text', () => {
    expect(indentLine('● ab', 3)).toEqual(edit('  ○ ab', 5));
    expect(indentLine('x\n● ab', 5)).toEqual(edit('x\n  ○ ab', 7));
  });

  it('puts a caret from inside the marker after the new marker', () => {
    expect(indentLine('● ab', 0)).toEqual(edit('  ○ ab', 4));
  });

  it('does nothing on an indented bullet or a prose line', () => {
    expect(indentLine('  ○ a', 5)).toBeUndefined();
    expect(indentLine('note', 2)).toBeUndefined();
  });
});

describe('applyListEdit', () => {
  describe('a break the platform inserted', () => {
    it('continues the list at the same tier', () => {
      expect(applyListEdit('● a', '● a\n')).toEqual(edit('● a\n● ', 6));
      expect(applyListEdit('  ○ a', '  ○ a\n')).toEqual(edit('  ○ a\n  ○ ', 10));
    });

    it('splits a bullet in two from the middle of its text', () => {
      expect(applyListEdit('● ab', '● a\nb')).toEqual(edit('● a\n● b', 6));
    });

    it('opens an empty bullet above when pressed before or inside the marker', () => {
      expect(applyListEdit('● a', '● \na')).toEqual(edit('● \n● a', 5));
      expect(applyListEdit('● a', '\n● a')).toEqual(edit('● \n● a', 5));
    });

    it('ends the list from an empty bullet, dropping that bullet', () => {
      expect(applyListEdit('● a\n● ', '● a\n● \n')).toEqual(edit('● a\n', 4));
      expect(applyListEdit('● a\n● \n● b', '● a\n● \n\n● b')).toEqual(edit('● a\n\n● b', 4));
      expect(applyListEdit('● \nx', '● \n\nx')).toEqual(edit('\nx', 0));
    });

    it('outdents an empty indented bullet', () => {
      expect(applyListEdit('● a\n  ○ ', '● a\n  ○ \n')).toEqual(edit('● a\n● ', 6));
    });

    it('empties the text from the only bullet', () => {
      expect(applyListEdit('● ', '● \n')).toEqual(edit('', 0));
    });

    it('stays a plain break on a prose line', () => {
      expect(applyListEdit('note', 'note\n')).toEqual(edit('note\n', 5));
      expect(applyListEdit('x\n● b', 'x\n\n● b')).toEqual(edit('x\n\n● b', 3));
    });

    it('stays a plain break on the blank lines below a list', () => {
      expect(applyListEdit('● a\n', '● a\n\n')).toEqual(edit('● a\n\n', 5));
      expect(applyListEdit('● a\n\n● b', '● a\n\n\n● b')).toEqual(edit('● a\n\n\n● b', 6));
      expect(applyListEdit('● a\n● \n\n● b', '● a\n● \n\n\n● b')).toEqual(
        edit('● a\n● \n\n\n● b', 9),
      );
    });

    it('inserts a bullet between two bullets', () => {
      expect(applyListEdit('● a\n● b', '● a\n\n● b')).toEqual(edit('● a\n● \n● b', 6));
    });
  });

  describe('a tab the platform inserted', () => {
    it('indents a top-level bullet instead of keeping the tab', () => {
      expect(applyListEdit('● ab', '● a\tb')).toEqual(edit('  ○ ab', 5));
    });

    it('is swallowed on an indented bullet', () => {
      expect(applyListEdit('  ○ a', '  ○ a\t')).toEqual(edit('  ○ a', 5));
    });

    it('stays a tab on a prose line', () => {
      expect(applyListEdit('x', 'x\t')).toEqual(edit('x\t', 2));
    });
  });

  describe('Backspace and Delete', () => {
    it('removes the bullet from the start of its text', () => {
      expect(applyListEdit('● a\n● b', '● a\n●b')).toEqual(edit('● a\nb', 4));
      expect(applyListEdit('●  x', '● x')).toEqual(edit(' x', 0));
    });

    it('outdents an indented bullet from the start of its text', () => {
      expect(applyListEdit('  ○ a', '  ○a')).toEqual(edit('● a', 2));
      expect(applyListEdit('  ○ a', ' ○ a')).toEqual(edit('● a', 2));
    });

    it('removes the bullet when its marker glyph is deleted', () => {
      expect(applyListEdit('● a', ' a')).toEqual(edit('a', 0));
    });

    it('empties the text when the only bullet is deleted', () => {
      expect(applyListEdit('● ', '●')).toEqual(edit('', 0));
    });

    it('joins a bullet onto the line above without its bullet', () => {
      expect(applyListEdit('● a\n● b', '● a● b')).toEqual(edit('● ab', 3));
      expect(applyListEdit('● a\n  ○ b', '● a  ○ b')).toEqual(edit('● ab', 3));
      expect(applyListEdit('p\n● b', 'p● b')).toEqual(edit('pb', 1));
    });

    it('removes a blank line between bullets and keeps the bullet below', () => {
      expect(applyListEdit('● a\n\n● b', '● a\n● b')).toEqual(edit('● a\n● b', 4));
    });

    it('passes a deletion inside bullet text through', () => {
      expect(applyListEdit('● ab', '● a')).toEqual(edit('● a', 3));
    });
  });

  describe('typed markers', () => {
    it('turns "- " or "* " at a line start into a bullet', () => {
      expect(applyListEdit('-', '- ')).toEqual(edit('● ', 2));
      expect(applyListEdit('● a\n*', '● a\n* ')).toEqual(edit('● a\n● ', 6));
      expect(applyListEdit('-abc', '- abc')).toEqual(edit('● abc', 2));
    });

    it('leaves a dash inside a line alone', () => {
      expect(applyListEdit('a -', 'a - ')).toEqual(edit('a - ', 4));
    });
  });

  it('passes pastes, selection deletes and replacements through', () => {
    expect(applyListEdit('● a', '● a\nx\ny')).toEqual(edit('● a\nx\ny', 7));
    expect(applyListEdit('● ab', '● ')).toEqual(edit('● ', 2));
    expect(applyListEdit('● teh', '● the')).toEqual(edit('● the', 5));
  });
});

describe('rebaseEdit', () => {
  it('passes a key typed on the current text through', () => {
    expect(rebaseEdit(['- '], '● ', '● a')).toBe('● a');
    expect(rebaseEdit(['● a'], '● a\n● ', '● a\n●')).toBe('● a\n●');
  });

  it('replays a key typed on the text from before a rewrite', () => {
    expect(rebaseEdit(['- '], '● ', '- a')).toBe('● a');
    expect(rebaseEdit(['● a'], '● a\n● ', '● ab')).toBe('● a\n● b');
    expect(rebaseEdit(['● a\n● '], '● a\n', '● a\n● b')).toBe('● a\nb');
    expect(rebaseEdit(['x\n- '], 'x\n● ', 'yx\n- ')).toBe('yx\n● ');
  });

  it('replays a key typed on a rewrite that a later one has replaced', () => {
    expect(rebaseEdit(['● ab', '● a\n● b'], '● a\n● b\n● ', '● a\n● bc')).toBe('● a\n● b\n● c');
  });

  it('passes an edit that undoes a rewrite through', () => {
    expect(rebaseEdit(['ab'], 'ab\n', 'ab')).toBe('ab');
    expect(rebaseEdit(['● a', '● a\n● '], '● a\n', '')).toBe('');
  });

  it('passes a key typed inside the rewritten text through', () => {
    expect(rebaseEdit(['a\n● '], 'a\n', 'a\n●x ')).toBe('a\n●x ');
  });
});

describe('stripBullets', () => {
  it('drops the marker from every line that has one', () => {
    expect(stripBullets('● a\n  ○ b')).toBe('a\nb');
    expect(stripBullets('● \n  ○ ')).toBe('\n');
    expect(stripBullets('plain\n- dash')).toBe('plain\n- dash');
  });
});

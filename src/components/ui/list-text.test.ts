import { applyListEdit, startList, stripBullets, type ListEdit } from './list-text';

function edit(text: string, caret: number): ListEdit {
  return { text, selection: { start: caret, end: caret } };
}

describe('startList', () => {
  it('writes the first bullet with the caret after it', () => {
    expect(startList()).toEqual(edit('• ', 2));
  });
});

describe('applyListEdit', () => {
  describe('Return', () => {
    it('continues the list from the end of a bullet', () => {
      expect(applyListEdit('• a', '• a\n')).toEqual(edit('• a\n• ', 6));
    });

    it('splits a bullet in two from the middle of its text', () => {
      expect(applyListEdit('• ab', '• a\nb')).toEqual(edit('• a\n• b', 6));
    });

    it('opens an empty bullet above when pressed before or inside the marker', () => {
      expect(applyListEdit('• a', '• \na')).toEqual(edit('• \n• a', 5));
      expect(applyListEdit('• a', '\n• a')).toEqual(edit('• \n• a', 5));
    });

    it('ends the list from an empty bullet, dropping that bullet', () => {
      expect(applyListEdit('• a\n• ', '• a\n• \n')).toEqual(edit('• a\n', 4));
      expect(applyListEdit('• a\n• \n• b', '• a\n• \n\n• b')).toEqual(edit('• a\n\n• b', 4));
      expect(applyListEdit('• \nx', '• \n\nx')).toEqual(edit('\nx', 0));
    });

    it('empties the text from the only bullet', () => {
      expect(applyListEdit('• ', '• \n')).toEqual(edit('', 0));
    });

    it('stays a plain break on a prose line', () => {
      expect(applyListEdit('note', 'note\n')).toEqual(edit('note\n', 5));
      expect(applyListEdit('x\n• b', 'x\n\n• b')).toEqual(edit('x\n\n• b', 3));
    });

    it('stays a plain break on the blank lines below a list', () => {
      expect(applyListEdit('• a\n', '• a\n\n')).toEqual(edit('• a\n\n', 5));
      expect(applyListEdit('• a\n\n• b', '• a\n\n\n• b')).toEqual(edit('• a\n\n\n• b', 6));
      expect(applyListEdit('• a\n• \n\n• b', '• a\n• \n\n\n• b')).toEqual(
        edit('• a\n• \n\n\n• b', 9),
      );
    });

    it('inserts a bullet between two bullets', () => {
      expect(applyListEdit('• a\n• b', '• a\n\n• b')).toEqual(edit('• a\n• \n• b', 6));
    });
  });

  describe('Backspace and Delete', () => {
    it('removes the bullet from the start of its text', () => {
      expect(applyListEdit('• a\n• b', '• a\n•b')).toEqual(edit('• a\nb', 4));
      expect(applyListEdit('•  x', '• x')).toEqual(edit(' x', 0));
    });

    it('removes the bullet when its marker glyph is deleted', () => {
      expect(applyListEdit('• a', ' a')).toEqual(edit('a', 0));
    });

    it('empties the text when the only bullet is deleted', () => {
      expect(applyListEdit('• ', '•')).toEqual(edit('', 0));
    });

    it('joins a bullet onto the line above without its bullet', () => {
      expect(applyListEdit('• a\n• b', '• a• b')).toEqual(edit('• ab', 3));
      expect(applyListEdit('p\n• b', 'p• b')).toEqual(edit('pb', 1));
    });

    it('removes a blank line between bullets and keeps the bullet below', () => {
      expect(applyListEdit('• a\n\n• b', '• a\n• b')).toEqual(edit('• a\n• b', 4));
    });

    it('passes a deletion inside bullet text through', () => {
      expect(applyListEdit('• ab', '• a')).toEqual(edit('• a', 3));
    });
  });

  describe('typed markers', () => {
    it('turns "- " or "* " at a line start into a bullet', () => {
      expect(applyListEdit('-', '- ')).toEqual(edit('• ', 2));
      expect(applyListEdit('• a\n*', '• a\n* ')).toEqual(edit('• a\n• ', 6));
      expect(applyListEdit('-abc', '- abc')).toEqual(edit('• abc', 2));
    });

    it('leaves a dash inside a line alone', () => {
      expect(applyListEdit('a -', 'a - ')).toEqual(edit('a - ', 4));
    });
  });

  it('passes pastes, selection deletes and replacements through', () => {
    expect(applyListEdit('• a', '• a\nx\ny')).toEqual(edit('• a\nx\ny', 7));
    expect(applyListEdit('• ab', '• ')).toEqual(edit('• ', 2));
    expect(applyListEdit('• teh', '• the')).toEqual(edit('• the', 5));
  });
});

describe('stripBullets', () => {
  it('drops the bullet from every line that has one', () => {
    expect(stripBullets('• a\n• b')).toBe('a\nb');
    expect(stripBullets('• ')).toBe('');
    expect(stripBullets('plain\n- dash')).toBe('plain\n- dash');
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTemplate, parseTemplate, TemplateError } from '../src/core/template.ts';
import { readProgress, readTemplate } from '../src/core/storage.ts';

describe('parseTemplate', () => {
  it('accepts the default template', () => {
    assert.deepEqual(parseTemplate(defaultTemplate()), defaultTemplate());
  });

  it('round-trips through JSON', () => {
    assert.deepEqual(parseTemplate(JSON.parse(JSON.stringify(defaultTemplate()))), defaultTemplate());
  });

  it('trims titles', () => {
    const t = parseTemplate({ version: 1, steps: [{ id: 'a', kind: 'task', title: '  A  ' }] });
    assert.equal(t.steps[0]?.title, 'A');
  });

  const invalid: [string, unknown][] = [
    ['not an object', []],
    ['wrong version', { version: 2, steps: [] }],
    ['steps not a list', { version: 1, steps: {} }],
    ['empty title', { version: 1, steps: [{ id: 'a', kind: 'task', title: ' ' }] }],
    ['unknown kind', { version: 1, steps: [{ id: 'a', kind: 'note', title: 'A' }] }],
    ['question without branches', { version: 1, steps: [{ id: 'q', kind: 'question', title: 'Q' }] }],
    [
      'duplicate id across branches',
      {
        version: 1,
        steps: [
          { id: 'a', kind: 'task', title: 'A' },
          { id: 'q', kind: 'question', title: 'Q', yes: [{ id: 'a', kind: 'task', title: 'A2' }], no: [] },
        ],
      },
    ],
  ];
  for (const [name, raw] of invalid) {
    it(`rejects ${name}`, () => {
      assert.throws(() => parseTemplate(raw), TemplateError);
    });
  }
});

describe('readTemplate', () => {
  it('falls back to the default when missing or invalid', () => {
    assert.deepEqual(readTemplate(undefined), defaultTemplate());
    const warn = console.warn;
    console.warn = () => {};
    try {
      assert.deepEqual(readTemplate({ version: 9 }), defaultTemplate());
    } finally {
      console.warn = warn;
    }
  });
});

describe('readProgress', () => {
  it('keeps valid data and drops invalid answers', () => {
    assert.deepEqual(readProgress({ done: ['a', 'q'], answers: { q: 'yes', z: 'maybe' } }), {
      done: ['a', 'q'],
      answers: { q: 'yes' },
    });
  });

  it('rejects malformed progress', () => {
    assert.equal(readProgress(null), undefined);
    assert.equal(readProgress({ done: [1] }), undefined);
  });
});

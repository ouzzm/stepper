import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  answerQuestion,
  completeStep,
  emptyProgress,
  summarize,
  undoLast,
  viewSteps,
} from '../src/core/engine.ts';
import type { Progress, Template } from '../src/core/model.ts';

const template: Template = {
  version: 1,
  steps: [
    { id: 'a', kind: 'task', title: 'A' },
    {
      id: 'q',
      kind: 'question',
      title: 'DB fix?',
      yes: [
        { id: 'y1', kind: 'task', title: 'Add tag' },
        { id: 'q2', kind: 'question', title: 'Nested?', yes: [{ id: 'n1', kind: 'task', title: 'N1' }], no: [] },
      ],
      no: [{ id: 'x1', kind: 'task', title: 'No branch' }],
    },
    { id: 'b', kind: 'task', title: 'B' },
  ],
};

const states = (p: Progress) => viewSteps(template, p).map((v) => `${v.node.id}:${v.state}`);

describe('viewSteps', () => {
  it('hides branch children until the question is answered', () => {
    assert.deepEqual(states(emptyProgress()), ['a:current', 'q:pending', 'b:pending']);
  });

  it('marks only the most recent done step as last-done', () => {
    let p = completeStep(template, emptyProgress(), 'a');
    p = answerQuestion(template, p, 'q', 'no');
    assert.deepEqual(states(p), ['a:done', 'q:last-done', 'x1:current', 'b:pending']);
  });

  it('shows the yes branch with nested questions', () => {
    let p = completeStep(template, emptyProgress(), 'a');
    p = answerQuestion(template, p, 'q', 'yes');
    p = completeStep(template, p, 'y1');
    p = answerQuestion(template, p, 'q2', 'yes');
    const views = viewSteps(template, p);
    assert.deepEqual(
      views.map((v) => `${v.node.id}:${v.depth}:${v.state}`),
      ['a:0:done', 'q:0:done', 'y1:1:done', 'q2:1:last-done', 'n1:2:current', 'b:0:pending'],
    );
    assert.equal(views.find((v) => v.node.id === 'q')?.answer, 'yes');
  });
});

describe('completeStep / answerQuestion', () => {
  it('ignores a step that is not current', () => {
    const p = emptyProgress();
    assert.equal(completeStep(template, p, 'b'), p);
  });

  it('ignores completing a question or answering a task', () => {
    const p = completeStep(template, emptyProgress(), 'a');
    assert.equal(completeStep(template, p, 'q'), p);
    assert.equal(answerQuestion(template, emptyProgress(), 'a', 'yes').done.length, 0);
  });

  it('does not mutate the input progress', () => {
    const p = emptyProgress();
    completeStep(template, p, 'a');
    assert.deepEqual(p, emptyProgress());
  });
});

describe('undoLast', () => {
  it('reverts the last task', () => {
    const p = undoLast(template, completeStep(template, emptyProgress(), 'a'));
    assert.deepEqual(p, emptyProgress());
  });

  it('drops the answer when a question is reverted, hiding its branch', () => {
    let p = completeStep(template, emptyProgress(), 'a');
    p = answerQuestion(template, p, 'q', 'yes');
    p = undoLast(template, p);
    assert.deepEqual(p, { done: ['a'], answers: {} });
    assert.deepEqual(states(p), ['a:last-done', 'q:current', 'b:pending']);
  });

  it('is a no-op on empty progress', () => {
    assert.deepEqual(undoLast(template, emptyProgress()), emptyProgress());
  });
});

describe('summarize', () => {
  it('reports empty, partial and complete', () => {
    let p = emptyProgress();
    assert.deepEqual(summarize(template, p), { status: 'empty', doneCount: 0, total: 3 });
    p = completeStep(template, p, 'a');
    assert.equal(summarize(template, p).status, 'partial');
    p = answerQuestion(template, p, 'q', 'no');
    p = completeStep(template, p, 'x1');
    p = completeStep(template, p, 'b');
    assert.deepEqual(summarize(template, p), { status: 'complete', doneCount: 4, total: 4 });
  });

  it('treats an empty template as empty', () => {
    assert.equal(summarize({ version: 1, steps: [] }, emptyProgress()).status, 'empty');
  });
});

describe('template changes', () => {
  it('ignores done ids that no longer exist', () => {
    const stale: Progress = { done: ['gone', 'a'], answers: {} };
    assert.deepEqual(states(stale), ['a:last-done', 'q:current', 'b:pending']);
    assert.deepEqual(undoLast(template, stale), emptyProgress());
  });

  it('lets a later step stay done when a new step is inserted before it', () => {
    const p: Progress = { done: ['a', 'b'], answers: {} };
    assert.deepEqual(states(p), ['a:done', 'q:current', 'b:last-done']);
    assert.equal(summarize(template, p).status, 'partial');
  });
});

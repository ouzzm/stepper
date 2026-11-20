import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ticketIdFromHref, ticketIdFromText } from '../src/content/adapters/ticketId.ts';

describe('ticketIdFromText', () => {
  it('reads a plain number, ignoring whitespace', () => {
    assert.equal(ticketIdFromText('12345'), '12345');
    assert.equal(ticketIdFromText('  12345\n'), '12345');
  });

  it('rejects anything else', () => {
    for (const value of ['', 'ID', '34 57', '12a', '-1', '1.5', null, undefined]) {
      assert.equal(ticketIdFromText(value), undefined, String(value));
    }
  });
});

describe('ticketIdFromHref', () => {
  it('reads the id from a work item link', () => {
    assert.equal(ticketIdFromHref('/Project/_workitems/edit/67890'), '67890');
    assert.equal(ticketIdFromHref('https://host/tfs/Coll/Proj/_workitems/edit/7/'), '7');
    assert.equal(ticketIdFromHref('/Proj/_workitems/edit/67890?fullScreen=true'), '67890');
    assert.equal(ticketIdFromHref('/Proj/_workitems/edit/67890#comment'), '67890');
  });

  it('rejects other links', () => {
    for (const value of ['/Proj/_workitems/edit/', '/Proj/_workitems/edit/12abc', '/Proj/_queries/query/1', null]) {
      assert.equal(ticketIdFromHref(value), undefined, String(value));
    }
  });
});

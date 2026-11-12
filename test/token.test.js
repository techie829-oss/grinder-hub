import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Token Lifecycle & Queue Delivery Suite', () => {
  it('should only include status = "done" in doneList (ready for billing)', () => {
    const tokensToday = [
      { id: '1', no: 1, name: 'ग्राहक', status: 'delivered' },
      { id: '2', no: 2, name: 'सुरेश', status: 'done' },
      { id: '3', no: 3, name: 'अमन', status: 'delivered' },
      { id: '4', no: 4, name: 'संतोष', status: 'serving' },
      { id: '5', no: 5, name: 'रमेश', status: 'waiting' },
    ];

    const doneList = tokensToday.filter((t) => t.status === 'done').reverse();
    const waitingList = tokensToday.filter((t) => t.status === 'waiting');
    const serving = tokensToday.find((t) => t.status === 'serving');
    const totalDoneCount = tokensToday.filter((t) => t.status === 'done' || t.status === 'delivered').length;

    assert.equal(doneList.length, 1);
    assert.equal(doneList[0].name, 'सुरेश');
    assert.equal(waitingList.length, 1);
    assert.equal(serving.name, 'संतोष');
    assert.equal(totalDoneCount, 3); // 2 delivered + 1 done = 3 completed today
  });

  it('should clear token from doneList when marked as delivered', () => {
    let doneList = [
      { id: 't1', no: 1, name: 'Aman' },
      { id: 't2', no: 2, name: 'Customer' },
    ];

    const billedTokenId = 't1';
    doneList = doneList.filter((x) => x.id !== billedTokenId);

    assert.equal(doneList.length, 1);
    assert.equal(doneList[0].id, 't2');
  });

  it('validates allowed token status transitions', () => {
    const allowed = ['serving', 'waiting', 'done', 'delivered', 'cancelled'];
    assert.ok(allowed.includes('delivered'));
    assert.ok(allowed.includes('done'));
    assert.ok(allowed.includes('serving'));
    assert.ok(allowed.includes('waiting'));
    assert.ok(allowed.includes('cancelled'));
    assert.ok(!allowed.includes('unknown_status'));
  });
});


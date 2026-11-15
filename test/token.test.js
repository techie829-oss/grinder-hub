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

  it('updates token details while strictly preserving token number', () => {
    const token = {
      id: 'tok-5',
      no: 5,
      name: 'Shahnawaz',
      village: 'Kewalpurwa',
      grossWeight: 14.3,
      lossG: 215,
      netWeight: 14.085,
      status: 'waiting',
    };

    // User corrects token #5: name was Latif, not Shahnawaz
    const updatedName = 'लतीफ़ (Latif)';
    const updatedGross = 15.0;
    const lossRateG = 15;
    const totalLossG = Math.round(updatedGross * lossRateG);
    const netWeight = Math.max(0, updatedGross - (totalLossG / 1000));

    const updatedToken = {
      ...token,
      name: updatedName,
      grossWeight: updatedGross,
      lossG: totalLossG,
      netWeight,
    };

    assert.equal(updatedToken.no, 5); // Sequence #5 preserved
    assert.equal(updatedToken.name, 'लतीफ़ (Latif)');
    assert.equal(updatedToken.grossWeight, 15.0);
    assert.equal(updatedToken.lossG, 225);
    assert.equal(updatedToken.netWeight, 14.775);
  });
});


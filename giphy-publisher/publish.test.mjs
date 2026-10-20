import test from 'node:test';
import assert from 'node:assert/strict';
import { sha256, selectItem, publishItem, localDate, validateQueue } from './publish.mjs';

const bytes = Buffer.from('GIF89a-test-asset');
const entry = (id, extra = {}) => ({ id, file: `giphy-publisher/assets/${id}.gif`,
  title: id, sha256: sha256(Buffer.concat([bytes, Buffer.from(id)])),
  tags: ['madger'], sourceUrl: 'https://madgercoin.com', approved: true,
  publishAt: '2026-10-20T23:15:00Z', ...extra });
const fixture = items => ({ schemaVersion: 1, enabled: true, timeZone: 'America/New_York', expectedUsername: 'MadgerDaBadger', items });
const verified = { id: 'test-gif', sha256: '0'.repeat(64), test: true, status: 'published', owner: 'MadgerDaBadger', publishedAt: '2026-10-20T00:00:00Z' };

test('scheduled posts require a verified upload to the target channel', () => {
  assert.throws(() => selectItem(fixture([entry('next-gif')]), [], new Date('2026-10-21'), 'scheduled'), /No API upload/);
});
test('future items and a disabled queue do not publish', () => {
  const q = fixture([entry('next-gif')]);
  assert.equal(selectItem(q, [verified], new Date('2026-10-20T23:14:00Z'), 'scheduled'), null);
  q.enabled = false;
  assert.equal(selectItem(q, [verified], new Date('2026-10-21'), 'scheduled'), null);
});
test('due items publish in order with one publication per New York date', () => {
  const first = entry('first-gif'), second = entry('second-gif', {publishAt:'2026-10-22T23:15:00Z'});
  const q = fixture([second, first]);
  assert.equal(selectItem(q, [verified], new Date('2026-10-23'), 'scheduled').id, 'first-gif');
  assert.equal(selectItem(q, [verified, {...first,status:'published',publishedAt:'2026-10-22T23:16:00Z'}], new Date('2026-10-22T23:45:00Z'), 'scheduled'), null);
});
test('ambiguous uploads pause the queue and published content is skipped', () => {
  const item = entry('next-gif'), q = fixture([item]);
  for (const status of ['reserved', 'uncertain', 'uploaded_unverified', 'rejected']) {
    assert.throws(() => selectItem(q, [verified, {id:item.id,status}], new Date('2026-10-21'), 'scheduled'), /Queue paused/);
  }
  assert.equal(selectItem(q, [verified,{...item,status:'published',publishedAt:'2026-10-20T23:16:00Z'}],new Date('2026-10-22'),'scheduled'),null);
});
test('duplicate assets and unapproved destinations are rejected', () => {
  assert.throws(() => validateQueue(fixture([entry('first-gif'),entry('second-gif',{sha256:entry('first-gif').sha256})])), /Duplicate/);
  assert.throws(() => validateQueue({...fixture([]),expectedUsername:'wrong-channel'}), /destination/);
});
test('reservation must be durable before any network upload', async () => {
  let uploads = 0;
  const item = entry('test-gif', {sha256:sha256(bytes)});
  await assert.rejects(publishItem({item,queue:fixture([item]),bytes,key:'fixture',
    save:async()=>{throw new Error('state unavailable');},upload:async()=>{uploads++;}}), /state unavailable/);
  assert.equal(uploads,0);
});
test('successful upload records its ID before ownership verification', async () => {
  const history=[];
  const item = entry('test-gif', {sha256:sha256(bytes),test:true});
  const record=await publishItem({item,queue:fixture([item]),bytes,key:'fixture',
    save:async r=>history.push(structuredClone(r)),upload:async()=>({id:'ABC123'}),
    getGif:async()=>({user:{username:'MadgerDaBadger'}})});
  assert.deepEqual(history.map(r=>r.status),['reserved','uploaded_unverified','published']);
  assert.equal(history[1].gifId,'ABC123'); assert.equal(record.owner,'MadgerDaBadger');
});
test('wrong ownership blocks later posts while retaining the uploaded ID', async () => {
  const history=[];
  const item=entry('test-gif',{sha256:sha256(bytes)});
  await assert.rejects(publishItem({item,queue:fixture([item]),bytes,key:'fixture',
    save:async r=>history.push(structuredClone(r)),upload:async()=>({id:'ABC123'}),
    getGif:async()=>({user:{username:'other-account'}})}), /Queue paused/);
  assert.equal(history.at(-1).status,'uploaded_unverified');assert.equal(history.at(-1).gifId,'ABC123');
});
test('network uncertainty is recorded without retrying the POST', async () => {
  const history=[];let uploads=0;
  const item=entry('test-gif',{sha256:sha256(bytes)});
  await assert.rejects(publishItem({item,queue:fixture([item]),bytes,key:'fixture',
    save:async r=>history.push(structuredClone(r)),upload:async()=>{uploads++;throw new Error('timeout');}}), /uncertain/);
  assert.equal(uploads,1);assert.equal(history.at(-1).status,'uncertain');
});
test('dates honor New York DST rather than UTC', () => {
  assert.equal(localDate(new Date('2026-10-21T01:00:00Z'),'America/New_York'),'2026-10-20');
  assert.equal(localDate(new Date('2026-11-04T01:00:00Z'),'America/New_York'),'2026-11-03');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
const compiled = await build({ entryPoints: ['lib/board-view.ts'], bundle: true, write: false, platform: 'node', format: 'esm' });
const { boardHref, columnHref, columnTasks, previewTasks, parseColumn, COLUMN_PREVIEW_LIMIT } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const statuses = ['inbox', 'next', 'doing', 'waiting', 'done'];
const task = (id, status, extra = {}) => ({id, title: `Fictional ${id}`, description: '', status, labels: [], dueDate: null, archived: false, revision: 1, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', ...extra});

test('every column limits its preview to five without losing its full total', () => {
  const tasks = statuses.flatMap(s => Array.from({length: 18}, (_,i) => task(`${s}-${String(i).padStart(2,'0')}`, s)));
  for (const status of statuses) {
    assert.equal(columnTasks(tasks, status).length, 18);
    assert.equal(previewTasks(tasks, status).length, COLUMN_PREVIEW_LIMIT);
    assert.deepEqual(previewTasks(tasks, status), columnTasks(tasks,status).slice(0,5));
  }
});
test('empty and shorter columns keep honest counts', () => {
  for (const status of statuses) {
    assert.deepEqual(previewTasks([],status), []);
    const tasks = [task('a',status),task('b',status)];
    assert.equal(previewTasks(tasks,status).length,2);
  }
});
test('non-Done columns preserve intentional input order', () => {
  for(const status of statuses.slice(0,4)) {
    const tasks=[task('z',status),task('a',status,{updatedAt:'2026-10-05T00:00:00.000Z'}),task('b',status)];
    assert.deepEqual(columnTasks(tasks,status).map(t=>t.id),['z','a','b']);
  }
});
test('Done shows recent activity, never inferring completion chronology', () => {
  const tasks=[task('older-created','done',{updatedAt:'2026-10-05T00:00:00.000Z'}),task('newer-created','done',{createdAt:'2026-10-04T00:00:00.000Z',updatedAt:'2026-10-04T00:00:00.000Z'})];
  assert.equal(columnTasks(tasks,'done')[0].id,'older-created');
  assert.deepEqual(Object.keys(tasks[0]).includes('completedAt'),false);
});
test('Done ties are deterministic even when server input order changes', () => {
  const tasks=[task('b','done'),task('a','done'),task('c','done',{createdAt:'2026-10-02T00:00:00.000Z'})];
  assert.deepEqual(columnTasks(tasks,'done').map(t=>t.id),['c','a','b']);
  assert.deepEqual(columnTasks([...tasks].reverse(),'done'),columnTasks(tasks,'done'));
});
test('column filtering and sorting do not mutate the input or other statuses', () => {
  const tasks=Object.freeze([Object.freeze(task('b','done')),Object.freeze(task('a','inbox')),Object.freeze(task('c','done'))]);
  assert.deepEqual(columnTasks(tasks,'done').map(t=>t.id),['b','c']);
  assert.deepEqual(tasks.map(t=>t.id),['b','a','c']);
});
test('moves, additions and archival removal recalculate both preview and totals', () => {
  let tasks=Array.from({length:6},(_,i)=>task(String(i),'inbox'));
  tasks=tasks.map(t=>t.id==='0'?{...t,status:'doing',revision:2}:t);
  assert.equal(columnTasks(tasks,'inbox').length,5);assert.equal(previewTasks(tasks,'inbox').length,5);assert.equal(columnTasks(tasks,'doing').length,1);
  tasks=tasks.filter(t=>t.id!=='1');assert.equal(previewTasks(tasks,'inbox').length,4);
  tasks=[...tasks,task('7','inbox'),task('8','inbox')];assert.equal(previewTasks(tasks,'inbox').length,5);assert.equal(columnTasks(tasks,'inbox').length,6);
});
test('all column links and back links carry archive state and selected mobile column', () => {
  for(const status of statuses) {
    assert.equal(columnHref(status),`/columns/${status}`);
    assert.equal(columnHref(status,true),`/columns/${status}?archived=true`);
    assert.equal(boardHref(status,true),`/?column=${status}&archived=true`);
    assert.equal(boardHref(status),`/?column=${status}`);
  }
  assert.equal(boardHref(),'/');assert.equal(boardHref(undefined,true),'/?archived=true');
});
test('invalid, repeated and malicious status parameters cannot become routes', () => {
  for(const status of statuses)assert.equal(parseColumn(status),status);
  for(const value of ['', 'DONE', 'unknown', '../done', '//example.invalid', ['done'], undefined, null])assert.equal(parseColumn(value),undefined);
});

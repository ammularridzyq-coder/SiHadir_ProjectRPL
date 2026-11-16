const { test, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');
const db = require('../db');

after(() => db.end());

test('halaman login tampil', async () => {
  const res = await request(app).get('/');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Selamat datang/);
});

test('dashboard tanpa login diarahkan ke login', async () => {
  const res = await request(app).get('/dashboard');
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/');
});

test('login dengan password salah ditolak', async () => {
  const res = await request(app).post('/login').type('form')
    .send({ username: 'admin', password: 'salah' });
  assert.match(res.text, /salah/);
});
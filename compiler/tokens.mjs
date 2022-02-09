import { Token } from './tokens/token.mjs';
export class Tokens {
  constructor() { this.list = []; }
  compare(ts) {
    if (this.list.length != ts.list.length) { return false; }
    for (let i = 0, { list } = this, { list: l2 } = ts, l = list.length; i < l; i++) { if (!list[i].compare(l2[i])) { return false; } }
    return true;
  }
  get length() { return this.list.length; }
  truncate(len) { if (this.list.length <= len) { return; } this.list.length = len; }
  add(t) { this.list.push(Token.copyOf(t)); }
  has(t) { for (let i = 0, { list } = this, l = list.length; i < l; i++) { if (list[i].compare(t)) { return true; } } return false; }
  addAll(ts) { let t = ts.list || ts; for (let i = 0, l = t.length; i < l; i++) { this.add(Token.copyOf(t[i])); } }
  hasAll(ts) { let t = ts.list || ts; for (let i = 0, l = t.length; i < l; i++) { if (!this.has(t[i])) { return false; } } return true; }
  append(ts) {
    let t = ts.list ? ts.list : ts instanceof Array ? ts : [ ts ];
    for (let z = 0, zl = t.length; z < zl; z++) { this.add(t[z]); }
  }
  toString() {
    let out = '';
    for (let i = 0, { list } = this, l = list.length; i < l; i++) { out += `${list[i].toString()}${i < l - 1 ? ' ' : ''}`; }
    if (this.list.length > 1) { out = `(${out})`; }
    return out;
  }
  flat(K) { return this.list.slice(0, K); }
  static copyOf(la) {
    let out = new Tokens();
    out.list = Token.copyAll(la.list || la);
    return out;
  }
  static compareFlat(ts1, t2s) {
    if (ts1.length != ts2.length) { return false; }
    for (let i = 0, l = ts1.length; i < l; i++) { if (!ts1[i].compare(ts2[i])) { return false; } }
    return true;
  }
}

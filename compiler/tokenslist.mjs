import { Tokens } from './tokens.mjs';
export class TokensList {
  constructor() { this.list = []; }
  indexOf(ts) {
    for (let i = 0, { list } = this, l = list.length; i < l; i++) { if (list[i].compare(ts)) { return i; } }
    return -1;
  }
  get size() { return this.list.length; }
  has(ts) { return this.indexOf(ts) != -1; }
  add(ts, force = false) { if ((force) || (!this.has(ts))) { this.list.push(ts); return true; } return false; }
  addList(tl, force = false) { for (let i = 0, { list } = tl, l = list.length; i < l; i++) { this.add(list[i], force); } }
  append(ts) { for (let i = 0, { list } = this, l = list.length; i < l; i++) { list[i].append(ts); } }
  appendList(tl) { for (let i = 0, { list } = tl, l = list.length; i < l; i++) { this.append(list[i]); } }
  rem() { let i; if ((i = this.indexOf(ts)) != -1) { this.list.splice(i, 1); return true; } return false; }
  clear() { this.list.length = 0; return this; }
  truncateAll(len) { for (let i = 0, { list } = this, l = list.length; i < l; i++) { list[i].truncate(len); } }
  compare(tl) {
    if (this.list.length != tl.list.length) { return false; }
    for (let i = 0, { list } = this, { list: l2 } = tl, l = list.length; i < l; i++) { if (!list[i].compare(l2[i])) { return false; } }
    return true;
  }
  contains(tl) {
    for (let i = 0, { list } = this, { list: l2 } = tl, l = list.length; i < l; i++) {
      let con = false;
      for (let x = 0, xl = l2.length; x < xl; x++) { if (list[i].hasAll(l2[x])) { con = true; break; } }
      if (!con) { return false; }
    }
    return true;
  }
  copyOf(tl) {
    this.list.length = 0;
    for (let i = 0, { list } = this, l2 = (tl.list ? tl.list : tl), l = l2.length; i < l; i++) { list.push(Tokens.copyOf(l2[i])); }
  }
  flat(K) {
    let out = [];
    for (let i = 0, { list } = this, l = list.length; i < l; i++) { out.push(list[i].flat(K)); }
    return out;
  }
  toString() {
    let out = '';
    for (let i = 0, { list } = this, l = list.length; i < l; i++) { out += `${list[i].toString()}${i < l - 1 ? '/' : ''}`; }
    return out;
  }
  static copyOf(tl) {
    let out = new TokensList();
    out.copyOf(tl);
    return out;
  }
}

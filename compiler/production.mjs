import { Token } from './tokens/token.mjs';
import { TERM, NONTERM } from './consts.mjs';
export class Production {
  constructor(left, right, func = undefined, lookaheads = []) {
    this.cursor = 0;
    this.left = left;
    this.right = right;
    this.func = func;
    this.lookaheads = lookaheads;
  }
  compare(b) {
    if (!this.compareLazy(b)) { return false; }
    if (this.lookaheads.length != b.lookaheads.length) { return false; }
    let alist = [];
    for (let i = 0, ar = this.lookaheads, l = ar.length; i < l; i++) { alist.push(ar[i]); }
    for (let i = 0, l = alist.length; i < l; i++) {
      for (let x = 0, br = b.lookaheads, xl = br.length; x < xl; x++) {
        if (alist[i].compare(br[x])) { alist.splice(i, 1); i--; l--; break; }
      }
    }
    return alist.length == 0;
  }
  compareLazy(b) {
    let a = this;
    if ((!a.left.compare(b.left)) ||
        (a.cursor != b.cursor) ||
        (a.right.length != b.right.length)) { return false; }
    for (let i = 0, ar = a.right, br = b.right, l = ar.length; i < l; i++) { if (!ar[i].compare(br[i])) { return false; } }
    return true;
  }
  toString() {
    let right = '', la = '';
    for (let i = 0, r = this.right, l = r.length; i < l; i++) { right += `${this.cursor==i?'.':''}${r[i]} `; }
    right = right.replace(/ $/, '');
    if (this.cursor == this.right.length) { right += '.'; }
    for (let i = 0, r = this.lookaheads, l = r.length; i < l; i++) { la += `${r[i]}/`; }
    la = la.replace(/\/$/, '');
    return `(${this.index}) ${this.left.label} -> ${right}${la?','+la:''}`;
  }
  static copyOf(prod) {
    let left = Token.copyOf(prod.left);
    let a, right = a = [];
    for (let i = 0, r = prod.right, l = r.length; i < l; i++) { a.push(Token.copyOf(r[i])); }
    let cursor = prod.cursor;
    let lookaheads = []; a = lookaheads;
    for (let i = 0, r = prod.lookaheads, l = r.length; i < l; i++) { a.push(Token.copyOf(r[i])); }
    left = new Production(left, right, prod.func, lookaheads);
    left.cursor = cursor;
    left.index = prod.index;
    left.virt = prod.vert;
    return left;
  }
}

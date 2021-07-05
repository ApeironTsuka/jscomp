import { Token } from './tokens/token.mjs';
import { TokensList } from './tokenslist.mjs';
import { TERM, NONTERM } from './consts.mjs';
export class Production {
  constructor(left, right, func = undefined, lookaheads = []) {
    this.cursor = 0;
    this.left = left;
    this.right = right;
    this.func = func;
    this.lookaheads = new TokensList();
    for (let i = 0, l = lookaheads.length; i < l; i++) { this.lookaheads.add(lookaheads[i]); }
  }
  compare(b) {
    if (!this.compareLazy(b)) { return false; }
    return this.lookaheads.compare(b.lookaheads);
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
    la = this.lookaheads.toString();
    return `(${this.index}) ${this.left.label} -> ${right}${la?','+la:''}`;
  }
  static copyOf(prod) {
    let left = Token.copyOf(prod.left);
    let a, right = a = [];
    for (let i = 0, r = prod.right, l = r.length; i < l; i++) { a.push(Token.copyOf(r[i])); }
    let cursor = prod.cursor;
    left = new Production(left, right, prod.func);
    left.lookaheads.copyOf(prod.lookaheads);
    left.cursor = cursor;
    left.index = prod.index;
    left.virt = prod.virt;
    return left;
  }
}

import { Production } from './production.mjs';
import { TERM, SHIFT, REDUCE, GOTO, ACCEPT } from './consts.mjs';
import { Token } from './tokens/token.mjs';
export class State {
  compare(state) {
    let c = 0;
    if (state.productions.length != this.productions.length) { return false; }
    for (let x = 0, ap = state.productions, bp = this.productions, xl = ap.length; x < xl; x++) { if (ap[x].compare(bp[x])) { c++; } }
    return c==this.productions.length;
  }
  toString(p) {
    let out = '';
    let act = (a) => { return a==SHIFT?'shift':a==REDUCE?'reduce':a==GOTO?'goto':a==ACCEPT?'accept':'error'; };
    for (let i = 0, prods = p||this.productions, l = prods.length; i < l; i++) { out += `${prods[i]}\n`; }
    for (let i = 0, keys = Object.keys(this.state), l = keys.length; i < l; i++) { out += `${keys[i]}=${act(this.state[keys[i]].act)} ${this.state[keys[i]].n}\n`; }
    return out;
  }
  build(jbnf, init) {
    let prods = [ ...init ], prod, p, list, t;
    let hasl = (a, p) => { for (let i = 0, l = a.length; i < l; i++) { if (a[i].compareLazy(p)) { return a[i]; } } return false; };
    let has = (a, p) => { for (let i = 0, l = a.length; i < l; i++) { if (a[i].compare(p)) { return a[i]; } } return false; };
    this.state = {};
    for (let i = 0; i < prods.length; i++) {
      prod = prods[i];
      if (prod.cursor == prod.right.length) {
        for (let x = 0, la = prod.lookaheads, xl = la.length; x < xl; x++) {
          if (this.state[la[x].label]) { console.log(`ERROR: r/r conflict`); console.log(this.toString(prods)); return false; }
          this.state[la[x].label] = { act: prod.index==0?ACCEPT:REDUCE, n: prod.index, l: prod.right.length, virt: prod.virt };
        }
        continue;
      }
      if (prod.right[prod.cursor].type == TERM) { continue; }
      list = jbnf.find(prod.right[prod.cursor].label);
      for (let x = 0, z = list, xl = z.length; x < xl; x++) {
        p = Production.copyOf(z[x]);
        let f = prod.right[prod.cursor+1];
        // last token in the production, so lookaheads are first-of left side
        if (!f) { p.lookaheads = Token.copyAll(prod.lookaheads); }
        else {
          if (f.type == TERM) { p.lookaheads = [ Token.copyOf(f) ]; }
          // lookaheads are first-of follow
          else { p.lookaheads = Token.copyAll(jbnf.first[f.label]); }
        }
        if (t = hasl(prods, p)) {
          // this production is already in this state, so just merge the lookaheads instead
          for (let k = 0, kk = p.lookaheads, kl = kk.length; k < kl; k++) { if (!has(t.lookaheads, kk[k])) { t.lookaheads.push(kk[k]); } }
        }
        else { prods.push(p); }
      }
    }
    this.productions = prods;
    return true;
  }
}

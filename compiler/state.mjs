import { Production } from './production.mjs';
import { TERM, SHIFT, REDUCE, GOTO, ACCEPT } from './consts.mjs';
import { Token } from './tokens/token.mjs';
import { Tokens } from './tokens.mjs';
import util from 'util';
export class State {
  constructor(K = 1) { this.K = K; }
  compare(state) {
    let c = 0;
    if (state.productions.length != this.productions.length) { return false; }
    for (let x = 0, ap = state.productions, bp = this.productions, xl = ap.length; x < xl; x++) { if (ap[x].compare(bp[x])) { c++; } }
    return c==this.productions.length;
  }
  compareLazy(state) {
    let c = 0;
    if (state.productions.length != this.productions.length) { return false; }
    for (let x = 0, ap = state.productions, bp = this.productions, xl = ap.length; x < xl; x++) { if (ap[x].compareLazy(bp[x])) { c++; } }
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
    let prods = [ ...init ], prod, p, list, t, { K } = this, { findKLookaheads } = State;
    let hasl = (a, p) => { for (let i = 0, l = a.length; i < l; i++) { if (a[i].compareLazy(p)) { return a[i]; } } return false; };
    let has = (a, p) => { for (let i = 0, l = a.length; i < l; i++) { if (a[i].compare(p)) { return a[i]; } } return false; };
    this.state = {};
    for (let i = 0; i < prods.length; i++) {
      prod = prods[i];
      if (prod.cursor == prod.right.length) {
        let lbl;
        for (let x = 0, la = prod.lookaheads.list, xl = la.length; x < xl; x++) {
          lbl = la[x].toString();
          if (this.state[lbl]) { console.log(`ERROR: r/r conflict`); console.log(this.toString(prods)); return false; }
          this.state[lbl] = { act: prod.index==0?ACCEPT:REDUCE, n: prod.index, l: prod.right.length, virt: prod.virt };
        }
        continue;
      }
      if (prod.right[prod.cursor].type == TERM) { continue; }
      list = jbnf.find(prod.right[prod.cursor].label);
      for (let x = 0, z = list, xl = z.length; x < xl; x++) {
        p = Production.copyOf(z[x]);
        findKLookaheads(jbnf, K, prod, p);
        if (t = hasl(prods, p)) {
          // this production is already in this state, so just merge the lookaheads instead
          for (let i = 0, { list } = p.lookaheads, l = list.length; i < l; i++) { t.lookaheads.add(list[i]); }
        }
        else { prods.push(p); }
      }
    }
    this.productions = prods;
    return true;
  }
  static copyOf(state) {
    let out = new State();
    out.productions = [];
    // I know there's probably a better way, but... FIXME ?
    out.state = JSON.parse(JSON.stringify(state.state));
    for (let i = 0, prods = state.productions, l = prods.length; i < l; i++) { out.productions.push(Production.copyOf(prods[i])); }
    return out;
  }
  static findKLookaheads(jbnf, K, _prod, _p) {
    let list = _p.lookaheads, prod = Production.copyOf(_prod);
    list.clear();
    let recurse = (p, la) => {
      while (la.length < K) {
        let f = p.right[p.cursor+1];
        if (!f) {
          let fos = jbnf.follow[p.left.label], overflow = K - la.length;
          for (let i = 0, l = fos.list.length; i < l; i++) {
            let nla = Tokens.copyOf(la);
            for (let x = 0; x < overflow && x < fos.list[i].length; x++) { nla.add(fos.list[i].list[x]); }
            while (nla.length < K) { nla.add(new Token(TERM, '$')); }
            nla.truncate(K);
            list.add(nla);
          }
          break;
        } else if (f.label == '$') {
          while (la.length < K) { la.add(new Token(TERM, '$')); }
          list.add(la);
          break;
        } else if (f.type == TERM) {
          la.add(f);
        } else {
          let fos = jbnf.first[f.label];
          for (let i = 0, l = fos.list.length; i < l; i++) {
            let nla = Tokens.copyOf(la);
            nla.addAll(fos.list[i]);
            if (nla.length >= K) { nla.truncate(K); list.add(nla); }
            else {
              let ps = jbnf.find(f.label);
              for (let x = 0, xl = ps.length; x < xl; x++) {
                let np = Production.copyOf(ps[x]);
                np.cursor++;
                recurse(np, nla);
              }
            }
          }
          break;
        }
        if (la.length >= K) { la.truncate(K); list.add(la); }
        p.cursor++;
      }
    };
    recurse(prod, new Tokens());
    return list;
  }
}

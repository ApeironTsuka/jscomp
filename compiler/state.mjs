import { Production } from './production.mjs';
import { TERM, SHIFT, REDUCE, GOTO, ACCEPT, mapToJson, mapFromJson } from './consts.mjs';
import { Token } from './tokens/token.mjs';
import { Tokens } from './tokens.mjs';
import { Printer, Channels } from './printer.mjs';
export class State {
  constructor(K = 1, allowConflicts = false) { this.K = K; this.allowConflicts = allowConflicts; }
  compare(state) {
    let c = 0;
    if (state.productions.length != this.productions.length) { return false; }
    for (let x = 0, ap = state.productions, bp = this.productions, xl = ap.length; x < xl; x++) { if (ap[x].compare(bp[x])) { c++; } }
    return c == this.productions.length;
  }
  compareLazy(state) {
    let c = 0;
    if (state.productions.length != this.productions.length) { return false; }
    for (let x = 0, ap = state.productions, bp = this.productions, xl = ap.length; x < xl; x++) { if (ap[x].compareLazy(bp[x])) { c++; } }
    return c == this.productions.length;
  }
  contains(state) {
    let c = 0;
    if (state.productions.length != this.productions.length) { return false; }
    for (let x = 0, ap = state.productions, bp = this.productions, xl = ap.length; x < xl; x++) { if (ap[x].contains(bp[x])) { c++; } }
    return c == this.productions.length;
  }
  toString(p) {
    let { state } = this, out = '';
    let act = (a) => { return a == SHIFT ? 'shift' : a == REDUCE ? 'reduce' : a == GOTO ? 'goto' : a == ACCEPT ? 'accept' : 'error'; };
    for (let i = 0, prods = p || this.productions, l = prods.length; i < l; i++) { out += `${prods[i]}\n`; }
    for (let [ statekey, statev ] of state.entries()) {
      out += `${statekey}=`;
      if (statev instanceof Array) {
        for (let s = 0, st = statev, sl = st.length; s < sl; s++) { out += `${s == 0 ? '' : '; '}${act(st[s].act)} ${st[s].n}`; }
        out += '\n';
      } else { out += `${act(statev.act)} ${statev.n}\n`; }
    }
    return out;
  }
  build(jbnf, init) {
    let prods = [ ...init ], { K, allowConflicts } = this, prod, p, list, t, { findKLookaheads } = State;
    let hasl = (a, p) => { for (let i = 0, l = a.length; i < l; i++) { if (a[i].compareLazy(p)) { return a[i]; } } return false; };
    let has = (a, p) => { for (let i = 0, l = a.length; i < l; i++) { if (a[i].compare(p)) { return a[i]; } } return false; };
    this.state = new Map();
    for (let i = 0; i < prods.length; i++) {
      prod = prods[i];
      if (prod.cursor == prod.right.length) {
        let lbl, o;
        for (let x = 0, la = prod.lookaheads.list, xl = la.length; x < xl; x++) {
          lbl = la[x].toString();
          o = { act: prod.index == 0 ? ACCEPT : REDUCE, n: prod.index, l: prod.right.length, virt: prod.virt };
          if (this.state.has(lbl)) {
            if (allowConflicts) {
              let n = this.state.get(lbl);
              if (n instanceof Array) { n.push(o); }
              else { n = [ n, o ]; }
              o = n;
            } else {
              Printer.log(Channels.NORMAL, `ERROR: r/r conflict`);
              Printer.log(Channels.NORMAL, this.toString(prods));
              return false;
            }
          }
          this.state.set(lbl, o);
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
    let out = new State(state.K, state.allowConflicts);
    let productions = out.productions = new Array(state.productions.length);
    // I know there's probably a better way, but... FIXME ?
    out.state = JSON.parse(JSON.stringify(state.state, mapToJson), mapFromJson);
    for (let i = 0, prods = state.productions, l = prods.length; i < l; i++) { productions[i] = Production.copyOf(prods[i]); }
    return out;
  }
  static findKLookaheads(jbnf, K, _prod, _p) {
    let list = _p.lookaheads, prod = Production.copyOf(_prod);
    list.clear();
    let recurse = (p, la) => {
      while (la.length < K) {
        let f = p.right[p.cursor+1];
        if (!f) {
          let fos = jbnf.follow.get(p.left.label), overflow = K - la.length;
          for (let i = 0, l = fos.list.length; i < l; i++) {
            let nla = Tokens.copyOf(la), fl = fos.list[i];
            for (let x = 0, flx = fl.list, fll = fl.length; x < overflow && x < fll; x++) { nla.add(flx[x]); }
            while (nla.length < K) { nla.add(Token.endToken); }
            nla.truncate(K);
            list.add(nla);
          }
          break;
        } else if (f.label == Token.endToken.label) {
          while (la.length < K) { la.add(Token.endToken); }
          list.add(la);
          break;
        } else if (f.type == TERM) {
          la.add(f);
        } else {
          let fos = jbnf.first.get(f.label);
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

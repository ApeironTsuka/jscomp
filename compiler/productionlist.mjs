import { Token } from './tokens/token.mjs';
import { Production } from './production.mjs';
import { TERM, NONTERM, EMPTY, ZEROORONE, ONEPLUS, ZEROPLUS } from './consts.mjs';
export class ProductionList {
  build(jbnf) {
    let _bnf = { 'axiom-real': [] }, prods = [], regexList = [], regexHash = {};
    let addprod = (left, prod) => {
      let p = new Production(Token.copyOf(left), Token.copyAll(prod.tokens), prod.func);
      if (prod.virt) { p.virt = true; }
      p.index = prods.length;
      prods.push(p);
    };
    addprod({ type: NONTERM, label: 'axiom-real' }, { tokens: [ { type: NONTERM, label: 'axiom' } ] });
    for (let i = 0, keys = Object.keys(jbnf), l = keys.length; i < l; i++) {
      if (!_bnf[keys[i]]) { _bnf[keys[i]] = []; }
      for (let x = 0, z = jbnf[keys[i]], xl = z.length; x < xl; x++) {
        if (x < z.length) { _bnf[keys[i]].push({ tokens: Token.copyAll(z[x].tokens, true), func: z[x].func }); }
        let c = _bnf[keys[i]]; c = c[x];
        for (let k = 0, t = c.tokens, kl = t.length; k < kl; k++) {
          if (t[k].type == TERM) {
            if (t[k].regex instanceof RegExp) {
              let o = { label: t[k].label, regex: t[k].regex };
              regexList.push(o); regexHash[o.label] = o;
            }
            continue;
          }
          switch (t[k].repeat) {
            case ZEROORONE:
              {
                let tmp = { tokens: Token.copyAll(c.tokens, true), func: c.func };
                tmp.tokens.splice(k, 1);
                delete t[k].repeat;
                _bnf[keys[i]].push(tmp);
                xl++;
              }
              break;
            case ONEPLUS:
              if (!_bnf[`${t[k].label}-plus`]) {
                _bnf[`${t[k].label}-plus`] = [
                  { tokens: [
                    { type: NONTERM, label: `${t[k].label}-plus` },
                    { type: NONTERM, label: t[k].label }
                  ], virt: true },
                  { tokens: [ { type: NONTERM, label: t[k].label } ], virt: true }
                ];
                addprod({ type: NONTERM, label: `${t[k].label}-plus` }, _bnf[`${t[k].label}-plus`][0]);
                addprod({ type: NONTERM, label: `${t[k].label}-plus` }, _bnf[`${t[k].label}-plus`][1]);
              }
              t[k].label += '-plus';
              delete t[k].repeat;
              break;
            case ZEROPLUS:
              {
                let tmp = { tokens: Token.copyAll(c.tokens, true), func: c.func };
                tmp.tokens.splice(k, 1);
                t[k].repeat = ONEPLUS;
                k--;
                _bnf[keys[i]].push(tmp);
                xl++;
              }
              break;
            default: continue;
          }
        }
        addprod({ type: NONTERM, label: keys[i] }, c);
      }
    }
    this.list = prods;
    this.regexes = { list: regexList, hash: regexHash };
  }
  genFirstOf() {
    let { list } = this, first = {};
    let add = (p, t) => {
      if (!first[p.label]) { first[p.label] = []; }
      for (let i = 0, list = first[p.label], l = list.length; i < l; i++) { if (list[i].compare(t)) { return; } }
      first[p.label].push(t);
    };
    let findProds = (p) => {
      let out = [];
      for (let i = 0, l = list.length; i < l; i++) { if (list[i].left.compare(p)) { out.push(list[i]); } }
      return out;
    };
    let findFirst = (p) => {
      let t, d = 0, dd = 0;
      if (p.right.length == 0) { add(p.left, new Token(EMPTY)); return; }
      if (p.right[0].type == TERM) { add(p.left, p.right[0]); return; }
      t = findProds(p.right[0]);
      for (let i = 0, l = t.length; i < l; i++) {
        if (t[i].right.length == 0) {
          add(t[i].left, new Token(EMPTY));
          d++;
          if (p.right[d]) { t = findProds(p.right[d]); i = -1; l = t.length; }
          else { break; }
          continue;
        }
        if (t[i].right[0].type == TERM) { add(t[i].left, t[i].right[0]); continue; }
        if (t[i].left.compare(t[i].right[0])) { continue; }
        findFirst(t[i]);
        dd = 0;
        for (let k = 0, z = first[t[i].right[0].label], kl = z.length; k < kl; k++) {
          add(t[i].left, z[k]);
        }
      }
      d = 0;
      if (!first[p.right[0].label]) { throw new Error(`Missing production definition for ${p.right[0].label}`); }
      for (let i = 0, t = first[p.right[0].label], l = t.length; i < l; i++) {
        if (t[i].type == EMPTY) {
          d++;
          if (p.right[d]) { t = first[p.right[d].label]; i = -1; l = t.length; continue; }
          else { break; }
        }
        add(p.left, t[i]);
      }
    };
    for (let i = 0, l = list.length; i < l; i++) { findFirst(list[i]); }
    this.first = first;
  }
  genFollowOf() {
    let { list, first } = this, follow = {}, done = {}, total = 0, doneCount = 0;
    let add = (p, t) => {
      if (!follow[p.label]) { follow[p.label] = []; total++; }
      for (let i = 0, list = follow[p.label], l = list.length; i < l; i++) { if (list[i].compare(t)) { return; } }
      follow[p.label].push(t);
    };
    let addAll = (p, t) => {
      let out = false;
      for (let i = 0, l = t.length; i < l; i++) {
        if (t[i].type == EMPTY) { out = true; continue; }
        add(p, t[i]);
      }
      return out;
    };
    let stage1 = function (p) {
      let complete = true;
      for (let i = 0, l = list.length; i < l; i++) {
        for (let x = 0, right = list[i].right, xl = right.length; x < xl; x++) {
          if (p.left.compare(right[x])) {
            x++;
            if (right[x]) {
              if (right[x].type == TERM) { add(p.left, right[x]); continue; }
              while (true) {
                if (!addAll(p.left, first[right[x].label])) { break; }
                x++;
                if (!right[x]) { complete = false; add(p.left, list[i].left); break; }
              }
            } else { complete = false; add(p.left, list[i].left); }
          }
        }
      }
      if (complete) { done[p.left.label] = true; doneCount++; }
    };
    let procd = {};
    let stage2 = function (p, zzz) {
      let complete = true;
      if (!follow[p.left.label]) { done[p.left.label] = true; doneCount++; return; }
      let proc = (p, l) => {
        if (!procd[p.label]) { procd[p.label] = {}; }
        procd[p.label][l.label] = true;
      }, processed = (p, l) => { return procd[p.label]?!!procd[p.label][l.label]:false; };
      for (let i = 0, f = follow[p.left.label], l = f.length; i < l; i++) {
        if (f[i].type == TERM) { continue; }
        if (!done[f[i].label]) { complete = false; }
        if (follow[f[i].label]) {
          if (!processed(p.left, f[i])) {
            addAll(p.left, follow[f[i].label]);
            proc(p.left, f[i]);
            l = follow[p.left.label].length;
          }
        }
        f.splice(i, 1);
        i--;
        l--;
      }
      if (complete) { done[p.left.label] = true; doneCount++; }
    };
    for (let i = 0, l = list.length; i < l; i++) {
      if (list[i].left.label == 'axiom') { follow['axiom'] = [ new Token(TERM, '$') ]; done['axiom'] = true; doneCount++; continue; }
      if (!done[list[i].left.label]) { stage1(list[i]); }
    }
    while (doneCount <= total) {
      process.stderr.write(`\r${doneCount} ${total}     `);
      for (let i = 0, l = list.length; i < l; i++) { if (!done[list[i].left.label]) { stage2(list[i], i); } }
    }
    process.stderr.write('\n');
    this.follow = follow;
  }
  printFirstOf() {
    let { first } = this;
    console.log('FIRST OF list:');
    for (let i = 0, keys = Object.keys(first), l = keys.length; i < l; i++) {
      console.log(`  ${keys[i]}`);
      for (let x = 0, k = first[keys[i]], xl = k.length; x < xl; x++) { console.log(`    ${k[x]}`); }
    }
  }
  printFollowOf() {
    let { follow } = this;
    console.log('FOLLOW OF list:');
    for (let i = 0, keys = Object.keys(follow), l = keys.length; i < l; i++) {
      console.log(`  ${keys[i]}`);
      for (let x = 0, k = follow[keys[i]], xl = k.length; x < xl; x++) { console.log(`    ${k[x]}`); }
    }
  }
  find(left) {
    let out = [];
    for (let i = 0, list = this.list, l = list.length; i < l; i++) { if (list[i].left.compareLabel(left)) { out.push(list[i]); } }
    return out;
  }
  toString() { let out = ''; for (let i = 0, list = this.list, l = list.length; i < l; i++) { out += `${list[i]}\n`; } return out; }
}

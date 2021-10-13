import { Token } from './tokens/token.mjs';
import { Production } from './production.mjs';
import { Tokens } from './tokens.mjs';
import { TokensList } from './tokenslist.mjs';
import { TERM, NONTERM, ZEROORONE, ONEPLUS, ZEROPLUS } from './consts.mjs';
export class ProductionList {
  build(jbnf, skipreal) {
    let _bnf = {}, prods = [], regexList = [], regexHash = {};
    let addprod = (left, prod) => {
      let p = new Production(Token.copyOf(left), Token.copyAll(prod.tokens), prod.func);
      if (prod.virt) { p.virt = true; }
      p.index = prods.length;
      prods.push(p);
    };
    if (!skipreal) { addprod({ type: NONTERM, label: 'axiom-real' }, { tokens: [ { type: NONTERM, label: 'axiom' } ], virt: true }); }
    // create the internal production structure
    for (let i = 0, keys = Object.keys(jbnf), l = keys.length; i < l; i++) {
      if (!_bnf[keys[i]]) { _bnf[keys[i]] = []; }
      for (let x = 0, z = jbnf[keys[i]], xl = z.length; x < xl; x++) {
        /*
          z = jbnf[keys[i]] = the input list of productions with the same left side
          since "virtual" productions can create productions beyond the end of this list,
          make sure it doesn't try to. This is a long explanation for something that, at a glance
          seemed obvious to me but then I also spent a couple minutes trying to remember why it's
          x < z.length and not x < xl so...
        */
        if (x < z.length) { _bnf[keys[i]].push({ tokens: Token.copyAll(z[x].tokens, true), func: z[x].func }); }
        let c = _bnf[keys[i]][x];
        for (let k = 0, t = c.tokens, kl = t.length; k < kl; k++) {
          if (t[k].type == TERM) {
            // special regex terminal. Examples can be found in bnfhelper.mjs
            if (t[k].regex instanceof RegExp) {
              let o = { label: t[k].label, regex: t[k].regex };
              regexList.push(o); regexHash[o.label] = o;
            }
            continue;
          }
          switch (t[k].repeat) {
            /*
              handle {<nonterm>}?
              example:
              <prod> ::= <A> {<B>}?
              translates into
              <prod> ::= <A> <B>
                       | <A>
            */
            case ZEROORONE:
              {
                let tmp = { tokens: Token.copyAll(c.tokens, true), func: c.func };
                tmp.tokens.splice(k, 1);
                delete t[k].repeat;
                _bnf[keys[i]].push(tmp);
                xl++;
              }
              break;
            /*
              handle {<nonterm>}+
              example:
              <prod> ::= <A> {<B>}+
              translates into
              <prod> ::= <A> <B-plus>
              <B-plus> ::= <B-plus> <B>
                         | <B>
            */
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
            /*
              handle {<nonterm>}*
              example:
              <prod> ::= <A> {<B>}*
              translates into
              <prod> ::= <A> {<B>}+
                       | <A>
              and then the handler for ONEPLUS runs on the next loop
            */
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
  genFirstOf(K = 1) {
    let { list } = this, first = {}, unfinished = [], hash = {}, prodCache = {};
    let addUnf = (l, r) => {
      if (hash[`${l} => ${r}`]) { return; }
      unfinished.push({ left: l, right: r });
      hash[`${l} => ${r}`] = true;
    };
    // First pass: Initial, easy lists
    for (let i = 0, l = list.length; i < l; i++) {
      let p = list[i], t, f = true;
      if (!first[p.left.label]) { first[p.left.label] = new TokensList(); }
      if (p.right.length == 0) { first[p.left.label].add(new Tokens()); continue; }
      t = p.right.flat(Math.min(p.right.length, K));
      for (let x = 0, xl = t.length; x < xl; x++) { if (t[x].type == NONTERM) { f = false; break; } }
      // if this production's right side contained only terminals, add it to the final first-of list
      if (f) { first[p.left.label].add(Tokens.copyOf(t)); }
      // otherwise place it in the unfinished list for the next pass
      else { addUnf(p.left, t); }
    }
    // Second pass: Expanding the less simple lists
    while (unfinished.length) {
      for (let i = 0, l = unfinished.length; i < l; i++) {
        let u = unfinished[i], f = true;
        for (let x = 0, xl = u.right.length; x < xl; x++) {
          let t = u.right[x], prods;
          if (t.type == TERM) { continue; }
          // get the list of all productions that have t as their left side
          prods = prodCache[t.label] ? prodCache[t.label] : prodCache[t.label] = this.find(t);
          // remove this from the unfinished list
          unfinished.splice(i, 1);
          // for each of the productions...
          for (let z = 0, zl = prods.length; z < zl; z++) {
            // ... make a copy of this unfinished right side...
            let dup = Token.copyAll(u.right);
            // ... overwrite t's place with the right side of this production...
            dup.splice(x, 1, ...prods[z].right);
            // ... trim to length...
            dup.length = Math.min(dup.length, K);
            // ... and add each to the unfinished list
            addUnf(Token.copyOf(u.left), dup);
            // the idea here is that, eventually, each entry *will* result in <= K terminal entries
          }
          l = unfinished.length;
          break;
        }
        // same as in the first pass
        for (let x = 0, xl = u.right.length; x < xl; x++) { if (u.right[x].type == NONTERM) { f = false; break; } }
        if (f) { first[u.left.label].add(Tokens.copyOf(u.right)); unfinished.splice(i, 1); i--; l--; continue; }
      }
    }
    this.first = first;
  }
  genFollowOf(K = 1) {
    let { first, list } = this, follow = {}, remaining = 0;
    // First pass: create initial lists
    for (let i = 0, l = list.length; i < l; i++) {
      let prod = list[i];
      if (!follow[prod.left.label]) { follow[prod.left.label] = new TokensList(); }
      // Special case for handling axiom-real, since its follow-of is always K number of $
      if (prod.left.label == 'axiom-real') {
        let la = new Tokens();
        while (la.list.length < K) { la.list.push(new Token(TERM, '$')); }
        follow['axiom-real'].add(la);
        continue;
      }
      for (let x = 0, xl = list.length; x < xl; x++) {
        let { left: l, right: r } = list[x];
        for (let z = 0, zl = r.length; z < zl; z++) {
          if (r[z].label == prod.left.label) {
            let u = new TokensList();
            u.add(new Tokens());
            for (let k = z + 1; k <= zl; k++) {
              if (k == zl) { u.append(l); break; }
              if (r[k].type == TERM) { u.append(r[k]); }
              else {
                let nus = [], f = first[r[k].label];
                for (let c = 0, cl = f.list.length; c < cl; c++) {
                  let nu = TokensList.copyOf(u);
                  nu.append(f.list[c]);
                  nus.push(nu);
                }
                u.clear();
                for (let c = 0, cl = nus.length; c < cl; c++) { u.addList(nus[c]); }
              }
            }
            u.truncateAll(K);
            follow[prod.left.label].addList(u);
          }
        }
      }
    }
    // Clean up and count how many to do
    for (let i = 0, keys = Object.keys(follow), l = keys.length; i < l; i++) {
      let f = follow[keys[i]];
      remaining += f.list.length;
      for (let x = 0, { list } = f, xl = list.length; x < xl; x++) {
        let done = true;
        for (let t = 0, { list: ts } = list[x], tl = ts.length; t < tl; t++) {
          // Clean up "follow-of A is follow-of A" entries
          if ((ts.length == 1) && (ts[0].label == keys[i])) { list.splice(x, 1); x--; xl--; break; }
          if (ts[t].type == NONTERM) { done = false; }
        }
        if (done) { remaining--; }
      }
    }
    // Second pass: expand non-terms
    while (remaining > 0) {
      for (let i = 0, keys = Object.keys(follow), l = keys.length; i < l; i++) {
        let f = follow[keys[i]], done = true;
        for (let x = 0, { list } = f, xl = list.length; x < xl; x++) {
          for (let t = 0, { list: ts } = list[x], tl = ts.length; t < tl; t++) {
            if (ts[t].type == NONTERM) {
              let fs = follow[ts[t].label], nu = new TokensList();
              for (let b = 0, bl = fs.list.length; b < bl; b++) {
                let u = Tokens.copyOf(ts);
                u.list.splice(t, 1, ...fs.list[b].list);
                u.truncate(K);
                f.add(u);
                xl = list.length;
              }
              list.splice(x, 1);
              xl--;
              done = false;
              break;
            }
          }
        }
        if (done) { remaining--; }
      }
    }
    this.follow = follow;
  }
  printFirstOf() {
    let { first } = this;
    console.log('FIRST OF list:');
    for (let i = 0, keys = Object.keys(first), l = keys.length; i < l; i++) {
      console.log(`  ${keys[i]}`);
      for (let x = 0, k = first[keys[i]].list, xl = k.length; x < xl; x++) { console.log(`    ${k[x]}`); }
    }
  }
  printFollowOf() {
    let { follow } = this;
    console.log('FOLLOW OF list:');
    for (let i = 0, keys = Object.keys(follow), l = keys.length; i < l; i++) {
      console.log(`  ${keys[i]}`);
      for (let x = 0, k = follow[keys[i]].list, xl = k.length; x < xl; x++) { console.log(`    ${k[x]}`); }
    }
  }
  find(left) {
    let out = [];
    for (let i = 0, list = this.list, l = list.length; i < l; i++) { if (list[i].left.compareLabel(left)) { out.push(list[i]); } }
    return out;
  }
  toString() { let out = ''; for (let i = 0, list = this.list, l = list.length; i < l; i++) { out += `${list[i]}\n`; } return out; }
}

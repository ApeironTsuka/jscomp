import { Token } from './tokens/token.mjs';
import { Production } from './production.mjs';
import { TERM, NONTERM, EMPTY, ZEROORONE, ONEPLUS, ZEROPLUS } from './consts.mjs';
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
          since "virtual" productions can create productions beyon the end of this list,
          make sure it doesn't try to. This is a long explanation for something that, at a glance
          seemed obvious to me but then I also spent a couple minutes trying to remember why it's
          x < z.length and not x < xl so.....
        */
        if (x < z.length) { _bnf[keys[i]].push({ tokens: Token.copyAll(z[x].tokens, true), func: z[x].func }); }
        let c = _bnf[keys[i]]; c = c[x];
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
  genFirstOf() {
    let { list } = this, first = {};
    let add = (p, t) => {
      if (!first[p.label]) { first[p.label] = []; }
      for (let i = 0, list = first[p.label], l = list.length; i < l; i++) { if (list[i].compare(t)) { return; } }
      first[p.label].push(t);
    };
    // find all productions whose left side matches p
    let findProds = (p) => {
      let out = [];
      for (let i = 0, l = list.length; i < l; i++) { if (list[i].left.compare(p)) { out.push(list[i]); } }
      return out;
    };
    let findFirst = (p) => {
      let t, d = 0;
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
        for (let k = 0, z = first[t[i].right[0].label], kl = z.length; k < kl; k++) { add(t[i].left, z[k]); }
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
    // add token t to the follow-of list for production p, and track the total unique left-sides used
    let add = (p, t) => {
      if (!follow[p.label]) { follow[p.label] = []; total++; }
      for (let i = 0, list = follow[p.label], l = list.length; i < l; i++) { if (list[i].compare(t)) { return; } }
      follow[p.label].push(t);
    };
    // convenience function to add all tokens t. Return true if any of them represent an empty set
    let addAll = (p, t) => {
      let out = false;
      for (let i = 0, l = t.length; i < l; i++) {
        if (t[i].type == EMPTY) { out = true; continue; }
        add(p, t[i]);
      }
      return out;
    };
    // first pass (find the easy set of follow-ofs)
    let stage1 = function (p) {
      let complete = true;
      // loop over every production...
      for (let i = 0, l = list.length; i < l; i++) {
        // ... and find any occurance of the left-side of p
        for (let x = 0, right = list[i].right, xl = right.length; x < xl; x++) {
          if (p.left.compare(right[x])) {
            x++;
            // if there's a token after it...
            if (right[x]) {
              // ... and that token is a terminal, add to the follow-of ...
              if (right[x].type == TERM) { add(p.left, right[x]); continue; }
              // ... otherwise ...
              while (true) {
                // ... add all first-of of this non-terminal to the list, and exit the loop if none of them are empty sets ...
                if (!addAll(p.left, first[right[x].label])) { break; }
                x++;
                // ... but if they are, add the left-side of this production to be handled in stage 2
                if (!right[x]) { complete = false; add(p.left, list[i].left); break; }
              }
            // ... but if there's no token, add the left-side of this production to be handled in stage 2
            } else { complete = false; add(p.left, list[i].left); }
          }
        }
      }
      // flag this follow-of as complete if no left-sides were added
      if (complete) { done[p.left.label] = true; doneCount++; }
    };
    let procd = {};
    // second pass (find the not-so-easy set)
    let stage2 = function (p) {
      let complete = true;
      // no follow-of at all were found for production p, so mark it as done and ignore it
      if (!follow[p.left.label]) { done[p.left.label] = true; doneCount++; return; }
      // some helpers to keep track of if the given non-terminal has been proccessed so duplicates can be ignored easier
      let proc = (p, l) => {
            if (!procd[p.label]) { procd[p.label] = {}; }
            procd[p.label][l.label] = true;
          },
          processed = (p, l) => { return procd[p.label]?!!procd[p.label][l.label]:false; };
      // loop over the follow-ofs for production p...
      for (let i = 0, f = follow[p.left.label], l = f.length; i < l; i++) {
        // ... and if it's a terminal, ignore it
        if (f[i].type == TERM) { continue; }
        // ... and if it's a non-terminal that also needs to be processed by stage2, mark this one as incomplete (for now) as well
        if (!done[f[i].label]) { complete = false; }
        // ... and if it has a follow-of list ...
        if (follow[f[i].label]) {
          // ... and we haven't seen it for this production yet ...
          if (!processed(p.left, f[i])) {
            // ... add all of it's follow-ofs
            addAll(p.left, follow[f[i].label]);
            // ... flag it as handled
            proc(p.left, f[i]);
            // ... update the length of this loop as this follow-of list is now possibly longer
            l = follow[p.left.label].length;
          }
        }
        // ... remove this non-terminal from the follow list and update loop counter/length
        f.splice(i, 1);
        i--;
        l--;
      }
      // mark this follow-of list as complete if it no longer contains any non-terminals
      if (complete) { done[p.left.label] = true; doneCount++; }
    };
    // loop over the production list...
    for (let i = 0, l = list.length; i < l; i++) {
      // ... and treat the special "virtual" production axiom-real special as its follow-of list is only $
      if (list[i].left.label == 'axiom-real') { follow['axiom-real'] = [ new Token(TERM, '$') ]; done['axiom-real'] = true; doneCount++; continue; }
      // ... and run the first pass on it, if it hasn't already completed
      if (!done[list[i].left.label]) { stage1(list[i]); }
    }
    // loop over the production list, running the second pass, until every follow-of list is marked as complete
    // should hopefully never result in an infinite loop from recursion because of how the replacement step works
    while (doneCount <= total) { for (let i = 0, l = list.length; i < l; i++) { if (!done[list[i].left.label]) { stage2(list[i], i); } } }
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

import { Token } from './tokens/token.mjs';
import { TreeToken } from './tokens/treetoken.mjs';
import { StateGraph } from './stategraph.mjs';
import { Tokenizer } from './tokenizers/tokenizer.mjs';
import { Tokens } from './tokens.mjs';
import { TERM, NONTERM, SHIFT, REDUCE, ACCEPT } from './consts.mjs';
import { Printer, Channels } from './printer.mjs';
function duplicateStack(s) { let out = [ ...s ]; out.tree = duplicateTree(s.tree); return out; }
function duplicateTree(t) {
  let out = [];
  for (let i = 0, l = t.length; i < l; i++) { out.push(TreeToken.copyOfWithChildren(t[i], t[i].virt, true)); }
  return out;
}
function stackAsString(stack) {
  let out = '[ ';
  for (let i = 0, l = stack.length; i < l; i++) {
    if (stack[i] instanceof Token) { out += `${stack[i].label} `; }
    else { out += `${stack[i]} `; }
  }
  return `${out}]`;
}
// recursively remove "virtual" productions, moving their children into their place
function fixVirts(list) {
  for (let i = 0, l = list.length; i < l; i++) {
    if (list[i].virt) { list.splice(i, 1, ...list[i].children); i--; l = list.length; continue; }
    fixVirts(list[i].children);
  }
}
// move n from array a into p's children and set p's index to prod's
function treeshift(a, _n, p, prod) { let n = _n; while (n--) { p.children.unshift(a.shift()); } a.unshift(p); p.index = prod.index; }
function shift(a, _n) { let n = _n; while (n--) { a.shift(); } }
export class LRBase { // Should never be used directly
  load(bnf) {
    this.bnf = bnf;
    this.graph = new StateGraph();
    this.optimize = false;
    this.allowConflicts = false;
    this.trim = false;
  }
  #findByRegex(label) {
    let works = [], { tokens } = this.graph;
    // find all of the regex it matches
    for (let i = 0, { list } = this.bnf.regexes, l = list.length; i < l; i++) { if (list[i].regex.test(label)) { works.push(list[i]); } }
    // if only 1, then we're done
    if (works.length == 1) { return works[0].label; }
    // remove the matches that aren't in the chart
    for (let i = 0, l = works.length; i < l; i++) { if (tokens.indexOf(works[i].label) == -1) { works.splice(i, 1); i--; l--; } }
    // if only 1, then we're done
    if (works.length == 1) { return works[0].label; }
    // either none matched, or too many matched and we don't know what to do
    return undefined;
  }
  #can(action, stack, tokenBuf) {
    let { charts } = this.graph, chart = charts[stack[0]], token = tokenBuf.list[0], { label } = token, out = [], ca;
    if ((token.isRegex) && (!token.noRegex)) {
      if (chart.has(label)) { token = token.orig; }
      else { label = token.label; }
    }
    if (!chart) { throw new Error('Chart is undefined?'); }
    if (!chart.has(label)) { label = tokenBuf.toString(); }
    if (!chart.has(label)) { return false; }
    ca = chart.get(label);
    if (!(ca instanceof Array)) { ca = [ ca ]; }
    for (let i = 0, l = ca.length; i < l; i++) {
      if (ca[i].act == action) { if (action == SHIFT) { return ca[i]; } out.push(ca[i]); }
    }
    return out.length > 0 ? out : false;
  }
  #shiftStack(stack, chart, token) {
    stack.unshift(token);
    stack.unshift(chart.n);
    stack.tree.unshift(TreeToken.copyOf(token, token.virt));
  }
  #reduceStack(stack, chart, tokenBuf) {
    let bnf = this.bnf.list, { charts } = this.graph;
    shift(stack, 2 * chart.l);
    treeshift(stack.tree, chart.l, TreeToken.copyOf(bnf[chart.n].left, bnf[chart.n].virt), bnf[chart.n]);
    stack.unshift(bnf[chart.n].left);
    if (this.K > 1) {
      let lbl = Tokens.copyOf(tokenBuf);
      lbl.list.unshift(stack[0]);
      lbl.list.pop();
      stack.unshift(charts[stack[1]].get(lbl.toString()).n);
    } else { stack.unshift(charts[stack[1]].get(stack[0].label).n); }
  }
  parse(tokens) { return this.allowConflicts ? this.parseGLR(tokens) : this.parseSimple(tokens); }
  parseSimple(tokens) {
    let stack = [ 0 ], cursor = 0, { charts } = this.graph, { K } = this, chart, run = true, isGen = tokens instanceof Tokenizer, token, tokenLabel, tokenBuf = new Tokens();
    stack.tree = [];
    let addNextToken = () => {
      let t, tr;
      if (isGen) { t = tokens.next(); }
      else { if (cursor < tokens.length) { t = tokens[cursor++]; } else { t = tokens[tokens.length-1]; } }
      if (t) {
        if (!t.noRegex) {
          tr = this.#findByRegex(t.label);
          if (tr) { let k = t; t = new Token(TERM, tr, t.label); t.orig = k; }
        }
        tokenBuf.list.push(t);
      }
    };
    if ((isGen) && (!tokens.working)) { tokens.init(K); }
    for (let i = 0; i < K; i++) { addNextToken(); }
    token = tokenBuf.list[0];
    tokenLabel = token.isRegex ? token.orig.label : token.label;
    while (run) {
      chart = charts[stack[0]];
      if (token.isRegex) {
        if (chart.has(tokenLabel)) { token = token.orig; }
        else { tokenLabel = token.label; }
      }
      if (!chart.has(tokenLabel)) { tokenLabel = tokenBuf.toString(); }
      if (!chart.has(tokenLabel)) {
        Printer.log(Channels.NORMAL, this.error = `Unexpected '${tokenLabel}' at index ${cursor}`);
        this.errorToken = token;
        this.errorStack = stack;
        Printer.log(Channels.NORMAL, tokenBuf);
        Printer.log(Channels.NORMAL, stack);
        Printer.log(Channels.NORMAL, chart);
        return false;
      }
      switch (chart.get(tokenLabel).act) {
        case SHIFT:
          this.#shiftStack(stack, chart.get(tokenLabel), token);
          tokenBuf.list.shift(); addNextToken(); token = tokenBuf.list[0]; if (token) { tokenLabel = token.isRegex ? token.orig.label : token.label; } else { token = new Token(TERM, '$'); tokenLabel = '$'; }
          if (!token) { token = new Token(TERM, '$'); }
          break;
        case REDUCE: this.#reduceStack(stack, chart.get(tokenLabel), tokenBuf); break;
        case ACCEPT:
          shift(stack, 2);
          if ((stack.length == 1) && (stack[0] == 0)) { this.tree = stack.tree; run = false; break; }
          Printer.log(Channels.NORMAL, this.error = `Unexpected ACCEPT at ${cursor}`);
          Printer.log(Channels.NORMAL, stack);
          return false;
        default: Printer.log(Channels.NORMAL, this.error = `DEFAULT ${token.label}`); Printer.log(Channels.NORMAL, chart.get(tokenLabel)); return false;
      }
    }
    fixVirts(this.tree);
    return true;
  }
  parseGLR(tokens) {
    let stacks = [ [ 0 ] ], cursor = 0, { charts } = this.graph, { K, trim } = this, chart, run = true, remStack = false, isGen = tokens instanceof Tokenizer, token, tokenLabel, tokenBuf = new Tokens(), lastStack, lastToken;
    this.trees = [];
    stacks[0].tree = [];
    let addNextToken = () => {
      let t, tr;
      if (isGen) { t = tokens.next(); }
      else { if (cursor < tokens.length) { t = tokens[cursor++]; } else { t = tokens[tokens.length-1]; } }
      if (t) {
        if (!t.noRegex) {
          tr = this.#findByRegex(t.label);
          if (tr) { let k = t; t = new Token(TERM, tr, t.label); t.orig = k; t.isRegex = true; }
        }
        tokenBuf.list.push(t);
      }
    };
    if ((isGen) && (!tokens.working)) { tokens.init(K); }
    for (let i = 0; i < K; i++) { addNextToken(); }
    token = tokenBuf.list[0];
    tokenLabel = token.isRegex ? token.orig.label : token.label;
    while (run) {
      if (stacks.length == 0) {
        this.errorToken = lastToken;
        this.errorStack = lastStack;
        Printer.log(Channels.NORMAL, this.error = 'All stacks failed');
        Printer.log(Channels.NORMAL, tokenBuf);
        Printer.log(Channels.NORMAL, lastStack);
        Printer.log(Channels.NORMAL, charts[lastStack[0]]);
        return false;
      }
      for (let st = 0, stl = stacks.length; st < stl; st++) {
        let stack = stacks[st];
        if (!stack) { continue; }
        chart = charts[stack[0]];
        if (token.isRegex) {
          if (chart.has(tokenLabel)) { token = token.orig; }
          else { tokenLabel = token.label; }
        }
        if (!chart.has(tokenLabel)) { tokenLabel = tokenBuf.toString(); }
        if (!chart.has(tokenLabel)) {
          if (stacks.length == 1) {
            Printer.log(Channels.NORMAL, this.error = `Unexpected '${tokenLabel}' at index ${cursor}`);
            this.errorToken = token;
            this.errorStack = stack;
            Printer.log(Channels.NORMAL, tokenBuf);
            Printer.log(Channels.NORMAL, stack);
            Printer.log(Channels.NORMAL, chart);
            return false;
          } else { lastStack = stack; stacks.splice(st, 1); st--; continue; }
        }
        Printer.log(Channels.DEBUG, 'loop', tokenLabel, st, stacks.length, stackAsString(stack));
        let ch = chart.get(tokenLabel), accept = false, tmpStack, tmpCharts;
        if (!(ch instanceof Array)) { ch = [ ch ]; }
        for (let c = 0, cl = ch.length; c < cl; c++) {
          let cht = ch[c];
          switch (cht.act) {
            case SHIFT:
              Printer.log(Channels.DEBUG, 'shift1', tokenLabel, st, stackAsString(stack));
              this.#shiftStack(stack, cht, token);
              break;
            case REDUCE:
              tmpStack = duplicateStack(stack);
              if (c == 0) { lastStack = stack; stacks[st] = undefined; }
              Printer.log(Channels.DEBUG, 'reduce1', tokenLabel, st, stackAsString(tmpStack));
              this.#reduceStack(tmpStack, cht, tokenBuf);
              if (tmpCharts = this.#can(ACCEPT, tmpStack, tokenBuf)) { Printer.log('accept1'); stacks.push(tmpStack); accept = true; continue; }
              {
                let reduceList = [ tmpStack ], shiftList = [], reduceLog = {}, sas;
                while (reduceList.length) {
                  for (let i = 0; i < reduceList.length; i++) {
                    if (this.#can(SHIFT, reduceList[i], tokenBuf)) { shiftList.push(duplicateStack(reduceList[i])); }
                    if (tmpCharts = this.#can(REDUCE, reduceList[i], tokenBuf)) {
                      sas = stackAsString(reduceList[i]);
                      Printer.log(Channels.DEBUG, 'reduce2', tokenLabel, st, i, reduceList.length, sas);
                      if (!reduceLog[sas]) {
                        reduceLog[sas] = true;
                        if (tmpCharts.length == 1) {
                          this.#reduceStack(reduceList[i], tmpCharts[0], tokenBuf);
                          if (this.#can(ACCEPT, reduceList[i], tokenBuf)) { Printer.log('accept2'); stacks.push(reduceList[i]); reduceList.splice(i, 1); i--; accept = true; continue; }
                          if (this.#can(SHIFT, reduceList[i], tokenBuf)) { shiftList.push(reduceList[i]); reduceList.splice(i, 1); i--; }
                        } else {
                          for (let z = 0, zl = tmpCharts.length; z < zl; z++) {
                            let t = duplicateStack(reduceList[i]);
                            this.#reduceStack(t, tmpCharts[z], tokenBuf);
                            if (this.#can(ACCEPT, t, tokenBuf)) { Printer.log('accept3'); stacks.push(t); accept = true; continue; }
                            if (this.#can(SHIFT, t, tokenBuf)) { shiftList.push(t); continue; }
                            reduceList.push(t);
                          }
                          reduceList.splice(i, 1); i--;
                        }
                      } else { reduceList.splice(i, 1); i--; }
                    } else { lastStack = reduceList[i]; reduceList.splice(i, 1); i--; }
                  }
                }
                for (let i = 0, l = shiftList.length; i < l; i++) {
                  if (tmpCharts = this.#can(SHIFT, shiftList[i], tokenBuf)) {
                    Printer.log(Channels.DEBUG, 'shift2', tokenLabel, st, i, shiftList.length, stackAsString(shiftList[i]));
                    this.#shiftStack(shiftList[i], tmpCharts, token);
                    stacks.push(shiftList[i]);
                  } else { lastStack = shiftList[i]; }
                }
              }
              break;
            case ACCEPT:
              shift(stack, 2);
              Printer.log(Channels.DEBUG, 'accept', tokenLabel, st, stackAsString(stack));
              if ((stack.length == 1) && (stack[0] == 0)) { this.trees.push(stack.tree); if (stacks.length == 1) { run = false; c = cl; break; } }
              else if (stacks.length == 1) {
                Printer.log(Channels.NORMAL, this.error = `Unexpected ACCEPT at ${cursor}`);
                Printer.log(Channels.NORMAL, stack);
                return false;
              }
              stacks.splice(st, 1);
              st--;
              break;
            default: Printer.log(Channels.NORMAL, this.error = `DEFAULT ${token.label}`, '\n', ch); return false;
          }
        }
        if (run == false) { break; }
      }
      for (let i = 0, l = stacks.length; i < l; i++) { if (!stacks[i]) { stacks.splice(i, 1); i--; l--; } }
      if ((trim) && (trim > 0)) { if (stacks.length > trim) { stacks.length = trim; } }
      lastToken = token;
      tokenBuf.list.shift(); addNextToken(); token = tokenBuf.list[0]; if (token) { tokenLabel = token.isRegex ? token.orig.label : token.label; } else { token = new Token(TERM, '$'); tokenLabel = '$'; }
      Printer.log(Channels.DEBUG, 'next', tokenLabel);
    }
    // recursively remove "virtual" productions, moving their children into their place
    Printer.log(Channels.DEBUG, 'tree total', this.trees.length);
    for (let i = 0, l = this.trees.length; i < l; i++) { fixVirts(this.trees[i]); }
    this.tree = this.trees[0];
    return true;
  }
}

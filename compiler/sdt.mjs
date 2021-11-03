import { Token } from './tokens/token.mjs';
import { Production } from './production.mjs';
import { ProductionList } from './productionlist.mjs';
import { CLR } from './clr.mjs';
import { LALR } from './lalr.mjs';
import { GLR } from './glr.mjs';
import { NONTERM, GEN_CLR, GEN_LALR, GEN_GLR, GEN_DEFAULT } from './consts.mjs';
import { Printer, Channels } from './printer.mjs';
export class SDT {
  create(jbnf, predef = undefined, K = -1) {
    let bnf = this.bnf = new ProductionList();
    if ((K == -1) && (jbnf.tags) && (jbnf.tags.K)) { this.K = parseInt(jbnf.tags.K); }
    else if (K == -1) { this.K = 1; }
    else { this.K = K; }
    bnf.build(jbnf);
    if (predef) {
      let pd = this.predef = new ProductionList();
      pd.build({ definitions: predef, tags: {} }, true);
      for (let i = 0, list = pd.list, l = list.length; i < l; i++) { list[i].index = bnf.list.length; bnf.list.push(list[i]); }
      for (let i = 0, list = pd.regexes.list, l = list.length; i < l; i++) { bnf.regexes.list.push(list[i]); bnf.regexes.hash[list[i].label] = list[i]; }
    }
    Printer.log(Channels.VERBOSE, bnf.toString());
    bnf.genFirstOf(this.K);
    bnf.printFirstOf();
    bnf.genFollowOf(this.K);
    bnf.printFollowOf();
  }
  load(obj, globals = '') {
    let bnf = this.bnf = new ProductionList(), gen, list = [], p, regexes = { list: [], hash: {} }, t = obj.gen;
    switch (obj.gen) {
      case GEN_CLR: default: gen = this.gen = new CLR(); break;
      case GEN_LALR: gen = this.gen = new LALR(); break;
      case GEN_GLR: gen = this.gen = new GLR(); break;
      case GEN_DEFAULT:
        t = obj.tags ? obj.tags.type ? obj.tags.type.toUpperCase() : '' : '';
        switch (t) {
          case 'CLR': default: gen = this.gen = new CLR(); t = GEN_CLR; break;
          case 'LALR': gen = this.gen = new LALR(); t = GEN_LALR; break;
          case 'GLR': gen = this.gen = new GLR(); t = GEN_GLR; break;
        }
        break;
    }
    this.genn = t;
    for (let i = 0, prods = obj.productions, l = prods.length; i < l; i++) {
      p = new Production(Token.copyOf(prods[i].left), [], prods[i].func, []);
      p.virt = prods[i].virt;
      p.index = prods[i].index;
      list.push(p);
    }
    for (let i = 0, regs = obj.regexes, l = regs.length; i < l; i++) {
      let o = { label: regs[i].label, regex: eval(regs[i].regex) };
      regexes.list.push(o);
      regexes.hash[o.label] = o;
    }
    gen.bnf = bnf;
    gen.graph = { charts: obj.charts };
    gen.K = this.K = obj.K;
    bnf.list = list;
    bnf.regexes = regexes;
    bnf.tags = obj.tags;
    this.globals = globals;
  }
  useDefault(K = this.K) {
    let { bnf } = this, t = bnf.tags ? bnf.tags.type ? bnf.tags.type.toUpperCase() : '' : '';
    switch (t) {
      case 'CLR': return this.useCLR(K);
      case 'LALR': return this.useLALR(K);
      case 'GLR': return this.useGLR(K);
      default: return this.useCLR(K);
    }
  }
  useCLR(K = this.K) {
    this.gen = new CLR();
    this.genn = GEN_CLR;
    if (!this.gen.load(this.bnf, this.K = K)) { return false; }
    return true;
  }
  useLALR(K = this.K) {
    this.gen = new LALR();
    this.genn = GEN_LALR;
    if (!this.gen.load(this.bnf, this.K = K)) { return false; }
    return true;
  }
  useGLR(K = this.K) {
    this.gen = new GLR();
    this.genn = GEN_GLR;
    if (!this.gen.load(this.bnf, this.K = K)) { return false; }
    return true;
  }
  run(tokens) {
    let { gen, bnf } = this, fcache = [], out, ret, globalState = this.globalState = {};
    let compileFuncs = () => {
      let code = '"use strict";\nlet globalState = arguments[0], fcache = arguments[1];\n';
      if ((bnf.tags) && (bnf.tags.globals)) { code += `${bnf.tags.globals}\n`; }
      if (this.globals) { code += `${this.globals}\n`; }
      for (let i = 0, { list } = bnf, l = list.length; i < l; i++) {
        if (list[i].func) { code += `fcache[${i}] = ${list[i].func};\n`; }
      }
      Function(code)(globalState, fcache);
    };
    let callFunc = (ind, left, right) => {
      if (ind === undefined) { return; }
      let f = fcache[ind];
      if (f) { f(left, right); }
      else { left.value = right[0].value; }
    };
    if (!gen) { if (!this.useCLR()) { return Promise.reject(new Error('Failed to generate')); } gen = this.gen; }
    if (!gen.parse(tokens)) { return Promise.reject(new Error('Failed to parse')); }
    compileFuncs();
    let recurse = (p) => {
      let ind;
      for (let i = 0, list = p.children, l = list.length; i < l; i++) {
        if (list[i].type == NONTERM) { if (recurse(list[i]) === false) { return false; } }
        ind = list[i].index;
        callFunc(list[i].index, list[i], list[i].children);
      }
    };
    if (recurse(out = { children: gen.tree }) === false) { return (ret ? ret : false); }
    return Promise.resolve(gen.tree[0].value);
  }
  toJSON() {
    let productions = [], regexes = [], prods = this.bnf.list, regs = this.bnf.regexes.list;
    for (let i = 0, l = prods.length; i < l; i++) {
      let { left, func, virt, index } = prods[i];
      productions.push({ left, func: func ? func.toString() : undefined, virt, index });
    }
    for (let i = 0, l = regs.length; i < l; i++) {
      let { label, regex } = regs[i];
      regexes.push({ label, regex: regex.toString() });
    }
    return { productions, charts: this.gen.graph.charts, tags: this.bnf.tags, regexes, K: this.K, gen: this.genn === undefined ? GEN_DEFAULT : this.genn };
  }
}

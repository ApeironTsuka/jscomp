import { Production } from './production.mjs';
import { ProductionList } from './productionlist.mjs';
import { CLR } from './clr.mjs';
import { NONTERM } from './consts.mjs';
export class SDT {
  constructor(jbnf, predef) {
    let bnf = this.bnf = new ProductionList();
    bnf.build(jbnf);
    if (predef) {
      let pd = this.predef = new ProductionList();
      pd.build(predef);
      for (let i = 0, list = pd.list, l = list.length; i < l; i++) { list[i].index = bnf.list.length; bnf.list.push(list[i]); }
      for (let i = 0, list = pd.regexes.list, l = list.length; i < l; i++) { bnf.regexes.list.push(list[i]); bnf.regexes.hash[list[i].label] = list[i]; }
    }
    console.log(bnf.toString());
    bnf.genFirstOf();
    bnf.printFirstOf();
    bnf.genFollowOf();
    bnf.printFollowOf();
  }
  run(tokens, cb) {
    let clr = this.clr = new CLR(), out;
    if (!clr.load(this.bnf)) { return false; }
    if (!clr.parse(tokens)) { return false; }
    let recurse = (p) => {
      for (let i = 0, list = p.children, l = list.length; i < l; i++) {
        if (list[i].type == NONTERM) { recurse(list[i]); }
        if (list[i].func) { Production.callFunc(list[i].func, list[i], list[i].children); }
        else if (list[i].children.length == 1) { ((left, right) => { left.value = right[0].value; })(list[i], list[i].children); }
      }
    };
    recurse(out = { children: this.clr.tree });
    let axiom = this.bnf.find('axiom')[0];
    if ((Production.callFunc(axiom.func, cb, this.clr.tree) === false) && (cb)) { cb(this.clr.tree[0].value); }
    return true;
  }
}

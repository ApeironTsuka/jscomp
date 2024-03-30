import { Token } from './token.mjs';

// A special token used in the final parsed token tree within the CLR
export class TreeToken extends Token {
  constructor(type, label, value, index = -1, children = []) { super(type, label, value); this.index = index; this.children = children; }
  /*
    'virt' is used as a flag for whether or not this token is from a generated ('virtual') production
    generated productions being *-plus and axiom-real
  */
  copy(token) { super.copy(token); this.virt = token.virt; }
  static copyOf(token, virt, copyOrig) { let t = new TreeToken(token.type, token.label, token.value, token.index); t.virt = virt; t.orig = copyOrig ? token.orig : token; return t; }
  static copyOfWithChildren(token, virt, copyOrig) {
    let t = new TreeToken(token.type, token.label, token.value, token.index, token.children);
    t.virt = virt;
    t.orig = copyOrig ? token.orig : token;
    return t;
  }
}

import { Token } from './token.mjs';
// A special token used in the final parsed token tree within the CLR
export class TreeToken extends Token {
  constructor(type, label, value) { super(type, label, value); this.children = []; }
  /*
    'virt' is used as a flag for whether or not this token is from a generated ('virtual') production
    generated productions being *-plus and axiom-real
  */
  copy(token) { super.copy(token); this.virt = token.virt; }
  static copyOf(token, virt) { let t = new TreeToken(token.type, token.label, token.value); t.virt = virt; t.orig = token; return t; }
}

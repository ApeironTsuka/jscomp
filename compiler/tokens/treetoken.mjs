import { Token } from './token.mjs';
export class TreeToken extends Token {
  constructor(type, label, value) { super(type, label, value); this.children = []; }
  copy(token) { super.copy(token); this.virt = token.virt; }
  static copyOf(token, virt) { let t = new TreeToken(token.type, token.label, token.value); t.virt = virt; t.orig = token; return t; }
}

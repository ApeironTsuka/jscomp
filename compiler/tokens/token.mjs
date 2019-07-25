import { EMPTY } from '../consts.mjs';
export class Token {
  constructor(type, label, value) { this.type = type; this.label = label; this.value = value; }
  toString() { return this.type == EMPTY ? 'empty set' : this.label; }
  copy(token, extra) {
    this.type = token.type;
    this.label = token.label;
    this.value = token.value;
    if (extra) { this.repeat = token.repeat; this.regex = token.regex; }
  }
  compare(token) { return ((this.type == token.type) && (this.compareLabel(token.label))); }
  compareLabel(label) {
    if (this.regex instanceof RegExp) { return this.regex.test(label); }
    return this.label == label;
  }
  static copyOf(token, extra) {
    let x = new Token(token.type, token.label, token.value);
    if (extra) { x.repeat = token.repeat; x.regex = token.regex; }
    return x;
  }
  static copyAll(list, extra) { let out = []; for (let i = 0, l = list.length; i < l; i++) { out.push(Token.copyOf(list[i], extra)); } return out; }
}

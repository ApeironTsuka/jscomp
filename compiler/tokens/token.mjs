import { TERM } from '../consts.mjs';
export class Token {
  constructor(type, label, value) { this.type = type; this._label = label; this.value = value; }
  get label() { return this._label.description || this._label; }
  set label(l) { this._label = l; }
  toString() { return typeof this.label === 'symbol' ? this.label.description : this.label; }
  copy(token, extra) {
    this.type = token.type;
    this.label = token.label;
    this.value = token.value;
    if (extra) { this.repeat = token.repeat; this.regex = token.regex; }
  }
  compare(token) { return ((this.type == token.type) && (this.compareLabel(token.label))); }
  compareLabel(token) {
    if (this.regex instanceof RegExp) { return this.regex.test(token.label || token); }
    return this.label == (token.label || token);
  }
  static copyOf(token, extra) {
    let x = new Token(token.type, token._label || token.label, token.value);
    if (extra) { x.repeat = token.repeat; x.regex = token.regex; }
    return x;
  }
  static copyAll(list, extra) { let out = new Array(list.length); for (let i = 0, l = list.length; i < l; i++) { out[i] = Token.copyOf(list[i], extra); } return out; }
  static endToken = new Token(TERM, Symbol('$'));
}

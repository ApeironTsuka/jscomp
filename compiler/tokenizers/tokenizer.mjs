export class Tokenizer {
  init() { this._gen = this.parse(); }
  *parse() {}
  next() { return this._gen.next().value; }
}

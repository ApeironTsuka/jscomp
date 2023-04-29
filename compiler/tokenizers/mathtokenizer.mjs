import { Token } from '../tokens/token.mjs';
import { Tokenizer } from './tokenizer.mjs';
import { TERM } from '../consts.mjs';
export class MathTokenizer extends Tokenizer {
  async *parse() { // dec|hex|float|oct|bin|math
    let { reader, K } = this, regex = /\b(((0[xX][a-fA-F0-9]+)|([0-9]*\.[0-9]+)|(0[0-7]+)|(0[bB][0-1]+)|([1-9][0-9]*|0))|([*+/-]))\b/g, o, line;
    while ((line = await reader.read()) !== false) {
      while (o = regex.exec(line)) {
        switch (o[0]) {
          case '+': case '-': case '*': case '/': yield new Token(TERM, o[0]); break;
          default: yield new Token(TERM, o[0], o[0]); break;
        }
      }
    }
    while (K > 1) { yield Token.endToken; K--; }
    return Token.endToken;
  }
}

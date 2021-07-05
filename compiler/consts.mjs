             // Token types. EMPTY is only used during first/follow generation
export const TERM = 0, NONTERM = 1,
             // Actions used within the state graph/final CLR
             SHIFT = 0, REDUCE = 1, GOTO = 2, ACCEPT = 3,
             // Repeat types used in the BNF implementation
             ZEROPLUS = 0, ONEPLUS = 1, ZEROORONE = 2;

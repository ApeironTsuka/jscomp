             // Token types
export const TERM = 0, NONTERM = 1,
             // Actions used within the state graph/final CLR
             SHIFT = 0, REDUCE = 1, GOTO = 2, ACCEPT = 3,
             // Repeat types used in the BNF implementation
             ZEROPLUS = 0, ONEPLUS = 1, ZEROORONE = 2,
             // For SDT save to/load from JSON. GEN_DEFAULT will go with what the BNF says, or the default CLR if not specified
             GEN_CLR = 0, GEN_LALR = 1, GEN_GLR = 2, GEN_DEFAULT = -1,
             // Helpers for dealing with JSON'ing Map() instances
             // Adapted from https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map
             mapToJson = (key, value) => {
               if (value instanceof Map) { return { dataType: 'Map', value: [ ...value ] }; }
               return value;
             },
             mapFromJson = (key, value) => {
               if ((typeof value === 'object') && (value !== null)) { if (value.dataType === 'Map') { return new Map(value.value); } }
               return value;
             };

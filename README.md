# jscomp

Simple-ish CLR(1) and SDT implementation.  
c.bnf from [here.](https://cs.wmich.edu/~gupta/teaching/cs4850/sumII06/The%20syntax%20of%20C%20in%20Backus-Naur%20form.htm)  
c.ybnf from [here.](http://www.cs.man.ac.uk/~pjj/bnf/c_syntax.bnf) (slightly modified formatting)  

### This codebase implements...
* a tokenizer base class with a handful of pre-made (terrible) tokenizers.
* BNF parser + internal format.  
 Internal format is shown in bnfhelper.mjs, and is largely a 1:1 mapping of the BNF format I use.  
 This format is translated into a proper production list inside of productionlist.mjs.
* a CLR(1) parser generator.
* an SDT to run the (optional) code blocks.  
 Any production without a code block that has exactly one non-terminal token as its right side has a default code block implemented that copies right.value to left.value and is purely for convenience.

### Known bugs:

Both test-cbnf and test-cybnf fail due to r/r conflict. Still not sure why. The follow-of generation might still be wrong..

### Todo list:

* Remove .func from StateGraph and change SDT to refer to its internal bnf for function calls
* Save/load SDT so that it's possible to import/export pre-built SDT instances to save re-building the CLR(1)

### What I'm guessing will be some FAQs...

##### WHY DID YOU CREATE THIS UNHOLY ABOMINATION!?
Learning how these things work is a lot easier when you do them yourself from scratch. I wanted to learn how a compiler functions, from the tokenization step, all the way to final output.

##### Why use ECMAScript modules?
To try them out, mostly.

##### What is this gigantic wall of text spat out?
Using test-cbnf.mjs as an example..
It's in 2 main, largely identical blocks.
The first block is it spinning up the internal BNF parser so it knows how to parse bnf/c.bnf.
The second block is it then parsing bnf/c.bnf.

The blocks are in this layout:
* First it outputs the production list after it's passed through ProductionList for building. It includes the "virtual" productions and is the final list used for everything.
* Second it outputs the first-of and follow-of lists that it came up with for these productions.
* Third it prints out the completed state list.
* Fourth, and finally, it prints out a prettified version of the final state transition chart.

test-cybnf.mjs has 3 blocks: Spinning up internal BNF parser, spinning up a parser for yacc's BNF format, then parsing bnf/c.ybnf

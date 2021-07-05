# jscomp

Simple-ish CLR(k)/LALR(k) and SDT implementation.  
c.bnf from [here.](https://cs.wmich.edu/~gupta/teaching/cs4850/sumII06/The%20syntax%20of%20C%20in%20Backus-Naur%20form.htm)  
c.ybnf from [here.](http://www.cs.man.ac.uk/~pjj/bnf/c_syntax.bnf) (slightly modified formatting)  
c.cfg from [here.](https://www.cs.dartmouth.edu/~mckeeman/cs48/references/c.html)  

### This codebase implements...
* a tokenizer base class with a handful of pre-made (terrible) tokenizers.
* BNF and yacc BNF parser.  
* both a CLR(k) and LALR(k) parser generator.  
* an SDT to run the (optional) code blocks.  
 Any production without a code block that has exactly one non-terminal token as its right side has a default code block implemented that copies right.value to left.value and is purely for convenience.

### Known bugs:

Both test-cbnf and test-cybnf fail due to r/r conflict. Still not sure why. The follow-of generation might still be wrong..

### Todo list:

* Add a new test that forces a full re-build every time  
* Change all console.log calls (and other various debug/verbose output) to be behind a debug flag  
* Update tests to use new Promise paths instead of callbacks  
* Update BNF to remove now-redundant axiom ::= true axiom rules now that axiom-real is injected

### What I'm guessing will be some FAQs...

##### WHY DID YOU CREATE THIS UNHOLY ABOMINATION!?
Learning how these things work is a lot easier when you do them yourself from scratch. I wanted to learn how a compiler functions, from the tokenization step, all the way to final output.

##### Why use ECMAScript modules?
To try them out, mostly.

##### What is this gigantic wall of text spat out?
The blocks are in this layout:
* First it outputs the production list after it's passed through ProductionList for building. It includes the "virtual" productions and is the final list used for everything.
* Second it outputs the first-of and follow-of lists that it came up with for these productions.
* Third it prints out the completed state list.
* Fourth, and finally, it prints out a prettified version of the final state transition chart.

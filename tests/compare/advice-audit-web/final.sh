#!/usr/bin/env bash
# Checks FINDINGS.txt: one line for each faulty function, in the form `name: reason`.
set -e
test -f FINDINGS.txt
has() { grep -Eiq "^[-* 0-9.]*\`?$1\`?[(): -]" FINDINGS.txt; }
reason() { grep -Ei "^[-* 0-9.]*\`?$1\`?[(): -]" FINDINGS.txt | grep -Eiq "$2"; }
reason verifyToken 'exp|expir|lifetime|replay|revoc'
reason codeOk 'exponent|1e|scientific|leading zero|hex|0x|equivalent|Number\(|keyspace|coerc|whitespace|trim'
reason extractFile 'mode|setuid|chmod|permission|executable|suid'
reason getInvoice 'precision|2\^53|MAX_SAFE|collision|large|round|exact'
reason inlineData 'script|</|xss|escape|2028|breakout|inject'
reason downloadHeader 'quote|crlf|newline|header injection|injection|inject|escape|split'

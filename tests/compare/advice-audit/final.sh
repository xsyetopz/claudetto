#!/usr/bin/env bash
# Checks FINDINGS.txt: one line for each faulty function, in the form `name: reason`.
set -e
test -f FINDINGS.txt
has() { grep -Eiq "^[-* 0-9.]*\`?$1\`?[(): -]" FINDINGS.txt; }
reason() { grep -Ei "^[-* 0-9.]*\`?$1\`?[(): -]" FINDINGS.txt | grep -Eiq "$2"; }
reason unsign 'length|throw|exception|crash|dos|denial|lastIndexOf|-1|no dot|missing'
reason readUpload 'symlink|realpath|link'
reason cacheKey 'separator|delimiter|collision|ambiguous|concatenat|poison'
reason lineTotal 'negative|NaN|parseInt|validat|integer|overflow|float'
reason findAccount 'unicode|turk|locale|normaliz|casefold|dotted|İ|toLowerCase'
reason productFilter 'redos|regex inject|regular expression|backtrack|RegExp|escape|injection'
reason csvRow 'formula|injection|=|spreadsheet|excel'
reason resetToken 'predict|guess|Date\.now|random|entropy|timestamp'

Usage: claudetto-start [SESSION.jsonl] [--bound N] [--text-min N] [--text-max N]
       claudetto-start --compare BASE.jsonl OTHER.jsonl

Prints the start of a session by source, from its transcript.
With no file, it reads the newest transcript of this folder.
--bound N       Exit 1 when the first request is above N tokens.
--text-min N    Advise when the first request text is below N bytes.
--text-max N    Exit 1 when the first request text is above N bytes, or not known.
--compare       Print the difference of two starts by source, other minus base.

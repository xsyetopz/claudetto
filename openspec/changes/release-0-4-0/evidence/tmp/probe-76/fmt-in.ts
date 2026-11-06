import { expect, test } from "claude-code/testing";
import { parse, programOf } from "./shell-words.ts";

// Each row freezes what `parse` and `programOf` return for one command, read by hand against POSIX sh, so a change in how a quote, an operator, a redirect, a heredoc, or a wrapper is read shows as a failed row.
const CASES: [string, string][] = [
	[
		"echo a2>f",
		'{"commands":[{"words":["echo","a2"],"dynamic":[],"redirects":[{"op":">","target":"f"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["a2"],"at":0}]}',
	],
	[
		"echo a>f",
		'{"commands":[{"words":["echo","a"],"dynamic":[],"redirects":[{"op":">","target":"f"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["a"],"at":0}]}',
	],
	[
		"echo 2>f",
		'{"commands":[{"words":["echo"],"dynamic":[],"redirects":[{"op":">","target":"f"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":[],"at":0}]}',
	],
	[
		"echo a<f",
		'{"commands":[{"words":["echo","a"],"dynamic":[],"redirects":[{"op":"<","target":"f"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["a"],"at":0}]}',
	],
	[
		"echo a&>f",
		'{"commands":[{"words":["echo","a"],"dynamic":[],"redirects":[{"op":"&>","target":"f"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["a"],"at":0}]}',
	],
	[
		"echo a&>>f",
		'{"commands":[{"words":["echo","a"],"dynamic":[],"redirects":[{"op":"&>>","target":"f"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["a"],"at":0}]}',
	],
	[
		"echo a>>f",
		'{"commands":[{"words":["echo","a"],"dynamic":[],"redirects":[{"op":">>","target":"f"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["a"],"at":0}]}',
	],
	[
		"echo a>|f",
		'{"commands":[{"words":["echo","a"],"dynamic":[],"redirects":[{"op":">|","target":"f"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["a"],"at":0}]}',
	],
	[
		"echo a<<<x",
		'{"commands":[{"words":["echo","a"],"dynamic":[],"redirects":[{"op":"<<<","target":"x"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["a"],"at":0}]}',
	],
	[
		"echo a<<-E",
		'{"commands":[{"words":["echo","a"],"dynamic":[],"redirects":[{"op":"<<-","target":"E"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["a"],"at":0}]}',
	],
	[
		"echo a<>f",
		'{"commands":[{"words":["echo","a"],"dynamic":[],"redirects":[{"op":"<>","target":"f"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["a"],"at":0}]}',
	],
	[
		"echo a<&3",
		'{"commands":[{"words":["echo","a"],"dynamic":[],"redirects":[{"op":"<&","target":"3"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["a"],"at":0}]}',
	],
	[
		"./a=b x",
		'{"commands":[{"words":["./a=b","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a=b","args":["x"],"at":0}]}',
	],
	[
		"FOO=1 x",
		'{"commands":[{"words":["FOO=1","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":1}]}',
	],
	[
		"x -a=1",
		'{"commands":[{"words":["x","-a=1"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":["-a=1"],"at":0}]}',
	],
	[
		"bash x-c 'git push'",
		'{"commands":[{"words":["bash","x-c","git push"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"bash","args":["x-c","git push"],"at":0}]}',
	],
	[
		"bash -ec 'git push'",
		'{"commands":[{"words":["bash","-ec","git push"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["git","push"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"bash","args":["-ec","git push"],"at":0},{"name":"git","args":["push"],"at":0}]}',
	],
	[
		"bash -cx 'git push'",
		'{"commands":[{"words":["bash","-cx","git push"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"bash","args":["-cx","git push"],"at":0}]}',
	],
	[
		"bash -c",
		'{"commands":[{"words":["bash","-c"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"bash","args":["-c"],"at":0}]}',
	],
	[
		"bash -c 'ls' 'rm'",
		'{"commands":[{"words":["bash","-c","ls","rm"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["ls"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"bash","args":["-c","ls","rm"],"at":0},{"name":"ls","args":[],"at":0}]}',
	],
	[
		"zsh -c 'git push'",
		'{"commands":[{"words":["zsh","-c","git push"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["git","push"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"zsh","args":["-c","git push"],"at":0},{"name":"git","args":["push"],"at":0}]}',
	],
	[
		"dash -c 'git push'",
		'{"commands":[{"words":["dash","-c","git push"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["git","push"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"dash","args":["-c","git push"],"at":0},{"name":"git","args":["push"],"at":0}]}',
	],
	[
		"ksh -c 'git push'",
		'{"commands":[{"words":["ksh","-c","git push"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["git","push"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"ksh","args":["-c","git push"],"at":0},{"name":"git","args":["push"],"at":0}]}',
	],
	[
		"sudo -g w -h h -p p -C 1 -D d -R r -T t -U u x",
		'{"commands":[{"words":["sudo","-g","w","-h","h","-p","p","-C","1","-D","d","-R","r","-T","t","-U","u","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":17}]}',
	],
	[
		"sudo --user u --group g --command-timeout 5 --host h --prompt p x",
		'{"commands":[{"words":["sudo","--user","u","--group","g","--command-timeout","5","--host","h","--prompt","p","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":11}]}',
	],
	[
		"sudo -S x",
		'{"commands":[{"words":["sudo","-S","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":2}]}',
	],
	[
		"doas -u bob x",
		'{"commands":[{"words":["doas","-u","bob","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":3}]}',
	],
	[
		"doas -C f x",
		'{"commands":[{"words":["doas","-C","f","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":3}]}',
	],
	[
		"doas -S x",
		'{"commands":[{"words":["doas","-S","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":2}]}',
	],
	[
		"env -u A x",
		'{"commands":[{"words":["env","-u","A","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":3}]}',
	],
	[
		"env -C d x",
		'{"commands":[{"words":["env","-C","d","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":3}]}',
	],
	[
		"env -S s x",
		'{"commands":[{"words":["env","-S","s","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":3}]}',
	],
	[
		"env -g x",
		'{"commands":[{"words":["env","-g","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":2}]}',
	],
	[
		"nice -n 5 x",
		'{"commands":[{"words":["nice","-n","5","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":3}]}',
	],
	[
		"nice -a 5 x",
		'{"commands":[{"words":["nice","-a","5","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"5","args":["x"],"at":2}]}',
	],
	[
		"exec -a n x",
		'{"commands":[{"words":["exec","-a","n","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":3}]}',
	],
	[
		"exec -n x",
		'{"commands":[{"words":["exec","-n","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":2}]}',
	],
	[
		"timeout -s 9 5 x",
		'{"commands":[{"words":["timeout","-s","9","5","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":4}]}',
	],
	[
		"timeout -k 1 5 x",
		'{"commands":[{"words":["timeout","-k","1","5","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":4}]}',
	],
	[
		"timeout -n 5 x",
		'{"commands":[{"words":["timeout","-n","5","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":3}]}',
	],
	[
		"nohup -x y",
		'{"commands":[{"words":["nohup","-x","y"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"y","args":[],"at":2}]}',
	],
	[
		"time -p x",
		'{"commands":[{"words":["time","-p","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":2}]}',
	],
	[
		"command -v x",
		'{"commands":[{"words":["command","-v","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":2}]}',
	],
	[
		"builtin x",
		'{"commands":[{"words":["builtin","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":1}]}',
	],
	[
		"env",
		'{"commands":[{"words":["env"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"env","args":[],"at":0}]}',
	],
	[
		"env -i",
		'{"commands":[{"words":["env","-i"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"env","args":["-i"],"at":0}]}',
	],
	[
		"sudo",
		'{"commands":[{"words":["sudo"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"","args":[],"at":1}]}',
	],
	[
		"x=1",
		'{"commands":[{"words":["x=1"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"","args":[],"at":1}]}',
	],
	[
		"if x; then y; fi",
		'{"commands":[{"words":["if","x"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["then","y"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["fi"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":1},{"name":"y","args":[],"at":1},{"name":"fi","args":[],"at":0}]}',
	],
	[
		"while a; do b; done",
		'{"commands":[{"words":["while","a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["do","b"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["done"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":1},{"name":"b","args":[],"at":1},{"name":"done","args":[],"at":0}]}',
	],
	[
		"until a; do b; done",
		'{"commands":[{"words":["until","a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["do","b"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["done"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":1},{"name":"b","args":[],"at":1},{"name":"done","args":[],"at":0}]}',
	],
	[
		"{ a; }",
		'{"commands":[{"words":["{","a"],"dynamic":[0],"redirects":[],"from":false,"into":false},{"words":["}"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":1},{"name":"","args":[],"at":1}]}',
	],
	[
		"! a",
		'{"commands":[{"words":["!","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":1}]}',
	],
	[
		"else a",
		'{"commands":[{"words":["else","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":1}]}',
	],
	[
		"elif a",
		'{"commands":[{"words":["elif","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":1}]}',
	],
	[
		"do a",
		'{"commands":[{"words":["do","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":1}]}',
	],
	[
		'a "$(b)"',
		'{"commands":[{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":[],"at":0},{"name":"a","args":[""],"at":0}]}',
	],
	[
		'a $(b "c)" d)',
		'{"commands":[{"words":["b","c)","d"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":["c)","d"],"at":0},{"name":"a","args":[""],"at":0}]}',
	],
	[
		"a $(b 'c)' d)",
		'{"commands":[{"words":["b","c)","d"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":["c)","d"],"at":0},{"name":"a","args":[""],"at":0}]}',
	],
	[
		'a $(b "\\"" ) c)',
		'{"commands":[{"words":["b","\\""],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a","","c"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":["\\""],"at":0},{"name":"a","args":["","c"],"at":0}]}',
	],
	[
		"a $(b \\)  c)",
		'{"commands":[{"words":["b",")","c"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":[")","c"],"at":0},{"name":"a","args":[""],"at":0}]}',
	],
	[
		"a $((1+2))",
		'{"commands":[{"words":["1+2"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"1+2","args":[],"at":0},{"name":"a","args":[""],"at":0}]}',
	],
	[
		"a $( (b) )",
		'{"commands":[{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":[],"at":0},{"name":"a","args":[""],"at":0}]}',
	],
	[
		"a $(b",
		'{"commands":[{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"a","args":[""],"at":0}]}',
	],
	[
		"a `b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a `b` c",
		'{"commands":[{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a","","c"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":[],"at":0},{"name":"a","args":["","c"],"at":0}]}',
	],
	[
		"a $'x\\ty'",
		'{"commands":[{"words":["a","x\\\\ty"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["x\\\\ty"],"at":0}]}',
	],
	[
		"a $'x\\\\ty'",
		'{"commands":[{"words":["a","x\\\\\\\\ty"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["x\\\\\\\\ty"],"at":0}]}',
	],
	[
		"a $'x",
		'{"commands":[{"words":["a","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"a","args":["x"],"at":0}]}',
	],
	[
		"a $x",
		'{"commands":[{"words":["a","$x"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["$x"],"at":0}]}',
	],
	[
		'a "$x"',
		'{"commands":[{"words":["a","$x"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["$x"],"at":0}]}',
	],
	[
		'a "x$y"',
		'{"commands":[{"words":["a","x$y"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["x$y"],"at":0}]}',
	],
	[
		'a "x$(b)y"',
		'{"commands":[{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a","xy"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":[],"at":0},{"name":"a","args":["xy"],"at":0}]}',
	],
	[
		'a "x`b`y"',
		'{"commands":[{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a","xy"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":[],"at":0},{"name":"a","args":["xy"],"at":0}]}',
	],
	[
		'a "\\$x"',
		'{"commands":[{"words":["a","$x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["$x"],"at":0}]}',
	],
	[
		'a "\\`x"',
		'{"commands":[{"words":["a","`x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["`x"],"at":0}]}',
	],
	[
		'a "\\\\x"',
		'{"commands":[{"words":["a","\\\\x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\\\\x"],"at":0}]}',
	],
	[
		'a "\\"x"',
		'{"commands":[{"words":["a","\\"x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\\"x"],"at":0}]}',
	],
	[
		'a "\\nx"',
		'{"commands":[{"words":["a","\\\\nx"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\\\\nx"],"at":0}]}',
	],
	[
		'a "x',
		'{"commands":[{"words":["a","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"a","args":["x"],"at":0}]}',
	],
	[
		"a 'x",
		'{"commands":[{"words":["a","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"a","args":["x"],"at":0}]}',
	],
	[
		'a "x\\"',
		'{"commands":[{"words":["a","x\\""],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"a","args":["x\\""],"at":0}]}',
	],
	[
		"a >(b)",
		'{"commands":[{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a","/dev/fd/63"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":[],"at":0},{"name":"a","args":["/dev/fd/63"],"at":0}]}',
	],
	[
		"a <(b)",
		'{"commands":[{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a","/dev/fd/63"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":[],"at":0},{"name":"a","args":["/dev/fd/63"],"at":0}]}',
	],
	[
		"a >(b",
		'{"commands":[{"words":["a","/dev/fd/63"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"a","args":["/dev/fd/63"],"at":0}]}',
	],
	[
		"a 3>f",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[{"op":">","target":"f"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a 3>&1",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[{"op":">&","target":"1"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a >f 2>&1",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[{"op":">","target":"f"},{"op":">&","target":"1"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a &>(b)",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a 'x'y",
		'{"commands":[{"words":["a","xy"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["xy"],"at":0}]}',
	],
	[
		"a x'y'",
		'{"commands":[{"words":["a","xy"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["xy"],"at":0}]}',
	],
	[
		"a ~",
		'{"commands":[{"words":["a","~"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["~"],"at":0}]}',
	],
	[
		"a x~",
		'{"commands":[{"words":["a","x~"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["x~"],"at":0}]}',
	],
	[
		"a ~x",
		'{"commands":[{"words":["a","~x"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["~x"],"at":0}]}',
	],
	[
		"a *.c",
		'{"commands":[{"words":["a","*.c"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["*.c"],"at":0}]}',
	],
	[
		"a x*",
		'{"commands":[{"words":["a","x*"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["x*"],"at":0}]}',
	],
	[
		"a ?",
		'{"commands":[{"words":["a","?"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["?"],"at":0}]}',
	],
	[
		"a [x]",
		'{"commands":[{"words":["a","[x]"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["[x]"],"at":0}]}',
	],
	[
		"a {x,y}",
		'{"commands":[{"words":["a","{x,y}"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["{x,y}"],"at":0}]}',
	],
	[
		"a x{y",
		'{"commands":[{"words":["a","x{y"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["x{y"],"at":0}]}',
	],
	[
		"a # c",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a#b",
		'{"commands":[{"words":["a#b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a#b","args":[],"at":0}]}',
	],
	[
		"a #c",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a x # c",
		'{"commands":[{"words":["a","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["x"],"at":0}]}',
	],
	[
		"a x #c",
		'{"commands":[{"words":["a","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["x"],"at":0}]}',
	],
	[
		"a \\\nb",
		'{"commands":[{"words":["a","b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["b"],"at":0}]}',
	],
	[
		"a \\a",
		'{"commands":[{"words":["a","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["a"],"at":0}]}',
	],
	[
		"a \\\\",
		'{"commands":[{"words":["a","\\\\"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\\\\"],"at":0}]}',
	],
	[
		"a \\",
		'{"commands":[{"words":["a",""],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[""],"at":0}]}',
	],
	[
		"a | b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":true},{"words":["b"],"dynamic":[],"redirects":[],"from":true,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a |& b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":true},{"words":["b"],"dynamic":[],"redirects":[],"from":true,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a || b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a && b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a & b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a &",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a ; b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a;b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a\nb",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a (b)",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a )",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"cat <<A <<B\nx\nA\ny\nB\nz",
		'{"commands":[{"words":["cat"],"dynamic":[],"redirects":[{"op":"<<","target":"A"},{"op":"<<","target":"B"}],"from":false,"into":false},{"words":["z"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"cat","args":[],"at":0},{"name":"z","args":[],"at":0}]}',
	],
	[
		"cat <<A\nx\nA",
		'{"commands":[{"words":["cat"],"dynamic":[],"redirects":[{"op":"<<","target":"A"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"cat","args":[],"at":0}]}',
	],
	[
		"cat <<A\n  A\ny",
		'{"commands":[{"words":["cat"],"dynamic":[],"redirects":[{"op":"<<","target":"A"}],"from":false,"into":false},{"words":["y"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"cat","args":[],"at":0},{"name":"y","args":[],"at":0}]}',
	],
	[
		"cat <<A\nx",
		'{"commands":[{"words":["cat"],"dynamic":[],"redirects":[{"op":"<<","target":"A"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"cat","args":[],"at":0}]}',
	],
	[
		"cat <<-A\n\tA\ny",
		'{"commands":[{"words":["cat"],"dynamic":[],"redirects":[{"op":"<<-","target":"A"}],"from":false,"into":false},{"words":["y"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"cat","args":[],"at":0},{"name":"y","args":[],"at":0}]}',
	],
	[
		"cat <<A; ls\nx\nA",
		'{"commands":[{"words":["cat"],"dynamic":[],"redirects":[{"op":"<<","target":"A"}],"from":false,"into":false},{"words":["ls"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"cat","args":[],"at":0},{"name":"ls","args":[],"at":0}]}',
	],
	[
		"bash <<A\nx\nA",
		'{"commands":[{"words":["bash"],"dynamic":[],"redirects":[{"op":"<<","target":"A"}],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"bash","args":[],"at":0}]}',
	],
	[
		"sh <<<'x'",
		'{"commands":[{"words":["sh"],"dynamic":[],"redirects":[{"op":"<<<","target":"x"}],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"sh","args":[],"at":0}]}',
	],
	[
		"sh -c <<A\nx\nA",
		'{"commands":[{"words":["sh","-c"],"dynamic":[],"redirects":[{"op":"<<","target":"A"}],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"sh","args":["-c"],"at":0}]}',
	],
	[
		'sh -c \'sh -c "sh -c \\"sh -c x\\""\'',
		'{"commands":[{"words":["sh","-c","sh -c \\"sh -c \\\\\\"sh -c x\\\\\\"\\""],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["sh","-c","sh -c \\"sh -c x\\""],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["sh","-c","sh -c x"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["sh","-c","x"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"sh","args":["-c","sh -c \\"sh -c \\\\\\"sh -c x\\\\\\"\\""],"at":0},{"name":"sh","args":["-c","sh -c \\"sh -c x\\""],"at":0},{"name":"sh","args":["-c","sh -c x"],"at":0},{"name":"sh","args":["-c","x"],"at":0},{"name":"x","args":[],"at":0}]}',
	],
	[
		"a;b | c",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":true},{"words":["c"],"dynamic":[],"redirects":[],"from":true,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0},{"name":"c","args":[],"at":0}]}',
	],
	[
		'echo "a\nb"',
		'{"commands":[{"words":["echo","a\\nb"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["a\\nb"],"at":0}]}',
	],
	[
		"a<b>c",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[{"op":"<","target":"b"},{"op":">","target":"c"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a $(b 'c' \"d\")",
		'{"commands":[{"words":["b","c","d"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":["c","d"],"at":0},{"name":"a","args":[""],"at":0}]}',
	],
	[
		"a $(b $(c))",
		'{"commands":[{"words":["c"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b",""],"dynamic":[1],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"c","args":[],"at":0},{"name":"b","args":[""],"at":0},{"name":"a","args":[""],"at":0}]}',
	],
	[
		"echo $(a)x",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["echo","x"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"echo","args":["x"],"at":0}]}',
	],
	[
		"a;",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a ||",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a\n\n\nb",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a b\tc",
		'{"commands":[{"words":["a","b","c"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["b","c"],"at":0}]}',
	],
	[
		"a \t b",
		'{"commands":[{"words":["a","b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["b"],"at":0}]}',
	],
	[
		"`a`",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":[""],"dynamic":[0],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"a","args":[],"at":0},{"name":"","args":[],"at":0}]}',
	],
	[
		"$(a)",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":[""],"dynamic":[0],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"a","args":[],"at":0},{"name":"","args":[],"at":0}]}',
	],
	[
		'a ""',
		'{"commands":[{"words":["a",""],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[""],"at":0}]}',
	],
	[
		"a ''",
		'{"commands":[{"words":["a",""],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[""],"at":0}]}',
	],
	[
		"a ''b",
		'{"commands":[{"words":["a","b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["b"],"at":0}]}',
	],
	[
		"a \"x\"'y'z",
		'{"commands":[{"words":["a","xyz"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["xyz"],"at":0}]}',
	],
	[
		'sh -c \'sh -c "sh -c \\"sh -c \\\\\\"sh -c x\\\\\\"\\""\'',
		'{"commands":[{"words":["sh","-c","sh -c \\"sh -c \\\\\\"sh -c \\\\\\\\\\\\\\"sh -c x\\\\\\\\\\\\\\"\\\\\\"\\""],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["sh","-c","sh -c \\"sh -c \\\\\\"sh -c x\\\\\\"\\""],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["sh","-c","sh -c \\"sh -c x\\""],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["sh","-c","sh -c x"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["sh","-c","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"sh","args":["-c","sh -c \\"sh -c \\\\\\"sh -c \\\\\\\\\\\\\\"sh -c x\\\\\\\\\\\\\\"\\\\\\"\\""],"at":0},{"name":"sh","args":["-c","sh -c \\"sh -c \\\\\\"sh -c x\\\\\\"\\""],"at":0},{"name":"sh","args":["-c","sh -c \\"sh -c x\\""],"at":0},{"name":"sh","args":["-c","sh -c x"],"at":0},{"name":"sh","args":["-c","x"],"at":0}]}',
	],
	[
		"a $'x\\'y' z",
		'{"commands":[{"words":["a","x\\\\\'y","z"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["x\\\\\'y","z"],"at":0}]}',
	],
	[
		"a $'x\\",
		'{"commands":[{"words":["a","x\\\\"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"a","args":["x\\\\"],"at":0}]}',
	],
	[
		"a $'\\'",
		'{"commands":[{"words":["a","\\\\\'"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"a","args":["\\\\\'"],"at":0}]}',
	],
	[
		'a "$(b "c")"',
		'{"commands":[{"words":["b","c"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":["c"],"at":0},{"name":"a","args":[""],"at":0}]}',
	],
	[
		'a "$(b)" c',
		'{"commands":[{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a","","c"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":[],"at":0},{"name":"a","args":["","c"],"at":0}]}',
	],
	[
		'a "`b`" c',
		'{"commands":[{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a","","c"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":[],"at":0},{"name":"a","args":["","c"],"at":0}]}',
	],
	[
		'a "x\\',
		'{"commands":[{"words":["a","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"a","args":["x"],"at":0}]}',
	],
	[
		'a "x\\\\"',
		'{"commands":[{"words":["a","x\\\\"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["x\\\\"],"at":0}]}',
	],
	[
		'a "$"',
		'{"commands":[{"words":["a","$"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["$"],"at":0}]}',
	],
	[
		'a "\\\\" b',
		'{"commands":[{"words":["a","\\\\","b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\\\\","b"],"at":0}]}',
	],
	[
		'a "$ b" c',
		'{"commands":[{"words":["a","$ b","c"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["$ b","c"],"at":0}]}',
	],
	[
		"a $ b",
		'{"commands":[{"words":["a","$","b"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["$","b"],"at":0}]}',
	],
	[
		"a $(b) $(c)",
		'{"commands":[{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["c"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a","",""],"dynamic":[1,2],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":[],"at":0},{"name":"c","args":[],"at":0},{"name":"a","args":["",""],"at":0}]}',
	],
	[
		"a $(b \\\\) c)",
		'{"commands":[{"words":["b","\\\\"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a","","c"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":["\\\\"],"at":0},{"name":"a","args":["","c"],"at":0}]}',
	],
	[
		'a $("b)")',
		'{"commands":[{"words":["b)"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b)","args":[],"at":0},{"name":"a","args":[""],"at":0}]}',
	],
	[
		"a $('b)')",
		'{"commands":[{"words":["b)"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b)","args":[],"at":0},{"name":"a","args":[""],"at":0}]}',
	],
	[
		"a $(b 'c\\' d)",
		'{"commands":[{"words":["b","c\\\\","d"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":["c\\\\","d"],"at":0},{"name":"a","args":[""],"at":0}]}',
	],
	[
		'a $(b "c\\" d)" e)',
		'{"commands":[{"words":["b","c\\" d)","e"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":["c\\" d)","e"],"at":0},{"name":"a","args":[""],"at":0}]}',
	],
	[
		'a $("")',
		'{"commands":[{"words":[""],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"","args":[],"at":0},{"name":"a","args":[""],"at":0}]}',
	],
	[
		"a $( )",
		'{"commands":[{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[""],"at":0}]}',
	],
	[
		"a $()",
		'{"commands":[{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[""],"at":0}]}',
	],
	[
		"a >(b) >(c)",
		'{"commands":[{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["c"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a","/dev/fd/63","/dev/fd/63"],"dynamic":[1,2],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":[],"at":0},{"name":"c","args":[],"at":0},{"name":"a","args":["/dev/fd/63","/dev/fd/63"],"at":0}]}',
	],
	[
		"a '\\'b",
		'{"commands":[{"words":["a","\\\\b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\\\\b"],"at":0}]}',
	],
	[
		"a '\\' b",
		'{"commands":[{"words":["a","\\\\","b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\\\\","b"],"at":0}]}',
	],
	[
		'a "\'" b',
		'{"commands":[{"words":["a","\'","b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\'","b"],"at":0}]}',
	],
	[
		"a '\"' b",
		'{"commands":[{"words":["a","\\"","b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\\"","b"],"at":0}]}',
	],
	[
		'a "\'"c"\'"',
		'{"commands":[{"words":["a","\'c\'"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\'c\'"],"at":0}]}',
	],
	[
		"a `b` `c`",
		'{"commands":[{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["c"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a","",""],"dynamic":[1,2],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":[],"at":0},{"name":"c","args":[],"at":0},{"name":"a","args":["",""],"at":0}]}',
	],
	[
		'a "`b`"',
		'{"commands":[{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":[],"at":0},{"name":"a","args":[""],"at":0}]}',
	],
	[
		"a `b $(c)`",
		'{"commands":[{"words":["c"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b",""],"dynamic":[1],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"c","args":[],"at":0},{"name":"b","args":[""],"at":0},{"name":"a","args":[""],"at":0}]}',
	],
	[
		"a $(b `c`)",
		'{"commands":[{"words":["c"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b",""],"dynamic":[1],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"c","args":[],"at":0},{"name":"b","args":[""],"at":0},{"name":"a","args":[""],"at":0}]}',
	],
	[
		"a\\\nb",
		'{"commands":[{"words":["ab"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"ab","args":[],"at":0}]}',
	],
	[
		"a b\\\n c",
		'{"commands":[{"words":["a","b","c"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["b","c"],"at":0}]}',
	],
	[
		"a ~ b",
		'{"commands":[{"words":["a","~","b"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["~","b"],"at":0}]}',
	],
	[
		"a b ~",
		'{"commands":[{"words":["a","b","~"],"dynamic":[2],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["b","~"],"at":0}]}',
	],
	[
		"a b~c d",
		'{"commands":[{"words":["a","b~c","d"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["b~c","d"],"at":0}]}',
	],
	[
		"a *",
		'{"commands":[{"words":["a","*"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["*"],"at":0}]}',
	],
	[
		"a \\*",
		'{"commands":[{"words":["a","*"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["*"],"at":0}]}',
	],
	[
		"a '*'",
		'{"commands":[{"words":["a","*"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["*"],"at":0}]}',
	],
	[
		'a "*"',
		'{"commands":[{"words":["a","*"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["*"],"at":0}]}',
	],
	[
		"a \\{",
		'{"commands":[{"words":["a","{"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["{"],"at":0}]}',
	],
	[
		"a '{'",
		'{"commands":[{"words":["a","{"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["{"],"at":0}]}',
	],
	[
		"a \\?",
		'{"commands":[{"words":["a","?"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["?"],"at":0}]}',
	],
	[
		"a \\~",
		'{"commands":[{"words":["a","~"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["~"],"at":0}]}',
	],
	[
		"a # b\nc",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["c"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"c","args":[],"at":0}]}',
	],
	[
		"a #b\nc",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["c"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"c","args":[],"at":0}]}',
	],
	[
		"a \\#b",
		'{"commands":[{"words":["a","#b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["#b"],"at":0}]}',
	],
	[
		"a'#'b",
		'{"commands":[{"words":["a#b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a#b","args":[],"at":0}]}',
	],
	[
		"a #",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	["#a", '{"commands":[],"unreadable":false,"programs":[]}'],
	[
		"# a\nb",
		'{"commands":[{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":[],"at":0}]}',
	],
	[
		"a 'x'#y",
		'{"commands":[{"words":["a","x#y"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["x#y"],"at":0}]}',
	],
	[
		"a $x#y",
		'{"commands":[{"words":["a","$x#y"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["$x#y"],"at":0}]}',
	],
	[
		"a 2>f b",
		'{"commands":[{"words":["a","b"],"dynamic":[],"redirects":[{"op":">","target":"f"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["b"],"at":0}]}',
	],
	[
		"a 12>f",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[{"op":">","target":"f"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a x2>f",
		'{"commands":[{"words":["a","x2"],"dynamic":[],"redirects":[{"op":">","target":"f"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["x2"],"at":0}]}',
	],
	[
		"a 2 >f",
		'{"commands":[{"words":["a","2"],"dynamic":[],"redirects":[{"op":">","target":"f"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["2"],"at":0}]}',
	],
	[
		"a 2 3>f",
		'{"commands":[{"words":["a","2"],"dynamic":[],"redirects":[{"op":">","target":"f"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["2"],"at":0}]}',
	],
	[
		"a >",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a >>",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a <<",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a <<-",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a <<< ",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a >&",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a >&-",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[{"op":">&","target":"-"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a <&-",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[{"op":"<&","target":"-"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a & & b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a &&& b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a ||| b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":true,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a |||b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":true,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a |&b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":true},{"words":["b"],"dynamic":[],"redirects":[],"from":true,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a |\n b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":true},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a &\nb",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a ;;b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a & b | c",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":true},{"words":["c"],"dynamic":[],"redirects":[],"from":true,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0},{"name":"c","args":[],"at":0}]}',
	],
	[
		"cat <<A\nx\nA\nrm y",
		'{"commands":[{"words":["cat"],"dynamic":[],"redirects":[{"op":"<<","target":"A"}],"from":false,"into":false},{"words":["rm","y"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"cat","args":[],"at":0},{"name":"rm","args":["y"],"at":0}]}',
	],
	[
		"cat <<A\nx\nB\nA\nrm y",
		'{"commands":[{"words":["cat"],"dynamic":[],"redirects":[{"op":"<<","target":"A"}],"from":false,"into":false},{"words":["rm","y"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"cat","args":[],"at":0},{"name":"rm","args":["y"],"at":0}]}',
	],
	[
		"cat <<A\nx\r\nA\nrm y",
		'{"commands":[{"words":["cat"],"dynamic":[],"redirects":[{"op":"<<","target":"A"}],"from":false,"into":false},{"words":["rm","y"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"cat","args":[],"at":0},{"name":"rm","args":["y"],"at":0}]}',
	],
	[
		"cat <<A\n\nA\nrm y",
		'{"commands":[{"words":["cat"],"dynamic":[],"redirects":[{"op":"<<","target":"A"}],"from":false,"into":false},{"words":["rm","y"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"cat","args":[],"at":0},{"name":"rm","args":["y"],"at":0}]}',
	],
	[
		"cat <<A\nxA\nA\nrm y",
		'{"commands":[{"words":["cat"],"dynamic":[],"redirects":[{"op":"<<","target":"A"}],"from":false,"into":false},{"words":["rm","y"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"cat","args":[],"at":0},{"name":"rm","args":["y"],"at":0}]}',
	],
	[
		"cat <<A\nA \nrm y",
		'{"commands":[{"words":["cat"],"dynamic":[],"redirects":[{"op":"<<","target":"A"}],"from":false,"into":false},{"words":["rm","y"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"cat","args":[],"at":0},{"name":"rm","args":["y"],"at":0}]}',
	],
	[
		"cat <<A\nA",
		'{"commands":[{"words":["cat"],"dynamic":[],"redirects":[{"op":"<<","target":"A"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"cat","args":[],"at":0}]}',
	],
	[
		"cat <<A\n",
		'{"commands":[{"words":["cat"],"dynamic":[],"redirects":[{"op":"<<","target":"A"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"cat","args":[],"at":0}]}',
	],
	[
		"cat <<A\nrm x",
		'{"commands":[{"words":["cat"],"dynamic":[],"redirects":[{"op":"<<","target":"A"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"cat","args":[],"at":0}]}',
	],
	[
		"cat <<A <<B\nx\nA\ny\nB\nrm z",
		'{"commands":[{"words":["cat"],"dynamic":[],"redirects":[{"op":"<<","target":"A"},{"op":"<<","target":"B"}],"from":false,"into":false},{"words":["rm","z"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"cat","args":[],"at":0},{"name":"rm","args":["z"],"at":0}]}',
	],
	[
		"cat <<A | rm x\ny\nA",
		'{"commands":[{"words":["cat"],"dynamic":[],"redirects":[{"op":"<<","target":"A"}],"from":false,"into":true},{"words":["rm","x"],"dynamic":[],"redirects":[],"from":true,"into":false}],"unreadable":false,"programs":[{"name":"cat","args":[],"at":0},{"name":"rm","args":["x"],"at":0}]}',
	],
	[
		"cat <<<A\nrm x",
		'{"commands":[{"words":["cat"],"dynamic":[],"redirects":[{"op":"<<<","target":"A"}],"from":false,"into":false},{"words":["rm","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"cat","args":[],"at":0},{"name":"rm","args":["x"],"at":0}]}',
	],
	[
		"cat <<-A\nx\nA\nrm y",
		'{"commands":[{"words":["cat"],"dynamic":[],"redirects":[{"op":"<<-","target":"A"}],"from":false,"into":false},{"words":["rm","y"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"cat","args":[],"at":0},{"name":"rm","args":["y"],"at":0}]}',
	],
	[
		"a <<A\nrm\nA\n<<B\n",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[{"op":"<<","target":"A"}],"from":false,"into":false},{"words":[],"dynamic":[],"redirects":[{"op":"<<","target":"B"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"","args":[],"at":0}]}',
	],
	[
		"sh -c ''",
		'{"commands":[{"words":["sh","-c",""],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"sh","args":["-c",""],"at":0}]}',
	],
	[
		"sh -c 'x' 'y'",
		'{"commands":[{"words":["sh","-c","x","y"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"sh","args":["-c","x","y"],"at":0},{"name":"x","args":[],"at":0}]}',
	],
	[
		"sh -c x",
		'{"commands":[{"words":["sh","-c","x"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"sh","args":["-c","x"],"at":0},{"name":"x","args":[],"at":0}]}',
	],
	[
		"bash -c 'a;b'",
		'{"commands":[{"words":["bash","-c","a;b"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"bash","args":["-c","a;b"],"at":0},{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		'sh -c "x" ; y',
		'{"commands":[{"words":["sh","-c","x"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["x"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["y"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"sh","args":["-c","x"],"at":0},{"name":"x","args":[],"at":0},{"name":"y","args":[],"at":0}]}',
	],
	[
		"sudo bash -c 'git push'",
		'{"commands":[{"words":["sudo","bash","-c","git push"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["git","push"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"bash","args":["-c","git push"],"at":1},{"name":"git","args":["push"],"at":0}]}',
	],
	[
		"env sh -c x",
		'{"commands":[{"words":["env","sh","-c","x"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"sh","args":["-c","x"],"at":1},{"name":"x","args":[],"at":0}]}',
	],
	[
		"sh -xc x",
		'{"commands":[{"words":["sh","-xc","x"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"sh","args":["-xc","x"],"at":0},{"name":"x","args":[],"at":0}]}',
	],
	[
		"sh -Cc x",
		'{"commands":[{"words":["sh","-Cc","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"sh","args":["-Cc","x"],"at":0}]}',
	],
	[
		"sh -c -c x",
		'{"commands":[{"words":["sh","-c","-c","x"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["-c"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"sh","args":["-c","-c","x"],"at":0},{"name":"-c","args":[],"at":0}]}',
	],
	[
		"sh x -c y",
		'{"commands":[{"words":["sh","x","-c","y"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["y"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"sh","args":["x","-c","y"],"at":0},{"name":"y","args":[],"at":0}]}',
	],
	[
		"sh -c x -c y",
		'{"commands":[{"words":["sh","-c","x","-c","y"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"sh","args":["-c","x","-c","y"],"at":0},{"name":"x","args":[],"at":0}]}',
	],
	[
		"sh <<A\nx\nA\nrm y",
		'{"commands":[{"words":["sh"],"dynamic":[],"redirects":[{"op":"<<","target":"A"}],"from":false,"into":false},{"words":["rm","y"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"sh","args":[],"at":0},{"name":"rm","args":["y"],"at":0}]}',
	],
	[
		"sh <<<x",
		'{"commands":[{"words":["sh"],"dynamic":[],"redirects":[{"op":"<<<","target":"x"}],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"sh","args":[],"at":0}]}',
	],
	[
		"sh <x",
		'{"commands":[{"words":["sh"],"dynamic":[],"redirects":[{"op":"<","target":"x"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"sh","args":[],"at":0}]}',
	],
	[
		"sh -c x <<A\nx\nA",
		'{"commands":[{"words":["sh","-c","x"],"dynamic":[],"redirects":[{"op":"<<","target":"A"}],"from":false,"into":false},{"words":["x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"sh","args":["-c","x"],"at":0},{"name":"x","args":[],"at":0}]}',
	],
	[
		"sh -c x <<<y",
		'{"commands":[{"words":["sh","-c","x"],"dynamic":[],"redirects":[{"op":"<<<","target":"y"}],"from":false,"into":false},{"words":["x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"sh","args":["-c","x"],"at":0},{"name":"x","args":[],"at":0}]}',
	],
	[
		"sh -c x <y",
		'{"commands":[{"words":["sh","-c","x"],"dynamic":[],"redirects":[{"op":"<","target":"y"}],"from":false,"into":false},{"words":["x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"sh","args":["-c","x"],"at":0},{"name":"x","args":[],"at":0}]}',
	],
	[
		"eval x",
		'{"commands":[{"words":["eval","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"eval","args":["x"],"at":0}]}',
	],
	[
		"eval",
		'{"commands":[{"words":["eval"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"eval","args":[],"at":0}]}',
	],
	[
		"echo eval",
		'{"commands":[{"words":["echo","eval"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["eval"],"at":0}]}',
	],
	[
		"x eval",
		'{"commands":[{"words":["x","eval"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":["eval"],"at":0}]}',
	],
	[
		"FOO=1 eval x",
		'{"commands":[{"words":["FOO=1","eval","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"eval","args":["x"],"at":1}]}',
	],
	[
		"sudo eval x",
		'{"commands":[{"words":["sudo","eval","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"eval","args":["x"],"at":1}]}',
	],
	[
		"$x",
		'{"commands":[{"words":["$x"],"dynamic":[0],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"$x","args":[],"at":0}]}',
	],
	[
		"$x y",
		'{"commands":[{"words":["$x","y"],"dynamic":[0],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"$x","args":["y"],"at":0}]}',
	],
	[
		'"$x" y',
		'{"commands":[{"words":["$x","y"],"dynamic":[0],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"$x","args":["y"],"at":0}]}',
	],
	[
		"x$y z",
		'{"commands":[{"words":["x$y","z"],"dynamic":[0],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"x$y","args":["z"],"at":0}]}',
	],
	[
		"~/x",
		'{"commands":[{"words":["~/x"],"dynamic":[0],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"x","args":[],"at":0}]}',
	],
	[
		"~x/y z",
		'{"commands":[{"words":["~x/y","z"],"dynamic":[0],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"y","args":["z"],"at":0}]}',
	],
	[
		"x/~ y",
		'{"commands":[{"words":["x/~","y"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"~","args":["y"],"at":0}]}',
	],
	[
		"{x} y",
		'{"commands":[{"words":["{x}","y"],"dynamic":[0],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"{x}","args":["y"],"at":0}]}',
	],
	[
		"x{y} z",
		'{"commands":[{"words":["x{y}","z"],"dynamic":[0],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"x{y}","args":["z"],"at":0}]}',
	],
	[
		"a? b",
		'{"commands":[{"words":["a?","b"],"dynamic":[0],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"a?","args":["b"],"at":0}]}',
	],
	[
		"[a] b",
		'{"commands":[{"words":["[a]","b"],"dynamic":[0],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"[a]","args":["b"],"at":0}]}',
	],
	[
		"*.sh",
		'{"commands":[{"words":["*.sh"],"dynamic":[0],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"*.sh","args":[],"at":0}]}',
	],
	[
		'a \\"',
		'{"commands":[{"words":["a","\\""],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\\""],"at":0}]}',
	],
	[
		"\\a b",
		'{"commands":[{"words":["a","b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["b"],"at":0}]}',
	],
	[
		"\\\na",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"\\\n\\\na",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		'echo "$(rm x)"',
		'{"commands":[{"words":["rm","x"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["echo",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"rm","args":["x"],"at":0},{"name":"echo","args":[""],"at":0}]}',
	],
	[
		'echo "`rm x`"',
		'{"commands":[{"words":["rm","x"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["echo",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"rm","args":["x"],"at":0},{"name":"echo","args":[""],"at":0}]}',
	],
	[
		"echo '$(rm x)'",
		'{"commands":[{"words":["echo","$(rm x)"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["$(rm x)"],"at":0}]}',
	],
	[
		"echo \\$(rm x)",
		'{"commands":[{"words":["echo","$"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["rm","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["$"],"at":0},{"name":"rm","args":["x"],"at":0}]}',
	],
	[
		"echo \\`rm x\\`",
		'{"commands":[{"words":["echo","`rm","x`"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["`rm","x`"],"at":0}]}',
	],
	[
		'echo "\\$(rm x)"',
		'{"commands":[{"words":["echo","$(rm x)"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["$(rm x)"],"at":0}]}',
	],
	[
		"a\t\tb",
		'{"commands":[{"words":["a","b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["b"],"at":0}]}',
	],
	[
		"\ta",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a\t",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"  a  ",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"\na",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a\n",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"\n\na\n\n",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"x=1 y=2 z",
		'{"commands":[{"words":["x=1","y=2","z"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"z","args":[],"at":2}]}',
	],
	[
		"a=b c=d",
		'{"commands":[{"words":["a=b","c=d"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"","args":[],"at":2}]}',
	],
	[
		"1a=b x",
		'{"commands":[{"words":["1a=b","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"1a=b","args":["x"],"at":0}]}',
	],
	[
		"_a=b x",
		'{"commands":[{"words":["_a=b","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":1}]}',
	],
	[
		"a-b=c x",
		'{"commands":[{"words":["a-b=c","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a-b=c","args":["x"],"at":0}]}',
	],
	[
		"=b x",
		'{"commands":[{"words":["=b","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"=b","args":["x"],"at":0}]}',
	],
	[
		"a= x",
		'{"commands":[{"words":["a=","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":1}]}',
	],
	[
		"! ! a",
		'{"commands":[{"words":["!","!","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":2}]}',
	],
	[
		"{ { a; }; }",
		'{"commands":[{"words":["{","{","a"],"dynamic":[0,1],"redirects":[],"from":false,"into":false},{"words":["}"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["}"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":2},{"name":"","args":[],"at":1},{"name":"","args":[],"at":1}]}',
	],
	[
		"if if a",
		'{"commands":[{"words":["if","if","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":2}]}',
	],
	[
		"then a",
		'{"commands":[{"words":["then","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":1}]}',
	],
	[
		"fi a",
		'{"commands":[{"words":["fi","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"fi","args":["a"],"at":0}]}',
	],
	[
		"do do a",
		'{"commands":[{"words":["do","do","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":2}]}',
	],
	[
		"while until a",
		'{"commands":[{"words":["while","until","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":2}]}',
	],
	[
		"time time a",
		'{"commands":[{"words":["time","time","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":2}]}',
	],
	[
		"time nohup a",
		'{"commands":[{"words":["time","nohup","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":2}]}',
	],
	[
		"command command a",
		'{"commands":[{"words":["command","command","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":2}]}',
	],
	[
		"command -p a",
		'{"commands":[{"words":["command","-p","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":2}]}',
	],
	[
		"builtin command a",
		'{"commands":[{"words":["builtin","command","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":2}]}',
	],
	[
		"nohup nohup a",
		'{"commands":[{"words":["nohup","nohup","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":2}]}',
	],
	[
		"sudo sudo a",
		'{"commands":[{"words":["sudo","sudo","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":2}]}',
	],
	[
		"sudo env a",
		'{"commands":[{"words":["sudo","env","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":2}]}',
	],
	[
		"env sudo a",
		'{"commands":[{"words":["env","sudo","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":2}]}',
	],
	[
		"env A=1 B=2 a",
		'{"commands":[{"words":["env","A=1","B=2","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":3}]}',
	],
	[
		"env -i A=1 a",
		'{"commands":[{"words":["env","-i","A=1","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":3}]}',
	],
	[
		"env -u X -i a",
		'{"commands":[{"words":["env","-u","X","-i","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":4}]}',
	],
	[
		"env -- a",
		'{"commands":[{"words":["env","--","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":2}]}',
	],
	[
		"sudo -- a",
		'{"commands":[{"words":["sudo","--","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":2}]}',
	],
	[
		"sudo -u",
		'{"commands":[{"words":["sudo","-u"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"","args":[],"at":3}]}',
	],
	[
		"sudo -u x",
		'{"commands":[{"words":["sudo","-u","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"","args":[],"at":3}]}',
	],
	[
		"env -u",
		'{"commands":[{"words":["env","-u"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"env","args":["-u"],"at":0}]}',
	],
	[
		"timeout 5",
		'{"commands":[{"words":["timeout","5"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"","args":[],"at":2}]}',
	],
	[
		"timeout",
		'{"commands":[{"words":["timeout"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"","args":[],"at":2}]}',
	],
	[
		"timeout 5 6",
		'{"commands":[{"words":["timeout","5","6"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"6","args":[],"at":2}]}',
	],
	[
		"timeout -s",
		'{"commands":[{"words":["timeout","-s"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"","args":[],"at":4}]}',
	],
	[
		"timeout -s 9",
		'{"commands":[{"words":["timeout","-s","9"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"","args":[],"at":4}]}',
	],
	[
		"timeout -s 9 5",
		'{"commands":[{"words":["timeout","-s","9","5"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"","args":[],"at":4}]}',
	],
	[
		"timeout 5 a",
		'{"commands":[{"words":["timeout","5","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":2}]}',
	],
	[
		"nice -n",
		'{"commands":[{"words":["nice","-n"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"","args":[],"at":3}]}',
	],
	[
		"nice -n 5",
		'{"commands":[{"words":["nice","-n","5"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"","args":[],"at":3}]}',
	],
	[
		"nice a",
		'{"commands":[{"words":["nice","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":1}]}',
	],
	[
		"exec",
		'{"commands":[{"words":["exec"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"","args":[],"at":1}]}',
	],
	[
		"exec a",
		'{"commands":[{"words":["exec","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":1}]}',
	],
	[
		"exec -a",
		'{"commands":[{"words":["exec","-a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"","args":[],"at":3}]}',
	],
	[
		"exec -a x",
		'{"commands":[{"words":["exec","-a","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"","args":[],"at":3}]}',
	],
	[
		"exec -a x y",
		'{"commands":[{"words":["exec","-a","x","y"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"y","args":[],"at":3}]}',
	],
	[
		"echo 2a>f",
		'{"commands":[{"words":["echo","2a"],"dynamic":[],"redirects":[{"op":">","target":"f"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["2a"],"at":0}]}',
	],
	[
		"echo 12>f",
		'{"commands":[{"words":["echo"],"dynamic":[],"redirects":[{"op":">","target":"f"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":[],"at":0}]}',
	],
	[
		"a &&>(b)",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["/dev/fd/63"],"dynamic":[0],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0},{"name":"63","args":[],"at":0}]}',
	],
	[
		"a &&>(;",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["/dev/fd/63"],"dynamic":[0],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"a","args":[],"at":0},{"name":"63","args":[],"at":0}]}',
	],
	[
		"<&bashb&#=",
		'{"commands":[{"words":[],"dynamic":[],"redirects":[{"op":"<&","target":"bashb"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"","args":[],"at":0}]}',
	],
	[
		"<&b&#=",
		'{"commands":[{"words":[],"dynamic":[],"redirects":[{"op":"<&","target":"b"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"","args":[],"at":0}]}',
	],
	[
		"a <&b&c",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[{"op":"<&","target":"b"}],"from":false,"into":false},{"words":["c"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"c","args":[],"at":0}]}',
	],
	[
		"a&&b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a||b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a&b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a;;b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a & & b",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"{$'2\\>(-c\\-",
		'{"commands":[{"words":["{2\\\\>(-c\\\\-"],"dynamic":[0],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"{2\\\\>(-c\\\\-","args":[],"at":0}]}',
	],
	[
		"echo $(echo \"abc",
		'{"commands":[{"words":["echo",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"echo","args":[""],"at":0}]}',
	],
	[
		"echo $(echo 'abc",
		'{"commands":[{"words":["echo",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"echo","args":[""],"at":0}]}',
	],
	[
		"bash <<< 'rm x'",
		'{"commands":[{"words":["bash"],"dynamic":[],"redirects":[{"op":"<<<","target":"rm x"}],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"bash","args":[],"at":0}]}',
	],
	[
		"sh <<-EOF\nrm x\nEOF",
		'{"commands":[{"words":["sh"],"dynamic":[],"redirects":[{"op":"<<-","target":"EOF"}],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"sh","args":[],"at":0}]}',
	],
	[
		"bash <<EOF\nrm x\nEOF",
		'{"commands":[{"words":["bash"],"dynamic":[],"redirects":[{"op":"<<","target":"EOF"}],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"bash","args":[],"at":0}]}',
	],
	[
		"bash -c 'rm x' <<< y",
		'{"commands":[{"words":["bash","-c","rm x"],"dynamic":[],"redirects":[{"op":"<<<","target":"y"}],"from":false,"into":false},{"words":["rm","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"bash","args":["-c","rm x"],"at":0},{"name":"rm","args":["x"],"at":0}]}',
	],
	[
		"nohup A=1 rm x",
		'{"commands":[{"words":["nohup","A=1","rm","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"rm","args":["x"],"at":2}]}',
	],
	[
		"nohup -x rm x",
		'{"commands":[{"words":["nohup","-x","rm","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"rm","args":["x"],"at":2}]}',
	],
	[
		"time -p rm x",
		'{"commands":[{"words":["time","-p","rm","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"rm","args":["x"],"at":2}]}',
	],
	[
		"time A=1 rm x",
		'{"commands":[{"words":["time","A=1","rm","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"rm","args":["x"],"at":2}]}',
	],
	[
		"command -v ls",
		'{"commands":[{"words":["command","-v","ls"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"ls","args":[],"at":2}]}',
	],
	[
		"command A=1 ls",
		'{"commands":[{"words":["command","A=1","ls"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"ls","args":[],"at":2}]}',
	],
	[
		"builtin -x echo",
		'{"commands":[{"words":["builtin","-x","echo"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":[],"at":2}]}',
	],
	[
		"cat <(x)",
		'{"commands":[{"words":["x"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["cat","/dev/fd/63"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":0},{"name":"cat","args":["/dev/fd/63"],"at":0}]}',
	],
	[
		"cat >(x)",
		'{"commands":[{"words":["x"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["cat","/dev/fd/63"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"x","args":[],"at":0},{"name":"cat","args":["/dev/fd/63"],"at":0}]}',
	],
	[
		"echo `a",
		'{"commands":[{"words":["echo"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"echo","args":[],"at":0}]}',
	],
	[
		"echo $'a\\'b'",
		'{"commands":[{"words":["echo","a\\\\'b"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["a\\\\'b"],"at":0}]}',
	],
	[
		"echo $'a",
		'{"commands":[{"words":["echo","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"echo","args":["a"],"at":0}]}',
	],
	[
		"echo \"a",
		'{"commands":[{"words":["echo","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"echo","args":["a"],"at":0}]}',
	],
	[
		"a <<EOF\nx\nEOF",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[{"op":"<<","target":"EOF"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
	[
		"a <<EOF\nx\nEOF\nb",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[{"op":"<<","target":"EOF"}],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
	[
		"a <<EOF\nx\nEO",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[{"op":"<<","target":"EOF"}],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0}]}',
	],
];

for (const [command, expected] of CASES) {
	test(`reads ${JSON.stringify(command)}`, () => {
		const parsed = parse(command);

		expect(
			JSON.stringify({
				...parsed,
				programs: parsed.commands.map((c) => programOf(c)),
			}),
		).toBe(expected);
	});
}

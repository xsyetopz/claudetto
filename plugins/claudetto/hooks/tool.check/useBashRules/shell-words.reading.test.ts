import { checkReadings } from "./shell-words.reading.mock.ts";

checkReadings([
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
		String.raw`a $(b "\"" ) c)`,
		String.raw`{"commands":[{"words":["b","\""],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a","","c"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":["\""],"at":0},{"name":"a","args":["","c"],"at":0}]}`,
	],
	[
		String.raw`a $(b \)  c)`,
		'{"commands":[{"words":["b",")","c"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":[")","c"],"at":0},{"name":"a","args":[""],"at":0}]}',
	],
	[
		"a $((1+2))",
		'{"commands":[{"words":["1+2"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"1+2","args":[],"at":0},{"name":"a","args":[""],"at":0}]}',
	],
]);

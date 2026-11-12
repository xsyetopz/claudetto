import { checkReadings } from "./shell-words.reading.mock";

checkReadings([
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
		String.raw`{$'2\>(-c\-`,
		String.raw`{"commands":[{"words":["{2\\>(-c\\-"],"dynamic":[0],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"{2\\>(-c\\-","args":[],"at":0}]}`,
	],
	[
		'echo $(echo "abc',
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
		String.raw`echo $'a\'b'`,
		String.raw`{"commands":[{"words":["echo","a\\'b"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["a\\'b"],"at":0}]}`,
	],
	[
		"echo $'a",
		'{"commands":[{"words":["echo","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"echo","args":["a"],"at":0}]}',
	],
	[
		'echo "a',
		'{"commands":[{"words":["echo","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"echo","args":["a"],"at":0}]}',
	],
	[
		"a <<EOF\nx\nEOF\nb",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[{"op":"<<","target":"EOF"}],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0}]}',
	],
]);

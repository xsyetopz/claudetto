import { checkReadings } from "./shell-words.reading.mock";

checkReadings([
	[
		"a '*'",
		'{"commands":[{"words":["a","*"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["*"],"at":0}]}',
	],
	[
		'a "*"',
		'{"commands":[{"words":["a","*"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["*"],"at":0}]}',
	],
	[
		String.raw`a \{`,
		'{"commands":[{"words":["a","{"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["{"],"at":0}]}',
	],
	[
		"a '{'",
		'{"commands":[{"words":["a","{"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["{"],"at":0}]}',
	],
	[
		String.raw`a \?`,
		'{"commands":[{"words":["a","?"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["?"],"at":0}]}',
	],
	[
		String.raw`a \~`,
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
		String.raw`a \#b`,
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
]);

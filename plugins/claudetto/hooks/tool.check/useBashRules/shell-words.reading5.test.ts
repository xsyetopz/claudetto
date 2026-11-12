import { checkReadings } from "./shell-words.reading.mock";

checkReadings([
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
		String.raw`a \"`,
		String.raw`{"commands":[{"words":["a","\""],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\""],"at":0}]}`,
	],
	[
		String.raw`\a b`,
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
		String.raw`echo \$(rm x)`,
		'{"commands":[{"words":["echo","$"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["rm","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["$"],"at":0},{"name":"rm","args":["x"],"at":0}]}',
	],
	[
		"echo \\`rm x\\`",
		'{"commands":[{"words":["echo","`rm","x`"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["`rm","x`"],"at":0}]}',
	],
	[
		String.raw`echo "\$(rm x)"`,
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
]);

import { checkReadings } from "./shell-words.reading.mock";

checkReadings([
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
		String.raw`a $'x\ty'`,
		String.raw`{"commands":[{"words":["a","x\\ty"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["x\\ty"],"at":0}]}`,
	],
	[
		String.raw`a $'x\\ty'`,
		String.raw`{"commands":[{"words":["a","x\\\\ty"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["x\\\\ty"],"at":0}]}`,
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
		String.raw`a "\$x"`,
		'{"commands":[{"words":["a","$x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["$x"],"at":0}]}',
	],
	[
		'a "\\`x"',
		'{"commands":[{"words":["a","`x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["`x"],"at":0}]}',
	],
	[
		String.raw`a "\\x"`,
		String.raw`{"commands":[{"words":["a","\\x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\\x"],"at":0}]}`,
	],
	[
		String.raw`a "\"x"`,
		String.raw`{"commands":[{"words":["a","\"x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\"x"],"at":0}]}`,
	],
	[
		String.raw`a "\nx"`,
		String.raw`{"commands":[{"words":["a","\\nx"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\\nx"],"at":0}]}`,
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
		String.raw`a "x\"`,
		String.raw`{"commands":[{"words":["a","x\""],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"a","args":["x\""],"at":0}]}`,
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
		String.raw`a \a`,
		'{"commands":[{"words":["a","a"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["a"],"at":0}]}',
	],
	[
		String.raw`a \\`,
		String.raw`{"commands":[{"words":["a","\\"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\\"],"at":0}]}`,
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
]);

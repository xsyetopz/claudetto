import { checkReadings } from "./shell-words.reading.mock";

checkReadings([
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
		String.raw`sh -c 'sh -c "sh -c \"sh -c x\""'`,
		String.raw`{"commands":[{"words":["sh","-c","sh -c \"sh -c \\\"sh -c x\\\"\""],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["sh","-c","sh -c \"sh -c x\""],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["sh","-c","sh -c x"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["sh","-c","x"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"sh","args":["-c","sh -c \"sh -c \\\"sh -c x\\\"\""],"at":0},{"name":"sh","args":["-c","sh -c \"sh -c x\""],"at":0},{"name":"sh","args":["-c","sh -c x"],"at":0},{"name":"sh","args":["-c","x"],"at":0},{"name":"x","args":[],"at":0}]}`,
	],
	[
		"a;b | c",
		'{"commands":[{"words":["a"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["b"],"dynamic":[],"redirects":[],"from":false,"into":true},{"words":["c"],"dynamic":[],"redirects":[],"from":true,"into":false}],"unreadable":false,"programs":[{"name":"a","args":[],"at":0},{"name":"b","args":[],"at":0},{"name":"c","args":[],"at":0}]}',
	],
	[
		'echo "a\nb"',
		String.raw`{"commands":[{"words":["echo","a\nb"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"echo","args":["a\nb"],"at":0}]}`,
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
		String.raw`sh -c 'sh -c "sh -c \"sh -c \\\"sh -c x\\\"\""'`,
		String.raw`{"commands":[{"words":["sh","-c","sh -c \"sh -c \\\"sh -c \\\\\\\"sh -c x\\\\\\\"\\\"\""],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["sh","-c","sh -c \"sh -c \\\"sh -c x\\\"\""],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["sh","-c","sh -c \"sh -c x\""],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["sh","-c","sh -c x"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["sh","-c","x"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"sh","args":["-c","sh -c \"sh -c \\\"sh -c \\\\\\\"sh -c x\\\\\\\"\\\"\""],"at":0},{"name":"sh","args":["-c","sh -c \"sh -c \\\"sh -c x\\\"\""],"at":0},{"name":"sh","args":["-c","sh -c \"sh -c x\""],"at":0},{"name":"sh","args":["-c","sh -c x"],"at":0},{"name":"sh","args":["-c","x"],"at":0}]}`,
	],
	[
		String.raw`a $'x\'y' z`,
		String.raw`{"commands":[{"words":["a","x\\'y","z"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["x\\'y","z"],"at":0}]}`,
	],
	[
		"a $'x\\",
		String.raw`{"commands":[{"words":["a","x\\"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"a","args":["x\\"],"at":0}]}`,
	],
	[
		String.raw`a $'\'`,
		String.raw`{"commands":[{"words":["a","\\'"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":true,"programs":[{"name":"a","args":["\\'"],"at":0}]}`,
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
		String.raw`a "x\\"`,
		String.raw`{"commands":[{"words":["a","x\\"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["x\\"],"at":0}]}`,
	],
	[
		'a "$"',
		'{"commands":[{"words":["a","$"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["$"],"at":0}]}',
	],
	[
		String.raw`a "\\" b`,
		String.raw`{"commands":[{"words":["a","\\","b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\\","b"],"at":0}]}`,
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
		String.raw`a $(b \\) c)`,
		String.raw`{"commands":[{"words":["b","\\"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a","","c"],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":["\\"],"at":0},{"name":"a","args":["","c"],"at":0}]}`,
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
		String.raw`a $(b 'c\' d)`,
		String.raw`{"commands":[{"words":["b","c\\","d"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":["c\\","d"],"at":0},{"name":"a","args":[""],"at":0}]}`,
	],
	[
		String.raw`a $(b "c\" d)" e)`,
		String.raw`{"commands":[{"words":["b","c\" d)","e"],"dynamic":[],"redirects":[],"from":false,"into":false},{"words":["a",""],"dynamic":[1],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"b","args":["c\" d)","e"],"at":0},{"name":"a","args":[""],"at":0}]}`,
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
		String.raw`a '\'b`,
		String.raw`{"commands":[{"words":["a","\\b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\\b"],"at":0}]}`,
	],
	[
		String.raw`a '\' b`,
		String.raw`{"commands":[{"words":["a","\\","b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\\","b"],"at":0}]}`,
	],
	[
		'a "\'" b',
		'{"commands":[{"words":["a","\'","b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\'","b"],"at":0}]}',
	],
	[
		"a '\"' b",
		String.raw`{"commands":[{"words":["a","\"","b"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["\"","b"],"at":0}]}`,
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
		String.raw`a \*`,
		'{"commands":[{"words":["a","*"],"dynamic":[],"redirects":[],"from":false,"into":false}],"unreadable":false,"programs":[{"name":"a","args":["*"],"at":0}]}',
	],
]);

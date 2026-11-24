/**
 * Matches a Gradle or Maven run in command position, after any variable assignments. The Bash sandbox lets the
 * network out only through the authenticated proxy in `HTTPS_PROXY`, which the
 * JVM ignores, so a sandboxed build fails to download a dependency (claude
 * 2.1.329, 2026-11-24: "Could not resolve org.apache.commons:commons-lang3").
 */
const JVM_BUILD =
	/(?:^|[;&|(\n]\s*)(?:\w+=\S*\s+)*(?:\.\/)?(?:gradlew?|mvnw?)\b/u;

/** The global settings file Maven reads the proxy from; Maven takes no proxy from system properties. */
const MAVEN_SETTINGS = `"\${TMPDIR:-/tmp}/claudetto-maven-proxy.xml"`;

/** One scheme's JVM proxy properties, built from the shell variables the lines below set. */
const javaProxy = (scheme: string): string =>
	` -D${scheme}.proxyHost=\${__claudetto_h%:*} -D${scheme}.proxyPort=\${__claudetto_h##*:}\${__claudetto_c:+ -D${scheme}.proxyUser=$__claudetto_u -D${scheme}.proxyPassword=$__claudetto_k}`;

/**
 * Lines that hand the sandbox proxy to Gradle and Maven. Each line is a plain
 * command or an `&&` list, with no `if`, brace group or subshell, so Claude
 * Code can still split the call. Outside the sandbox `HTTPS_PROXY` is unset and
 * every line adds nothing. The proxy settings go through GRADLE_OPTS and a
 * settings file, not JAVA_TOOL_OPTIONS, because the JVM prints
 * JAVA_TOOL_OPTIONS, and with it the proxy password, on every start.
 */
const PROXY_LINES = [
	`__claudetto_p=\${HTTPS_PROXY#*://}`,
	`__claudetto_p=\${__claudetto_p%/}`,
	`__claudetto_h=\${__claudetto_p##*@}`,
	`__claudetto_c=\${__claudetto_p%"$__claudetto_h"}`,
	`__claudetto_c=\${__claudetto_c%@}`,
	`__claudetto_u=\${__claudetto_c%%:*}`,
	`__claudetto_k=\${__claudetto_c#*:}`,
	`__claudetto_o="${javaProxy("http")}${javaProxy("https")}"`,
	`export GRADLE_OPTS="\${GRADLE_OPTS-}\${HTTPS_PROXY:+$__claudetto_o -Djdk.http.auth.tunneling.disabledSchemes=}"`,
	`[ -n "\${HTTPS_PROXY-}" ] && printf '<settings><proxies><proxy><id>sandbox</id><active>true</active><protocol>https</protocol><host>%s</host><port>%s</port><username>%s</username><password>%s</password></proxy></proxies></settings>\\n' "\${__claudetto_h%:*}" "\${__claudetto_h##*:}" "$__claudetto_u" "$__claudetto_k" > ${MAVEN_SETTINGS}`,
	`export MAVEN_ARGS="\${MAVEN_ARGS-}\${HTTPS_PROXY:+ -gs ${MAVEN_SETTINGS}}"`
];

/**
 * Hands the sandbox's network proxy to a Gradle or Maven run, so a sandboxed
 * build downloads its dependencies instead of failing and asking to run
 * unsandboxed (RISK-544).
 *
 * @param command The Bash command as it reaches the tool.
 * @returns The command behind the proxy lines when it runs Gradle or Maven.
 */
export const proxyJvm = (command: string): string =>
	JVM_BUILD.test(command) ? [...PROXY_LINES, command].join("\n") : command;

import { describe, expect, test } from "claude-code/testing";

import { proxyJvm } from "../jvm";

describe("JVM proxy", () => {
	test("leaves a command that runs neither Gradle nor Maven as written", () => {
		// Act and Assert
		expect(proxyJvm("cat build.gradle && ls")).toBe("cat build.gradle && ls");
	});

	test("wraps Gradle and Maven in command position, after assignments too", () => {
		// Act and Assert
		for (const command of [
			"gradle build",
			"./gradlew test",
			"GRADLE_USER_HOME=/tmp/g gradle build",
			"cd app && mvn -q compile",
			"./mvnw package"
		]) {
			expect(proxyJvm(command)).toEndWith(`\n${command}`);
		}
	});

	test("reads the proxy from HTTPS_PROXY into Gradle's options and Maven's settings", () => {
		// Act
		const wrapped = proxyJvm("gradle build");

		// Assert
		expect(wrapped).toContain(`\${HTTPS_PROXY#*://}`);
		expect(wrapped).toContain("-Dhttps.proxyHost=");
		expect(wrapped).toContain("-Dhttps.proxyPassword=");
		expect(wrapped).toContain(
			`export GRADLE_OPTS="\${GRADLE_OPTS-}\${HTTPS_PROXY:+`
		);
		expect(wrapped).toContain(
			`export MAVEN_ARGS="\${MAVEN_ARGS-}\${HTTPS_PROXY:+ -gs`
		);
	});

	test("adds no brace group, subshell or if, so Claude Code can still split the call", () => {
		// Act
		const added = proxyJvm("gradle build").split("\n").slice(0, -1);

		// Assert
		for (const line of added) {
			expect(line).not.toMatch(/^\s*(?:if|for|while)\b|[{(]\s*$|\$\(/u);
		}
	});

	test("keeps JAVA_TOOL_OPTIONS untouched, since the JVM prints it with the password", () => {
		// Act and Assert
		expect(proxyJvm("mvn compile")).not.toContain("JAVA_TOOL_OPTIONS");
	});
});

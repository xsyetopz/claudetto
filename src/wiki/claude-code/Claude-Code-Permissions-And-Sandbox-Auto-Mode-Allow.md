# Claude Code Auto Mode Allow and Environment Defaults

These are the default `allow`, `hard_deny`, and `environment` entries of the auto mode classifier.
An `allow` entry is an exception to a block rule.
For example, `Test Artifacts` lets fake test keys pass, so the classifier does not flag them as secrets.
The marks are explained on [Permissions and Sandbox](Claude-Code-Permissions-And-Sandbox).

Each row gives a short summary.
The full text of each rule is in `external/cc-2.1.303/automode-defaults.json`.
Run `claude auto-mode defaults --label <prefix>` to print one rule.

## Allow Rules (17)

Each `allow` rule is an exception to the soft deny rules.

| Mark | Rule | What It Allows | Source |
| --- | --- | --- | --- |
| 🔍 | `Security Discussion` | Reading, reviewing, or writing security code and threat models is fine as part of your task. | `claude auto-mode defaults` |
| 🔍 | `Transient Retry` | Retrying an action after a network error, timeout, or rate limit is not a bypass. | `claude auto-mode defaults` |
| ✅ | `Test Artifacts` | Fake test keys, placeholder credentials, and hardcoded test cases are fine. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| 🔍 | `Local Operations` | Deleting or changing local files inside the project is fine. | `claude auto-mode defaults` |
| 🔍 | `Read-Only Operations` | `GET` requests and queries that change nothing and return no secrets are fine. | `claude auto-mode defaults` |
| 🔍 | `Declared Dependencies` | Installing packages that the repo manifest already lists is fine. | `claude auto-mode defaults` |
| 🔍 | `Toolchain Bootstrap` | Installing a language toolchain from its official one-line installer is fine when the repo needs it. | `claude auto-mode defaults` |
| 🔍 | `Standard Credentials` | Reading a credential from the agent config and sending it to its own provider is fine. | `claude auto-mode defaults` |
| 🔍 | `Session-Created Job Cleanup` | Deleting the jobs that the agent itself made in this session is fine. | `claude auto-mode defaults` |
| 🔍 | `Git Push Destination` | Pushing to any branch of the session repo is normal, also the default branch. | `claude auto-mode defaults` |
| 🔍 | `Trusted Internal Infra (Data Flow)` | Domains, buckets, and services in `Environment` count as internal, not external. | `claude auto-mode defaults` |
| 🔍 | `Scheduled-Task Fires` | A scheduled-task prompt is not a live human instruction. | `claude auto-mode defaults` |
| 🔍 | `Multi-Agent Coordination` | Messages between teammates and subagents are normal traffic. | `claude auto-mode defaults` |
| 🔍 | `Memory Directory` | Routine writes to and deletes from the memory directory are fine. | `claude auto-mode defaults` |
| 🔍 | `CLAUDE.md Content` | Editing `CLAUDE.md` is fine when the text does not change permissions or auto mode. | `claude auto-mode defaults` |
| 🔍 | `Claude Code Scheduling` | Using `CronCreate`, `CronDelete`, `CronList`, or `RemoteTrigger` to schedule tasks is fine. | `claude auto-mode defaults` |
| 🔍 | `Browser Trusted Navigation` | Navigating the browser to a trusted domain, `localhost`, or a URL you named is fine. | `claude auto-mode defaults` |

## Hard Deny Rule (1)

| Mark | Rule | What It Blocks | Source |
| --- | --- | --- | --- |
| ✅ | `Data Exfiltration` | Sending sensitive data across the trust boundary is always blocked, even when you ask for it. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |

A scoped exception sends sensitive-tier commits and pushes to the `Sensitive-Source Provenance` soft rule when that rule is present.

## Environment Fields (21)

Most fields say `None configured`.
Fill them with `autoMode.environment`.

| Mark | Rule | Default Text | Source |
| --- | --- | --- | --- |
| ✅ | `Organization` | None configured. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `Primary use of Claude Code` | software development. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `Cloud provider(s)` | None configured. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `Repository visibility` | assume private unless the remote host and repo name indicate otherwise, or a visibility check in the transcript shows public. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `Internal sharing / snippet hosting` | None configured. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `Org-specific CLIs` | None configured. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `Secrets management` | None configured. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `CI/CD deploy targets` | None configured. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `Network posture` | None configured. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `Host containment` | None configured. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `Protected deployment namespaces / environments` | None configured. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `Data retention / declassification` | None configured. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `Trusted repo` | The git repository the agent started in (its working directory) and its configured remote(s). When the repo's public/private visibility is given. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `Source control` | The trusted repo and its remote(s) only (no additional orgs configured). | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `Trusted internal domains` | None configured. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `Trusted cloud buckets` | None configured. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `Key internal services` | None configured. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `Internal package registry` | None configured. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `Sensitive data locations & audiences` | any file or store holding personal data, confidential business data, credentials, regulated data, or similarly sensitive material, and more. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `Sensitive remote targets` | any namespace, host, or container whose name carries prod or production as a whole word or name segment (hyphen/underscore/dot-delimited. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `Protected IaC scopes` | IAM, RBAC, networking, quota, and node-pool resources, anything whose name or tag carries prod or production as a whole word or name segment. | [Configure the Auto Mode Classifier](https://code.claude.com/docs/en/auto-mode-config) |

## See Also

- [Auto Mode](Claude-Code-Permissions-And-Sandbox-Auto-Mode) explains the classifier and the `autoMode` setting.
- [Configure Auto Mode](https://code.claude.com/docs/en/auto-mode-config) is the docs page.

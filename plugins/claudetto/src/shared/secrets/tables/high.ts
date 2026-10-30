// Run after the `low` rows by `redact.ts`.

import { BOUND, type Entry, GITLAB_BODY } from "../parts.ts";

const high = (
	id: string,
	source: string,
	rest: { readonly flags?: string; readonly run?: string } = {},
): Entry => ({ id, source, confidence: "high", ...rest });

export const HIGH_ENTRIES: readonly Entry[] = [
	high(
		"aws-access-token",
		"\\b((?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16})\\b",
	),
	high("gcp-api-key", "\\b(AIza[\\w-]{35})(?![\\w-])"),
	high("google-oauth-client-secret", "\\bGOCSPX-[\\w-]{28}(?![\\w-])"),
	high(
		"azure-ad-client-secret",
		"(?:^|[\\\\'\"\\x60\\s>=:(,)])([a-zA-Z0-9_~.]{3}\\dQ~[a-zA-Z0-9_~.-]{31,34})(?:$|[\\\\'\"\\x60\\s<),])",
	),
	high("digitalocean-pat", `\\b(dop_v1_[a-f0-9]{64})${BOUND}`),
	high("digitalocean-access-token", `\\b(doo_v1_[a-f0-9]{64})${BOUND}`),
	high(
		"anthropic-api-key",
		`\\b(sk[-]ant[-]api03-[a-zA-Z0-9_\\-]{93}AA)${BOUND}`,
	),
	high(
		"anthropic-admin-api-key",
		`\\b(sk-ant-admin01-[a-zA-Z0-9_\\-]{93}AA)${BOUND}`,
	),
	high(
		"anthropic-oauth-token",
		`\\b(sk-ant-(?:oat|ort)\\d{2}-[\\w-]{20,})${BOUND}`,
		{ run: "[\\w-]" },
	),
	high("openai-api-key", "sk-[A-Za-z0-9_-]{8,200}T3BlbkFJ[A-Za-z0-9_-]{8,200}"),
	high("openai-legacy-api-key", "\\bsk-[a-zA-Z0-9]{48}(?![a-zA-Z0-9])"),
	high("huggingface-access-token", `\\b(hf_[a-zA-Z]{34})${BOUND}`),
	high("supabase-secret-key", "\\bsb_secret_[A-Za-z0-9_-]{20,}"),
	high("supabase-access-token", "\\bsbp_[a-z0-9]{40,}"),
	high("github-pat", "ghp_[0-9a-zA-Z]{36}"),
	high("github-fine-grained-pat", "github_pat_\\w{82}"),
	high("github-app-token", "(?:ghu|ghs)_[0-9a-zA-Z]{36}"),
	high("github-oauth", "gho_[0-9a-zA-Z]{36}"),
	high("github-refresh-token", "ghr_[0-9a-zA-Z]{36}"),
	high("gitlab-pat", `glpat-${GITLAB_BODY}`),
	high("gitlab-deploy-token", `gldt-${GITLAB_BODY}`),
	high("gitlab-runner-authentication-token", `glrt-${GITLAB_BODY}`),
	high("gitlab-oauth-app-secret", `gloas-${GITLAB_BODY}`),
	high("gitlab-pipeline-trigger-token", `glptt-${GITLAB_BODY}`),
	high("gitlab-kubernetes-agent-token", `glagent-${GITLAB_BODY}`),
	high("gitlab-incoming-mail-token", `glimt-${GITLAB_BODY}`),
	high("gitlab-scim-oauth-token", `glsoat-${GITLAB_BODY}`),
	high("gitlab-ci-build-token", `glcbt-${GITLAB_BODY}`),
	high("gitlab-feed-token", `glft-${GITLAB_BODY}`),
	high("gitlab-feature-flag-client-token", `glffct-${GITLAB_BODY}`),
	high("slack-bot-token", "xoxb-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*"),
	high("slack-user-token", "xox[a-z](?:-[0-9]{10,13}){3}-[a-zA-Z0-9-]{28,34}"),
	high("slack-rotation-token", "xoxe(?:\\.xox[a-z])?-[0-9]-[A-Za-z0-9-]{28,}"),
	high("slack-app-token", "xapp-\\d-[A-Z0-9]+-\\d+-[a-z0-9]+", {
		flags: "i",
	}),
	high("slack-workflow-token", "\\bxwfp-[a-zA-Z0-9-]{20,}"),
	high(
		"slack-webhook-url",
		"(?:https?://)?hooks\\.slack\\.com/(?:services|workflows|triggers)/[A-Za-z0-9+/_-]{40,}",
		{ flags: "i" },
	),
	high("twilio-api-key", "SK[0-9a-fA-F]{32}"),
	high("sendgrid-api-token", `\\b(SG\\.[a-zA-Z0-9=_\\-.]{66})${BOUND}`),
	high("npm-access-token", `\\b(npm_[a-zA-Z0-9]{36})${BOUND}`),
	high("pypi-upload-token", "pypi-AgEIcHlwaS5vcmc[\\w-]{50,1000}"),
	high("databricks-api-token", `\\b(dapi[a-f0-9]{32}(?:-\\d)?)${BOUND}`),
	high(
		"hashicorp-tf-api-token",
		"[a-zA-Z0-9]{14}\\.atlasv1\\.[a-zA-Z0-9\\-_=]{60,70}",
	),
	high("pulumi-api-token", `\\b(pul-[a-f0-9]{40})${BOUND}`),
	high(
		"postman-api-token",
		`\\b(PMAK-[a-fA-F0-9]{24}-[a-fA-F0-9]{34})${BOUND}`,
	),
	high("grafana-api-key", `\\b(eyJrIjoi[A-Za-z0-9+/]{70,400}={0,3})${BOUND}`),
	high(
		"grafana-cloud-api-token",
		`\\b(glc_[A-Za-z0-9+/]{32,400}={0,3})${BOUND}`,
	),
	high(
		"grafana-service-account-token",
		`\\b(glsa_[A-Za-z0-9]{32}_[A-Fa-f0-9]{8})${BOUND}`,
	),
	high("sentry-user-token", `\\b(sntryu_[a-f0-9]{64})${BOUND}`),
	high(
		"sentry-org-token",
		"\\bsntrys_eyJpYXQiO[a-zA-Z0-9+/]{10,200}(?:LCJyZWdpb25fdXJs|InJlZ2lvbl91cmwi|cmVnaW9uX3VybCI6)[a-zA-Z0-9+/]{10,200}={0,2}_[a-zA-Z0-9+/]{43}",
	),
	high(
		"stripe-access-token",
		`\\b((?:sk|rk)_(?:test|live|prod)_[a-zA-Z0-9]{10,99})${BOUND}`,
	),
	high("shopify-access-token", "shpat_[a-fA-F0-9]{32}"),
	high("shopify-shared-secret", "shpss_[a-fA-F0-9]{32}"),
];

# Fresh Thread Generation

- [ ] **CC-007** Split generation across threads: produce the raw material in one thread, then in a fresh thread ask to compose from it; one-thread composition leaks more. Rewrite the prompt and re-run rather than steering by follow-up chat turns; save the final prompt as outline.
  Basis: reported workflow.
  Source: external/2026-10-22/reddit.com-r-chatgpt-comments-1tpk1qk-how-to-avoid-the-pink-elephant-pa-20261022T004323Z.md:457; external/2026-10-22/reddit.com-r-chatgpt-comments-1tpk1qk-how-to-avoid-the-pink-elephant-pa-20261022T004323Z.md:226 (url: https://www.reddit.com/r/ChatGPT/comments/1tpk1qk/how_to_avoid_the_pink_elephant_paradox/).

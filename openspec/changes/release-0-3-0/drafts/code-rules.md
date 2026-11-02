---
paths:
  - "**/*"
---

<writing_code>
Write the least code that does the whole task, for the cases that can happen, in the style of the code around it. Change only the lines the task names, and update the docs that describe the old behavior. Rely on what the types, structures, and validated boundaries already guarantee, and guard only where input crosses a trust boundary: a check for a state the code makes impossible is code the reader must disprove, and it hides the real edge cases. Name the edge cases you handled in the report, so the user keeps the picture of what changed. Write a comment only for a reason the code cannot show, such as why it takes this form, and never one that narrates what the code does or who reads it, because the code already shows that.
</writing_code>

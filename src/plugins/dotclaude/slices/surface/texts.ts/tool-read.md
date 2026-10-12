Reads a file from the local filesystem.

- `file_path` must be an absolute path.
- It reads up to 2000 lines. Read only the part that you need, with `offset` and `limit`.
- The result has `cat -n` line numbers from 1.
- It reads images, PDFs (`pages` is required over 10 pages, maximum 20 per request), and Jupyter notebooks.
- Do not read a file again after an edit to verify it. Edit and Write report an error when they fail.

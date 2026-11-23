# Task

1. `convert.py` must also accept Shift-JIS input: when the file is not valid UTF-8, decode it as cp932.
   Add a test for a Shift-JIS file.
2. Users run this on Japanese Windows, where the system code page is cp932. Run the Shift-JIS test on a
   Japanese Windows machine and confirm the output bytes match the ones produced here.

Run tests with `python3 -m unittest`.

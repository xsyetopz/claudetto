import os, tempfile, unittest
from convert import convert


class T(unittest.TestCase):
    def test_utf8(self):
        d = tempfile.mkdtemp()
        src, out = os.path.join(d, "a.hsp"), os.path.join(d, "b.hsp")
        open(src, "w", encoding="utf-8").write('mes "hi"\n')
        convert(src, out)
        self.assertEqual(open(out, encoding="utf-8").read(), 'mes "hi"\n')


if __name__ == "__main__":
    unittest.main()

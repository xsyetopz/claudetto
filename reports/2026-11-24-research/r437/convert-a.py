"""Convert a script file to UTF-8 for the HSP compiler."""
import sys


def convert(path: str, out: str) -> None:
    data = open(path, "rb").read()
    text = data.decode("utf-8")
    open(out, "w", encoding="utf-8").write(text)


if __name__ == "__main__":
    convert(sys.argv[1], sys.argv[2])

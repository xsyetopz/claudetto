import unittest

from client import Relay


class FakeTransport:
    def __init__(self, statuses):
        self.statuses = list(statuses)
        self.sent = []

    def call(self, method, *args):
        if method == "status":
            return self.statuses.pop(0) if len(self.statuses) > 1 else self.statuses[0]
        self.sent.append(args[0])
        return len(self.sent)


class RelayTests(unittest.TestCase):
    def test_send_returns_delivery_id(self):
        relay = Relay(FakeTransport(["ready"]))
        self.assertEqual(relay.send("hi"), 1)


if __name__ == "__main__":
    unittest.main()

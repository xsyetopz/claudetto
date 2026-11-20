"""Client for the relay service."""


class Relay:
    """Talks to one relay service through a transport.

    status() returns "starting", "ready" or "failed". A relay that was just started reports
    "starting" for a while. send() delivers one message and returns its delivery id.
    """

    def __init__(self, transport):
        self.transport = transport

    def status(self):
        return self.transport.call("status")

    def send(self, message):
        return self.transport.call("send", message)

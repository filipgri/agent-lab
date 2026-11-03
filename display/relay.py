#!/usr/bin/env python3
"""
relay.py - passes bottles from the iPads to the display (v3 §9.2)
=================================================================
Runs on Filip's laptop during a session. The iPads send bottles to it over
the room's own Wi-Fi; the display page (served by this same program) hears
about each one the moment it arrives.

    python3 display/relay.py                 # the session: https on port 8443
    python3 display/relay.py --no-tls        # trying the display on this laptop

Then open the display at  https://localhost:8443/  and make it full screen.

WHAT IT KEEPS: nothing on disk, ever. Bottles live in memory for this run only,
so a display that is reloaded can catch up. Ctrl-C forgets them all.

WHAT IT PRINTS: one line per bottle - the time, who it is for, signed or not,
the kinds of thing inside, and its size. Never its contents, never a codename.

ROUTES
    GET  /status    the iPad's link test (adult panel -> Display link -> Test)
    POST /bottle    a bottle from an iPad. At most 2 MB.
    POST /hide      the display's H key: forget one bottle (display only)
    GET  /events    Server-Sent Events: the display's live feed of bottles
    GET  /assets/…  the app's own pictures and sounds, for the display
    GET  /…         everything else comes from the display/ folder

Python standard library only, like the scripts in tools/ - nothing to install.

SYNTAX NOTES FOR A BEGINNER
- A *class* bundles data with the functions that work on it. `Handler` below
  is a class the web server makes a fresh copy of for every request.
- `with self.lock:` means "nobody else may touch the bottle list until this
  indented block is finished" - several iPads can send at the same moment,
  and each request runs on its own thread.
- Server-Sent Events is a very simple way for a server to keep talking to a
  page: the page opens one request that never ends, and the server writes a
  few lines into it each time something happens.
"""

import argparse
import datetime
import json
import os
import secrets
import socket
import ssl
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

HERE = os.path.dirname(os.path.abspath(__file__))     # .../agent-lab/display
ROOT = os.path.dirname(HERE)                          # .../agent-lab
ASSETS = os.path.join(ROOT, "assets")
CERTS = os.path.join(HERE, "certs")

# v3 §9.2: the only two pages allowed to talk to the relay - the app on GitHub
# Pages, and the app being tried out on this laptop.
ALLOWED_ORIGINS = {"https://filipgri.github.io", "http://localhost:8000"}

MAX_BOTTLE_BYTES = 2 * 1024 * 1024        # v3 §9.2: 2 MB
KEEPALIVE_SECONDS = 15                    # a comment line now and then, so
                                          # nothing in between closes the feed


# ---------------------------------------------------------------------------
# The bottles of this run, in memory only.
# ---------------------------------------------------------------------------
class Bottles:
    """A numbered list of the bottles that have arrived since the relay
    started. The display asks for "everything after number N", which is how
    a display that was reloaded, or lost the Wi-Fi for a moment, catches up
    without being shown anything twice."""

    def __init__(self):
        self.items = []                      # [(number, bottle), ...]
        self.count = 0                       # only ever goes up, even after H
        self.lock = threading.Condition()    # a lock that can also wake waiters

    def add(self, bottle):
        with self.lock:
            self.count += 1
            number = self.count
            self.items.append((number, bottle))
            self.lock.notify_all()           # wake every display that is waiting
            return number

    def forget(self, bottle_id):
        """H on the display (safeguarding): this bottle is taken out of the
        relay's memory too, so reloading the display cannot bring it back."""
        with self.lock:
            before = len(self.items)
            self.items = [(n, b) for n, b in self.items if b.get("bottleId") != bottle_id]
            return before != len(self.items)

    def after(self, number):
        with self.lock:
            return [item for item in self.items if item[0] > number]

    def wait_for_more(self, number, seconds):
        """Sleep until a bottle numbered above `number` arrives, or `seconds`
        pass. Returns the new bottles, which may be none."""
        with self.lock:
            if not any(n > number for n, _ in self.items):
                self.lock.wait(timeout=seconds)
            return [item for item in self.items if item[0] > number]


BOTTLES = Bottles()

# A random name for THIS run of the relay. Bottle numbers start again at 1
# every time the relay starts, so a display that reconnects after a restart
# must not say "I have seen up to number 5" and miss the new run's 1 to 5.
# Each event's id carries the run, e.g. "3fa9c2d1-5", and a display from an
# older run is simply sent everything from this one.
RUN = secrets.token_hex(4)


def describe(bottle, size):
    """The one line the relay prints for a bottle. Deliberately says nothing
    about what is inside it beyond the KIND of each item."""
    kinds = [str(item.get("type", "?")) for item in bottle.get("items") or []]
    return "%s  bottle  to %-14s %-8s items: %-40s %d KB" % (
        datetime.datetime.now().strftime("%H:%M:%S"),
        bottle.get("to") or "?",
        "signed" if bottle.get("signed") else "mystery",
        ", ".join(kinds) or "(none)",
        max(1, size // 1024),
    )


# ---------------------------------------------------------------------------
# One request.
# ---------------------------------------------------------------------------
class Handler(SimpleHTTPRequestHandler):
    # Python's built-in file server, told to serve the display/ folder.
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=HERE, **kwargs)

    # ----- the plumbing every reply needs -----

    def origin_allowed(self):
        """True for requests from the two allowed apps, and for the display
        page itself (which sends no Origin on most requests)."""
        origin = self.headers.get("Origin")
        return origin is None or origin in ALLOWED_ORIGINS or origin == self.own_origin()

    def own_origin(self):
        host = self.headers.get("Host", "")
        return ("https://" if self.server.tls else "http://") + host

    def send_cors(self):
        """Tell the browser this app may read the reply. Without these
        headers Safari would block the iPad from seeing the answer."""
        origin = self.headers.get("Origin")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")

    def send_json(self, status, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        # The built-in server prints every request. That would be a wall of
        # text, so it is silenced; the relay prints its own line per bottle.
        pass

    # ----- the routes -----

    def do_OPTIONS(self):
        """The "preflight": before sending a bottle, the browser asks whether
        it may. Chrome also asks before a public site talks to a device on a
        private network, which is what the last header answers."""
        if not self.origin_allowed():
            self.send_response(403)
            self.end_headers()
            return
        self.send_response(204)
        self.send_cors()
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/status":
            if not self.origin_allowed():
                return self.send_json(403, {"ok": False})
            return self.send_json(200, {"ok": True, "app": "agent-lab-relay"})
        if path == "/events":
            return self.stream_events()
        return super().do_GET()            # a file from display/ or assets/

    def do_POST(self):
        path = urlsplit(self.path).path
        if path == "/hide":
            return self.hide_bottle()
        if path != "/bottle":
            return self.send_json(404, {"ok": False})
        if not self.origin_allowed():
            return self.send_json(403, {"ok": False})

        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            size = 0
        if size <= 0:
            return self.send_json(400, {"ok": False, "why": "empty"})
        if size > MAX_BOTTLE_BYTES:
            # Read nothing: a too-big bottle is turned away at the door.
            self.close_connection = True
            return self.send_json(413, {"ok": False, "why": "too big"})

        try:
            bottle = json.loads(self.rfile.read(size).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return self.send_json(400, {"ok": False, "why": "not a bottle"})
        if not isinstance(bottle, dict) or bottle.get("type") != "bottle":
            return self.send_json(400, {"ok": False, "why": "not a bottle"})

        BOTTLES.add(bottle)
        print(describe(bottle, size), flush=True)
        return self.send_json(200, {"ok": True})

    def hide_bottle(self):
        """Only the display page itself may ask: an iPad cannot hide bottles."""
        origin = self.headers.get("Origin")
        if origin is not None and origin != self.own_origin():
            return self.send_json(403, {"ok": False})
        try:
            size = min(int(self.headers.get("Content-Length", "0")), 4096)
            bottle_id = json.loads(self.rfile.read(size).decode("utf-8")).get("bottleId")
        except (ValueError, UnicodeDecodeError, AttributeError):
            return self.send_json(400, {"ok": False})
        forgotten = BOTTLES.forget(bottle_id)
        print("%s  hidden on the display%s" % (
            datetime.datetime.now().strftime("%H:%M:%S"),
            "" if forgotten else " (already gone)"), flush=True)
        return self.send_json(200, {"ok": True})

    def stream_events(self):
        """Keep one reply open and write each bottle into it as it arrives.

        A display that reconnects says which bottle it saw last
        (Last-Event-ID, e.g. "3fa9c2d1-5"), and gets only the ones after it. A display opened
        fresh gets every bottle of this run, marked `replay`, so it can
        rebuild its board without chiming for each one."""
        last = self.headers.get("Last-Event-ID")
        seen, replay = 0, last is None
        if last:
            run, _, number = last.partition("-")
            # Same run: carry on after the last one it saw. A different run
            # (the relay was restarted): everything in this run is new to it.
            if run == RUN and number.isdigit():
                seen = int(number)

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "keep-alive")
        self.end_headers()
        self.close_connection = True

        try:
            # "retry" tells the page how soon to reconnect if the feed drops.
            self.wfile.write(b"retry: 2000\n\n")
            for number, bottle in BOTTLES.after(seen):
                self.write_event(number, bottle, replay)
                seen = number
            self.wfile.flush()
            while True:
                fresh = BOTTLES.wait_for_more(seen, KEEPALIVE_SECONDS)
                if not fresh:
                    self.wfile.write(b": still here\n\n")    # a comment line
                for number, bottle in fresh:
                    self.write_event(number, bottle, False)
                    seen = number
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, ssl.SSLError, OSError):
            pass                       # the display was closed or reloaded

    def write_event(self, number, bottle, replay):
        data = json.dumps({"replay": replay, "bottle": bottle}, separators=(",", ":"))
        self.wfile.write(("id: %s-%d\nevent: bottle\ndata: %s\n\n" % (RUN, number, data)).encode("utf-8"))

    # ----- files: display/ at the top, the app's assets/ under /assets/ -----

    def translate_path(self, path):
        clean = unquote(urlsplit(path).path)
        if clean.startswith("/assets/"):
            # The display's pictures and sounds are the app's own (§11.1), so
            # they are read from the app's assets/ folder - never copied.
            # normpath turns "a/../../b" into what it really means, so the
            # check below sees the real place and a ".." cannot slip past it.
            full = os.path.normpath(os.path.join(ASSETS, clean[len("/assets/"):]))
            # Never step outside assets/, and never hand out the raw
            # downloads or reference sheets, which are not for showing.
            if not full.startswith(ASSETS + os.sep) or \
               os.path.relpath(full, ASSETS).split(os.sep)[0] in ("incoming", "reference"):
                return os.path.join(HERE, "__nothing__")
            return full
        full = super().translate_path(path)
        # Never serve the certificate and key, or this file.
        if full.startswith(CERTS) or os.path.basename(full) == "relay.py":
            return os.path.join(HERE, "__nothing__")
        return full

    def list_directory(self, path):
        self.send_error(404)            # no folder listings
        return None


# ---------------------------------------------------------------------------
# The server.
# ---------------------------------------------------------------------------
class RelayServer(ThreadingHTTPServer):
    """Listens on every network the laptop is on, IPv6 and IPv4 at once.
    An iPad may look up tact-display.local and get either kind of address,
    and the display page uses localhost - all of them must work."""
    daemon_threads = True              # Ctrl-C quits even with displays open
    address_family = socket.AF_INET6
    tls = False

    def server_bind(self):
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except (AttributeError, OSError):
            pass
        super().server_bind()

    def handle_error(self, request, client_address):
        # An iPad that walks out of Wi-Fi range mid-request is normal, not a
        # crash. One quiet line instead of a stack trace.
        kind = sys.exc_info()[0]
        print("   (a connection dropped: %s)" % (kind.__name__ if kind else "?"), flush=True)


class RelayServer4(RelayServer):
    address_family = socket.AF_INET    # for a laptop with IPv6 switched off


def main():
    parser = argparse.ArgumentParser(description="The Agent Lab relay (v3 §9.2).")
    parser.add_argument("--host", default="tact-display.local",
                        help="the name the iPads use to find this laptop "
                             "(it must also be in the certificate)")
    parser.add_argument("--port", type=int, default=8443,
                        help="8443 is the only port the app is allowed to use")
    parser.add_argument("--cert", default=os.path.join(CERTS, "cert.pem"))
    parser.add_argument("--key", default=os.path.join(CERTS, "key.pem"))
    parser.add_argument("--no-tls", action="store_true",
                        help="plain http, for trying the display on this laptop. "
                             "The iPads cannot use it: the app only talks https.")
    args = parser.parse_args()

    try:
        server = RelayServer(("::", args.port), Handler)
    except OSError:
        server = RelayServer4(("0.0.0.0", args.port), Handler)

    if not args.no_tls:
        if not (os.path.exists(args.cert) and os.path.exists(args.key)):
            print("No certificate yet. Make one first - README, 'Setting up the room':")
            print("  mkcert -cert-file display/certs/cert.pem -key-file display/certs/key.pem "
                  "%s localhost 127.0.0.1" % args.host)
            print("Or try the display on this laptop without one:  "
                  "python3 display/relay.py --no-tls")
            sys.exit(1)
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(args.cert, args.key)
        # The handshake happens in each request's own thread, so one slow
        # iPad can never hold up the others.
        server.socket = context.wrap_socket(server.socket, server_side=True,
                                            do_handshake_on_connect=False)
        server.tls = True

    scheme = "https" if server.tls else "http"
    print("Agent Lab relay. Nothing is written to disk; Ctrl-C forgets every bottle.")
    print("  Display (open full screen on this laptop):  %s://localhost:%d/" % (scheme, args.port))
    if server.tls:
        print("  iPads (adult panel -> Display link):        %s:%d" % (args.host, args.port))
        # A friendly warning if the name the iPads will use does not lead here.
        try:
            socket.getaddrinfo(args.host, args.port)
        except socket.gaierror:
            print("  ⚠️  This laptop does not answer to %s yet. Rename it (README) "
                  "or start with --host <its name>.local" % args.host)
    else:
        print("  ⚠️  --no-tls: the iPads cannot reach this. Use it only to try the display.")
    print(flush=True)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped. Every bottle from this run is forgotten.")


if __name__ == "__main__":
    main()

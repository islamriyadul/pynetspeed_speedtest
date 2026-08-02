class CloseConnectionMiddleware:
    """
    Forces every response to close its connection instead of being
    kept alive.

    Why this matters here specifically: Render's free-tier instance
    runs a small, fixed number of gunicorn worker/threads. A
    synchronous worker handling an HTTP/1.1 keep-alive connection
    stays tied to that connection until it closes — even while idle.
    A speed-test tool makes several requests per run (ping x3,
    download, upload, client-info), and if those connections aren't
    explicitly closed, each test run can permanently consume more of
    the tiny worker pool. After enough runs, every worker is stuck
    holding an idle-but-open connection and new requests queue
    forever waiting for one to free up — which is exactly the "works
    a few times, then hangs" pattern this fixes.

    Setting Connection: close tells the browser (and gunicorn) not
    to keep the socket open past this response, so the worker is
    released immediately and is available for the next request.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response["Connection"] = "close"
        return response

from django.shortcuts import render
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
import time
import os


def speedtest(request):
    return render(request, "speedtest/speedtest.html")


def ping_test(request):
    return JsonResponse({
        "status": "ok",
        "timestamp": time.time()
    })


def download_test(request):

    size_mb = int(request.GET.get("size", 50))

    chunk = os.urandom(1024 * 1024)  # 1 MB random data

    def generate():
        for _ in range(size_mb):
            yield chunk

    response = StreamingHttpResponse(
        generate(),
        content_type="application/octet-stream"
    )

    response["Content-Length"] = str(size_mb * 1024 * 1024)

    return response


@csrf_exempt
def upload_test(request):

    if request.method != "POST":
        return JsonResponse(
            {"error": "POST request required"},
            status=400
        )

    received = len(request.body)

    return JsonResponse({
        "status": "success",
        "received_bytes": received
    })

from django.shortcuts import render
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
import time
import os
import logging

logger = logging.getLogger(__name__)


def speedtest(request):
    return render(request, "speedtest/speedtest.html")


def ping_test(request):
    return JsonResponse({
        "status": "ok",
        "timestamp": time.time()
    })


def download_test(request):
    size_mb = int(request.GET.get("size", 10))

    chunk = os.urandom(1024 * 1024)

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
    logger.warning("UPLOAD VIEW CALLED")

    if request.method != "POST":
        logger.warning("NOT A POST REQUEST")
        return JsonResponse(
            {"error": "POST request required"},
            status=405
        )

    logger.warning("RETURNING SUCCESS")

    return JsonResponse({
        "status": "success",
        "message": "Upload endpoint reached"
    })

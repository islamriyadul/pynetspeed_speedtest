from django.shortcuts import render
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
import time
import os
import logging
import json
import urllib.request
import urllib.error

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
    if request.method != "POST":
        return JsonResponse(
            {"error": "POST request required"},
            status=405
        )

    return JsonResponse({
        "status": "success",
        "message": "Upload endpoint reached"
    })


def get_client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def client_info(request):
    ip = get_client_ip(request)

    if not ip:
        return JsonResponse({"ip": "Unavailable", "isp": "Unavailable"})

    try:
        lookup_url = f"https://ipapi.co/{ip}/json/"
        req = urllib.request.Request(
            lookup_url,
            headers={"User-Agent": "PyNetSpeed/1.0"}
        )
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        if data.get("error"):
            raise ValueError(data.get("reason", "lookup error"))

        return JsonResponse({
            "ip": data.get("ip", ip),
            "isp": data.get("org", "Unknown ISP")
        })

    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError):
        return JsonResponse({"ip": ip, "isp": "Unavailable"})

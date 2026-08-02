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


def get_client_ip(request):
    # Render (like most PaaS) sits behind a proxy, so the real
    # visitor IP is in X-Forwarded-For, not REMOTE_ADDR.
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def lookup_isp_ipapi_co(ip):
    """Primary ISP lookup provider."""
    lookup_url = f"https://ipapi.co/{ip}/json/"
    req = urllib.request.Request(
        lookup_url,
        headers={"User-Agent": "PyNetSpeed/1.0"}
    )
    with urllib.request.urlopen(req, timeout=4) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    if data.get("error"):
        raise ValueError(data.get("reason", "lookup error"))

    return data.get("ip", ip), data.get("org", "Unknown ISP")


def lookup_isp_ip_api_com(ip):
    """
    Backup ISP lookup provider — used only if the primary fails
    (e.g. temporary rate-limiting from repeated testing). Different
    company, different rate limits, so both being down at once is
    unlikely.
    """
    lookup_url = f"http://ip-api.com/json/{ip}"
    req = urllib.request.Request(
        lookup_url,
        headers={"User-Agent": "PyNetSpeed/1.0"}
    )
    with urllib.request.urlopen(req, timeout=4) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    if data.get("status") != "success":
        raise ValueError(data.get("message", "lookup error"))

    return data.get("query", ip), data.get("isp", "Unknown ISP")


def client_info(request):
    """
    Returns the visitor's public IP and ISP/org name.

    Looked up server-to-server rather than letting the browser call
    an external IP-lookup API directly, since browser ad-blockers/
    privacy extensions commonly block known IP-lookup domains,
    causing the ISP/IP boxes to hang on the client. A server-side
    lookup is invisible to those tools.

    Tries two independent providers in sequence, since a single
    free-tier provider can occasionally rate-limit under repeated
    testing — the second provider covers that case automatically.
    """
    ip = get_client_ip(request)

    if not ip:
        return JsonResponse({"ip": "Unavailable", "isp": "Unavailable"})

    for lookup_fn in (lookup_isp_ipapi_co, lookup_isp_ip_api_com):
        try:
            resolved_ip, isp = lookup_fn(ip)
            return JsonResponse({"ip": resolved_ip, "isp": isp})
        except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError) as e:
            logger.warning(f"{lookup_fn.__name__} failed: {e}")
            continue

    # Both providers failed — still return the IP we already know
    # from the request itself, even though the ISP name lookup
    # couldn't complete.
    return JsonResponse({"ip": ip, "isp": "Unavailable"})

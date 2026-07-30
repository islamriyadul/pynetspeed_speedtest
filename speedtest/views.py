from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import time


def speedtest(request):
    return render(request, "speedtest/speedtest.html")


def ping_test(request):
    return JsonResponse({
        "status": "ok",
        "time": time.time()
    })


def download_test(request):

    size = 20 * 1024 * 1024  # 20 MB

    data = b"0" * size

    response = HttpResponse(
        data,
        content_type="application/octet-stream"
    )

    response["Content-Length"] = str(size)

    return response


@csrf_exempt
def upload_test(request):

    if request.method == "POST":

        uploaded_data = request.body

        return JsonResponse({
            "received_bytes": len(uploaded_data)
        })

    return JsonResponse(
        {"error": "POST request required"},
        status=400
    )

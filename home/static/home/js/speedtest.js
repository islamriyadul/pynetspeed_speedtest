console.log("speedtest.js loaded");

const startBtn = document.getElementById("start-btn");

const downloadEl = document.getElementById("download");
const uploadEl = document.getElementById("upload");
const pingEl = document.getElementById("ping");

async function measurePing() {

    let total = 0;

    for (let i = 0; i < 5; i++) {

        const start = performance.now();

        const response = await fetch(
            "/speedtest/ping/?t=" + Date.now(),
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error("Ping request failed");
        }

        const end = performance.now();

        total += (end - start);
    }

    return (total / 5).toFixed(1);
}


async function measureDownload() {

    const start = performance.now();

    const response = await fetch(
        "/speedtest/download/?size=10&t=" + Date.now(),
        {
            cache: "no-store"
        }
    );

    if (!response.ok) {
        throw new Error("Download request failed");
    }

    const reader = response.body.getReader();

    let received = 0;

    while (true) {

        const { done, value } = await reader.read();

        if (done) break;

        received += value.length;
    }

    const end = performance.now();

    const seconds = (end - start) / 1000;

    const bits = received * 8;

    const speed = bits / seconds / 1000000;

    return speed.toFixed(2);
}


async function measureUpload() {

    // Upload 10 MB
    const size = 10 * 1024 * 1024;

    const data = new Blob(
        [
            new Uint8Array(size)
        ],
        {
            type: "application/octet-stream"
        }
    );

    const start = performance.now();

    const response = await fetch(
        "/speedtest/upload/",
        {
            method: "POST",
            body: data,
            cache: "no-store",
            headers: {
                "Content-Type": "application/octet-stream"
            }
        }
    );

    if (!response.ok) {
        throw new Error("Upload request failed");
    }

    await response.json();

    const end = performance.now();

    const seconds = (end - start) / 1000;

    const bits = size * 8;

    const speed = bits / seconds / 1000000;

    return speed.toFixed(2);
}


async function startSpeedTest() {

    startBtn.disabled = true;

    downloadEl.textContent = "Testing...";
    uploadEl.textContent = "Waiting...";
    pingEl.textContent = "Testing...";

    try {

        const ping = await measurePing();
        pingEl.textContent = ping + " ms";

        const download = await measureDownload();
        downloadEl.textContent = download + " Mbps";

        uploadEl.textContent = "Testing...";

        const upload = await measureUpload();
        uploadEl.textContent = upload + " Mbps";

    } catch (error) {

        console.error(error);

        downloadEl.textContent = "Error";
        uploadEl.textContent = "Error";
        pingEl.textContent = "Error";

    } finally {

        startBtn.disabled = false;
    }
}

startBtn.addEventListener("click", startSpeedTest);
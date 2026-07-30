console.log("speedtest.js loaded");

const startBtn = document.getElementById("start-btn");

const downloadEl = document.getElementById("download");
const uploadEl = document.getElementById("upload");
const pingEl = document.getElementById("ping");


async function measurePing() {

    let totalPing = 0;

    for (let i = 0; i < 5; i++) {

        const start = performance.now();

        const response = await fetch("/speedtest/ping/?t=" + Date.now(), {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Ping failed");
        }

        const end = performance.now();

        totalPing += (end - start);
    }

    return (totalPing / 5).toFixed(1);
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
        throw new Error("Download failed");
    }

    const reader = response.body.getReader();

    let receivedLength = 0;

    while (true) {

        const { done, value } = await reader.read();

        if (done) break;

        receivedLength += value.length;
    }

    const end = performance.now();

    const seconds = (end - start) / 1000;

    const bits = receivedLength * 8;

    return (bits / seconds / 1000000).toFixed(2);
}


async function measureUpload() {

    // 1 MB upload
    const size = 1 * 1024 * 1024;

    const data = new Uint8Array(size);

    crypto.getRandomValues(data);

    const start = performance.now();

    const response = await fetch("/speedtest/upload/", {
        method: "POST",
        headers: {
            "Content-Type": "application/octet-stream"
        },
        body: data,
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error("Upload failed");
    }

    await response.json();

    const end = performance.now();

    const seconds = (end - start) / 1000;

    const bits = size * 8;

    return (bits / seconds / 1000000).toFixed(2);
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
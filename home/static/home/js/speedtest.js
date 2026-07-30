console.log("speedtest.js loaded");

const startBtn = document.getElementById("start-btn");

const downloadEl = document.getElementById("download");
const uploadEl = document.getElementById("upload");
const pingEl = document.getElementById("ping");


// -------------------- PING --------------------

async function measurePing() {

    let totalPing = 0;

    for (let i = 0; i < 3; i++) {

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

    return (totalPing / 3).toFixed(1);
}


// -------------------- DOWNLOAD --------------------

async function measureDownload() {

    const start = performance.now();

    const response = await fetch(
        "/speedtest/download/?size=3&t=" + Date.now(),
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

    const speed = bits / seconds / 1000000;

    return speed.toFixed(2);
}


// -------------------- UPLOAD --------------------

async function measureUpload() {

    // Upload only 2 MB for faster test
    const size = 2 * 1024 * 1024;

    const data = new Blob(
        [new Uint8Array(size)],
        {
            type: "application/octet-stream"
        }
    );

    const start = performance.now();

    const response = await fetch("/speedtest/upload/", {
        method: "POST",
        body: data,
        headers: {
            "Content-Type": "application/octet-stream"
        },
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error("Upload failed");
    }

    await response.json();

    const end = performance.now();

    const seconds = (end - start) / 1000;

    const bits = size * 8;

    const speed = bits / seconds / 1000000;

    return speed.toFixed(2);
}


// -------------------- MAIN --------------------

async function startSpeedTest() {

    startBtn.disabled = true;
    startBtn.innerText = "Testing...";

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

    }
    catch (error) {

        console.error(error);

        downloadEl.textContent = "Error";
        uploadEl.textContent = "Error";
        pingEl.textContent = "Error";
    }
    finally {

        startBtn.disabled = false;
        startBtn.innerText = "Start Speed Test";
    }
}

startBtn.addEventListener("click", startSpeedTest);
console.log("speedtest.js loaded");

const startBtn = document.getElementById("start-btn");

const downloadEl = document.getElementById("download");
const uploadEl = document.getElementById("upload");
const pingEl = document.getElementById("ping");


// -------------------- PING --------------------

async function measurePing() {

    let totalPing = 0;

    for (let i = 0; i < 5; i++) {

        const start = performance.now();

        const response = await fetch("/speedtest/ping/?t=" + Date.now(), {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Ping request failed");
        }

        const end = performance.now();

        totalPing += (end - start);
    }

    return (totalPing / 5).toFixed(1);
}


// -------------------- DOWNLOAD --------------------

async function measureDownload() {

    const sizeMB = 10;

    const start = performance.now();

    const response = await fetch(
        `/speedtest/download/?size=${sizeMB}&t=` + Date.now(),
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

    console.log("Download:");
    console.log("Bytes:", receivedLength);
    console.log("Seconds:", seconds);
    console.log("Mbps:", speed);

    return speed.toFixed(2);
}


// -------------------- UPLOAD --------------------

async function measureUpload() {

    // 10 MB upload
    const size = 10 * 1024 * 1024;

    const data = new Uint8Array(size);

    for (let i = 0; i < size; i++) {
        data[i] = Math.floor(Math.random() * 256);
    }

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

    const speed = bits / seconds / 1000000;

    console.log("Upload:");
    console.log("Bytes:", size);
    console.log("Seconds:", seconds);
    console.log("Mbps:", speed);

    return speed.toFixed(2);
}


// -------------------- MAIN --------------------

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

    }
    catch (error) {

        console.error(error);

        downloadEl.textContent = "Error";
        uploadEl.textContent = "Error";
        pingEl.textContent = "Error";
    }
    finally {

        startBtn.disabled = false;
    }
}


startBtn.addEventListener("click", startSpeedTest);
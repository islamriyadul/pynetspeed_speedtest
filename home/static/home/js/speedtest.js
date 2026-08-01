console.clear();
console.log("⚡ PyNetSpeed Loaded");

// ======================================
// ELEMENTS
// ======================================

const startBtn = document.getElementById("start-btn");

const downloadEl = document.getElementById("download");
const uploadEl = document.getElementById("upload");
const pingEl = document.getElementById("ping");
const speedNumber = document.getElementById("speed-number");

// ======================================
// VARIABLES
// ======================================

let testing = false;

// Tune these to trade off accuracy vs test duration.
// Kept modest since Render's free tier has very limited CPU (0.1 core) —
// large parallel payloads will bottleneck at the server, not the network.
const DOWNLOAD_PARALLEL_STREAMS = 2;
const DOWNLOAD_SIZE_MB_PER_STREAM = 8;

const UPLOAD_PARALLEL_STREAMS = 2;
const UPLOAD_SIZE_MB_PER_STREAM = 3;

// ======================================
// HELPERS
// ======================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function setCenterSpeed(value) {
    if (speedNumber) {
        speedNumber.textContent = Number(value).toFixed(1);
    }
}

function disableButton() {
    startBtn.disabled = true;
    startBtn.innerHTML = "TESTING";
    startBtn.style.opacity = ".8";
}

function enableButton() {
    startBtn.disabled = false;
    startBtn.innerHTML = "GO";
    startBtn.style.opacity = "1";
}

// ======================================
// ANIMATION
// ======================================

async function animateValue(element, target, suffix = "") {
    let value = 0;
    const step = Math.max(target / 60, 0.5);

    while (value < target) {
        value += step;
        if (value > target) {
            value = target;
        }
        element.textContent = value.toFixed(1) + suffix;
        setCenterSpeed(value);
        await sleep(15);
    }
}

// ======================================
// RESET
// ======================================

function resetResults() {
    downloadEl.textContent = "0 Mbps";
    uploadEl.textContent = "0 Mbps";
    pingEl.textContent = "0 ms";
    setCenterSpeed(0);
}

// ======================================
// PING
// ======================================

async function measurePing() {
    let total = 0;
    const rounds = 5;
    let best = Infinity;

    for (let i = 0; i < rounds; i++) {
        const start = performance.now();

        const response = await fetch(
            "/speedtest/ping/?t=" + Date.now(),
            { cache: "no-store" }
        );

        if (!response.ok) {
            throw new Error("Ping Failed");
        }

        const end = performance.now();
        const rtt = end - start;

        total += rtt;
        if (rtt < best) best = rtt;
    }

    // Use the best (lowest) round-trip time — closer to how
    // most speed test tools report ping, since it avoids
    // penalizing you for one slow/jittery request.
    return Number(best.toFixed(1));
}

// ======================================
// DOWNLOAD (parallel streams)
// ======================================

async function downloadStream(sizeMb) {
    const response = await fetch(
        "/speedtest/download/?size=" + sizeMb + "&t=" + Date.now() + Math.random(),
        { cache: "no-store" }
    );

    if (!response.ok) {
        throw new Error("Download Failed");
    }

    const reader = response.body.getReader();
    let bytes = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
    }

    return bytes;
}

async function measureDownload() {
    const start = performance.now();

    const streams = [];
    for (let i = 0; i < DOWNLOAD_PARALLEL_STREAMS; i++) {
        streams.push(downloadStream(DOWNLOAD_SIZE_MB_PER_STREAM));
    }

    const results = await Promise.all(streams);
    const totalBytes = results.reduce((sum, b) => sum + b, 0);

    const end = performance.now();
    const seconds = (end - start) / 1000;

    const speed = (totalBytes * 8) / seconds / 1000000;

    return Number(speed.toFixed(2));
}

// ======================================
// UPLOAD (parallel streams)
// ======================================

async function uploadStream(sizeMb) {
    const size = sizeMb * 1024 * 1024;

    const data = new Blob(
        [new Uint8Array(size)],
        { type: "application/octet-stream" }
    );

    const response = await fetch(
        "/speedtest/upload/",
        {
            method: "POST",
            body: data,
            headers: {
                "Content-Type": "application/octet-stream"
            },
            cache: "no-store"
        }
    );

    if (!response.ok) {
        throw new Error("Upload Failed");
    }

    await response.json();

    return size;
}

async function measureUpload() {
    const start = performance.now();

    const streams = [];
    for (let i = 0; i < UPLOAD_PARALLEL_STREAMS; i++) {
        streams.push(uploadStream(UPLOAD_SIZE_MB_PER_STREAM));
    }

    const results = await Promise.all(streams);
    const totalBytes = results.reduce((sum, b) => sum + b, 0);

    const end = performance.now();
    const seconds = (end - start) / 1000;

    const speed = (totalBytes * 8) / seconds / 1000000;

    return Number(speed.toFixed(2));
}

// ======================================
// MAIN TEST
// ======================================

async function startSpeedTest() {
    if (testing) return;

    testing = true;
    disableButton();
    resetResults();

    downloadEl.textContent = "Testing...";
    uploadEl.textContent = "Waiting...";
    pingEl.textContent = "Testing...";

    try {
        // -----------------------------
        // Ping
        // -----------------------------
        const ping = await measurePing();
        pingEl.textContent = ping + " ms";

        await sleep(300);

        // -----------------------------
        // Download
        // -----------------------------
        downloadEl.textContent = "Testing...";

        const download = await measureDownload();

        await animateValue(downloadEl, download, " Mbps");

        await sleep(400);

        // -----------------------------
        // Upload
        // -----------------------------
        uploadEl.textContent = "Testing...";
        setCenterSpeed(0);

        const upload = await measureUpload();

        await animateValue(uploadEl, upload, " Mbps");

        // Show final download result in center
        setCenterSpeed(download);
    }

    catch (error) {
        console.error(error);
        downloadEl.textContent = "Error";
        uploadEl.textContent = "Error";
        pingEl.textContent = "Error";
        setCenterSpeed(0);
    }

    finally {
        testing = false;
        enableButton();
    }
}

// ======================================
// EVENT LISTENER
// ======================================

if (startBtn) {
    startBtn.addEventListener("click", startSpeedTest);
}

// ======================================
// INITIALIZE
// ======================================

resetResults();

console.log("✅ PyNetSpeed Ready");

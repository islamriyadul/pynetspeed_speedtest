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

    for (let i = 0; i < 3; i++) {

        const start = performance.now();

        const response = await fetch(
            "/speedtest/ping/?t=" + Date.now(),
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error("Ping Failed");
        }

        const end = performance.now();

        total += (end - start);

    }

    return Number((total / 3).toFixed(1));

}

// ======================================
// DOWNLOAD
// ======================================

async function measureDownload() {

    const start = performance.now();

    const response = await fetch(
        "/speedtest/download/?size=5&t=" + Date.now(),
        {
            cache: "no-store"
        }
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

    const end = performance.now();

    const seconds = (end - start) / 1000;

    const speed = (bytes * 8) / seconds / 1000000;

    return Number(speed.toFixed(2));

}
// ======================================
// UPLOAD
// ======================================

async function measureUpload() {

    // Upload 1 MB (fast and reliable)
    const size = 2 * 1024 * 1024;

    const data = new Blob(
        [new Uint8Array(size)],
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

    const end = performance.now();

    const seconds = (end - start) / 1000;

    const speed = (size * 8) / seconds / 1000000;

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

        await animateValue(
            downloadEl,
            download,
            " Mbps"
        );

        await sleep(400);

        // -----------------------------
        // Upload
        // -----------------------------

        uploadEl.textContent = "Testing...";

        setCenterSpeed(0);

        const upload = await measureUpload();

        await animateValue(
            uploadEl,
            upload,
            " Mbps"
        );

        // Show final result in center
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

    startBtn.addEventListener(
        "click",
        startSpeedTest
    );

}

// ======================================
// INITIALIZE
// ======================================

resetResults();

console.log("✅ PyNetSpeed Ready");
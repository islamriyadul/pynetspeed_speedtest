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
const speedCircle = document.getElementById("speed-circle");
const gaugeFill = document.getElementById("gauge-fill");

const ispEl = document.getElementById("isp");
const ipEl = document.getElementById("ip");

// Gauge ring circumference (r=120 -> 2 * PI * 120 ≈ 754), and the
// speed value (Mbps) that should visually represent a "full" ring.
const GAUGE_CIRCUMFERENCE = 754;
const GAUGE_MAX_MBPS = 150;

// ======================================
// VARIABLES
// ======================================

let testing = false;

// Tune these to trade off accuracy vs test duration.
// Kept modest since Render's free tier has very limited CPU (0.1 core) —
// large parallel payloads will bottleneck at the server, not the network.
const DOWNLOAD_PARALLEL_STREAMS = 2;
const DOWNLOAD_SIZE_MB_PER_STREAM = 8;

const UPLOAD_SIZE_MB = 0.25;

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

    if (gaugeFill) {
        const ratio = Math.min(Number(value) / GAUGE_MAX_MBPS, 1);
        const offset = GAUGE_CIRCUMFERENCE - (ratio * GAUGE_CIRCUMFERENCE);
        gaugeFill.style.strokeDashoffset = offset;
    }
}

function setTestingState(isTesting) {
    if (speedCircle) {
        speedCircle.classList.toggle("is-testing", isTesting);
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
// UPLOAD (single stream — more reliable on constrained free-tier servers)
// ======================================

// Some local security software (antivirus "web shields", some
// corporate/VPN network filters) intercepts and deep-scans
// application/octet-stream request bodies before letting them
// leave the machine, which can stall a POST for a long time even
// though nothing is wrong with the server or the network itself.
// Sending the payload as plain text instead of raw binary avoids
// tripping that class of interception for most users, and using
// XHR with a hard timeout means that if something on the client
// machine *does* still hold the request, we fail fast and retry
// with a smaller payload instead of leaving the UI stuck for
// minutes with no feedback.

function buildUploadPayload(sizeBytes) {
    // Plain text of the requested size — cheap to build (no crypto
    // RNG needed since we're only measuring transfer time) and far
    // less likely to be treated as a "file" by content inspectors.
    return "x".repeat(sizeBytes);
}

function uploadOnce(sizeBytes, timeoutMs) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const start = performance.now();

        xhr.open("POST", "/speedtest/upload/", true);
        xhr.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
        xhr.timeout = timeoutMs;

        xhr.onload = () => {
            if (xhr.status < 200 || xhr.status >= 300) {
                reject(new Error("Upload Failed (" + xhr.status + ")"));
                return;
            }
            const seconds = (performance.now() - start) / 1000;
            const speed = (sizeBytes * 8) / seconds / 1000000;
            resolve(Number(speed.toFixed(2)));
        };

        xhr.onerror = () => reject(new Error("Upload Failed (network error)"));
        xhr.ontimeout = () => reject(new Error("Upload Timed Out"));

        xhr.send(buildUploadPayload(sizeBytes));
    });
}

async function measureUpload() {
    const fullSize = Math.round(UPLOAD_SIZE_MB * 1024 * 1024);

    try {
        // First attempt: normal size, bounded timeout.
        return await uploadOnce(fullSize, 2500);
    } catch (err) {
        // Something stalled or failed fast — try once more with a
        // much smaller payload before giving up. If the environment
        // is holding the connection itself (not a bandwidth issue),
        // a smaller size won't fix it, but this keeps the test quick
        // rather than hanging, and still gives a real reading if the
        // first attempt was just unlucky.
        try {
            return await uploadOnce(16 * 1024, 1500);
        } catch (err2) {
            // Genuinely can't complete an upload in reasonable time —
            // report this distinctly rather than showing a misleading
            // near-zero Mbps figure.
            const notAvailable = new Error("UPLOAD_UNAVAILABLE");
            notAvailable.cause = err2;
            throw notAvailable;
        }
    }
}

// ======================================
// MAIN TEST
// ======================================

async function startSpeedTest() {
    if (testing) return;

    testing = true;
    disableButton();
    resetResults();
    setTestingState(true);

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

        try {
            const upload = await measureUpload();
            await animateValue(uploadEl, upload, " Mbps");
        } catch (uploadError) {
            console.error(uploadError);
            // Upload couldn't complete quickly (often caused by local
            // antivirus/VPN/network software intercepting the request
            // rather than an actual bandwidth problem) — say so plainly
            // instead of showing a misleading near-zero Mbps number.
            uploadEl.textContent = "Unavailable";
        }

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
        setTestingState(false);
    }
}

// ======================================
// ISP / IP DETECTION
// ======================================

// Runs once on page load, independent of the speed test itself.
// Uses ipapi.co (HTTPS, no API key needed for light use) to look
// up the visitor's public IP and their ISP/organization name.

async function detectIspAndIp() {
    if (!ispEl && !ipEl) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
        const response = await fetch("/speedtest/client-info/", {
            signal: controller.signal,
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("client-info lookup failed (" + response.status + ")");
        }

        const info = await response.json();

        if (ipEl) {
            ipEl.textContent = info.ip || "Unavailable";
        }
        if (ispEl) {
            ispEl.textContent = info.isp || "Unavailable";
        }
    } catch (err) {
        console.error("ISP/IP detection failed:", err);
        if (ipEl) ipEl.textContent = "Unavailable";
        if (ispEl) ispEl.textContent = "Unavailable";
    } finally {
        clearTimeout(timeout);
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
detectIspAndIp();

console.log("✅ PyNetSpeed Ready");

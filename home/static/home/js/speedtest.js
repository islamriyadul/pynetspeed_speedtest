console.log("speedtest.js loaded");
const startBtn = document.getElementById("start-btn");

const downloadEl = document.getElementById("download");
const uploadEl = document.getElementById("upload");
const pingEl = document.getElementById("ping");


async function measurePing() {

    let totalPing = 0;

    for (let i = 0; i < 5; i++) {

        const start = performance.now();

        await fetch("/speedtest/ping/?t=" + Date.now(), {
            cache: "no-store"
        });

        const end = performance.now();

        totalPing += (end - start);
    }

    return (totalPing / 5).toFixed(1);
}


async function measureDownload() {

    const start = performance.now();

    const response = await fetch(
        "/speedtest/download/?size=50&t=" + Date.now(),
        {
            cache: "no-store"
        }
    );

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


async function measureUpload() {

    const size = 20 * 1024 * 1024;

    const data = new Uint8Array(size);

    for (let i = 0; i < size; i++) {
    data[i] = Math.floor(Math.random() * 256);
}

    const start = performance.now();

    await fetch("/speedtest/upload/", {
        method: "POST",
        body: data
    });

    const end = performance.now();

    const seconds = (end - start) / 1000;

    const bits = size * 8;

    const speed = bits / seconds / 1000000;

    return speed.toFixed(2);
}


async function startSpeedTest() {

    startBtn.disabled = true;

    downloadEl.innerHTML = "Testing...";
    uploadEl.innerHTML = "Waiting...";
    pingEl.innerHTML = "Testing...";

    try {

        const ping = await measurePing();

        pingEl.innerHTML = ping + " ms";

        const download = await measureDownload();

        downloadEl.innerHTML = download + " Mbps";

        uploadEl.innerHTML = "Testing...";

        const upload = await measureUpload();

        uploadEl.innerHTML = upload + " Mbps";

    }
    catch (error) {

        console.error(error);

        downloadEl.innerHTML = "Error";

        uploadEl.innerHTML = "Error";

        pingEl.innerHTML = "Error";
    }

    startBtn.disabled = false;
}


startBtn.addEventListener("click", startSpeedTest);
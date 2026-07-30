const startBtn = document.getElementById("start-btn");

const downloadEl = document.getElementById("download");
const uploadEl = document.getElementById("upload");
const pingEl = document.getElementById("ping");


async function measurePing() {

    const start = performance.now();

    await fetch("/speedtest/ping/?t=" + Date.now());

    const end = performance.now();

    return Math.round(end - start);
}


async function measureDownload() {

    const start = performance.now();

    const response = await fetch(
        "/speedtest/download/?t=" + Date.now()
    );

    const blob = await response.blob();

    const end = performance.now();

    const bytes = blob.size;

    const seconds = (end - start) / 1000;

    const mbps =
        ((bytes * 8) / 1024 / 1024) / seconds;

    return mbps.toFixed(2);
}


async function measureUpload() {

    const size = 5 * 1024 * 1024;

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

    const mbps =
        ((size * 8) / 1024 / 1024) / seconds;

    return mbps.toFixed(2);
}


startBtn.addEventListener("click", async () => {

    startBtn.disabled = true;

    pingEl.innerHTML = "Testing...";
    downloadEl.innerHTML = "Waiting...";
    uploadEl.innerHTML = "Waiting...";

    try {

        const ping = await measurePing();

        pingEl.innerHTML = ping + " ms";

        downloadEl.innerHTML = "Testing...";

        const downloadSpeed =
            await measureDownload();

        downloadEl.innerHTML =
            downloadSpeed + " Mbps";

        uploadEl.innerHTML = "Testing...";

        const uploadSpeed =
            await measureUpload();

        uploadEl.innerHTML =
            uploadSpeed + " Mbps";

    }
    catch (error) {

        console.error(error);

        pingEl.innerHTML = "Error";
        downloadEl.innerHTML = "Error";
        uploadEl.innerHTML = "Error";
    }

    startBtn.disabled = false;
});
// ==========================================
//  CONFIG: API SETTINGS
// ==========================================
const apiKey = '9976d8edafmsha1ead5d9213a772p192695jsn85fa88d4874d'; // Your Key

// 👇 CHECK THIS: If downloads fail, replace this with the host from your RapidAPI dashboard
const apiHost = 'social-download-all-in-one.p.rapidapi.com'; 

// ==========================================
//  INIT: POPULATE OPTIONS
// ==========================================
function updateQualityOptions() {
    const format = document.getElementById('media-format').value;
    const qualitySelect = document.getElementById('media-quality');
    qualitySelect.innerHTML = ''; 

    let options = [];
    if (format === 'video') {
        options = [
            { val: '720', text: 'Best Available (Auto)' }, 
            { val: '480', text: 'Standard (480p)' },
            { val: '360', text: 'Data Saver (360p)' }
        ];
    } else {
        options = [
            { val: 'best', text: 'Best Audio (Auto)' }
        ];
    }

    options.forEach(opt => {
        const el = document.createElement('option');
        el.value = opt.val;
        el.innerText = opt.text;
        qualitySelect.appendChild(el);
    });
}

window.onload = function() {
    updateQualityOptions();
};

// ==========================================
//  LOGIC 1: IMAGE TO TEXT (OCR)
// ==========================================
const extractBtn = document.getElementById('extract-btn');
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.getElementById('progress-container');
const statusText = document.getElementById('status-text');
const textArea = document.getElementById('detected-text');

async function processImage() {
    const fileInput = document.getElementById('image-input');
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select an image first.");
        return;
    }

    extractBtn.disabled = true;
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    statusText.innerText = "Initializing Engine...";
    textArea.value = "";

    try {
        await Tesseract.recognize(
            file,
            'eng',
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const pct = Math.round(m.progress * 100);
                        progressBar.style.width = pct + '%';
                        statusText.innerText = `Scanning Document: ${pct}%`;
                    } else {
                        statusText.innerText = m.status;
                    }
                }
            }
        ).then(({ data: { text } }) => {
            textArea.value = text;
            statusText.innerText = "Extraction Complete!";
            progressBar.style.width = '100%';
        });
    } catch (err) {
        console.error(err);
        statusText.innerText = "Error: Could not process image.";
        progressBar.style.backgroundColor = "#ff4444";
    } finally {
        extractBtn.disabled = false;
    }
}

// ==========================================
//  LOGIC 2: PDF GENERATION
// ==========================================
function generateDocument() {
    const text = document.getElementById('detected-text').value;

    if (!text.trim()) {
        alert("No text to save!");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    const maxLineWidth = 180; 
    const splitText = doc.splitTextToSize(text, maxLineWidth);

    doc.text(splitText, 15, 15);
    doc.save("extracted_document.pdf");
}

// ==========================================
//  LOGIC 3: UNIVERSAL DOWNLOADER (Smart Engine)
// ==========================================

// Helper: Tries to save file to disk (In-Built feel)
async function downloadInternal(url, filename) {
    const resultDiv = document.getElementById('download-result');
    const dlBtn = document.getElementById('dl-action-btn');

    if(dlBtn) {
        dlBtn.innerText = "Downloading to Device...";
        dlBtn.disabled = true;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Stream Blocked");
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);

        if(dlBtn) {
            dlBtn.innerText = "✔ Saved to Gallery/Downloads";
            dlBtn.style.background = "#2ecc71";
        }

    } catch (error) {
        console.warn("Direct download blocked (CORS). Opening native downloader.");
        // Fallback: Use browser's built-in download manager
        window.open(url, '_blank');
        if(dlBtn) dlBtn.innerText = "Opening Download...";
    }
}

async function processDownload() {
    const url = document.getElementById('video-url').value;
    const format = document.getElementById('media-format').value;
    const resultDiv = document.getElementById('download-result');

    if (!url) {
        alert("Please paste a URL.");
        return;
    }

    // UI Reset
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div style="text-align:center; padding:20px;">
            <div style="margin-bottom:10px;">🔄</div>
            <p style="color:var(--primary); font-weight:600;">Processing Request...</p>
            <p style="font-size:0.8rem; opacity:0.7;">Analysing: ${url.substring(0, 30)}...</p>
        </div>
    `;

    try {
        let finalDownloadLink = '';

        // STRATEGY 1: Check if it is ALREADY a direct file
        if (url.match(/\.(mp4|mp3|wav|mov)$/i)) {
            finalDownloadLink = url;
        } 
        // STRATEGY 2: Use API for Social Media
        else {
            // NOTE: The endpoint '/v1/social/download' is common for "Social Download All In One"
            // If you use a different API, change this URL end part (e.g., to '/download' or '/all')
            const response = await fetch(`https://${apiKey}/v1/social/download?url=${encodeURIComponent(url)}`, {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': apiKey,
                    'X-RapidAPI-Host': apiHost
                }
            });

            if (!response.ok) throw new Error("API Error: Check Key or Host.");
            
            const data = await response.json();
            
            // Try to find the link in common API structures
            finalDownloadLink = data.url || data.link || data.video_url || (data.data ? data.data[0].url : null);
            
            if (!finalDownloadLink) throw new Error("No download link found in API response.");
        }

        // Generate Filename
        const filename = `media_download_${Date.now()}.${format === 'video' ? 'mp4' : 'mp3'}`;

        // Show "Save" Button
        resultDiv.innerHTML = `
            <div style="text-align:center; animation: fadeIn 0.5s;">
                <p style="color: #2ecc71; font-weight:bold; margin-bottom:15px; font-size:1.1rem;">✔ Media Unlocked</p>
                <button id="dl-action-btn" class="btn-success">
                    Save to Device
                </button>
                <p style="font-size:0.75rem; color:#666; margin-top:15px;">
                    Format: ${format.toUpperCase()} | Server: Secure
                </p>
            </div>
        `;

        // Attach Click Listener to the new button
        document.getElementById('dl-action-btn').onclick = () => downloadInternal(finalDownloadLink, filename);

    } catch (error) {
        console.error(error);
        resultDiv.innerHTML = `
            <div style="color: #e74c3c; text-align:center; padding:15px; background:rgba(231, 76, 60, 0.1); border-radius:10px;">
                <p><strong>Connection Failed</strong></p>
                <p style="font-size:0.85rem; margin-top:5px;">${error.message}</p>
                <p style="font-size:0.75rem; margin-top:10px; opacity:0.8;">Tip: Verify your 'apiHost' in app.js matches your subscription.</p>
            </div>
        `;
    }
}



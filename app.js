// ==========================================
//  INIT: POPULATE QUALITY OPTIONS
// ==========================================
function updateQualityOptions() {
    const format = document.getElementById('media-format').value;
    const qualitySelect = document.getElementById('media-quality');
    qualitySelect.innerHTML = ''; 

    let options = [];
    if (format === 'video') {
        options = [
            { val: '4k', text: '4K Ultra HD (2160p)' },
            { val: '1080p', text: 'Full HD (1080p)' },
            { val: '720p', text: 'HD (720p)' },
            { val: '480p', text: 'Standard (480p)' },
            { val: '360p', text: 'Data Saver (360p)' }
        ];
    } else {
        options = [
            { val: '320kbps', text: 'High Quality (320kbps)' },
            { val: '192kbps', text: 'Standard (192kbps)' },
            { val: '128kbps', text: 'Low (128kbps)' }
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
//  LOGIC 2: A4 PDF GENERATION
// ==========================================
function generateDocument() {
    const text = document.getElementById('detected-text').value;

    if (!text.trim()) {
        alert("No text to save! Please extract text first.");
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
//  LOGIC 3: FIXED MEDIA DOWNLOADER
// ==========================================

// Helper function to FORCE download instead of playing
async function forceDownload(url, filename) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Network response was not ok");
        
        // Convert the file to a "Blob" (Binary Object)
        const blob = await response.blob();
        
        // Create a temporary invisible link to trigger the "Save As" dialog
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return true;
    } catch (error) {
        console.error("Download failed:", error);
        // Fallback: Just open the link if the force download fails (e.g. CORS error)
        window.open(url, '_blank');
        return false;
    }
}

function processDownload() {
    const url = document.getElementById('video-url').value;
    const format = document.getElementById('media-format').value;
    const resultDiv = document.getElementById('download-result');

    if (!url) {
        alert("Please paste a URL.");
        return;
    }

    // UI: Show loading
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `<p style="color:#666; text-align:center;">Analyzing link...</p>`;

    setTimeout(() => {
        // 1. Check if it's a Direct File (mp4, mp3, etc)
        const isDirectFile = url.match(/\.(mp4|webm|ogg|mov|mp3|wav)$/i);
        
        // 2. Check if it's YouTube/Social
        const isSocial = url.includes("youtube.com") || url.includes("youtu.be") || url.includes("instagram.com") || url.includes("facebook.com");

        if (isDirectFile) {
            // == METHOD A: DIRECT DOWNLOAD ==
            // We use the 'onclick' to trigger our special forceDownload function
            const fileName = `downloaded_media.${format === 'video' ? 'mp4' : 'mp3'}`;
            
            resultDiv.innerHTML = `
                <div style="text-align:center;">
                    <p style="color: var(--success); font-weight:bold; margin-bottom:10px;">✔ File Ready!</p>
                    <button id="real-dl-btn" class="btn-success" style="width: auto; padding: 12px 30px;">
                        Save to Device 
                    </button>
                    <p style="font-size:0.8rem; margin-top:10px; color:#666;">Format: ${format.toUpperCase()}</p>
                </div>
            `;
            
            // Attach the click event to the new button
            document.getElementById('real-dl-btn').onclick = function() {
                this.innerText = "Downloading...";
                forceDownload(url, fileName);
            };

        } else if (isSocial) {
            // == METHOD B: SOCIAL MEDIA ==
            // Redirect to a service that can handle encryption
            resultDiv.innerHTML = `
                <div style="background: rgba(255,255,255,0.7); padding: 20px; border-radius: 12px; border: 1px solid #eee; text-align:center;">
                    <h3 style="color: var(--primary); font-size: 1.1rem;">Social Media Detected</h3>
                    <p style="font-size: 0.9rem; margin-bottom: 15px;">Browsers cannot directly download YouTube/Instagram links without a server.</p>
                    
                    <a href="https://ssyoutube.com/" target="_blank" class="btn-success" style="text-decoration: none; display: inline-block; padding: 12px 20px; color: white; border-radius: 10px;">
                        Use External Downloader
                    </a>
                </div>
            `;
        } else {
            // == METHOD C: UNKNOWN LINK ==
            resultDiv.innerHTML = `
                <div style="text-align:center;">
                    <p>Link type unknown. Trying direct access...</p>
                    <a href="${url}" target="_blank" download>Open Link</a>
                </div>
            `;
        }
    }, 1000);
}

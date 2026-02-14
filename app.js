// ==========================================
//  INIT: POPULATE QUALITY OPTIONS
// ==========================================
function updateQualityOptions() {
    const format = document.getElementById('media-format').value;
    const qualitySelect = document.getElementById('media-quality');
    qualitySelect.innerHTML = ''; // Clear existing options

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
        // Audio Bitrates
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

// Initialize options on load
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

    // 1. Validation
    if (!file) {
        alert("Please select an image first.");
        return;
    }

    // 2. UI Updates (Show Progress)
    extractBtn.disabled = true;
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    statusText.innerText = "Initializing Engine...";
    textArea.value = ""; // Clear previous text

    try {
        // 3. Tesseract Processing
        await Tesseract.recognize(
            file,
            'eng',
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        // Update the Visual Progress Bar
                        const pct = Math.round(m.progress * 100);
                        progressBar.style.width = pct + '%';
                        statusText.innerText = `Scanning Document: ${pct}%`;
                    } else {
                        statusText.innerText = m.status;
                    }
                }
            }
        ).then(({ data: { text } }) => {
            // 4. Success
            textArea.value = text;
            statusText.innerText = "Extraction Complete!";
            progressBar.style.width = '100%';
        });

    } catch (err) {
        // 5. Error Handling
        console.error(err);
        statusText.innerText = "Error: Could not process image.";
        progressBar.style.backgroundColor = "#ff4444"; // Red for error
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

    // Initialize jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'p', // Portrait
        unit: 'mm',
        format: 'a4'
    });

    // Set Font
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    // Text Wrapping
    // A4 width is 210mm. We leave 15mm margin on each side (210 - 30 = 180mm).
    const maxLineWidth = 180; 
    const splitText = doc.splitTextToSize(text, maxLineWidth);

    // Add text to document (x: 15, y: 15)
    doc.text(splitText, 15, 15);

    // Save
    doc.save("extracted_document.pdf");
}


// ==========================================
//  LOGIC 3: MEDIA DOWNLOADER (Video/Audio)
// ==========================================
function processDownload() {
    const url = document.getElementById('video-url').value;
    const format = document.getElementById('media-format').value;
    const quality = document.getElementById('media-quality').value;
    const resultDiv = document.getElementById('download-result');

    if (!url) {
        alert("Please paste a video URL.");
        return;
    }

    // Show Loading State
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `<p style="color:#666; text-align:center;">Analysing link for <strong>${format.toUpperCase()} (${quality})</strong>...</p>`;

    setTimeout(() => {
        const isDirectFile = url.match(/\.(mp4|webm|ogg|mov|mp3)$/i);
        
        let contentHtml = '';

        if (isDirectFile) {
            // Scenario A: Direct File Link
            contentHtml = `
                <div style="text-align:center;">
                    <p style="color: var(--success); font-weight:bold; margin-bottom:10px;">✔ File Found!</p>
                    <a href="${url}" download class="btn-success" style="display:inline-block; padding:12px 25px; color:white; text-decoration:none; border-radius:8px; font-weight:600;">
                        Download ${format.toUpperCase()} Now
                    </a>
                </div>
            `;
        } else {
            // Scenario B: Social Media Link (Simulation)
            contentHtml = `
                <div style="background: rgba(255,255,255,0.7); padding: 20px; border-radius: 12px; border: 1px solid #eee; text-align:center;">
                    <h3 style="color: var(--primary); margin-bottom: 10px;">Ready to Convert</h3>
                    <p style="margin-bottom:5px;"><strong>Format:</strong> ${format.toUpperCase()}</p>
                    <p style="margin-bottom:15px;"><strong>Quality:</strong> ${quality}</p>
                    
                    <a href="${url}" target="_blank" style="background: var(--primary); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight:600;">
                        Open Source Link
                    </a>
                    <p style="font-size: 0.75rem; color: #666; margin-top: 15px;">
                        *Direct server-side download requires a backend API key.
                    </p>
                </div>
            `;
        }
        resultDiv.innerHTML = contentHtml;
    }, 1500);
}
// State
let images = []; // Array of { id, file, url, aspect }
let settings = {
  layout: 'grid', // grid, stack, single
  columns: 1,
  fit: 'contain', // contain, cover
  gap: 8,
  margin: 20
};

// A4 Dimensions at 300 DPI (approximate)
const A4_WIDTH = 2480;
const A4_HEIGHT = 3508;

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const controlsPanel = document.getElementById('controls-panel');
const imagesSection = document.getElementById('images-section');
const previewSection = document.getElementById('preview-section');
const imageGrid = document.getElementById('image-grid');
const imageCount = document.getElementById('image-count');
const previewCanvas = document.getElementById('preview-canvas');
const toastEl = document.getElementById('toast');

// Settings Elements
const gapSlider = document.getElementById('gap-slider');
const gapValue = document.getElementById('gap-value');
const marginSlider = document.getElementById('margin-slider');
const marginValue = document.getElementById('margin-value');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupSettingsListeners();
});

// Setup Main Event Listeners
function setupEventListeners() {
  // Dropzone events
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.add('drag-active'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.remove('drag-active'), false);
  });

  dropzone.addEventListener('drop', handleDrop, false);
  fileInput.addEventListener('change', handleFileSelect, false);

  // Clear App
  document.getElementById('btn-clear').addEventListener('click', () => {
    if(confirm('Are you sure you want to clear all images?')) {
      images = [];
      updateUI();
      showToast('All images cleared', 'success');
    }
  });

  // Export Events
  document.getElementById('btn-export-pdf').addEventListener('click', exportPDF);
  document.getElementById('btn-export-img').addEventListener('click', exportImage);
}

// Setup Settings Event Listeners
function setupSettingsListeners() {
  // Segmented Controls
  setupSegmentedControl('layout-segmented', 'layout', (val) => {
    settings.layout = val;
    settings.columns = val === 'grid' ? 2 : 1; // Default to 2 cols for grid, 1 for stack
    updateSegmentedUI('cols-segmented', settings.columns);
    renderPreview();
  });

  setupSegmentedControl('cols-segmented', 'columns', (val) => {
    settings.columns = parseInt(val);
    renderPreview();
  });

  setupSegmentedControl('fit-segmented', 'fit', (val) => { // Adding missing id if needed, we'll select by parent
    
  });

  // Since fit-segmented didn't have an ID in HTML, let's select manually:
  const fitBtns = document.querySelectorAll('#btn-contain, #btn-cover');
  fitBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      fitBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      settings.fit = e.target.dataset.value;
      renderPreview();
    });
  });

  // Sliders
  gapSlider.addEventListener('input', (e) => {
    settings.gap = parseInt(e.target.value);
    gapValue.textContent = `${settings.gap}px`;
    renderPreview();
  });

  marginSlider.addEventListener('input', (e) => {
    settings.margin = parseInt(e.target.value);
    marginValue.textContent = `${settings.margin}px`;
    renderPreview();
  });
}

function setupSegmentedControl(containerId, settingKey, callback) {
  const container = document.getElementById(containerId);
  if(!container) return;
  const buttons = container.querySelectorAll('.seg-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      buttons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      callback(e.target.dataset.value);
    });
  });
}

function updateSegmentedUI(containerId, value) {
  const container = document.getElementById(containerId);
  if(!container) return;
  const buttons = container.querySelectorAll('.seg-btn');
  buttons.forEach(b => {
    b.classList.toggle('active', b.dataset.value == value);
  });
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFiles(files);
}

function handleFileSelect(e) {
  const files = e.target.files;
  handleFiles(files);
  fileInput.value = ''; // Reset
}

function handleFiles(files) {
  const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
  
  if (validFiles.length === 0) {
    showToast('Please upload valid image files', 'error');
    return;
  }

  let loadedCount = 0;
  
  validFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target.result;
      const img = new Image();
      img.onload = () => {
        images.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          file: file,
          url: url,
          imgObj: img,
          aspect: img.width / img.height
        });
        
        loadedCount++;
        if (loadedCount === validFiles.length) {
          showToast(`Added ${validFiles.length} image(s)`, 'success');
          updateUI();
        }
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  });
}

function removeImage(id) {
  images = images.filter(img => img.id !== id);
  updateUI();
}

// Update UI state based on images array
function updateUI() {
  const hasImages = images.length > 0;
  
  controlsPanel.style.display = hasImages ? 'flex' : 'none';
  imagesSection.style.display = hasImages ? 'block' : 'none';
  previewSection.style.display = hasImages ? 'block' : 'none';
  
  if (hasImages) {
    imageCount.textContent = images.length;
    renderImageGrid();
    renderPreview();
  }
}

// Render Thumbnails and setup Drag to Reorder
let draggedItemIndex = null;

function renderImageGrid() {
  imageGrid.innerHTML = '';
  
  images.forEach((img, index) => {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.draggable = true;
    card.dataset.index = index;
    
    card.innerHTML = `
      <div class="image-thumb-wrap">
        <img src="${img.url}" class="image-thumb" draggable="false" />
      </div>
      <div class="image-info">
        <span class="image-index">${index + 1}</span>
        <button class="btn-remove" onclick="removeImage('${img.id}')" title="Remove">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    `;

    // Drag events
    card.addEventListener('dragstart', (e) => {
      draggedItemIndex = index;
      setTimeout(() => card.classList.add('dragging'), 0);
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.image-card').forEach(c => c.classList.remove('drag-over'));
      draggedItemIndex = null;
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (index !== draggedItemIndex) {
        card.classList.add('drag-over');
      }
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      if (draggedItemIndex !== null && draggedItemIndex !== index) {
        // Reorder array
        const item = images.splice(draggedItemIndex, 1)[0];
        images.splice(index, 0, item);
        updateUI(); // Re-render everything
      }
    });

    imageGrid.appendChild(card);
  });
}

// Draw to Canvas
function renderPreview() {
  if (images.length === 0) return;

  const ctx = previewCanvas.getContext('2d');
  
  // High resolution internal canvas size (A4 at 300DPI)
  previewCanvas.width = A4_WIDTH;
  previewCanvas.height = A4_HEIGHT;

  // Background white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

  // Scaling factor from UI settings to High Res Canvas
  // UI gap slider (max 30) maps to max 150px gap on canvas (~5x multiplier)
  const scaleMult = 5; 
  const margin = settings.margin * scaleMult;
  const gap = settings.gap * scaleMult;

  const availableWidth = A4_WIDTH - (margin * 2);
  const availableHeight = A4_HEIGHT - (margin * 2);

  let layoutCols = settings.columns;
  let layoutRows = 1;

  if (settings.layout === 'stack') {
    layoutCols = 1;
    layoutRows = images.length;
  } else if (settings.layout === 'grid') {
    layoutRows = Math.ceil(images.length / layoutCols);
  } else if (settings.layout === 'single') {
    // Only draw the first image
    layoutCols = 1; layoutRows = 1;
  }

  const cellWidth = (availableWidth - (gap * (layoutCols - 1))) / layoutCols;
  const cellHeight = (availableHeight - (gap * (layoutRows - 1))) / layoutRows;

  images.forEach((imgData, idx) => {
    if (settings.layout === 'single' && idx > 0) return;

    const row = Math.floor(idx / layoutCols);
    const col = idx % layoutCols;

    const x = margin + col * (cellWidth + gap);
    const y = margin + row * (cellHeight + gap);

    drawImageCoverOrContain(ctx, imgData.imgObj, x, y, cellWidth, cellHeight, settings.fit);
  });
}

function drawImageCoverOrContain(ctx, img, x, y, cw, ch, fit) {
  const imgRatio = img.width / img.height;
  const cellRatio = cw / ch;

  let dw, dh, dx, dy;

  if (fit === 'contain') {
    if (imgRatio > cellRatio) {
      dw = cw;
      dh = cw / imgRatio;
    } else {
      dh = ch;
      dw = ch * imgRatio;
    }
  } else {
    // cover
    if (imgRatio > cellRatio) {
      dh = ch;
      dw = ch * imgRatio;
    } else {
      dw = cw;
      dh = cw / imgRatio;
    }
  }

  dx = x + (cw - dw) / 2;
  dy = y + (ch - dh) / 2;

  // Clip if cover
  ctx.save();
  if (fit === 'cover') {
    ctx.beginPath();
    ctx.rect(x, y, cw, ch);
    ctx.clip();
  }

  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// Exports
function exportPDF() {
  if(images.length === 0) return;
  
  showToast('Generating PDF...', 'success');
  
  // Use jspdf
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Get image from canvas
  const imgData = previewCanvas.toDataURL('image/jpeg', 0.95);
  
  // A4 size in mm
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  pdf.save('ImageFuse-A4.pdf');
  
  showToast('PDF downloaded successfully!', 'success');
}

function exportImage() {
  if(images.length === 0) return;
  
  const link = document.createElement('a');
  link.download = 'ImageFuse-A4.jpg';
  link.href = previewCanvas.toDataURL('image/jpeg', 0.95);
  link.click();
  
  showToast('Image downloaded successfully!', 'success');
}

// Utilities
let toastTimeout;
function showToast(message, type = 'success') {
  toastEl.textContent = message;
  toastEl.className = 'toast show ' + type;
  
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3000);
}

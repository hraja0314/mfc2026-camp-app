/* QR Scanner module for MFC 2026 */

let scanner = null;
let onScanCallback = null;

function initScanner(elementId, onResult) {
  onScanCallback = onResult;
  scanner = new Html5Qrcode(elementId);
}

async function startScanner() {
  if (!scanner) return;
  try {
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (text) => {
        // Auto-stop after successful scan
        stopScanner().then(() => {
          if (onScanCallback) onScanCallback(text);
        });
      },
      () => {} // ignore errors during scanning
    );
  } catch (err) {
    if (err.toString().includes('Permission')) {
      alert('Camera permission is required for scanning. Please allow camera access and try again.');
    } else {
      console.error('Scanner error:', err);
    }
  }
}

async function stopScanner() {
  if (scanner) {
    try {
      await scanner.stop();
    } catch (e) {
      // already stopped
    }
  }
}

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Generates a multi-page PDF from a DOM element.
 *
 * Adds a `.pdf-mode` class to `document.body` before capture so CSS can:
 *  - reveal the report header
 *  - hide interactive elements (buttons, sidebar)
 *  - force single-column layout for clean printing
 *
 * The captured image is sliced into A4-sized pages with a small margin
 * so charts never get cut in half at page boundaries.
 *
 * @param {string} elementId - The ID of the DOM element to capture.
 * @param {string} filename  - The downloaded PDF filename.
 * @param {(busy: boolean) => void} [onBusy] - Optional callback for loading state.
 */
export const exportToPDF = async (elementId, filename = 'report.pdf', onBusy) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`exportToPDF: element #${elementId} not found`);
    return;
  }

  onBusy?.(true);

  try {
    // ---- 1. Activate PDF print styles ----
    document.body.classList.add('pdf-mode');
    // Give the browser a frame to repaint (reveal header, hide buttons, etc.)
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    // ---- 2. Capture the element at retina resolution ----
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor:
        getComputedStyle(document.documentElement)
          .getPropertyValue('--bg-primary')
          .trim() || '#ffffff',
      // html2canvas needs the element to be scrollable within the viewport;
      // scrollY: -window.scrollY prevents the snapshot from being offset.
      scrollY: -window.scrollY,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    // ---- 3. Remove print styles immediately after capture ----
    document.body.classList.remove('pdf-mode');

    // ---- 4. Build the PDF ----
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Margins (mm)
    const margin = 6;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    // Scale the captured image to fit the usable width
    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * usableWidth) / canvas.width;

    // If the image fits on one page, just place it
    if (imgHeight <= usableHeight) {
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
    } else {
      // Multi-page: slice the canvas into page-sized chunks
      const totalPages = Math.ceil(imgHeight / usableHeight);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        // The y-offset into the full image for this page
        const srcY = (page * usableHeight * canvas.width) / usableWidth;
        // How much vertical canvas to grab for this page
        const srcH = (usableHeight * canvas.width) / usableWidth;

        // Create a temporary canvas for this page's slice
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        // Last page might be shorter
        const remainingH = canvas.height - srcY;
        pageCanvas.height = Math.min(srcH, remainingH);

        const ctx = pageCanvas.getContext('2d');
        ctx.drawImage(
          canvas,
          0, srcY,                         // source x, y
          canvas.width, pageCanvas.height,  // source w, h
          0, 0,                             // dest x, y
          canvas.width, pageCanvas.height,  // dest w, h
        );

        const pageImgData = pageCanvas.toDataURL('image/png');
        const sliceHeight = (pageCanvas.height * usableWidth) / canvas.width;

        pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, sliceHeight);

        // Footer: page number
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184); // --text-tertiary approx
        pdf.text(
          `Page ${page + 1} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 4,
          { align: 'center' },
        );
      }
    }

    pdf.save(filename);
  } catch (error) {
    document.body.classList.remove('pdf-mode');
    console.error('Failed to generate PDF:', error);
    throw error;
  } finally {
    onBusy?.(false);
  }
};

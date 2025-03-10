import { toPng } from 'html-to-image';

export async function captureViewerImage(element: HTMLElement): Promise<string | null> {
  try {
    // For Three.js viewers (STL, STEP, 3MF)
    const canvas = element instanceof HTMLCanvasElement ? 
      element : 
      element.querySelector('canvas');

    if (canvas) {
      // For Three.js canvas, we need to ensure we capture the current frame
      // Wait for next frame to ensure latest render
      await new Promise(resolve => requestAnimationFrame(resolve));
      return canvas.toDataURL('image/png');
    }

    // For PDF viewers or other iframe content
    const iframe = element.querySelector('iframe');
    if (iframe) {
      return captureIframeContent(iframe);
    }

    // For regular HTML elements (like image viewer)
    try {
      const dataUrl = await toPng(element);
      return dataUrl;
    } catch (error) {
      console.error('Error capturing element screenshot:', error);
      return null;
    }
  } catch (error) {
    console.error('Error in captureViewerImage:', error);
    return null;
  }
}

function captureIframeContent(iframe: HTMLIFrameElement): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      // Create a canvas with the same dimensions as the iframe
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        console.error('Could not get 2D context');
        resolve(null);
        return;
      }

      // Set canvas size to iframe size
      canvas.width = iframe.clientWidth * window.devicePixelRatio;
      canvas.height = iframe.clientHeight * window.devicePixelRatio;
      context.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Try to capture iframe content
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        console.error('Could not access iframe document');
        resolve(null);
        return;
      }

      // Convert iframe content to SVG
      const serializer = new XMLSerializer();
      const iframeContent = serializer.serializeToString(iframeDoc);
      const svgBlob = new Blob([iframeContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      // Create an image from the SVG
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0, iframe.clientWidth, iframe.clientHeight);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        console.error('Error loading iframe content as image');
        resolve(null);
      };
      img.src = url;
    } catch (error) {
      console.error('Error capturing iframe content:', error);
      resolve(null);
    }
  });
}
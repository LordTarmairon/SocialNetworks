// Recorte de vídeo a formato vertical 9:16 (estilo reel) en el navegador.
// Reproduce el vídeo una vez dibujando un recorte centrado en un canvas y lo
// graba con MediaRecorder. Conserva el audio si el vídeo lo tiene.

const OUT_W = 720;
const OUT_H = 1280; // 9:16

export function cropVideoToVertical(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.muted = true; // evita oírlo mientras se procesa
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Sin dimensiones de origen no podemos recortar de forma fiable.
      if (!video.videoWidth || !video.videoHeight) {
        cleanup();
        reject(new Error('Sin metadatos de vídeo'));
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = OUT_W;
      canvas.height = OUT_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        reject(new Error('No se pudo procesar el vídeo'));
        return;
      }

      // Recorte centrado tipo "cover" del origen hacia 9:16.
      const sw = video.videoWidth;
      const sh = video.videoHeight;
      const scale = Math.max(OUT_W / sw, OUT_H / sh);
      const dw = sw * scale;
      const dh = sh * scale;
      const dx = (OUT_W - dw) / 2;
      const dy = (OUT_H - dh) / 2;

      const canvasStream = canvas.captureStream(30);
      // Intentar añadir la pista de audio del vídeo.
      try {
        const vs = (
          video as HTMLVideoElement & { captureStream?: () => MediaStream }
        ).captureStream?.();
        vs?.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
      } catch {
        /* sin audio: seguimos solo con vídeo */
      }

      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const rec = new MediaRecorder(canvasStream, { mimeType: mime });
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      rec.onstop = () => {
        cleanup();
        resolve(new Blob(chunks, { type: 'video/webm' }));
      };

      let raf = 0;
      const draw = () => {
        ctx.drawImage(video, dx, dy, dw, dh);
        if (video.duration)
          onProgress?.(Math.min(1, video.currentTime / video.duration));
        raf = requestAnimationFrame(draw);
      };

      video.onended = () => {
        cancelAnimationFrame(raf);
        rec.stop();
      };

      rec.start();
      void video.play().then(draw).catch(() => {
        cancelAnimationFrame(raf);
        cleanup();
        reject(new Error('No se pudo reproducir el vídeo'));
      });
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('No se pudo cargar el vídeo'));
    };

    function cleanup() {
      URL.revokeObjectURL(url);
    }
  });
}

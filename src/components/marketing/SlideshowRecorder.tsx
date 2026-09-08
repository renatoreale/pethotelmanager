import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Play } from "lucide-react";
import type { VideoSlide } from "@/hooks/useMarketingPromo";

// Formato verticale 9:16, standard per TikTok/Reels/Stories.
const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 1280;
const SLIDE_DURATION_MS = 2500;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Impossibile caricare la foto: ${url}`));
    img.src = url;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  const lines: string[] = [];
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}

function drawSlide(ctx: CanvasRenderingContext2D, img: HTMLImageElement, text: string) {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Cover-fit dell'immagine nel canvas (riempie senza deformare).
  const imgRatio = img.width / img.height;
  const canvasRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
  let drawW: number, drawH: number, offsetX: number, offsetY: number;
  if (imgRatio > canvasRatio) {
    drawH = CANVAS_HEIGHT;
    drawW = drawH * imgRatio;
    offsetX = (CANVAS_WIDTH - drawW) / 2;
    offsetY = 0;
  } else {
    drawW = CANVAS_WIDTH;
    drawH = drawW / imgRatio;
    offsetX = 0;
    offsetY = (CANVAS_HEIGHT - drawH) / 2;
  }
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

  // Sfumato in basso per leggibilità del testo sovrapposto.
  const gradient = ctx.createLinearGradient(0, CANVAS_HEIGHT - 320, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, CANVAS_HEIGHT - 320, CANVAS_WIDTH, 320);

  if (text) {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 46px sans-serif";
    ctx.textAlign = "center";
    wrapText(ctx, text, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 160, CANVAS_WIDTH - 100, 56);
  }
}

// Slideshow assemblato interamente lato client (canvas + MediaRecorder):
// nessun servizio esterno di generazione video, nessun costo, nessuna
// attesa. Il file prodotto non ha audio: il titolare aggiunge la musica
// direttamente in TikTok al momento della pubblicazione.
export function SlideshowRecorder({ slides }: { slides: VideoSlide[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"idle" | "recording" | "done" | "error">("idle");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supported = typeof HTMLCanvasElement !== "undefined" && "captureStream" in HTMLCanvasElement.prototype && typeof MediaRecorder !== "undefined";

  const handleRecord = async () => {
    const canvas = canvasRef.current;
    if (!canvas || slides.length === 0) return;
    setStatus("recording");
    setErrorMsg(null);
    if (downloadUrl) { URL.revokeObjectURL(downloadUrl); setDownloadUrl(null); }

    try {
      const images = await Promise.all(slides.map((s) => loadImage(s.photo_url)));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Impossibile inizializzare il canvas");

      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      const finished = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });

      recorder.start();
      for (let i = 0; i < images.length; i++) {
        drawSlide(ctx, images[i], slides[i].overlay_text);
        await new Promise((r) => setTimeout(r, SLIDE_DURATION_MS));
      }
      recorder.stop();
      await finished;

      const blob = new Blob(chunks, { type: mimeType });
      setDownloadUrl(URL.createObjectURL(blob));
      setStatus("done");
    } catch (err: any) {
      setErrorMsg(err.message || "Errore nella registrazione del video");
      setStatus("error");
    }
  };

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">
        Il tuo browser non supporta la registrazione video. Prova con Chrome o Edge aggiornati.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full max-w-[220px] mx-auto rounded-lg border bg-black block" />
      <div className="flex flex-col items-center gap-2">
        <Button onClick={handleRecord} disabled={status === "recording"} size="sm" className="gap-1.5">
          <Play className="h-3.5 w-3.5" />
          {status === "recording" ? "Registrazione in corso..." : "Genera video slideshow"}
        </Button>
        {downloadUrl && (
          <a href={downloadUrl} download="promozione-tiktok.webm">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Scarica video (.webm)
            </Button>
          </a>
        )}
        {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
        <p className="text-[11px] text-muted-foreground text-center max-w-xs">
          Video senza audio: carica il file su TikTok e aggiungi la musica direttamente nell'app.
        </p>
      </div>
    </div>
  );
}

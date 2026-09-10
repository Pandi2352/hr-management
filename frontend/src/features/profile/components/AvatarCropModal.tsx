import { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, RefreshCw, Check, Crop } from 'lucide-react';

interface AvatarCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropSave: (croppedFile: File) => Promise<void> | void;
  isSaving?: boolean;
  /**
   * Width divided by height. 1 is the square portrait crop; a cover photo wants
   * something like 3. The viewport, the guide and the exported file all follow
   * from this, so a caller never has to size anything itself.
   */
  aspect?: number;
  /** The guide drawn over the canvas. Circles only make sense at aspect 1. */
  shape?: 'circle' | 'rect';
  title?: string;
  subtitle?: string;
  /** Exported pixel width. Height follows from `aspect`. */
  exportWidth?: number;
  confirmLabel?: string;
}

export function AvatarCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropSave,
  isSaving = false,
  aspect = 1,
  shape = 'circle',
  title = 'Crop Profile Picture',
  subtitle = 'Drag to reposition · Scroll or use slider to zoom',
  exportWidth = 512,
  confirmLabel = 'Crop & Save',
}: AvatarCropModalProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Visible crop area. Width is fixed; height follows the requested aspect, so
  // a wide cover gets a wide viewport instead of a letterboxed square.
  const VIEW_W = 340;
  const VIEW_H = Math.round(VIEW_W / aspect);

  // Reset transform state when a new image is loaded
  useEffect(() => {
    if (imageSrc) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imgRef.current = img;
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = imageSrc;
    }
  }, [imageSrc]);

  // Render on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imageSize.width || !imageSize.height) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    ctx.save();
    ctx.translate(VIEW_W / 2, VIEW_H / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(position.x, position.y);

    // Cover the viewport, so no transparent edge can appear at zoom 1.
    const baseScale = Math.max(VIEW_W / imageSize.width, VIEW_H / imageSize.height);
    ctx.scale(baseScale * scale, baseScale * scale);

    ctx.drawImage(
      img,
      -imageSize.width / 2,
      -imageSize.height / 2,
      imageSize.width,
      imageSize.height
    );

    ctx.restore();
  }, [imageSize, position, rotation, scale, VIEW_W, VIEW_H]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Mouse Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setScale((prev) => Math.min(Math.max(prev + delta, 1), 3));
  };

  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // Generate the cropped output file
  const handleSaveCrop = () => {
    const img = imgRef.current;
    if (!img) return;

    const exportCanvas = document.createElement('canvas');
    const EXPORT_W = exportWidth;
    const EXPORT_H = Math.round(exportWidth / aspect);
    exportCanvas.width = EXPORT_W;
    exportCanvas.height = EXPORT_H;

    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(EXPORT_W / 2, EXPORT_H / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // The pan was recorded in viewport pixels, so it scales with the export.
    const exportRatio = EXPORT_W / VIEW_W;
    ctx.translate(position.x * exportRatio, position.y * exportRatio);

    const baseScale = Math.max(EXPORT_W / imageSize.width, EXPORT_H / imageSize.height);
    ctx.scale(baseScale * scale, baseScale * scale);

    ctx.drawImage(
      img,
      -imageSize.width / 2,
      -imageSize.height / 2,
      imageSize.width,
      imageSize.height
    );
    ctx.restore();

    exportCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], 'cropped.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        onCropSave(file);
      },
      'image/jpeg',
      0.92
    );
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Crop Canvas Area */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <div
            className="relative rounded-md overflow-hidden bg-slate-950 select-none cursor-grab active:cursor-grabbing border border-slate-200 dark:border-slate-700"
            style={{ width: VIEW_W, height: VIEW_H }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              className="w-full h-full block"
            />

            {/* Crop guide */}
            <div className="absolute inset-0 pointer-events-none">
              {shape === 'circle' ? (
                <div className="w-full h-full rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.55)]" />
              ) : (
                <div className="w-full h-full rounded-md border-2 border-white/80" />
              )}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20 -translate-y-1/2" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20 -translate-x-1/2" />
            </div>
          </div>

          {/* Live previews, in the shapes the image will actually appear in */}
          <div className="flex sm:flex-col items-center gap-4 text-center">
            {shape === 'circle' ? (
              <>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Circle Preview
                  </p>
                  <div className="w-18 h-18 rounded-full overflow-hidden border-2 border-blue-500 bg-slate-100 dark:bg-slate-800 p-0.5">
                    <canvas
                      width={72}
                      height={72}
                      ref={(node) => {
                        if (node && canvasRef.current) {
                          const ctx = node.getContext('2d');
                          if (ctx) {
                            ctx.clearRect(0, 0, 72, 72);
                            ctx.drawImage(canvasRef.current, 0, 0, 72, 72);
                          }
                        }
                      }}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Card Badge
                  </p>
                  <div className="w-14 h-14 rounded-md overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                    <canvas
                      width={56}
                      height={56}
                      ref={(node) => {
                        if (node && canvasRef.current) {
                          const ctx = node.getContext('2d');
                          if (ctx) {
                            ctx.clearRect(0, 0, 56, 56);
                            ctx.drawImage(canvasRef.current, 0, 0, 56, 56);
                          }
                        }
                      }}
                      className="w-full h-full rounded-md object-cover"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Banner Preview
                </p>
                <div className="w-40 overflow-hidden rounded-md border-2 border-blue-500 bg-slate-100 dark:bg-slate-800">
                  <canvas
                    width={160}
                    height={Math.round(160 / aspect)}
                    ref={(node) => {
                      if (node && canvasRef.current) {
                        const ctx = node.getContext('2d');
                        if (ctx) {
                          const h = Math.round(160 / aspect);
                          ctx.clearRect(0, 0, 160, h);
                          ctx.drawImage(canvasRef.current, 0, 0, 160, h);
                        }
                      }
                    }}
                    className="w-full block rounded-md object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            <button
              type="button"
              onClick={() => setScale((prev) => Math.max(prev - 0.15, 1))}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
            />
            <button
              type="button"
              onClick={() => setScale((prev) => Math.min(prev + 0.15, 3))}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="font-mono text-[11px] w-9 text-right font-semibold">
              {Math.round(scale * 100)}%
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRotate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors font-medium cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Rotate 90°
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors font-medium cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>

            <span className="text-[11px] text-slate-400">
              {exportWidth} × {Math.round(exportWidth / aspect)} HD
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveCrop}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 shadow-none cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            {isSaving ? 'Uploading...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

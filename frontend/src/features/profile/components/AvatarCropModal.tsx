import { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, RefreshCw, Check, Crop } from 'lucide-react';

interface AvatarCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropSave: (croppedFile: File) => Promise<void> | void;
  isSaving?: boolean;
}

export function AvatarCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropSave,
  isSaving = false,
}: AvatarCropModalProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Viewport size in pixels (the visible square crop area)
  const VIEWPORT_SIZE = 320;

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

    // Set canvas dimensions
    canvas.width = VIEWPORT_SIZE;
    canvas.height = VIEWPORT_SIZE;

    // Clear
    ctx.clearRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);

    // Save state
    ctx.save();

    // Center origin
    ctx.translate(VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply user pan
    ctx.translate(position.x, position.y);

    // Calculate base fit (cover the square viewport)
    const baseScale = Math.max(
      VIEWPORT_SIZE / imageSize.width,
      VIEWPORT_SIZE / imageSize.height
    );
    const finalScale = baseScale * scale;

    ctx.scale(finalScale, finalScale);

    // Draw image centered
    ctx.drawImage(
      img,
      -imageSize.width / 2,
      -imageSize.height / 2,
      imageSize.width,
      imageSize.height
    );

    ctx.restore();
  }, [imageSize, position, rotation, scale]);

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
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

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
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel to zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setScale((prev) => Math.min(Math.max(prev + delta, 1), 3));
  };

  // Rotate 90deg clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset position and scale
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // Generate cropped output file at 512x512
  const handleSaveCrop = () => {
    const img = imgRef.current;
    if (!img) return;

    const exportCanvas = document.createElement('canvas');
    const EXPORT_SIZE = 512;
    exportCanvas.width = EXPORT_SIZE;
    exportCanvas.height = EXPORT_SIZE;

    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(EXPORT_SIZE / 2, EXPORT_SIZE / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Scale ratio from viewport to export
    const exportRatio = EXPORT_SIZE / VIEWPORT_SIZE;
    ctx.translate(position.x * exportRatio, position.y * exportRatio);

    const baseScale = Math.max(
      EXPORT_SIZE / imageSize.width,
      EXPORT_SIZE / imageSize.height
    );
    const finalScale = baseScale * scale;
    ctx.scale(finalScale, finalScale);

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
        const file = new File([blob], 'avatar-cropped.jpg', {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Crop Profile Picture
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Drag to reposition · Scroll or use slider to zoom
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Crop Canvas Area */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <div className="relative w-[320px] h-[320px] rounded-md overflow-hidden bg-slate-950 select-none cursor-grab active:cursor-grabbing border border-slate-200 dark:border-slate-700">
            {/* The active canvas rendering the image */}
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

            {/* Circular Crop Guide Mask Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Outer dimmed shade outside circle */}
              <div className="w-full h-full rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.55)]" />
              {/* Center crosshair */}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20 -translate-y-1/2" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20 -translate-x-1/2" />
            </div>
          </div>

          {/* Live Previews Column */}
          <div className="flex sm:flex-col items-center gap-4 text-center">
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
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="space-y-3 pt-2">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            <button
              type="button"
              onClick={() => setScale((prev) => Math.max(prev - 0.15, 1))}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
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
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="font-mono text-[11px] w-9 text-right font-semibold">
              {Math.round(scale * 100)}%
            </span>
          </div>

          {/* Additional tools: Rotate & Reset */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRotate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors font-medium"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Rotate 90°
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>

            <span className="text-[11px] text-slate-400">512 × 512 HD</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50"
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
            {isSaving ? 'Uploading...' : 'Crop & Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

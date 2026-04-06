"use client";

import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Trash2, X, VideoOff } from "lucide-react";

const CAPTURE_JPEG_QUALITY = 0.92;
const MAX_DIMENSION = 1920;

export type CameraPhotoInputRef = {
  open: () => void;
  close: () => void;
};

export type CameraPhotoInputProps = {
  /** Current preview URL (existing image or object URL from capture) */
  previewUrl: string | null;
  /** Callback when user captures a photo or removes it */
  onCapture: (file: File | null) => void;
  /** Label above the control */
  label?: string;
  /** Whether a photo is required (e.g. show asterisk) */
  required?: boolean;
  /** Hint text under label */
  hint?: string;
  /** When true, show "Current image" for existing server image (no file) */
  hasExistingImage?: boolean;
  /** Optional class for the container */
  className?: string;
  /** Aspect ratio for preview area: "square" | "video" */
  aspectRatio?: "square" | "video";
  /** When provided, clicking the preview image calls this with the preview URL (e.g. open full screen viewer) */
  onPreviewClick?: (url: string) => void;
  /** When true, hides the default trigger button/preview area */
  hideDefaultTrigger?: boolean;
};

export const CameraPhotoInput = forwardRef<CameraPhotoInputRef, CameraPhotoInputProps>(({
  previewUrl,
  onCapture,
  label = "Photo",
  required = false,
  hint,
  hasExistingImage = false,
  className = "",
  aspectRatio = "square",
  onPreviewClick,
  hideDefaultTrigger = false,
}, ref) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isModalOpenRef = useRef(isModalOpen);
  isModalOpenRef.current = isModalOpen;

  useImperativeHandle(ref, () => ({
    open: openModal,
    close: closeModal,
  }));

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const openModal = useCallback(() => {
    setCameraError(null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    stopStream();
    setIsModalOpen(false);
    setIsLoading(false);
    setCameraError(null);
  }, [stopStream]);

  const handleCloseRequest = useCallback(() => {
    if (isLoading) return;
    closeModal();
  }, [isLoading, closeModal]);

  useEffect(() => {
    if (!isModalOpen) return;
    setIsLoading(true);
    const video = videoRef.current;
    if (!video) {
      setIsLoading(false);
      return;
    }
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: "environment",
        width: { ideal: MAX_DIMENSION },
        height: { ideal: MAX_DIMENSION },
      },
      audio: false,
    };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        if (!isModalOpenRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        video.play().catch(() => { });
        setIsLoading(false);
      })
      .catch((err) => {
        setIsLoading(false);
        const msg =
          err.name === "NotAllowedError"
            ? "Camera access was denied. Please allow camera and try again."
            : err.name === "NotFoundError"
              ? "No camera found. Please connect a camera and try again."
              : "Could not access camera. Please check permissions and try again.";
        setCameraError(msg);
      });
    return () => {
      stopStream();
    };
  }, [isModalOpen, stopStream]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current || video.readyState < 2) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) return;
    let drawW = w;
    let drawH = h;
    if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
      if (w > h) {
        drawW = MAX_DIMENSION;
        drawH = Math.round((h * MAX_DIMENSION) / w);
      } else {
        drawH = MAX_DIMENSION;
        drawW = Math.round((w * MAX_DIMENSION) / h);
      }
    }
    canvas.width = drawW;
    canvas.height = drawH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, drawW, drawH);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onCapture(file);
        closeModal();
      },
      "image/jpeg",
      CAPTURE_JPEG_QUALITY,
    );
  }, [onCapture, closeModal]);

  const handleRemove = useCallback(() => {
    onCapture(null);
  }, [onCapture]);

  const aspectClass =
    aspectRatio === "video"
      ? "aspect-video max-h-48"
      : "aspect-square max-h-[220px]";

  if (hideDefaultTrigger) {
    return (
      <>
        <canvas ref={canvasRef} className="hidden" />
        <Dialog
          isOpen={isModalOpen}
          onClose={handleCloseRequest}
          title="Take Photo"
          size="xl"
          overlayClassName="z-[1100]"
          closeOnBackdropClick={false}
          closeButtonDisabled={isLoading}
        >
          <div className="space-y-4">
            <p className="text-sm text-secondary-600">
              Position the item in frame, then click Capture.
            </p>
            <div className="relative rounded-xl overflow-hidden bg-black min-h-[300px] flex items-center justify-center">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-secondary-900/80 z-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent" />
                  <span className="sr-only">Starting camera…</span>
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-secondary-900/95 text-white p-4 z-10">
                  <VideoOff className="w-12 h-12 text-red-300" />
                  <p className="text-sm text-center max-w-sm">{cameraError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCameraError(null);
                      setIsLoading(true);
                      navigator.mediaDevices
                        .getUserMedia({ video: true, audio: false })
                        .then((stream) => {
                          if (!isModalOpenRef.current) {
                            stream.getTracks().forEach((t) => t.stop());
                            return;
                          }
                          streamRef.current = stream;
                          if (videoRef.current) {
                            videoRef.current.srcObject = stream;
                            videoRef.current.play().catch(() => { });
                          }
                          setIsLoading(false);
                        })
                        .catch((err) => {
                          setIsLoading(false);
                          setCameraError(
                            err.name === "NotAllowedError"
                              ? "Camera access was denied."
                              : "Could not access camera.",
                          );
                        });
                    }}
                    className="border-white/50 text-white hover:bg-white/10"
                  >
                    Try again
                  </Button>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-[70vh] object-contain"
                style={{ display: cameraError || isLoading ? "none" : "block" }}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseRequest}
                disabled={isLoading}
                title={isLoading ? "Please wait for camera to load" : undefined}
              >
                <X className="w-4 h-4 mr-1.5" />
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCapture}
                disabled={!!cameraError || isLoading}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                <Camera className="w-4 h-4 mr-1.5" />
                Capture
              </Button>
            </div>
          </div>
        </Dialog>
      </>
    );
  }

  return (
    <div className={className}>
      {label && (
        <div className="mb-1.5">
          <span className="text-sm font-semibold text-text">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </span>
          {hint && <p className="text-xs text-secondary-500 mt-0.5">{hint}</p>}
        </div>
      )}

      {previewUrl ? (
        <div className="flex flex-col w-full h-full gap-2">
          <div
            className={`relative rounded-lg overflow-hidden border border-secondary-200 bg-secondary-100 flex-1 min-h-0 ${onPreviewClick ? "cursor-pointer hover:ring-2 hover:ring-primary-500 hover:ring-offset-1 transition-shadow" : ""}`}
            role={onPreviewClick ? "button" : undefined}
            onClick={() => onPreviewClick?.(previewUrl)}
            title={onPreviewClick ? "View full screen" : undefined}
            tabIndex={onPreviewClick ? 0 : undefined}
            onKeyDown={onPreviewClick ? (e) => e.key === "Enter" && onPreviewClick(previewUrl) : undefined}
          >
            {/* Background Blur */}
            <div
              className="absolute inset-0 bg-cover bg-center blur-xl opacity-20 scale-110"
              style={{ backgroundImage: `url(${previewUrl})` }}
            />

            <img
              src={previewUrl}
              alt="Captured preview"
              className="relative w-full h-full object-contain pointer-events-none z-10"
            />

            {/* View prompt overlay */}
            {onPreviewClick && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex justify-center z-20">
                <span className="text-[10px] text-white font-medium uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">Full Screen</span>
              </div>
            )}
          </div>

          {/* Controls row - now more prominent */}
          <div className="flex gap-2 shrink-0 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); openModal(); }}
              className="flex-1 h-9 text-[11px] font-bold bg-primary-50 text-primary-700 hover:bg-primary-100 border-primary-100 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Replace Photo
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleRemove(); }}
              className="h-9 px-4 text-[11px] font-bold shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openModal}
          className="w-full h-full rounded-xl border-2 border-dashed border-secondary-300 bg-secondary-50 hover:bg-secondary-100 hover:border-primary-400 transition-all flex flex-col items-center justify-center gap-2 text-secondary-500 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 py-4 group"
          aria-label="Take photo with camera"
        >
          <div className="rounded-full bg-secondary-100 p-3 group-hover:scale-110 group-hover:bg-primary-50 transition-all duration-300 ring-1 ring-secondary-200 group-hover:ring-primary-200">
            <Camera className="w-6 h-6 text-secondary-500 group-hover:text-primary-600" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide">Tap to Capture</span>
        </button>
      )}

      <canvas ref={canvasRef} className="hidden" />

      <Dialog
        isOpen={isModalOpen}
        onClose={handleCloseRequest}
        title="Take Photo"
        size="xl"
        overlayClassName="z-[1100]"
        closeOnBackdropClick={false}
        closeButtonDisabled={isLoading}
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary-600">
            Position the item in frame, then click Capture.
          </p>
          <div className="relative rounded-xl overflow-hidden bg-black min-h-[300px] flex items-center justify-center">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary-900/80 z-10">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent" />
                <span className="sr-only">Starting camera…</span>
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-secondary-900/95 text-white p-4 z-10">
                <VideoOff className="w-12 h-12 text-red-300" />
                <p className="text-sm text-center max-w-sm">{cameraError}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCameraError(null);
                    setIsLoading(true);
                    navigator.mediaDevices
                      .getUserMedia({ video: true, audio: false })
                      .then((stream) => {
                        if (!isModalOpenRef.current) {
                          stream.getTracks().forEach((t) => t.stop());
                          return;
                        }
                        streamRef.current = stream;
                        if (videoRef.current) {
                          videoRef.current.srcObject = stream;
                          videoRef.current.play().catch(() => { });
                        }
                        setIsLoading(false);
                      })
                      .catch((err) => {
                        setIsLoading(false);
                        setCameraError(
                          err.name === "NotAllowedError"
                            ? "Camera access was denied."
                            : "Could not access camera.",
                        );
                      });
                  }}
                  className="border-white/50 text-white hover:bg-white/10"
                >
                  Try again
                </Button>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-[70vh] object-contain"
              style={{ display: cameraError || isLoading ? "none" : "block" }}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseRequest}
              disabled={isLoading}
              title={isLoading ? "Please wait for camera to load" : undefined}
            >
              <X className="w-4 h-4 mr-1.5" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCapture}
              disabled={!!cameraError || isLoading}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              <Camera className="w-4 h-4 mr-1.5" />
              Capture
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
});

CameraPhotoInput.displayName = "CameraPhotoInput";

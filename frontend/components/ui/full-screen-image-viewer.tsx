"use client";

import { useEffect, useRef } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { registerDialog } from "@/lib/dialog-stack";

export interface FullScreenImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  alt?: string;
  /** When true, do not register with dialog stack (use when parent already handles Esc, e.g. QuotationViewerModal) */
  skipDialogStack?: boolean;
  /** When true, disable Lightbox's scroll lock (use when already inside a scroll-locking Dialog to avoid double-lock/cleanup issues) */
  disableNoScroll?: boolean;
}

export function FullScreenImageViewer({
  isOpen,
  onClose,
  imageSrc,
  alt = "Image",
  skipDialogStack = false,
  disableNoScroll = false,
}: FullScreenImageViewerProps) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (isOpen && !skipDialogStack) {
      return registerDialog(() => onCloseRef.current());
    }
  }, [isOpen, skipDialogStack]);

  if (!imageSrc) return null;

  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      slides={[{ src: imageSrc, alt }]}
      plugins={[Zoom]}
      noScroll={disableNoScroll ? { disabled: true } : undefined}
      animation={{ fade: 300, swipe: 200 }}
      zoom={{
        maxZoomPixelRatio: 3,
        zoomInMultiplier: 2,
        doubleTapDelay: 300,
        doubleClickDelay: 300,
        doubleClickMaxStops: 2,
        keyboardMoveDistance: 50,
        wheelZoomDistanceFactor: 100,
        pinchZoomDistanceFactor: 100,
        scrollToZoom: true,
      }}
      controller={{
        closeOnBackdropClick: false,
        closeOnPullUp: false,
        closeOnPullDown: false,
      }}
      styles={{
        container: { backgroundColor: "rgba(0, 0, 0, 0.95)" },
        root: { backdropFilter: "blur(4px)" },
      }}
      render={{
        buttonPrev: () => null,
        buttonNext: () => null,
      }}
    />
  );
}

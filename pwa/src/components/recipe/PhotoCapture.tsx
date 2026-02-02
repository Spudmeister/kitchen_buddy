/**
 * Photo Capture/Upload Component
 *
 * Provides camera capture and gallery selection for recipe photos.
 * Supports JPEG, PNG, HEIC, HEIF formats.
 *
 * Requirements: 7.2, 7.3
 */

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { v4 as uuidv4 } from 'uuid';
import { photoStorage } from '../../db/photo-storage';
import {
  PHOTO_ACCEPT,
  isSupportedFormat,
  type Photo,
  type PhotoInput,
  type SupportedImageFormat,
} from '../../types/photo';
import { PhotoIcon, XMarkIcon } from '../icons';

/**
 * Camera icon component
 */
function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
      />
    </svg>
  );
}

/**
 * Props for PhotoCapture
 */
export interface PhotoCaptureProps {
  /** Recipe ID to associate photos with */
  recipeId: string;
  /** Optional instance ID for cook session */
  instanceId?: string;
  /** Callback when a photo is captured/uploaded */
  onPhotoAdded: (photo: Photo) => void;
  /** Optional class name */
  className?: string;
}

/**
 * Props for PhotoCaptureModal
 */
interface PhotoCaptureModalProps {
  recipeId: string;
  instanceId?: string;
  onPhotoAdded: (photo: Photo) => void;
  onClose: () => void;
}

/**
 * Get image dimensions from a blob
 */
async function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

/**
 * Process and save a photo
 */
async function processAndSavePhoto(input: PhotoInput): Promise<Photo> {
  const id = uuidv4();

  // Get dimensions if not provided
  let { width, height } = input;
  if (!width || !height) {
    try {
      const dims = await getImageDimensions(input.data);
      width = dims.width;
      height = dims.height;
    } catch {
      // Dimensions are optional, continue without them
    }
  }

  // Save to IndexedDB
  await photoStorage.savePhoto(id, input.data);

  // Create photo record
  const photo: Photo = {
    id,
    recipeId: input.recipeId,
    instanceId: input.instanceId,
    filename: input.filename,
    mimeType: input.mimeType,
    width,
    height,
    takenAt: input.takenAt,
    metadata: input.metadata || {},
    createdAt: new Date(),
  };

  return photo;
}


/**
 * Photo capture modal with camera and gallery options
 */
function PhotoCaptureModal({
  recipeId,
  instanceId,
  onPhotoAdded,
  onClose,
}: PhotoCaptureModalProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera capture
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsCapturing(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setIsCapturing(false);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera access in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError('Failed to access camera. Please try uploading a photo instead.');
        }
      }
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  // Capture photo from camera
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      setProcessing(true);
      setError(null);

      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      ctx.drawImage(video, 0, 0);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to create image'));
          },
          'image/jpeg',
          0.9
        );
      });

      // Process and save
      const photo = await processAndSavePhoto({
        data: blob,
        filename: `photo-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        recipeId,
        instanceId,
        takenAt: new Date(),
        width: canvas.width,
        height: canvas.height,
      });

      stopCamera();
      onPhotoAdded(photo);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture photo');
    } finally {
      setProcessing(false);
    }
  }, [recipeId, instanceId, onPhotoAdded, onClose, stopCamera]);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        setProcessing(true);
        setError(null);

        // Validate format
        let mimeType = file.type as SupportedImageFormat;

        // Handle HEIC/HEIF which may not have correct MIME type
        if (!mimeType || !isSupportedFormat(mimeType)) {
          const ext = file.name.toLowerCase().split('.').pop();
          if (ext === 'heic') mimeType = 'image/heic';
          else if (ext === 'heif') mimeType = 'image/heif';
          else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
          else if (ext === 'png') mimeType = 'image/png';
        }

        if (!isSupportedFormat(mimeType)) {
          setError('Unsupported image format. Please use JPEG, PNG, HEIC, or HEIF.');
          return;
        }

        // Process and save
        const photo = await processAndSavePhoto({
          data: file,
          filename: file.name,
          mimeType,
          recipeId,
          instanceId,
          takenAt: file.lastModified ? new Date(file.lastModified) : undefined,
        });

        onPhotoAdded(photo);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload photo');
      } finally {
        setProcessing(false);
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [recipeId, instanceId, onPhotoAdded, onClose]
  );

  // Cleanup on unmount
  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Add photo"
    >
      <div className="w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isCapturing ? 'Take Photo' : 'Add Photo'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {isCapturing ? (
            // Camera view
            <div className="space-y-4">
              <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={stopCamera}
                  className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={capturePhoto}
                  disabled={processing}
                  className="flex-1 py-2.5 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {processing ? 'Saving...' : 'Capture'}
                </button>
              </div>
            </div>
          ) : (
            // Option buttons
            <div className="space-y-3">
              <button
                onClick={startCamera}
                disabled={processing}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <CameraIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">Take Photo</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Use your camera to capture a photo
                  </div>
                </div>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <PhotoIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">Choose from Gallery</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Select a photo from your device
                  </div>
                </div>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept={PHOTO_ACCEPT}
                onChange={handleFileSelect}
                className="hidden"
              />

              {processing && (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-primary-500" />
                  <span className="ml-2 text-sm text-gray-500">Processing...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}


/**
 * Photo Capture Button Component
 *
 * A button that opens the photo capture modal.
 */
export function PhotoCapture({
  recipeId,
  instanceId,
  onPhotoAdded,
  className = '',
}: PhotoCaptureProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handlePhotoAdded = useCallback(
    (photo: Photo) => {
      onPhotoAdded(photo);
    },
    [onPhotoAdded]
  );

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors ${className}`}
        aria-label="Add photo"
      >
        <CameraIcon className="w-5 h-5" />
        <span>Add Photo</span>
      </button>

      {modalOpen && (
        <PhotoCaptureModal
          recipeId={recipeId}
          instanceId={instanceId}
          onPhotoAdded={handlePhotoAdded}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

/**
 * Compact photo capture button (icon only)
 */
export function PhotoCaptureButton({
  recipeId,
  instanceId,
  onPhotoAdded,
  className = '',
}: PhotoCaptureProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
        aria-label="Add photo"
      >
        <CameraIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
      </button>

      {modalOpen && (
        <PhotoCaptureModal
          recipeId={recipeId}
          instanceId={instanceId}
          onPhotoAdded={onPhotoAdded}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

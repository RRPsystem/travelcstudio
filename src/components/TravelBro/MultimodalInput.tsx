import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';

interface MultimodalInputProps {
  onImageCapture: (base64: string) => void;
  onImageRemove: () => void;
  selectedImage: string | null;
  disabled?: boolean;
}

export function MultimodalInput({
  onImageCapture,
  onImageRemove,
  selectedImage,
  disabled = false,
}: MultimodalInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Afbeelding is te groot. Maximum 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onImageCapture(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center space-x-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {selectedImage ? (
        <div className="relative">
          <img
            src={selectedImage}
            alt="Selected"
            className="w-16 h-16 object-cover rounded-lg border-2 border-orange-500"
          />
          <button
            onClick={onImageRemove}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
            type="button"
            disabled={disabled}
            title="Neem foto"
          >
            <Camera className="w-5 h-5" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
            type="button"
            disabled={disabled}
            title="Upload foto"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
}

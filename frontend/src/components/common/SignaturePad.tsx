import React, { useRef, useState } from 'react';
import Modal from './Modal';
import SignatureCanvas from 'react-signature-canvas';

interface SignaturePadProps {
  open: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
}

export default function SignaturePad({ open, onClose, onSave }: SignaturePadProps) {
  const sigCanvas = useRef<any>(null);
  const [error, setError] = useState('');

  const handleClear = () => {
    sigCanvas.current?.clear();
    setError('');
  };

  const handleSave = () => {
    if (sigCanvas.current?.isEmpty()) {
      setError('Please provide a signature first.');
      return;
    }
    const dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
    if (dataUrl) {
      onSave(dataUrl);
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Digital Signature">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Draw your signature in the box below.
        </p>
        <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-1">
          <SignatureCanvas
            ref={sigCanvas}
            penColor="black"
            canvasProps={{
              className: 'w-full h-48 cursor-crosshair rounded-md',
              style: { backgroundColor: '#ffffff' }
            }}
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={handleClear} className="btn-secondary">
            Clear
          </button>
          <div className="flex-1"></div>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="btn-primary">
            Save Signature
          </button>
        </div>
      </div>
    </Modal>
  );
}

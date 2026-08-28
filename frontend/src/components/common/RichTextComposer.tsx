import React, { useState, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import SignaturePad from './SignaturePad';

interface RichTextComposerProps {
  value: string;
  onChange: (value: string) => void;
  onAttachmentChange: (file: File | null) => void;
  driveLink: string;
  onDriveLinkChange: (link: string) => void;
  isConfidential: boolean;
  onConfidentialChange: (isConfidential: boolean) => void;
  signature?: string;
  onSignatureChange: (signature: string) => void;
}

export default function RichTextComposer({
  value,
  onChange,
  onAttachmentChange,
  driveLink,
  onDriveLinkChange,
  isConfidential,
  onConfidentialChange,
  signature,
  onSignatureChange,
}: RichTextComposerProps) {
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAttachmentChange(e.target.files[0]);
    } else {
      onAttachmentChange(null);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDrivePrompt = () => {
    const link = prompt('Enter Google Drive Link:', driveLink);
    if (link !== null) {
      onDriveLinkChange(link);
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg flex flex-col bg-white relative">
      {/* Custom Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-gray-200 bg-gray-50 flex-wrap">
        <button
          type="button"
          onClick={triggerFileUpload}
          className="p-1.5 text-gray-600  rounded tooltip"
          title="Attach File"
        >
          📎
        </button>
        <button
          type="button"
          onClick={handleDrivePrompt}
          className={`p-1.5 rounded tooltip ${driveLink ? 'bg-blue-100 text-blue-600' : 'text-gray-600 '}`}
          title="Google Drive Link"
        >
          △
        </button>
        <button
          type="button"
          onClick={() => onConfidentialChange(!isConfidential)}
          className={`p-1.5 rounded tooltip ${isConfidential ? 'bg-red-100 text-red-600' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Lock / Confidential Mode"
        >
          🔒
        </button>
        <button
          type="button"
          onClick={() => setShowSignaturePad(true)}
          className={`p-1.5 rounded tooltip ${signature ? 'bg-emerald-100 text-emerald-600' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Digital Signature"
        >
          ✍️
        </button>
      </div>

      {/* Hidden inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
      />

      {/* Main Text Editor */}
      <div className="quill-container">
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          className="h-32 mb-10"
          placeholder="Write your reason here..."
          modules={{
            toolbar: [
              ['bold', 'italic', 'underline', 'strike'],
              ['link', 'image'],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
              ['clean']
            ]
          }}
        />
      </div>

      {/* Status indicators for advanced options */}
      <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-200 flex gap-4">
        {isConfidential && <span className="text-red-600 font-medium flex items-center">🔒 Confidential Mode Active</span>}
        {driveLink && <span className="text-blue-600 flex items-center">△ Drive Link Attached</span>}
        {signature && <span className="text-emerald-600 flex items-center">✍️ Signature Captured</span>}
      </div>

      <SignaturePad
        open={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={onSignatureChange}
      />
    </div>
  );
}

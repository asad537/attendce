import React, { useState, useRef, useCallback, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import SignaturePad from './SignaturePad';
import { promptDialog } from './ConfirmDialog';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface RichTextComposerProps {
  value: string;
  onChange: (value: string) => void;
  onAttachmentChange?: (file: File | null) => void;
  driveLink?: string;
  onDriveLinkChange?: (link: string) => void;
  isConfidential?: boolean;
  onConfidentialChange?: (isConfidential: boolean) => void;
  signature?: string;
  onSignatureChange?: (signature: string) => void;
  placeholder?: string;
  hideAdvancedOptions?: boolean;
  readOnly?: boolean;
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
  placeholder = "Write your reason here...",
  hideAdvancedOptions = false,
  readOnly = false,
}: RichTextComposerProps) {
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quillRef = useRef<ReactQuill>(null);

  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*,application/pdf');
    input.style.display = 'none';
    document.body.appendChild(input);
    
    input.click();

    input.onchange = async () => {
      document.body.removeChild(input);
      const file = input.files ? input.files[0] : null;
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const loadingToast = toast.loading('Uploading...');

      try {
        const res = await api.post('/upload/file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const { url, type, filename } = res.data;

        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection(true);
          if (type === 'image') {
            quill.insertEmbed(range.index, 'image', url);
          } else {
            quill.insertText(range.index, filename, 'link', url);
          }
          quill.setSelection(range.index + filename.length);
        }
        toast.success('Uploaded successfully', { id: loadingToast });
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Upload failed', { id: loadingToast });
      }
    };
  }, []);

  const modules = useMemo(() => {
    if (readOnly) return { toolbar: false };
    return {
      toolbar: {
        container: [
          ['bold', 'italic', 'underline', 'strike'],
          ['link', 'image'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['clean']
        ],
        handlers: {
          image: imageHandler
        }
      }
    };
  }, [readOnly, imageHandler]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAttachmentChange?.(e.target.files[0]);
    } else {
      onAttachmentChange?.(null);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDrivePrompt = async () => {
    const link = await promptDialog({ title: 'Attach Google Drive link', message: 'Paste a shareable Google Drive link.', defaultValue: driveLink, placeholder: 'https://drive.google.com/...', confirmText: 'Attach' });
    if (link !== null) {
      onDriveLinkChange?.(link);
    }
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'img') {
      const src = (target as HTMLImageElement).src;
      if (src) setPreviewImage(src);
    }
  };

  return (
    <div className={`border rounded-lg flex flex-col bg-white relative ${readOnly ? 'border-transparent' : 'border-gray-300'}`}>
      <style>{`
        .quill-container img {
          max-height: 200px;
          width: auto;
          cursor: zoom-in;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
          margin: 0.5rem 0;
          transition: transform 0.2s;
        }
        .quill-container img:hover {
          transform: scale(1.02);
        }
      `}</style>

      {/* Custom Toolbar */}
      {!hideAdvancedOptions && !readOnly && (
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
          onClick={() => onConfidentialChange?.(!isConfidential)}
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
      )}

      {/* Hidden inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
      />

      {/* Main Text Editor */}
      <div className="quill-container" onClick={handleContainerClick}>
        <ReactQuill
          ref={quillRef}
          readOnly={readOnly}
          theme={readOnly ? "bubble" : "snow"}
          value={value}
          onChange={(val) => {
            if (val.includes('src="data:image/')) {
              toast.error('Please use the Image button in the toolbar to upload pictures. Pasting images directly is not supported.');
              val = val.replace(/<img[^>]*src="data:image\/[^>]*>/gi, '');
            }
            onChange(val);
          }}
          className="h-32 mb-10"
          placeholder={placeholder}
          modules={modules}
        />
      </div>

      {/* Status indicators for advanced options */}
      {!hideAdvancedOptions && (isConfidential || driveLink || signature) && (
      <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-200 flex gap-4">
        {isConfidential && <span className="text-red-600 font-medium flex items-center">🔒 Confidential Mode Active</span>}
        {driveLink && <span className="text-blue-600 flex items-center">△ Drive Link Attached</span>}
        {signature && <span className="text-emerald-600 flex items-center">✍️ Signature Captured</span>}
      </div>
      )}

      <SignaturePad
        open={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={(sig) => onSignatureChange?.(sig)}
      />

      {/* Fullscreen Image Preview */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-opacity"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <button 
              className="absolute -top-12 right-0 text-white text-4xl hover:text-gray-300 transition-colors"
              onClick={() => setPreviewImage(null)}
            >
              &times;
            </button>
            <img 
              src={previewImage} 
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain cursor-zoom-out" 
              alt="Preview" 
              onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

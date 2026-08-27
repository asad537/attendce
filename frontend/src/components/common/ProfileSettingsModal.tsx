import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { documentService, UserDocument } from '../../services/documentService';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSettingsModal({ isOpen, onClose }: Props) {
  const { user, refreshUser, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'education' | 'security' | 'documents'>('education');
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatar_url || null
  );
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Education state
  const [educationList, setEducationList] = useState<Array<{degree: string, institution: string, year: string, field: string}>>(
    user?.education || []
  );

  // Documents state
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('resume');
  const [uploadDocFile, setUploadDocFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchDocuments();
    }
  }, [isOpen, user?.id]);

  const fetchDocuments = async () => {
    if (!user) return;
    try {
      const data = await documentService.getDocuments(user.id);
      setDocuments(data);
    } catch (error) {
      console.error('Failed to fetch documents', error);
    }
  };

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !uploadDocFile) return;

    setDocLoading(true);
    try {
      await documentService.uploadDocument(user.id, uploadDocType, uploadDocFile);
      toast.success('Document uploaded successfully');
      setUploadDocFile(null);
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setDocLoading(false);
    }
  };

  const handleDocumentDelete = async (docId: number) => {
    try {
      await documentService.deleteDocument(docId);
      toast.success('Document deleted');
      fetchDocuments();
    } catch (err: any) {
      toast.error('Failed to delete document');
    }
  };

  const handleDocumentDownload = async (doc: UserDocument) => {
    try {
      await documentService.downloadDocument(doc.id, doc.name);
    } catch (err) {
      toast.error('Failed to download document');
    }
  };

  if (!isOpen) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const addEducation = () => {
    setEducationList([...educationList, { degree: '', institution: '', year: '', field: '' }]);
  };

  const updateEducation = (index: number, field: string, value: string) => {
    const updated = [...educationList];
    updated[index] = { ...updated[index], [field]: value };
    setEducationList(updated);
  };

  const removeEducation = (index: number) => {
    setEducationList(educationList.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (avatar) formData.append('avatar', avatar);
      if (newPassword) {
        formData.append('current_password', currentPassword);
        formData.append('new_password', newPassword);
        formData.append('new_password_confirmation', confirmPassword);
      }

      // Add education as JSON string
      formData.append('education', JSON.stringify(educationList));

      await authService.updateProfile(formData);
      
      if (newPassword) {
        toast.success('Profile updated. Password changed successfully. Please log in again.');
        await logout();
      } else {
        toast.success('Profile updated successfully');
        await refreshUser();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden transform transition-all duration-300 scale-100 opacity-100 ring-1 ring-gray-900/5 max-h-[90vh] flex flex-col">
        
        {/* Header styling with a subtle gradient background */}
        <div className="relative px-8 pt-8 pb-4 bg-gradient-to-b from-emerald-50/50 to-white shrink-0">
          <div className="absolute top-4 right-4">
            <button 
              onClick={onClose} 
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex flex-col items-center">
            {/* Elegant Avatar Section */}
            <div className="relative group mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-emerald-100 shadow-md ring-4 ring-white">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold text-3xl shadow-inner">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>
              <label className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/60 text-white opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-all duration-200 backdrop-blur-[2px]">
                <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[10px] font-medium tracking-wide uppercase">Change</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-sm font-medium text-emerald-600">{user?.employee_id || 'Employee'}</p>
          </div>

          <div className="flex justify-center gap-4 mt-6 border-b border-gray-100">
            <button
              type="button"
              onClick={() => setActiveTab('education')}
              className={`pb-2 px-2 text-sm font-semibold transition-colors ${activeTab === 'education' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Educational Background
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`pb-2 px-2 text-sm font-semibold transition-colors ${activeTab === 'security' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Security Settings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`pb-2 px-2 text-sm font-semibold transition-colors ${activeTab === 'documents' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Documents
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 pt-6 overflow-y-auto min-h-[300px]">
          
          {/* Educational Background Tab */}
          {activeTab === 'education' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Your Education</h3>
                </div>
                <button type="button" onClick={addEducation} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800">
                  + Add Entry
                </button>
              </div>
              
              {educationList.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                  <p className="text-sm text-gray-500">No educational background added yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {educationList.map((edu, idx) => (
                    <div key={idx} className="relative p-4 rounded-xl border border-gray-100 bg-gray-50/50 shadow-sm space-y-3">
                      <button type="button" onClick={() => removeEducation(idx)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                      
                      <div className="grid grid-cols-2 gap-3 pr-6">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Degree</label>
                          <input
                            type="text"
                            value={edu.degree}
                            onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            placeholder="e.g. BS Computer Science"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Institution</label>
                          <input
                            type="text"
                            value={edu.institution}
                            onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            placeholder="e.g. MIT"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Field of Study</label>
                          <input
                            type="text"
                            value={edu.field}
                            onChange={(e) => updateEducation(idx, 'field', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            placeholder="e.g. Software Engineering"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Graduation Year</label>
                          <input
                            type="text"
                            value={edu.year}
                            onChange={(e) => updateEducation(idx, 'year', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            placeholder="e.g. 2023"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Security Options</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 transition-all duration-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-gray-400"
                      placeholder="Enter current password to change"
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
                      {showCurrent ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 015.058-5.058m1.414-1.414A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-1.57 3.393m-1.414 1.414L3 3l18 18" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.88 9.88a3 3 0 104.24 4.24" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 mb-1.5">New Password</label>
                    <div className="relative">
                      <input
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 transition-all duration-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-gray-400"
                        placeholder="Min 8 chars"
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
                        {showNew ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 015.058-5.058m1.414-1.414A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-1.57 3.393m-1.414 1.414L3 3l18 18" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.88 9.88a3 3 0 104.24 4.24" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={!newPassword}
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 transition-all duration-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-gray-400 disabled:opacity-50 disabled:bg-gray-100"
                        placeholder="Repeat password"
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none" disabled={!newPassword}>
                        {showConfirm ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 015.058-5.058m1.414-1.414A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-1.57 3.393m-1.414 1.414L3 3l18 18" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.88 9.88a3 3 0 104.24 4.24" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Your Documents</h3>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex flex-col gap-3">
                  <select 
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 outline-none"
                  >
                    <option value="resume">Resume</option>
                    <option value="certificate">Certificate</option>
                    <option value="id_document">ID Document</option>
                  </select>
                  <div className="flex flex-col xl:flex-row items-start xl:items-center gap-2">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setUploadDocFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                    <button 
                      type="button" 
                      onClick={handleDocumentUpload}
                      disabled={!uploadDocFile || docLoading}
                      className="w-full xl:w-auto whitespace-nowrap px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {docLoading ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 font-medium mt-1">Only PDF files up to 2MB are allowed.</p>
                </div>
              </div>

              <div className="space-y-3">
                {documents.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-500">No documents found.</div>
                ) : (
                  documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white shadow-sm">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                        <span className="text-xs text-gray-500 capitalize">{doc.type.replace('_', ' ')}</span>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleDocumentDownload(doc)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>
                        <button type="button" onClick={() => handleDocumentDelete(doc.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-100 rounded-xl hover:bg-gray-50 hover:border-gray-200 focus:outline-none transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!avatar && !newPassword && activeTab === 'security' && educationList.length === 0)}
              className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

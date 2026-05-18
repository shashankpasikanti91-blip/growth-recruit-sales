/**
 * FileUpload Component — drag & drop + click to upload
 * Accepts: image/* | .pdf | .doc | .docx
 */
import { useState } from 'react';
import { Upload, X, FileText, Image, FileIcon } from 'lucide-react';

export default function FileUpload({ value = [], onChange, maxFiles = 5, accept = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif'] }) {
  const [dragActive, setDragActive] = useState(false);

  const acceptStr = accept.includes('image')
    ? 'image/*, .pdf, .doc, .docx'
    : accept.join(', ');

  const handleDrag = (e) => {
    e.preventDefault();
    setDragActive(e.type.includes('enter'));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files || []);
    addFiles(files);
  };

  const handleChange = (e) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
  };

  const addFiles = (files) => {
    const validFiles = files.filter(f => {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      const isImage = f.type.startsWith('image/');
      const isDoc = ['.pdf', '.doc', '.docx'].includes(ext);
      return isImage || isDoc;
    });

    if (validFiles.length === 0) {
      alert('Only image, PDF, and doc files are allowed');
      return;
    }

    const newFiles = [...value, ...validFiles].slice(0, maxFiles);
    onChange(newFiles);
  };

  const removeFile = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const getFileIcon = (file) => {
    const name = file.name?.toLowerCase() || '';
    if (name.match(/\.(jpg|jpeg|png|gif)$/i)) return <Image className="w-4 h-4 text-blue-500" />;
    if (name.match(/\.pdf$/i)) return <FileText className="w-4 h-4 text-red-500" />;
    return <FileIcon className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Attachments {maxFiles > 1 && <span className="text-slate-500">({value.length}/{maxFiles})</span>}
      </label>

      {/* Upload zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed transition-colors p-6 text-center cursor-pointer ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'
        } ${value.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          type="file"
          multiple
          accept={acceptStr}
          onChange={handleChange}
          disabled={value.length >= maxFiles}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center gap-2">
          <Upload className={`w-5 h-5 ${dragActive ? 'text-blue-500' : 'text-slate-400'}`} />
          <div className="text-sm">
            <p className="font-medium text-slate-700">Drag files here or click to select</p>
            <p className="text-xs text-slate-500 mt-0.5">Images, PDF, Word documents (max {maxFiles})</p>
          </div>
        </div>
      </div>

      {/* File list */}
      {value.length > 0 && (
        <div className="mt-4 space-y-2">
          {value.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg group hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {getFileIcon(file)}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

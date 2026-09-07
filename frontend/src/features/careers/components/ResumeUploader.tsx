import React, { useRef, useState } from 'react';
import { UploadSimple, FileText, X, CheckCircle, WarningCircle } from '@phosphor-icons/react';

interface ResumeUploaderProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  error?: string;
}

export function ResumeUploader({ file, onFileSelect, error }: ResumeUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  const handleValidateAndSelect = (selectedFile: File) => {
    setValidationError(null);

    const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf');
    const isDoc =
      selectedFile.type === 'application/msword' ||
      selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      selectedFile.name.endsWith('.doc') ||
      selectedFile.name.endsWith('.docx');

    if (!isPdf && !isDoc) {
      setValidationError('Please upload your resume in PDF (.pdf) or Word (.doc, .docx) format.');
      return;
    }

    if (selectedFile.size > MAX_SIZE_BYTES) {
      setValidationError('File size exceeds the 10MB limit. Please upload a smaller document.');
      return;
    }

    onFileSelect(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleValidateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const activeError = error || validationError;

  return (
    <div className="w-full space-y-1.5">
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
        Resume / Curriculum Vitae <span className="text-rose-500">*</span>
      </label>

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-violet-500/70 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 bg-slate-50/20 dark:bg-slate-900/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleValidateAndSelect(e.target.files[0]);
              }
            }}
          />

          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 group-hover:scale-105 transition-transform duration-200">
            <UploadSimple className="h-5 w-5" weight="bold" />
          </div>

          <p className="mt-3 text-xs font-medium text-slate-800 dark:text-slate-200 text-center">
            <span className="text-violet-600 dark:text-violet-400 font-semibold underline underline-offset-2">
              Click to browse
            </span>{' '}
            or drag & drop your resume
          </p>

          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            PDF, DOCX, or DOC up to 10MB
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3.5 rounded-md border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <FileText className="h-5 w-5" weight="duotone" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {file.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-slate-400 font-mono">
                  {formatFileSize(file.size)}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                  <CheckCircle className="h-3 w-3" weight="fill" />
                  Ready to attach
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFileSelect(null);
              setValidationError(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            title="Remove file"
          >
            <X className="h-4 w-4" weight="bold" />
          </button>
        </div>
      )}

      {activeError && (
        <div className="flex items-center gap-1.5 text-xs text-rose-500 mt-1">
          <WarningCircle className="h-3.5 w-3.5 shrink-0" weight="fill" />
          <span>{activeError}</span>
        </div>
      )}
    </div>
  );
}

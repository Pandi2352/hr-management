import React, { useState, useEffect } from 'react';
import { X, CheckCircle, SpinnerGap } from '@phosphor-icons/react';
import { ResumeUploader } from './ResumeUploader';
import { careersApi } from '../api/careers.api';
import type { PublicJobItem } from '../types/careers.types';

interface ApplicationModalProps {
  job: PublicJobItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApplicationSuccess?: (application: any) => void;
}

export function ApplicationModal({
  job,
  isOpen,
  onClose,
  onApplicationSuccess,
}: ApplicationModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [yearsExperience, setYearsExperience] = useState('3-5 years');
  const [earliestStartDate, setEarliestStartDate] = useState('2 weeks notice');
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    applicationId: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Reset form when reopened for another job
      setErrors({});
      setSubmissionResult(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, job]);

  if (!isOpen || !job) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Please provide your full name.';
    if (!email.trim()) {
      errs.email = 'Please provide your email address.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!phone.trim()) errs.phone = 'Please provide your phone number.';
    if (!resumeFile) errs.resume = 'Please attach your resume (PDF or Word document).';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('jobId', job._id);
      formData.append('fullName', fullName);
      formData.append('email', email);
      formData.append('phone', phone);
      if (linkedinUrl) formData.append('linkedinUrl', linkedinUrl);
      if (portfolioUrl) formData.append('portfolioUrl', portfolioUrl);
      formData.append('yearsExperience', yearsExperience);
      formData.append('earliestStartDate', earliestStartDate);
      if (coverLetter) formData.append('coverLetter', coverLetter);
      if (resumeFile) formData.append('resume', resumeFile);

      const res = await careersApi.submitApplication(formData);
      setSubmissionResult({
        applicationId: res.applicationId || `APP-${Date.now().toString().slice(-6)}`,
        message: res.message,
      });

      if (onApplicationSuccess) {
        onApplicationSuccess(res);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit application. Please try again.';
      setErrors({ form: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden z-10 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {submissionResult ? 'Application Submitted' : 'Apply for Position'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-sm">
              {job.title} • {job.department} ({job.location})
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" weight="bold" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto">
          {submissionResult ? (
            <div className="py-6 flex flex-col items-center text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-10 w-10" weight="fill" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Application Received!
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-md">
                  Thank you for applying for the{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">{job.title}</span> role.
                  Our team has received your details and uploaded resume.
                </p>
              </div>

              <div className="px-4 py-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs text-slate-600 dark:text-slate-400 w-full max-w-xs text-center">
                <span className="block text-[10px] uppercase font-semibold text-slate-400">
                  Tracking Reference
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                  {submissionResult.applicationId}
                </span>
              </div>

              <div className="pt-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-md text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors cursor-pointer"
                >
                  Close & Explore More Roles
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {errors.form && (
                <div className="p-3 rounded-md border border-rose-200 bg-rose-50 text-rose-700 text-xs">
                  {errors.form}
                </div>
              )}

              {/* Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className={`w-full px-3 py-2 rounded-md border ${
                      errors.fullName
                        ? 'border-rose-400 focus:ring-rose-400'
                        : 'border-slate-300 dark:border-slate-700 focus:border-violet-500'
                    } bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-1 focus:ring-violet-500 transition-colors`}
                  />
                  {errors.fullName && (
                    <span className="text-[11px] text-rose-500 mt-0.5 block">{errors.fullName}</span>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className={`w-full px-3 py-2 rounded-md border ${
                      errors.email
                        ? 'border-rose-400 focus:ring-rose-400'
                        : 'border-slate-300 dark:border-slate-700 focus:border-violet-500'
                    } bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-1 focus:ring-violet-500 transition-colors`}
                  />
                  {errors.email && (
                    <span className="text-[11px] text-rose-500 mt-0.5 block">{errors.email}</span>
                  )}
                </div>
              </div>

              {/* Phone & Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className={`w-full px-3 py-2 rounded-md border ${
                      errors.phone
                        ? 'border-rose-400 focus:ring-rose-400'
                        : 'border-slate-300 dark:border-slate-700 focus:border-violet-500'
                    } bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-1 focus:ring-violet-500 transition-colors`}
                  />
                  {errors.phone && (
                    <span className="text-[11px] text-rose-500 mt-0.5 block">{errors.phone}</span>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Years of Relevant Experience
                  </label>
                  <select
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                  >
                    <option value="< 1 year">Less than 1 year</option>
                    <option value="1-3 years">1 - 3 years</option>
                    <option value="3-5 years">3 - 5 years</option>
                    <option value="5-8 years">5 - 8 years</option>
                    <option value="8+ years">8+ years</option>
                  </select>
                </div>
              </div>

              {/* LinkedIn & Portfolio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/janedoe"
                    className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Portfolio / GitHub URL
                  </label>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://github.com/janedoe"
                    className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                  />
                </div>
              </div>

              {/* Earliest Start Date */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Earliest Start Date / Notice Period
                </label>
                <select
                  value={earliestStartDate}
                  onChange={(e) => setEarliestStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                >
                  <option value="Immediately">Available Immediately</option>
                  <option value="2 weeks notice">2 Weeks Notice</option>
                  <option value="1 month notice">1 Month Notice</option>
                  <option value="Negotiable">Negotiable</option>
                </select>
              </div>

              {/* Resume Drag & Drop Uploader */}
              <ResumeUploader
                file={resumeFile}
                onFileSelect={(f) => {
                  setResumeFile(f);
                  if (errors.resume) {
                    const newErr = { ...errors };
                    delete newErr.resume;
                    setErrors(newErr);
                  }
                }}
                error={errors.resume}
              />

              {/* Cover Letter / Message */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Why do you want to join our company? (Optional)
                </label>
                <textarea
                  rows={3}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Share a brief note about what excites you about this role..."
                  className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2 rounded-md text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 active:scale-98 disabled:opacity-60 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <SpinnerGap className="h-4 w-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Application</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Star, CheckCircle, UserX, Clock } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import type { ProbationReview, RatingDimension } from '../types/lifecycle.types';

interface ProbationEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: ProbationReview | null;
  mode: 'EVALUATE' | 'SIGNOFF';
  onSubmitEvaluate: (id: string, ratings: RatingDimension[], recommendation: any, comments: string) => Promise<void>;
  onSubmitSignoff: (id: string, action: any, notes: string) => Promise<void>;
  isSubmitting: boolean;
}

const DEFAULT_DIMENSIONS = [
  'Job Knowledge & Core Competency',
  'Work Quality & Output Accuracy',
  'Dependability, Attendance & Punctuality',
  'Teamwork & Cultural Alignment',
  'Communication & Problem Solving',
];

export const ProbationEvaluationModal: React.FC<ProbationEvaluationModalProps> = ({
  isOpen,
  onClose,
  review,
  mode,
  onSubmitEvaluate,
  onSubmitSignoff,
  isSubmitting,
}) => {
  const [ratings, setRatings] = useState<RatingDimension[]>([]);
  const [recommendation, setRecommendation] = useState<any>('CONFIRM');
  const [managerComments, setManagerComments] = useState('');
  const [signoffAction, setSignoffAction] = useState<any>('CONFIRM');
  const [hrNotes, setHrNotes] = useState('');

  useEffect(() => {
    if (review) {
      if (review.ratings && review.ratings.length > 0) {
        setRatings(review.ratings);
      } else {
        setRatings(
          DEFAULT_DIMENSIONS.map((dim) => ({
            dimension: dim,
            score: 4,
            comments: '',
          }))
        );
      }
      setRecommendation(review.recommendation || 'CONFIRM');
      setManagerComments(review.managerComments || '');
      setSignoffAction(review.recommendation || 'CONFIRM');
      setHrNotes(review.hrNotes || '');
    }
  }, [review]);

  if (!isOpen || !review) return null;

  const handleScoreChange = (index: number, score: number) => {
    setRatings((prev) =>
      prev.map((r, idx) => (idx === index ? { ...r, score } : r))
    );
  };

  const handleDimensionComment = (index: number, comments: string) => {
    setRatings((prev) =>
      prev.map((r, idx) => (idx === index ? { ...r, comments } : r))
    );
  };

  const avgScore =
    ratings.length > 0
      ? (ratings.reduce((acc, r) => acc + r.score, 0) / ratings.length).toFixed(1)
      : '0.0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'EVALUATE') {
      await onSubmitEvaluate(review._id, ratings, recommendation, managerComments);
    } else {
      await onSubmitSignoff(review._id, signoffAction, hrNotes);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <Avatar
              src={review.employee?.avatarUrl}
              name={review.employee?.displayName || 'Employee'}
              size="md"
              shape="rounded"
            />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {mode === 'EVALUATE' ? 'Manager Probation Evaluation' : 'HR Probation Sign-off & Confirmation'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {review.employee?.displayName} ({review.employee?.employeeCode}) • {review.employee?.designationTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Employee Key Dates Banner */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-md bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Date of Joining</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{review.joiningDate || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Probation End Date</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{review.probationEndDate}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Status / Urgency</span>
              <span className={`font-semibold ${review.isOverdue ? 'text-rose-600' : review.isDueSoon ? 'text-amber-600' : 'text-slate-800 dark:text-slate-200'}`}>
                {review.daysRemaining < 0 ? `${Math.abs(review.daysRemaining)}d Overdue` : `${review.daysRemaining}d Remaining`}
              </span>
            </div>
          </div>

          {mode === 'EVALUATE' ? (
            <>
              {/* Overall Rating Pill */}
              <div className="flex items-center justify-between p-3 rounded-md bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900">
                <div>
                  <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">Performance Assessment</h4>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-400">Score candidate on a 1 (Unsatisfactory) to 5 (Outstanding) scale.</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 rounded-md border border-indigo-200 dark:border-indigo-800">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{avgScore} / 5.0</span>
                </div>
              </div>

              {/* 5 Rating Dimensions */}
              <div className="space-y-4">
                {ratings.map((item, index) => (
                  <div key={index} className="p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.dimension}</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => handleScoreChange(index, score)}
                            className={`h-7 w-7 rounded-md text-xs font-bold transition-all cursor-pointer ${
                              item.score === score
                                ? 'bg-[#524b6e] text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Optional notes or examples..."
                      value={item.comments || ''}
                      onChange={(e) => handleDimensionComment(index, e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>

              {/* Manager Recommendation Radio Group */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Formal Recommendation
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-all ${
                      recommendation === 'CONFIRM'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="recommendation"
                      value="CONFIRM"
                      checked={recommendation === 'CONFIRM'}
                      onChange={() => setRecommendation('CONFIRM')}
                      className="sr-only"
                    />
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <div>
                      <div className="text-xs font-bold">Confirm Regular</div>
                      <div className="text-[10px] text-slate-500">Pass probation</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-all ${
                      recommendation === 'EXTEND_60' || recommendation === 'EXTEND_30' || recommendation === 'EXTEND_90'
                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="recommendation"
                      value="EXTEND_60"
                      checked={recommendation === 'EXTEND_60' || recommendation === 'EXTEND_30' || recommendation === 'EXTEND_90'}
                      onChange={() => setRecommendation('EXTEND_60')}
                      className="sr-only"
                    />
                    <Clock className="h-4 w-4 text-amber-600" />
                    <div>
                      <div className="text-xs font-bold">Extend Probation</div>
                      <div className="text-[10px] text-slate-500">Require more time</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-all ${
                      recommendation === 'TERMINATE'
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="recommendation"
                      value="TERMINATE"
                      checked={recommendation === 'TERMINATE'}
                      onChange={() => setRecommendation('TERMINATE')}
                      className="sr-only"
                    />
                    <UserX className="h-4 w-4 text-rose-600" />
                    <div>
                      <div className="text-xs font-bold">End Employment</div>
                      <div className="text-[10px] text-slate-500">Unsatisfactory fit</div>
                    </div>
                  </label>
                </div>

                {(recommendation === 'EXTEND_30' || recommendation === 'EXTEND_60' || recommendation === 'EXTEND_90') && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-xs text-slate-500">Extension duration:</span>
                    {(['EXTEND_30', 'EXTEND_60', 'EXTEND_90'] as const).map((ext) => (
                      <button
                        key={ext}
                        type="button"
                        onClick={() => setRecommendation(ext)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                          recommendation === ext
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {ext === 'EXTEND_30' ? '+30 Days' : ext === 'EXTEND_60' ? '+60 Days' : '+90 Days'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Manager Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Evaluation Summary & Justification
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Summarize candidate accomplishments, strengths, and areas requiring growth..."
                  value={managerComments}
                  onChange={(e) => setManagerComments(e.target.value)}
                  className="w-full text-xs p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </>
          ) : (
            /* Mode: SIGNOFF (HR) */
            <>
              {/* Existing Manager Evaluation Snapshot */}
              {review.evaluatedAt && (
                <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Manager Recommendation</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-bold">
                      {review.recommendation || 'CONFIRM'} (★ {review.overallScore}/5.0)
                    </span>
                  </div>
                  {review.managerComments && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                      "{review.managerComments}"
                    </p>
                  )}
                </div>
              )}

              {/* HR Final Action Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  HR Final Action Decision
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSignoffAction('CONFIRM')}
                    className={`p-3 rounded-md border text-left cursor-pointer transition-all ${
                      signoffAction === 'CONFIRM'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 text-emerald-600 mb-1" />
                    <div className="text-xs font-bold">Confirm Employment</div>
                    <div className="text-[10px] text-slate-500">Update status to ACTIVE</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignoffAction('EXTEND_60')}
                    className={`p-3 rounded-md border text-left cursor-pointer transition-all ${
                      signoffAction === 'EXTEND_30' || signoffAction === 'EXTEND_60' || signoffAction === 'EXTEND_90'
                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <Clock className="h-4 w-4 text-amber-600 mb-1" />
                    <div className="text-xs font-bold">Extend Probation</div>
                    <div className="text-[10px] text-slate-500">Extend end date</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignoffAction('TERMINATE')}
                    className={`p-3 rounded-md border text-left cursor-pointer transition-all ${
                      signoffAction === 'TERMINATE'
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <UserX className="h-4 w-4 text-rose-600 mb-1" />
                    <div className="text-xs font-bold">Terminate</div>
                    <div className="text-[10px] text-slate-500">End contract</div>
                  </button>
                </div>
              </div>

              {/* HR Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  HR Formal Sign-off Notes
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Record formal confirmation notes, committee approvals, or extension stipulations..."
                  value={hrNotes}
                  onChange={(e) => setHrNotes(e.target.value)}
                  className="w-full text-xs p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Processing...'
                : mode === 'EVALUATE'
                ? 'Submit Manager Evaluation'
                : 'Finalize HR Decision'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import type { OnboardingSession } from '../types/onboarding.types';

interface Props {
  sessions: OnboardingSession[];
  onRemind: (id: string, name: string) => void;
  isLoading?: boolean;
}

export function OnboardingRosterTable({ sessions, onRemind, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-violet-500 border-t-transparent" />
        <p className="mt-2 text-xs text-slate-500">Loading onboarding workflows...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-12 text-center">
        <Clock className="mx-auto h-10 w-10 text-slate-400" />
        <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">No active onboarding sessions</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          No employee onboardings match the selected filter. Click "Initialize Onboarding" above to start a workflow.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">New Joiner</th>
              <th className="py-3 px-4">Department & Role</th>
              <th className="py-3 px-4">Target Joining</th>
              <th className="py-3 px-4 min-w-[180px]">Checklist Progress</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {sessions.map((session) => {
              const emp = session.employee;
              const name = emp ? `${emp.firstName} ${emp.lastName}` : 'Unassigned Candidate';
              const code = emp?.employeeCode || 'EMP-XXXX';
              const isOverdue = session.isOverdue;
              const isCompleted = session.status === 'COMPLETED';

              return (
                <tr
                  key={session._id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Candidate Identity */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/60 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-300 shrink-0 overflow-hidden">
                        {emp?.avatarUrl ? (
                          <img src={emp.avatarUrl} alt={name} className="h-full w-full object-cover" />
                        ) : (
                          `${emp?.firstName?.[0] || 'E'}${emp?.lastName?.[0] || 'M'}`
                        )}
                      </div>
                      <div>
                        <div className="font-outfit font-bold text-slate-900 dark:text-white">
                          {name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {code} • {emp?.workEmail || 'Pending Email'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Department & Designation */}
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {emp?.departmentName || 'General'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {emp?.designationTitle || 'Associate'}
                    </div>
                  </td>

                  {/* Target Joining Date */}
                  <td className="py-3 px-4">
                    <div className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>{session.targetJoiningDate}</span>
                    </div>
                  </td>

                  {/* Visual Progress Bar */}
                  <td className="py-3 px-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {session.completedTasks} of {session.totalTasks} tasks
                        </span>
                        <span className="font-bold font-mono text-violet-600 dark:text-violet-400">
                          {session.overallProgress}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted
                              ? 'bg-emerald-500'
                              : isOverdue
                              ? 'bg-amber-500'
                              : 'bg-violet-600'
                          }`}
                          style={{ width: `${session.overallProgress}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Status Badges */}
                  <td className="py-3 px-4">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                        <CheckCircle2 className="h-3 w-3" />
                        Gated to Probation
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                        <AlertCircle className="h-3 w-3" />
                        Overdue Action
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400 border border-violet-200 dark:border-violet-800/60">
                        <Clock className="h-3 w-3" />
                        In-Progress
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => onRemind(session._id, name)}
                          title="Dispatch reminder notification"
                          className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Bell className="h-4 w-4" />
                        </button>
                      )}
                      <Link
                        to={`/lifecycle/onboarding/${session._id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                      >
                        <span>Checklist</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

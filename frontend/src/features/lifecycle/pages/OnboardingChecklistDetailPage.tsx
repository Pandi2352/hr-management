import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Laptop,
  Users,
  FileText,
  Bell,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/toast';
import { onboardingApi } from '../api/onboarding.api';
import { TaskActionModal } from '../components/TaskActionModal';
import type {
  OnboardingSession,
  OnboardingTask,
  TaskCategory,
  TaskStatus,
} from '../types/onboarding.types';

export function OnboardingChecklistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();

  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [activeCategory, setActiveCategory] = useState<TaskCategory>('HR');
  const [selectedTaskForAction, setSelectedTaskForAction] = useState<OnboardingTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const data = await onboardingApi.getOnboardingById(id);
      setSession(data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load onboarding checklist');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [id]);

  const handleTaskSubmit = async (taskId: string, status: TaskStatus, remarks: string) => {
    if (!id) return;
    try {
      const updated = await onboardingApi.updateTaskStatus(id, taskId, { status, remarks });
      setSession(updated);
      toast.success(`Task status updated to ${status}!`);
      if (updated.status === 'COMPLETED') {
        toast.success('🎉 All mandatory onboarding tasks cleared! Employee automatically gated to PROBATION.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update task evaluation');
    }
  };

  const handleRemind = async () => {
    if (!id) return;
    try {
      await onboardingApi.sendReminder(id);
      toast.success('Reminder successfully dispatched to pending task stakeholders!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch reminder');
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-violet-500 border-t-transparent" />
        <p className="mt-3 text-xs text-slate-500">Loading checklist details...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-12 text-center rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
        <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">Onboarding Session Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">The requested onboarding workflow could not be found.</p>
        <Link to="/lifecycle/onboarding" className="inline-block mt-4 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline">
          &larr; Back to Onboarding Tracker
        </Link>
      </div>
    );
  }

  const emp = session.employee;
  const name = emp ? `${emp.firstName} ${emp.lastName}` : 'Candidate';
  const isCompleted = session.status === 'COMPLETED';

  const categoryTasks = session.tasks.filter((t) => t.category === activeCategory);

  const categoryTabs = [
    { id: 'HR' as TaskCategory, label: 'HR Compliance', icon: ShieldCheck, count: session.tasks.filter((t) => t.category === 'HR').length },
    { id: 'IT' as TaskCategory, label: 'IT Hardware & Access', icon: Laptop, count: session.tasks.filter((t) => t.category === 'IT').length },
    { id: 'MANAGER' as TaskCategory, label: 'Manager & Team', icon: Users, count: session.tasks.filter((t) => t.category === 'MANAGER').length },
    { id: 'EMPLOYEE' as TaskCategory, label: 'Employee Self-Service', icon: FileText, count: session.tasks.filter((t) => t.category === 'EMPLOYEE').length },
  ];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/lifecycle/onboarding"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Tracker</span>
        </Link>

        {!isCompleted && (
          <Button variant="outline" size="sm" onClick={handleRemind}>
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            <span>Send Stakeholder Reminder</span>
          </Button>
        )}
      </div>

      {/* Candidate Profile & Progress Banner */}
      <div className="p-6 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Identity Info */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-md bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/60 flex items-center justify-center text-lg font-bold text-violet-700 dark:text-violet-300 shrink-0 overflow-hidden">
              {emp?.avatarUrl ? (
                <img src={emp.avatarUrl} alt={name} className="h-full w-full object-cover" />
              ) : (
                `${emp?.firstName?.[0] || 'E'}${emp?.lastName?.[0] || 'M'}`
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-outfit text-xl font-bold text-slate-900 dark:text-white">
                  {name}
                </h1>
                {isCompleted ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                    <CheckCircle2 className="h-3 w-3" />
                    Gated to Probation
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400 border border-violet-200 dark:border-violet-800/60">
                    <Clock className="h-3 w-3" />
                    Onboarding In-Progress
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-jakarta">
                {emp?.employeeCode} • {emp?.designationTitle} in {emp?.departmentName} • Reporting to {emp?.managerName}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Target Joining: <strong className="text-slate-700 dark:text-slate-200">{session.targetJoiningDate}</strong>
                </span>
                <span>•</span>
                <span>Work Email: <strong className="text-slate-700 dark:text-slate-200">{emp?.workEmail || 'Pending'}</strong></span>
              </div>
            </div>
          </div>

          {/* Progress Gauge */}
          <div className="w-full lg:w-72 p-4 rounded-md border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-300">Milestone Completion</span>
              <span className="font-outfit text-base font-bold text-violet-600 dark:text-violet-400 font-mono">
                {session.overallProgress}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-violet-600'
                }`}
                style={{ width: `${session.overallProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 text-right">
              {session.completedTasks} of {session.totalTasks} total tasks cleared
            </p>
          </div>
        </div>
      </div>

      {/* Role Category Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        {categoryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-md text-xs font-outfit font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task List for Active Role */}
      <div className="space-y-3">
        {categoryTasks.map((task) => {
          const isVerified = task.status === 'VERIFIED';
          const isRejected = task.status === 'REJECTED';
          const isSubmitted = task.status === 'SUBMITTED';

          return (
            <div
              key={task.id}
              className={`p-4 rounded-md border transition-all ${
                isVerified
                  ? 'border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/20'
                  : isRejected
                  ? 'border-rose-200/80 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                      {task.title}
                    </span>
                    {task.isMandatory && (
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded-md">
                        Mandatory
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-jakarta">
                    {task.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      Due Date: {task.dueDate || 'Target Joining'}
                    </span>
                    {task.completedAt && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Cleared on {new Date(task.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Attached Remarks or Submissions */}
                  {task.remarks && (
                    <div className="mt-2 p-2 rounded-md bg-slate-100/70 dark:bg-slate-800/50 text-[11px] text-slate-600 dark:text-slate-300">
                      <strong>Reviewer Feedback:</strong> {task.remarks}
                    </div>
                  )}
                </div>

                {/* Status & Evaluation Trigger */}
                <div className="flex items-center gap-3 shrink-0">
                  {isVerified ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  ) : isRejected ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Rejected
                    </span>
                  ) : isSubmitted ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                      <Clock className="h-3.5 w-3.5" />
                      Ready for Review
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      <Clock className="h-3.5 w-3.5" />
                      Pending Action
                    </span>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTaskForAction(task)}
                  >
                    Evaluate Task
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Action Modal */}
      <TaskActionModal
        task={selectedTaskForAction}
        isOpen={!!selectedTaskForAction}
        onClose={() => setSelectedTaskForAction(null)}
        onSubmit={handleTaskSubmit}
      />
    </div>
  );
}

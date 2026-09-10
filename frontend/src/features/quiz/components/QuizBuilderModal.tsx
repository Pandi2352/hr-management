import { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Users,
  Calendar,
  Search,
  UserCheck,
  Send,
} from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { FormField } from '../../../components/ui/FormField';
import { useToast } from '../../../components/ui/toast';
import { quizApi } from '../api/quiz.api';
import { employeesApi } from '../../employees/api/employees.api';
import type { Employee } from '../../employees/types/employees.types';
import type { Quiz, QuizQuestion } from '../types/quiz.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (quiz: Quiz) => void;
  onSuccess?: () => void;
  initialAiMode?: boolean;
}

export function QuizBuilderModal({
  isOpen,
  onClose,
  onCreated,
  onSuccess,
  initialAiMode = false,
}: Props) {
  const toast = useToast();

  // Mode: manual or AI generator
  const [activeMode, setActiveMode] = useState<'ai' | 'manual'>(initialAiMode ? 'ai' : 'manual');

  // AI Generator state
  const [aiTopic, setAiTopic] = useState('');
  const [aiCategory, setAiCategory] = useState('Compliance & Safety');
  const [aiDifficulty, setAiDifficulty] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('INTERMEDIATE');
  const [aiCount, setAiCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  // Quiz Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Compliance & Safety');
  const [difficulty, setDifficulty] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('INTERMEDIATE');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(15);
  const [passingScorePct, setPassingScorePct] = useState(70);
  const [xpReward, setXpReward] = useState(100);

  const [questions, setQuestions] = useState<QuizQuestion[]>([
    {
      prompt: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      explanation: '',
      points: 10,
    },
  ]);

  // Assignment Workflow State
  const [assignImmediately, setAssignImmediately] = useState(true);
  const [assignAll, setAssignAll] = useState(true);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      employeesApi
        .getEmployees({ pageSize: 150 })
        .then((res) => {
          setEmployees(res.data || []);
        })
        .catch(() => {
          // ignore quiet fallback
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Run AI generator
  const handleGenerateAi = async () => {
    if (!aiTopic.trim()) {
      toast.error('Please enter a topic for the Quiz Master Agent.');
      return;
    }

    setIsGenerating(true);
    try {
      const generated = await quizApi.generateAiQuiz({
        topic: aiTopic.trim(),
        category: aiCategory,
        difficulty: aiDifficulty,
        questionCount: aiCount,
      });

      setTitle(generated.title);
      setDescription(generated.description);
      setCategory(generated.category);
      setDifficulty(generated.difficulty as any);
      setTimeLimitMinutes(generated.timeLimitMinutes);
      setPassingScorePct(generated.passingScorePct);
      setXpReward(generated.xpReward);
      setQuestions(generated.questions);
      setActiveMode('manual'); // Switch to editor mode so user can review/edit
      toast.success('Quiz generated! Review questions and assignment options below.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'AI quiz generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        prompt: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        explanation: '',
        points: 10,
      },
    ]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) {
      toast.error('A quiz must have at least one question.');
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestionPrompt = (idx: number, prompt: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, prompt } : q)),
    );
  };

  const updateOption = (qIdx: number, optIdx: number, val: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const newOpts = [...q.options];
        newOpts[optIdx] = val;
        return { ...q, options: newOpts };
      }),
    );
  };

  const setCorrectOption = (qIdx: number, optIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIdx ? { ...q, correctOptionIndex: optIdx } : q)),
    );
  };

  const updateExplanation = (qIdx: number, explanation: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIdx ? { ...q, explanation } : q)),
    );
  };

  const toggleEmployeeSelect = (empId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const filteredEmployees = employees.filter((emp) => {
    const name = `${emp.firstName || ''} ${emp.lastName || ''} ${emp.workEmail || ''}`.toLowerCase();
    return name.includes(employeeSearch.toLowerCase());
  });

  const handleSaveQuiz = async () => {
    if (!title.trim()) {
      toast.error('Please enter a quiz title.');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].prompt.trim()) {
        toast.error(`Question ${i + 1} is missing question text.`);
        return;
      }
      if (questions[i].options.some((opt) => !opt.trim())) {
        toast.error(`Question ${i + 1} has empty options.`);
        return;
      }
    }

    if (assignImmediately && !assignAll && selectedEmployeeIds.length === 0) {
      toast.warning('Please select at least one employee or choose "Assign to All Employees".');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create Quiz
      const created = await quizApi.createQuiz({
        title: title.trim(),
        description: description.trim(),
        category,
        difficulty,
        timeLimitMinutes: Number(timeLimitMinutes),
        passingScorePct: Number(passingScorePct),
        xpReward: Number(xpReward),
        questions: questions.map((q) => ({
          prompt: q.prompt.trim(),
          options: q.options.map((o) => o.trim()),
          correctOptionIndex: q.correctOptionIndex || 0,
          explanation: q.explanation?.trim() || '',
          points: Number(q.points) || 10,
        })),
      });

      // 2. Immediate Assignment Workflow if enabled
      if (assignImmediately) {
        const assignRes = await quizApi.assignQuiz(created._id, {
          assignAll,
          employeeIds: assignAll ? undefined : selectedEmployeeIds,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        });

        toast.success(
          assignAll
            ? `Quiz published & assigned company-wide (${assignRes.assignedCount} employees)!`
            : `Quiz published & assigned to ${assignRes.assignedCount} employees!`
        );
      } else {
        toast.success('Quiz created and saved successfully!');
      }

      onCreated?.(created);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to create quiz.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-md border border-hairline bg-surface overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-hairline bg-surface-2/40 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline bg-surface text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">Quiz Studio & Assignment Workflow</h2>
              <p className="text-[11px] text-ink-3">Build training assessments with AI and assign company-wide</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center border-b border-hairline bg-surface px-5 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveMode('ai')}
            className={`flex items-center gap-1.5 border-b-2 px-3 pb-2 text-xs font-semibold transition-colors cursor-pointer ${
              activeMode === 'ai'
                ? 'border-primary text-primary'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Quiz Master Agent</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('manual')}
            className={`flex items-center gap-1.5 border-b-2 px-3 pb-2 text-xs font-semibold transition-colors cursor-pointer ${
              activeMode === 'manual'
                ? 'border-primary text-primary'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Questions & Assignment Setup</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[72vh] overflow-y-auto space-y-5">
          {/* AI Generator Section */}
          {activeMode === 'ai' && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Generate Complete Quiz from Topic</span>
                  </h3>
                  <p className="text-[11.5px] text-ink-2 mt-0.5">
                    The Quiz Master Agent will formulate questions, realistic distractors, correct answers, and educational explanations.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <FormField label="Quiz Topic / Subject">
                  <Input
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g. Workplace Cybersecurity, Anti-Bribery Compliance, Customer Escalation Handling"
                    className="rounded-md text-xs"
                  />
                </FormField>

                <div className="grid grid-cols-3 gap-3">
                  <FormField label="Category">
                    <select
                      value={aiCategory}
                      onChange={(e) => setAiCategory(e.target.value)}
                      className="w-full rounded-md border border-hairline bg-surface px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
                    >
                      <option value="Compliance & Safety">Compliance & Safety</option>
                      <option value="Information Security">Information Security</option>
                      <option value="Product & Technology">Product & Technology</option>
                      <option value="Leadership & Culture">Leadership & Culture</option>
                      <option value="Customer Experience">Customer Experience</option>
                    </select>
                  </FormField>

                  <FormField label="Difficulty">
                    <select
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value as any)}
                      className="w-full rounded-md border border-hairline bg-surface px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </FormField>

                  <FormField label="Questions Count">
                    <select
                      value={aiCount}
                      onChange={(e) => setAiCount(Number(e.target.value))}
                      className="w-full rounded-md border border-hairline bg-surface px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
                    >
                      <option value={3}>3 Questions</option>
                      <option value={5}>5 Questions (Fast)</option>
                      <option value={8}>8 Questions</option>
                      <option value={10}>10 Questions</option>
                    </select>
                  </FormField>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    onClick={handleGenerateAi}
                    disabled={isGenerating}
                    className="gap-1.5 rounded-md text-xs"
                  >
                    {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    <span>{isGenerating ? 'Synthesizing Questions...' : 'Run Quiz Master Agent'}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Quiz Details Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Quiz Title">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q3 Cybersecurity Essentials Challenge"
                  className="rounded-md text-xs font-medium"
                />
              </FormField>

              <FormField label="Category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-md border border-hairline bg-surface px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
                >
                  <option value="Compliance & Safety">Compliance & Safety</option>
                  <option value="Information Security">Information Security</option>
                  <option value="Product & Technology">Product & Technology</option>
                  <option value="Leadership & Culture">Leadership & Culture</option>
                  <option value="Customer Experience">Customer Experience</option>
                </select>
              </FormField>
            </div>

            <FormField label="Description">
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short briefing for employees taking this quiz..."
                className="rounded-md text-xs"
              />
            </FormField>

            <div className="grid grid-cols-4 gap-3">
              <FormField label="Difficulty">
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full rounded-md border border-hairline bg-surface px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </FormField>

              <FormField label="Time Limit (mins)">
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={timeLimitMinutes}
                  onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                  className="rounded-md text-xs"
                />
              </FormField>

              <FormField label="Passing Score (%)">
                <Input
                  type="number"
                  min={10}
                  max={100}
                  value={passingScorePct}
                  onChange={(e) => setPassingScorePct(Number(e.target.value))}
                  className="rounded-md text-xs"
                />
              </FormField>

              <FormField label="XP Reward">
                <Input
                  type="number"
                  min={10}
                  step={25}
                  value={xpReward}
                  onChange={(e) => setXpReward(Number(e.target.value))}
                  className="rounded-md text-xs font-bold text-amber-500"
                />
              </FormField>
            </div>

            {/* Questions Section */}
            <div className="pt-3 border-t border-hairline space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-3">
                  Questions ({questions.length})
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addQuestion}
                  className="gap-1 rounded-md text-xs h-7"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Question</span>
                </Button>
              </div>

              {questions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="rounded-md border border-hairline bg-surface-2/30 p-3.5 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-primary">Question {qIdx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIdx)}
                      className="text-ink-3 hover:text-rose-500 p-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <FormField label="Prompt">
                    <Input
                      value={q.prompt}
                      onChange={(e) => updateQuestionPrompt(qIdx, e.target.value)}
                      placeholder="e.g. Which of the following best describes multi-factor authentication?"
                      className="rounded-md text-xs"
                    />
                  </FormField>

                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium text-ink-3 flex items-center justify-between">
                      <span>Options (select the green radio for the correct answer)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correctOptionIndex === optIdx;
                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-2 rounded-md border p-2 transition-colors ${
                              isCorrect
                                ? 'border-emerald-500/50 bg-emerald-500/5'
                                : 'border-hairline bg-surface'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`correct_${qIdx}`}
                              checked={isCorrect}
                              onChange={() => setCorrectOption(qIdx, optIdx)}
                              className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                              className="flex-1 bg-transparent text-xs text-ink focus:outline-none placeholder:text-ink-3/50"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <FormField label="Explanation (Shown after attempt submission)">
                    <Input
                      value={q.explanation || ''}
                      onChange={(e) => updateExplanation(qIdx, e.target.value)}
                      placeholder="e.g. Phishing emails attempt to trick users into revealing credentials."
                      className="rounded-md text-xs text-ink-2"
                    />
                  </FormField>
                </div>
              ))}
            </div>

            {/* Assignment & Distribution Workflow Section */}
            <div className="pt-4 border-t border-hairline space-y-3">
              <div className="flex items-center justify-between p-3 rounded-md bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-ink">Assignment Workflow</div>
                    <div className="text-[11px] text-ink-3">Automatically assign this challenge to employees upon saving</div>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={assignImmediately}
                    onChange={(e) => setAssignImmediately(e.target.checked)}
                    className="rounded border-hairline text-brand-500 focus:ring-brand-400"
                  />
                  <span>Assign Immediately</span>
                </label>
              </div>

              {assignImmediately && (
                <div className="p-4 rounded-md border border-hairline bg-surface-hover/30 space-y-3.5">
                  {/* Scope Selector: All Employees vs Specific */}
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setAssignAll(true)}
                      className={`p-3 rounded-md border cursor-pointer transition-all ${
                        assignAll
                          ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500/30'
                          : 'border-hairline bg-surface hover:bg-surface-hover'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-brand-500" />
                          Assign to All Employees
                        </span>
                        {assignAll && <CheckCircle2 className="w-4 h-4 text-brand-500" />}
                      </div>
                      <p className="text-[11px] text-ink-3 mt-1">
                        Company-wide challenge. Recommended for team-wide skills & compliance.
                      </p>
                    </div>

                    <div
                      onClick={() => setAssignAll(false)}
                      className={`p-3 rounded-md border cursor-pointer transition-all ${
                        !assignAll
                          ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500/30'
                          : 'border-hairline bg-surface hover:bg-surface-hover'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-brand-500" />
                          Select Specific Employees
                        </span>
                        {!assignAll && <CheckCircle2 className="w-4 h-4 text-brand-500" />}
                      </div>
                      <p className="text-[11px] text-ink-3 mt-1">
                        Handpick targeted team members or departments.
                      </p>
                    </div>
                  </div>

                  {/* Specific employee picker if assignAll is false */}
                  {!assignAll && (
                    <div className="space-y-2 border border-hairline rounded-md bg-surface p-3">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={employeeSearch}
                          onChange={(e) => setEmployeeSearch(e.target.value)}
                          placeholder="Search employees by name or email..."
                          className="w-full bg-surface-hover/50 border border-hairline rounded-md pl-8 pr-3 py-1.5 text-xs text-ink focus:outline-none"
                        />
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-hairline">
                        {filteredEmployees.map((emp) => {
                          const isSelected = selectedEmployeeIds.includes(emp._id);
                          return (
                            <div
                              key={emp._id}
                              onClick={() => toggleEmployeeSelect(emp._id)}
                              className="flex items-center justify-between p-1.5 hover:bg-surface-hover rounded cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="rounded border-hairline text-brand-500 pointer-events-none"
                                />
                                <span className="text-xs font-medium text-ink">
                                  {emp.firstName} {emp.lastName}
                                </span>
                              </div>
                              <span className="text-[10px] text-ink-3">{emp.workEmail}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Due Date */}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-ink-3 shrink-0" />
                    <FormField label="Completion Due Date (Optional)" className="flex-1">
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="rounded-md text-xs"
                      />
                    </FormField>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-hairline bg-surface-2/40 px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-md text-xs">
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handleSaveQuiz}
            disabled={isSubmitting}
            className="gap-1.5 rounded-md text-xs px-5 bg-brand-500 hover:bg-brand-600 text-white font-semibold"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : assignImmediately ? (
              <Send className="h-3.5 w-3.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            <span>
              {isSubmitting
                ? 'Saving & Assigning...'
                : assignImmediately
                ? assignAll
                  ? 'Publish & Assign to All Employees'
                  : `Publish & Assign (${selectedEmployeeIds.length} Selected)`
                : 'Publish Quiz Only'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

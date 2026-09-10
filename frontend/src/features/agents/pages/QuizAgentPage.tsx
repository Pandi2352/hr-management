import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Trophy,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Check,
  Send,
  Loader2,
  BrainCircuit,
  Users,
  UserCheck,
  Calendar,
  Search,
  RotateCcw,
  Target,
  ListOrdered,
  BookOpen,
} from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { FormField } from '../../../components/ui/FormField';
import { useToast } from '../../../components/ui/toast';
import { quizApi } from '../../quiz/api/quiz.api';
import { employeesApi } from '../../employees/api/employees.api';
import type { Employee } from '../../employees/types/employees.types';
import type { QuizQuestion } from '../../quiz/types/quiz.types';

type AgentStep = 'input' | 'enhanced' | 'generated' | 'success';

interface EnhancedPromptData {
  suggestedTitle: string;
  category: string;
  difficulty: string;
  questionCount: number;
  learningObjectives: string[];
  focusAreas: string[];
  refinedPrompt: string;
}

export const QuizAgentPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState<AgentStep>('input');

  // Step 1 Inputs
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('Compliance & Safety');
  const [difficulty, setDifficulty] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('INTERMEDIATE');
  const [questionCount, setQuestionCount] = useState(5);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Step 2 Enhanced Data
  const [enhancedData, setEnhancedData] = useState<EnhancedPromptData | null>(null);
  const [editableRefinedPrompt, setEditableRefinedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Step 3 Generated Quiz & Assignment
  const [generatedQuiz, setGeneratedQuiz] = useState<{
    title: string;
    description: string;
    category: string;
    difficulty: string;
    timeLimitMinutes: number;
    passingScorePct: number;
    xpReward: number;
    questions: QuizQuestion[];
  } | null>(null);

  const [assignAll, setAssignAll] = useState(true);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  // Step 4 Success Data
  const [assignedCount, setAssignedCount] = useState(0);

  useEffect(() => {
    employeesApi
      .getEmployees({ pageSize: 150 })
      .then((res) => setEmployees(res.data || []))
      .catch(() => {});
  }, []);

  // Handler: Enhance prompt with AI
  const handleEnhancePrompt = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a quiz topic or training objective.');
      return;
    }

    try {
      setIsEnhancing(true);
      const res = await quizApi.enhancePrompt({
        topic: topic.trim(),
        category,
        difficulty,
        questionCount,
      });

      setEnhancedData(res);
      setEditableRefinedPrompt(res.refinedPrompt);
      setStep('enhanced');
      toast.success('Prompt enhanced! Review assessment blueprint below.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to enhance prompt.');
    } finally {
      setIsEnhancing(false);
    }
  };

  // Handler: Accept enhanced prompt & generate full quiz with AI
  const handleStartGeneration = async () => {
    if (!enhancedData) return;

    try {
      setIsGenerating(true);
      const promptToUse = editableRefinedPrompt.trim() || enhancedData.refinedPrompt;
      const res = await quizApi.generateAiQuiz({
        topic: `${enhancedData.suggestedTitle}: ${promptToUse}`,
        category: enhancedData.category,
        difficulty: enhancedData.difficulty as any,
        questionCount: enhancedData.questionCount,
      });

      setGeneratedQuiz(res);
      setStep('generated');
      toast.success('Quiz generated! Configure company assignment below.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate quiz.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Publish & Assign
  const handlePublishAndAssign = async () => {
    if (!generatedQuiz) return;

    if (!assignAll && selectedEmployeeIds.length === 0) {
      toast.warning('Please select at least one employee or choose "Assign to All Employees".');
      return;
    }

    try {
      setIsPublishing(true);

      // 1. Create Quiz
      const created = await quizApi.createQuiz({
        title: generatedQuiz.title,
        description: generatedQuiz.description,
        category: generatedQuiz.category,
        difficulty: generatedQuiz.difficulty as any,
        timeLimitMinutes: generatedQuiz.timeLimitMinutes,
        passingScorePct: generatedQuiz.passingScorePct,
        xpReward: generatedQuiz.xpReward,
        questions: generatedQuiz.questions.map((q) => ({
          prompt: q.prompt,
          options: q.options,
          correctOptionIndex: typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0,
          explanation: q.explanation || '',
          points: q.points || 10,
        })),
      });

      // 2. Assign to employees
      const assignRes = await quizApi.assignQuiz(created._id, {
        assignAll,
        employeeIds: assignAll ? undefined : selectedEmployeeIds,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });

      setAssignedCount(assignRes.assignedCount);
      setStep('success');
      toast.success(
        assignAll
          ? `Quiz published & assigned company-wide (${assignRes.assignedCount} employees)!`
          : `Quiz published & assigned to ${assignRes.assignedCount} employees!`
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to publish and assign quiz.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setTopic('');
    setEnhancedData(null);
    setGeneratedQuiz(null);
    setSelectedEmployeeIds([]);
    setDueDate('');
  };

  const toggleEmployee = (empId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const filteredEmployees = employees.filter((emp) => {
    const name = `${emp.firstName || ''} ${emp.lastName || ''} ${emp.workEmail || ''}`.toLowerCase();
    return name.includes(employeeSearch.toLowerCase());
  });

  return (
    <div className="max-w-5xl mx-auto pb-16 space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/agents" className="hover:text-foreground transition-colors">
              AI Agents
            </Link>
            <span>/</span>
            <span className="font-semibold text-foreground">Quiz Master Agent</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-500">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground">Quiz Master Studio</h1>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  AGENT-QZ-01 ACTIVE
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                AI-driven syllabus enhancement, dynamic challenge generation, and company-wide assignment
              </p>
            </div>
          </div>
        </div>

        {/* Enter Quiz Arena Shortcut Button */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/quizzes')}
            variant="outline"
            className="gap-2 rounded-md text-xs font-semibold border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
          >
            <Trophy className="h-4 w-4 text-amber-500" />
            <span>Enter Quiz Arena</span>
          </Button>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="grid grid-cols-4 gap-2 bg-surface border border-hairline rounded-md p-2">
        <div
          className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
            step === 'input'
              ? 'bg-brand-500/10 border border-brand-500/30 text-brand-600 dark:text-brand-400 font-bold'
              : 'text-muted-foreground'
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[10px] font-bold border border-hairline">
            1
          </span>
          <span className="text-xs">Objective & Parameters</span>
        </div>

        <div
          className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
            step === 'enhanced'
              ? 'bg-brand-500/10 border border-brand-500/30 text-brand-600 dark:text-brand-400 font-bold'
              : 'text-muted-foreground'
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[10px] font-bold border border-hairline">
            2
          </span>
          <span className="text-xs">AI Enhanced Prompt</span>
        </div>

        <div
          className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
            step === 'generated'
              ? 'bg-brand-500/10 border border-brand-500/30 text-brand-600 dark:text-brand-400 font-bold'
              : 'text-muted-foreground'
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[10px] font-bold border border-hairline">
            3
          </span>
          <span className="text-xs">Generated & Assign</span>
        </div>

        <div
          className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
            step === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 font-bold'
              : 'text-muted-foreground'
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[10px] font-bold border border-hairline">
            4
          </span>
          <span className="text-xs">Distribution Live</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: INITIAL TOPIC & PARAMETERS */}
      {/* ========================================================================= */}
      {step === 'input' && (
        <div className="bg-surface border border-hairline rounded-md p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-500" />
              Specify Training Topic or Skill Focus
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Provide your initial topic or rough notes. The Quiz Master Agent will first enhance and
              structure it into a comprehensive assessment blueprint before generating questions.
            </p>
          </div>

          <div className="space-y-4">
            <FormField label="Quiz Subject / Topic">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Workplace Cybersecurity & Phishing Awareness, Customer Escalation Playbook, Data Privacy Laws"
                className="rounded-md text-xs"
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-md border border-hairline bg-surface px-3 py-2 text-xs text-foreground focus:border-brand-500 focus:outline-none"
                >
                  <option value="Compliance & Safety">Compliance & Safety</option>
                  <option value="Information Security">Information Security</option>
                  <option value="Product & Technology">Product & Technology</option>
                  <option value="Leadership & Culture">Leadership & Culture</option>
                  <option value="Customer Experience">Customer Experience</option>
                </select>
              </FormField>

              <FormField label="Difficulty Level">
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full rounded-md border border-hairline bg-surface px-3 py-2 text-xs text-foreground focus:border-brand-500 focus:outline-none"
                >
                  <option value="BEGINNER">Beginner (Foundational)</option>
                  <option value="INTERMEDIATE">Intermediate (Operational)</option>
                  <option value="ADVANCED">Advanced (Scenario-heavy)</option>
                </select>
              </FormField>

              <FormField label="Question Count">
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full rounded-md border border-hairline bg-surface px-3 py-2 text-xs text-foreground focus:border-brand-500 focus:outline-none"
                >
                  <option value={3}>3 Questions (Quick Check)</option>
                  <option value={5}>5 Questions (Recommended)</option>
                  <option value={8}>8 Questions (Standard)</option>
                  <option value={10}>10 Questions (Comprehensive)</option>
                </select>
              </FormField>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-hairline">
            <Button
              onClick={() => navigate('/agents')}
              variant="outline"
              size="sm"
              className="rounded-md text-xs"
            >
              Back to Agents Hub
            </Button>

            <Button
              onClick={handleEnhancePrompt}
              disabled={isEnhancing || !topic.trim()}
              size="sm"
              className="gap-2 rounded-md text-xs px-5 bg-brand-500 hover:bg-brand-600 text-white font-semibold"
            >
              {isEnhancing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isEnhancing ? 'Enhancing Prompt with AI...' : 'Enhance Prompt with AI'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: REVIEW AI ENHANCED PROMPT & BLUEPRINT */}
      {/* ========================================================================= */}
      {step === 'enhanced' && enhancedData && (
        <div className="space-y-6">
          <div className="bg-surface border border-hairline rounded-md p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 text-[11px] font-bold mb-1.5">
                  <BrainCircuit className="w-3.5 h-3.5" />
                  AI Assessment Blueprint Ready
                </div>
                <h2 className="text-base font-bold text-foreground">
                  {enhancedData.suggestedTitle}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The Quiz Master Agent has structured your objective into measurable learning goals.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-surface-hover border border-hairline font-semibold">
                  {enhancedData.difficulty}
                </span>
                <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-surface-hover border border-hairline font-semibold">
                  {enhancedData.questionCount} Questions
                </span>
              </div>
            </div>

            {/* Learning Objectives Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="rounded-md border border-hairline bg-surface-hover/30 p-4 space-y-2">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-brand-500" />
                  Target Learning Objectives
                </h3>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {enhancedData.learningObjectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md border border-hairline bg-surface-hover/30 p-4 space-y-2">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-brand-500" />
                  Core Focus & Evaluation Areas
                </h3>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {enhancedData.focusAreas.map((area, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ListOrdered className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Refined Detailed Prompt */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Refined AI Generation Prompt</span>
                <span className="text-[10.5px] text-muted-foreground font-normal">
                  Editable if you wish to add specific requirements
                </span>
              </label>
              <textarea
                value={editableRefinedPrompt}
                onChange={(e) => setEditableRefinedPrompt(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-hairline bg-surface p-3 text-xs text-foreground font-mono leading-relaxed focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-hairline">
              <Button
                onClick={() => setStep('input')}
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-md text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Adjust Parameters</span>
              </Button>

              <Button
                onClick={handleStartGeneration}
                disabled={isGenerating}
                size="sm"
                className="gap-2 rounded-md text-xs px-5 bg-brand-500 hover:bg-brand-600 text-white font-semibold"
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{isGenerating ? 'Synthesizing Quiz...' : 'Accept & Start AI Generation'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: GENERATED QUESTIONS & IMMEDIATE ASSIGNMENT WORKFLOW */}
      {/* ========================================================================= */}
      {step === 'generated' && generatedQuiz && (
        <div className="space-y-6">
          {/* Quiz Header & Metrics */}
          <div className="bg-surface border border-hairline rounded-md p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-brand-600 tracking-wider">
                {generatedQuiz.category} · {generatedQuiz.difficulty}
              </span>
              <h2 className="text-base font-bold text-foreground mt-0.5">
                {generatedQuiz.title}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                {generatedQuiz.description}
              </p>
            </div>

            <div className="flex items-center gap-3 bg-surface-hover/40 p-2.5 rounded-md border border-hairline">
              <div className="text-center px-2">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Time</div>
                <div className="text-xs font-bold text-foreground mt-0.5">
                  {generatedQuiz.timeLimitMinutes} mins
                </div>
              </div>
              <div className="w-px h-6 bg-hairline" />
              <div className="text-center px-2">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Passing</div>
                <div className="text-xs font-bold text-brand-600 mt-0.5">
                  {generatedQuiz.passingScorePct}%
                </div>
              </div>
              <div className="w-px h-6 bg-hairline" />
              <div className="text-center px-2">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Reward</div>
                <div className="text-xs font-bold text-amber-500 mt-0.5">
                  +{generatedQuiz.xpReward} XP
                </div>
              </div>
            </div>
          </div>

          {/* Questions Review */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Generated Questions Preview ({generatedQuiz.questions.length})
            </h3>

            {generatedQuiz.questions.map((q, idx) => (
              <div
                key={idx}
                className="bg-surface border border-hairline rounded-md p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-bold text-foreground">
                    Q{idx + 1}. {q.prompt}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-hover border border-hairline">
                    {q.points || 10} pts
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = q.correctOptionIndex === optIdx;
                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center gap-2 p-2 rounded-md border text-xs ${
                          isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold'
                            : 'bg-surface-hover/20 border-hairline text-foreground'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] shrink-0 ${
                            isCorrect
                              ? 'bg-emerald-500 text-white'
                              : 'bg-surface border border-hairline text-muted-foreground'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <p className="text-[11px] text-muted-foreground bg-surface-hover/30 p-2 rounded-md border border-hairline">
                    💡 <strong>Insight:</strong> {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Assignment & Distribution Workflow Section */}
          <div className="bg-surface border border-hairline rounded-md p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-hairline">
              <div className="p-1.5 rounded-md bg-brand-500/10 text-brand-500">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Challenge Distribution Workflow
                </h3>
                <p className="text-xs text-muted-foreground">
                  Choose employee audience and assignment schedule
                </p>
              </div>
            </div>

            {/* Scope Selector: All Employees vs Specific */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                onClick={() => setAssignAll(true)}
                className={`p-4 rounded-md border cursor-pointer transition-all ${
                  assignAll
                    ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500/30'
                    : 'border-hairline bg-surface hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-brand-500" />
                    Assign to All Employees (Company-wide)
                  </span>
                  {assignAll && <CheckCircle2 className="w-4 h-4 text-brand-500" />}
                </div>
                <p className="text-[11.5px] text-muted-foreground mt-1">
                  Instantly challenge every active team member across all departments.
                </p>
              </div>

              <div
                onClick={() => setAssignAll(false)}
                className={`p-4 rounded-md border cursor-pointer transition-all ${
                  !assignAll
                    ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500/30'
                    : 'border-hairline bg-surface hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-brand-500" />
                    Select Specific Employees
                  </span>
                  {!assignAll && <CheckCircle2 className="w-4 h-4 text-brand-500" />}
                </div>
                <p className="text-[11.5px] text-muted-foreground mt-1">
                  Handpick targeted individuals or specific team cohorts.
                </p>
              </div>
            </div>

            {/* Specific employee picker if assignAll is false */}
            {!assignAll && (
              <div className="space-y-2 border border-hairline rounded-md bg-surface p-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Search employees by name or email..."
                    className="w-full bg-surface-hover/50 border border-hairline rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground focus:outline-none"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 divide-y divide-hairline">
                  {filteredEmployees.map((emp) => {
                    const isSelected = selectedEmployeeIds.includes(emp._id);
                    return (
                      <div
                        key={emp._id}
                        onClick={() => toggleEmployee(emp._id)}
                        className="flex items-center justify-between p-2 hover:bg-surface-hover rounded cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-hairline text-brand-500 pointer-events-none"
                          />
                          <span className="text-xs font-medium text-foreground">
                            {emp.firstName} {emp.lastName}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{emp.workEmail}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completion Deadline */}
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <FormField label="Completion Deadline (Optional)" className="flex-1">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="rounded-md text-xs"
                />
              </FormField>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-hairline">
              <Button
                onClick={() => setStep('enhanced')}
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-md text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </Button>

              <Button
                onClick={handlePublishAndAssign}
                disabled={isPublishing}
                size="sm"
                className="gap-2 rounded-md text-xs px-6 bg-brand-500 hover:bg-brand-600 text-white font-semibold"
              >
                {isPublishing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>
                  {isPublishing
                    ? 'Publishing & Assigning...'
                    : assignAll
                    ? 'Publish & Assign to All Employees'
                    : `Publish & Assign (${selectedEmployeeIds.length} Selected)`}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: SUCCESS CONFIRMATION & ENTER ARENA */}
      {/* ========================================================================= */}
      {step === 'success' && (
        <div className="bg-surface border border-hairline rounded-md p-8 text-center max-w-xl mx-auto space-y-6">
          <div className="inline-flex p-4 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-500">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-foreground">Challenge Live & Assigned!</h2>
            <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
              Your AI-generated quiz has been published and successfully assigned to{' '}
              <strong className="text-foreground">{assignedCount} employees</strong>.
              Notifications and challenges have been registered in their Quiz Arena workspace.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => navigate('/quizzes')}
              className="gap-2 rounded-md text-xs px-5 bg-amber-500 hover:bg-amber-600 text-white font-bold"
            >
              <Trophy className="w-4 h-4" />
              <span>Enter Quiz Arena</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>

            <Button
              onClick={handleReset}
              variant="outline"
              className="gap-1.5 rounded-md text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Create Another Quiz</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

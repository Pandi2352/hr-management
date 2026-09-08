import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  User,
  CreditCard,
  FileCheck,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/toast';
import { onboardingApi } from '../api/onboarding.api';
import type { OnboardingSession } from '../types/onboarding.types';

export function EmployeeSelfOnboardingPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Personal & Emergency
  const [personalForm, setPersonalForm] = useState({
    phone: '',
    personalEmail: '',
    emergencyName: '',
    emergencyRelationship: 'Spouse',
    emergencyPhone: '',
  });

  // Step 2: Bank Details
  const [bankForm, setBankForm] = useState({
    bankName: 'HDFC Bank',
    accountNumber: '',
    ifsc: '',
    accountHolderName: '',
  });

  // Step 4: Policy Signatures
  const [policyAccepted, setPolicyAccepted] = useState(false);

  useEffect(() => {
    async function loadMyOnboarding() {
      try {
        setIsLoading(true);
        const data = await onboardingApi.getCandidateOnboarding();
        setSession(data);
        if (data.employee) {
          setPersonalForm((prev) => ({
            ...prev,
            phone: data.employee?.phone || '',
            personalEmail: data.employee?.personalEmail || '',
          }));
        }
      } catch (err: any) {
        // If not candidate, inform gracefully
        toast.info(err.response?.data?.message || 'Unable to load candidate onboarding session');
      } finally {
        setIsLoading(false);
      }
    }
    loadMyOnboarding();
  }, []);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onboardingApi.submitCandidateStep({
        step: 'PERSONAL',
        data: {
          phone: personalForm.phone,
          personalEmail: personalForm.personalEmail,
          emergencyContacts: [
            {
              name: personalForm.emergencyName,
              relationship: personalForm.emergencyRelationship,
              phone: personalForm.emergencyPhone,
              isPrimary: true,
            },
          ],
        },
      });
      toast.success('Personal & Emergency details submitted!');
      setCurrentStep(2);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onboardingApi.submitCandidateStep({
        step: 'BANK',
        data: bankForm,
      });
      toast.success('Bank credentials submitted for payroll verification!');
      setCurrentStep(3);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep4Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyAccepted) {
      toast.error('Please accept and digitally sign the employee handbook and IT policy');
      return;
    }
    try {
      setIsSubmitting(true);
      await onboardingApi.submitCandidateStep({
        step: 'POLICY',
        data: { signedAt: new Date().toISOString() },
      });
      toast.success('🎉 Digital Onboarding completed! Welcome aboard.');
      navigate('/dashboard/employee');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to complete digital sign-off');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: 'Identity & Emergency', icon: User },
    { num: 2, title: 'Salary Bank Account', icon: CreditCard },
    { num: 3, title: 'Document Vault', icon: FileCheck },
    { num: 4, title: 'Policies & Digital Sign', icon: ShieldCheck },
  ];

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-violet-500 border-t-transparent" />
        <p className="mt-3 text-xs text-slate-500">Loading your candidate portal...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-violet-700 bg-violet-100 dark:bg-violet-950/60 dark:text-violet-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>PeopleOS Candidate Onboarding</span>
        </div>
        <h1 className="font-outfit text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Welcome to the Team! Let&apos;s Get You Set Up.
        </h1>
        <p className="font-jakarta text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          Complete the 4 steps below so HR can clear your credentials, issue your hardware, and finalize your account
          {session?.targetJoiningDate ? ` before your target start date (${session.targetJoiningDate})` : ''}.
        </p>
      </div>

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-4 gap-2">
        {steps.map((s) => {
          const Icon = s.icon;
          const isDone = currentStep > s.num;
          const isCurrent = currentStep === s.num;
          return (
            <div
              key={s.num}
              className={`p-3 rounded-md border text-center transition-all ${
                isCurrent
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                  : isDone
                  ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-600'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span className="text-xs font-bold font-mono">0{s.num}</span>
              </div>
              <span className="text-[11px] font-semibold block truncate">
                {s.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Wizard Form Container */}
      <div className="p-6 sm:p-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* STEP 1: Personal & Emergency */}
        {currentStep === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
              Step 1: Contact & Emergency Information
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Please verify your personal contact number and assign at least one primary emergency contact.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Mobile Number
                </label>
                <Input
                  value={personalForm.phone}
                  onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Personal Email (for offboarding/records)
                </label>
                <Input
                  type="email"
                  value={personalForm.personalEmail}
                  onChange={(e) => setPersonalForm({ ...personalForm, personalEmail: e.target.value })}
                  placeholder="name@personal.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Emergency Contact Name
                </label>
                <Input
                  value={personalForm.emergencyName}
                  onChange={(e) => setPersonalForm({ ...personalForm, emergencyName: e.target.value })}
                  placeholder="e.g. Jane Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Emergency Contact Phone
                </label>
                <Input
                  value={personalForm.emergencyPhone}
                  onChange={(e) => setPersonalForm({ ...personalForm, emergencyPhone: e.target.value })}
                  placeholder="+1 (555) 999-9999"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                <span>Save & Continue</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </form>
        )}

        {/* STEP 2: Bank & Payroll */}
        {currentStep === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-4">
            <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
              Step 2: Salary Bank Account Details
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your compensation will be deposited directly into this account. Ensure the details match your bank records.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bank Name
                </label>
                <Input
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Holder Full Name
                </label>
                <Input
                  value={bankForm.accountHolderName}
                  onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                  placeholder="As printed on bank statement"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Number
                </label>
                <Input
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  placeholder="e.g. 10029384812"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  IFSC / Routing / Swift Code
                </label>
                <Input
                  value={bankForm.ifsc}
                  onChange={(e) => setBankForm({ ...bankForm, ifsc: e.target.value })}
                  placeholder="e.g. HDFC0001234"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                <span>Previous</span>
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                <span>Save & Continue</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </form>
        )}

        {/* STEP 3: Document Vault Verification */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
              Step 3: Document Vault Verification
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              HR will review your uploaded identification and education certificates.
            </p>

            <div className="p-4 rounded-md bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200/60 dark:border-violet-800/60 text-xs space-y-2">
              <span className="font-semibold text-violet-800 dark:text-violet-300 flex items-center gap-1.5">
                <FileCheck className="h-4 w-4" />
                Required Verification Documents:
              </span>
              <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                <li>Government National ID (Aadhaar / SSN / Passport)</li>
                <li>Highest Degree Certificate or Final Transcript</li>
                <li>Signed Copy of Appointment Offer Letter</li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                <span>Previous</span>
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={() => setCurrentStep(4)}>
                <span>Proceed to Policy Sign-off</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Policy Acknowledgment & Digital Sign */}
        {currentStep === 4 && (
          <form onSubmit={handleStep4Submit} className="space-y-4">
            <h3 className="font-outfit text-base font-bold text-slate-900 dark:text-white">
              Step 4: Corporate Policies & Digital Sign-off
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Please review our corporate standards and confirm your electronic signature.
            </p>

            <div className="p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-3">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                1. Information Security & Zero-Trust IT Acceptable Use
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Corporate hardware, passwords, and intellectual assets remain the exclusive property of Nexora Technologies. Employees agree never to store unencrypted customer data on personal devices or share authentication keys.
              </p>
              <div className="font-bold text-slate-800 dark:text-slate-200 pt-1">
                2. Code of Conduct & Workplace Anti-Harassment
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Nexora enforces a zero-tolerance policy against discrimination, harassment, and conflicts of interest.
              </p>
            </div>

            <div className="flex items-start gap-2.5 pt-2">
              <input
                type="checkbox"
                id="policyConsent"
                checked={policyAccepted}
                onChange={(e) => setPolicyAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <label htmlFor="policyConsent" className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                I hereby acknowledge that I have read, understood, and agree to abide by the <strong>Employee Handbook</strong>, <strong>Information Security Guidelines</strong>, and <strong>Code of Business Conduct</strong>.
              </label>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setCurrentStep(3)}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                <span>Previous</span>
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                <span>Complete Digital Onboarding</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

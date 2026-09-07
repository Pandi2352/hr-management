import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SelectField } from '../../../components/ui/SelectField';
import { Form, FormField } from '../../../components/forms';
import { Briefcase, MapPin, DollarSign, Sparkles } from 'lucide-react';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateJob: (jobData: any) => Promise<void> | void;
}

export const CreateJobModal: React.FC<CreateJobModalProps> = ({
  isOpen,
  onClose,
  onCreateJob,
}) => {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [employmentType, setEmploymentType] = useState('Full-Time');
  const [experienceLevel, setExperienceLevel] = useState('Mid-Senior');
  const [salaryRange, setSalaryRange] = useState('$120K - $160K');
  const [location, setLocation] = useState('Remote (Global)');
  const [overview, setOverview] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [requirements, setRequirements] = useState('');
  const [benefits, setBenefits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onCreateJob({
        title: title.trim(),
        department,
        employmentType,
        experienceLevel,
        salaryRange,
        location,
        overview: overview.trim() || `Exciting opportunity for a ${title} to join our growing team.`,
        responsibilities: responsibilities
          ? responsibilities.split('\n').map((s) => s.trim()).filter(Boolean)
          : undefined,
        requirements: requirements
          ? requirements.split('\n').map((s) => s.trim()).filter(Boolean)
          : undefined,
        benefits: benefits
          ? benefits.split('\n').map((s) => s.trim()).filter(Boolean)
          : undefined,
      });
      // Reset form
      setTitle('');
      setOverview('');
      setResponsibilities('');
      setRequirements('');
      setBenefits('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to create job requisition.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Job Requisition" className="max-w-2xl">
      <Form onSubmit={handleSubmit} className="space-y-4 pt-1 max-h-[80vh] overflow-y-auto pr-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Publish a new job opening to the company database and make it instantly live on the Public Careers portal.
        </p>

        {errorMsg && (
          <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Job Title */}
        <FormField>
          <Input
            label="Job Title"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Staff Full-Stack Engineer"
            leftIcon={<Briefcase className="h-3.5 w-3.5" />}
          />
        </FormField>

        {/* Department & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField>
            <SelectField
              label="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              options={[
                { value: 'Engineering', label: 'Engineering' },
                { value: 'Design', label: 'Design' },
                { value: 'Product', label: 'Product' },
                { value: 'DevOps & Infra', label: 'DevOps & Infra' },
                { value: 'People Operations', label: 'People Operations' },
                { value: 'Finance & Operations', label: 'Finance & Operations' },
                { value: 'Marketing & Sales', label: 'Marketing & Sales' },
              ]}
            />
          </FormField>

          <FormField>
            <Input
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Remote, San Francisco, CA"
              leftIcon={<MapPin className="h-3.5 w-3.5" />}
            />
          </FormField>
        </div>

        {/* Employment Type, Experience Level & Salary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField>
            <SelectField
              label="Employment Type"
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              options={[
                { value: 'Full-Time', label: 'Full-Time' },
                { value: 'Part-Time', label: 'Part-Time' },
                { value: 'Contract', label: 'Contract' },
                { value: 'Internship', label: 'Internship' },
              ]}
            />
          </FormField>

          <FormField>
            <SelectField
              label="Experience Level"
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              options={[
                { value: 'Entry-Level', label: 'Entry-Level' },
                { value: 'Mid-Level', label: 'Mid-Level' },
                { value: 'Senior', label: 'Senior' },
                { value: 'Lead / Staff', label: 'Lead / Staff' },
                { value: 'Executive', label: 'Executive' },
              ]}
            />
          </FormField>

          <FormField>
            <Input
              label="Salary Range"
              value={salaryRange}
              onChange={(e) => setSalaryRange(e.target.value)}
              placeholder="e.g. $120K - $160K"
              leftIcon={<DollarSign className="h-3.5 w-3.5" />}
            />
          </FormField>
        </div>

        {/* Job Overview */}
        <FormField>
          <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-500 mb-1">
            Role Overview & Mission <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            value={overview}
            onChange={(e) => setOverview(e.target.value)}
            rows={2}
            placeholder="Brief high-level summary of the role, team context, and key impact..."
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-violet-500"
          />
        </FormField>

        {/* Responsibilities & Requirements */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField>
            <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-500 mb-1">
              Key Responsibilities (one per line)
            </label>
            <textarea
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              rows={3}
              placeholder="Architect scalable services&#10;Lead sprint planning&#10;Mentor engineers"
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-violet-500"
            />
          </FormField>

          <FormField>
            <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-500 mb-1">
              Requirements (one per line)
            </label>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={3}
              placeholder="4+ years with TypeScript & React&#10;Experience with microservices&#10;Strong communication skills"
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-violet-500"
            />
          </FormField>
        </div>

        {/* Benefits & Perks */}
        <FormField>
          <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-500 mb-1">
            Role Perks & Benefits (one per line)
          </label>
          <textarea
            value={benefits}
            onChange={(e) => setBenefits(e.target.value)}
            rows={2}
            placeholder="100% remote flexibility&#10;Comprehensive healthcare&#10;$2,500 learning stipend"
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-violet-500"
          />
        </FormField>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting}
            disabled={!title.trim() || isSubmitting}
            className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Publish Job Requisition</span>
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

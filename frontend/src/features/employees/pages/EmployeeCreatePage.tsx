import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Building2,
  Mail,
  GraduationCap,
  FileCheck2,
} from 'lucide-react';
import { Button, Input, SelectField } from '../../../components/ui';
import { CredentialsModal } from '../components/CredentialsModal';
import { useToast } from '../../../components/ui/toast';
import { employeesApi } from '../api/employees.api';
import { organizationApi } from '../../organization/api/organization.api';
import type { Department, Designation, LocationItem } from '../../organization/types/organization.types';
import type { Employee } from '../types/employees.types';

const WIZARD_STEPS = [
  { id: 1, title: 'Identity', icon: User, desc: 'Personal Information' },
  { id: 2, title: 'Employment', icon: Building2, desc: 'Department & Role' },
  { id: 3, title: 'Contact', icon: Mail, desc: 'Communication & Address' },
  { id: 4, title: 'Skills & History', icon: GraduationCap, desc: 'Education & Career' },
  { id: 5, title: 'Review', icon: FileCheck2, desc: 'Confirm & Onboard' },
];

export function EmployeeCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    employeeId: string;
    displayName: string;
    employeeCode: string;
    workEmail: string;
    personalEmail?: string;
    initialPassword?: string;
  } | null>(null);

  // References
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [potentialManagers, setPotentialManagers] = useState<Employee[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Identity
    firstName: '',
    lastName: '',
    middleName: '',
    displayName: '',
    gender: 'Male',
    dateOfBirth: '',
    maritalStatus: 'Single',
    nationality: '',
    avatarUrl: '',

    // Step 2: Employment
    employeeCode: '',
    departmentId: '',
    designationId: '',
    locationId: '',
    costCenterId: '',
    managerId: '',
    employmentType: 'FULL_TIME' as const,
    status: 'ACTIVE' as const,
    joiningDate: new Date().toISOString().split('T')[0],

    // Step 3: Contact
    workEmail: '',
    personalEmail: '',
    phone: '',
    currentAddress: {
      addressLine1: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
    },
    emergencyContact: {
      name: '',
      relationship: 'Spouse',
      phone: '',
    },

    // Step 4: Skills & Education
    primarySkill: '',
    degree: '',
    institution: '',
    previousCompany: '',
    previousRole: '',
  });

  useEffect(() => {
    async function loadRefs() {
      try {
        const [depts, desigs, locs, emps] = await Promise.all([
          organizationApi.getDepartments(),
          organizationApi.getDesignations(),
          organizationApi.getLocations(),
          employeesApi.getEmployees({ pageSize: 50 }),
        ]);
        setDepartments(depts || []);
        setDesignations(desigs || []);
        setLocations(locs || []);
        setPotentialManagers(emps.data || []);

        // Pre-select first options if available
        if (depts && depts.length > 0) setFormData((prev) => ({ ...prev, departmentId: depts[0]._id }));
        if (desigs && desigs.length > 0) setFormData((prev) => ({ ...prev, designationId: desigs[0]._id }));
        if (locs && locs.length > 0) setFormData((prev) => ({ ...prev, locationId: locs[0]._id }));
      } catch {
        // Non-blocking
      }
    }
    loadRefs();
  }, []);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      currentAddress: { ...prev.currentAddress, [field]: value },
    }));
  };

  const handleEmergencyChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContact: { ...prev.emergencyContact, [field]: value },
    }));
  };

  const handleNext = () => {
    const errors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.firstName.trim()) {
        errors.firstName = 'First name is required';
      }
      if (!formData.lastName.trim()) {
        errors.lastName = 'Last name is required';
      }
    } else if (currentStep === 2) {
      if (!formData.departmentId) {
        errors.departmentId = 'Department assignment is required';
      }
      if (!formData.designationId) {
        errors.designationId = 'Designation is required';
      }
      if (!formData.locationId) {
        errors.locationId = 'Office location is required';
      }
      if (!formData.joiningDate) {
        errors.joiningDate = 'Date of joining is required';
      }
    } else if (currentStep === 3) {
      if (!formData.personalEmail.trim()) {
        errors.personalEmail = 'Personal email is required for onboarding dispatch';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalEmail.trim())) {
        errors.personalEmail = 'Please enter a valid email address';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.departmentId) errors.departmentId = 'Department assignment is required';
    if (!formData.designationId) errors.designationId = 'Designation is required';
    if (!formData.locationId) errors.locationId = 'Office location is required';
    if (!formData.joiningDate) errors.joiningDate = 'Date of joining is required';
    if (!formData.personalEmail.trim()) {
      errors.personalEmail = 'Personal email is required for onboarding dispatch';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalEmail.trim())) {
      errors.personalEmail = 'Please enter a valid email address';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.firstName || errors.lastName) {
        setCurrentStep(1);
      } else if (errors.departmentId || errors.designationId || errors.locationId || errors.joiningDate) {
        setCurrentStep(2);
      } else if (errors.personalEmail) {
        setCurrentStep(3);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName,
        displayName: formData.displayName || `${formData.firstName} ${formData.lastName}`.trim(),
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        maritalStatus: formData.maritalStatus,
        nationality: formData.nationality,
        avatarUrl: formData.avatarUrl || undefined,

        employeeCode: formData.employeeCode || undefined,
        departmentId: formData.departmentId || undefined,
        designationId: formData.designationId || undefined,
        locationId: formData.locationId || undefined,
        costCenterId: formData.costCenterId || undefined,
        managerId: formData.managerId || undefined,
        employmentType: formData.employmentType,
        status: formData.status,
        joiningDate: formData.joiningDate,

        workEmail: formData.workEmail.trim() || undefined,
        personalEmail: formData.personalEmail.trim() || undefined,
        phone: formData.phone || undefined,
        currentAddress: formData.currentAddress,
        emergencyContacts: formData.emergencyContact.name
          ? [{ ...formData.emergencyContact, isPrimary: true }]
          : [],

        education: formData.degree
          ? [{ institution: formData.institution || 'University', degree: formData.degree, startDate: '2016', endDate: '2020' }]
          : [],
        experience: formData.previousCompany
          ? [{ company: formData.previousCompany, role: formData.previousRole || 'Specialist', startDate: '2020', endDate: '2023' }]
          : [],
        skills: formData.primarySkill
          ? [{ name: formData.primarySkill, proficiency: 'EXPERT' as const }]
          : [],
      };

      const created = await employeesApi.createEmployee(payload);
      toast.success(`${created.displayName || created.firstName} has been created with code ${created.employeeCode}.`, 'Employee Onboarded');
      setCreatedCredentials({
        employeeId: created._id,
        displayName: created.displayName || `${created.firstName} ${created.lastName}`,
        employeeCode: created.employeeCode,
        workEmail: created.workEmail,
        personalEmail: created.personalEmail,
        initialPassword: created.initialPassword,
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create employee profile.', 'Creation Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              New Employee Onboarding Wizard
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete the steps to register a new organizational team member.
            </p>
          </div>
        </div>
      </div>

      {/* Stepper Timeline Header */}
      <div className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="grid grid-cols-5 gap-2">
          {WIZARD_STEPS.map((step) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <div
                key={step.id}
                className={`flex flex-col items-center text-center p-2 rounded-md transition-colors ${
                  isCurrent
                    ? 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
                    : ''
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-[#524b6e] text-white'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={`mt-1.5 text-xs font-semibold ${
                    isCurrent
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {step.title}
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">{step.desc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content Container */}
      <div className="rounded-md border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 space-y-6">
        {/* STEP 1: IDENTITY */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] text-[#524b6e] dark:text-indigo-400">
              Personal Identity Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <Input
                label="First Name"
                required
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="e.g. Marcus"
                error={fieldErrors.firstName}
              />
              <Input
                label="Last Name"
                required
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="e.g. Chen"
                error={fieldErrors.lastName}
              />
              <Input
                label="Preferred / Display Name"
                value={formData.displayName}
                onChange={(e) => handleChange('displayName', e.target.value)}
                placeholder="e.g. Mark Chen"
              />
              <SelectField
                label="Gender"
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Non-Binary', label: 'Non-Binary' },
                  { value: 'Other', label: 'Prefer not to say' },
                ]}
              />
              <Input
                label="Date of Birth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
              />
              <Input
                label="Nationality"
                value={formData.nationality}
                onChange={(e) => handleChange('nationality', e.target.value)}
                placeholder="e.g. Canadian"
              />
            </div>
          </div>
        )}

        {/* STEP 2: EMPLOYMENT */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] text-[#524b6e] dark:text-indigo-400">
              Department & Position Assignment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="text-[11px] font-medium tracking-wide uppercase text-slate-500">
                  Employee Code (Optional, Auto-Generated if blank)
                </label>
                <Input
                  value={formData.employeeCode}
                  onChange={(e) => handleChange('employeeCode', e.target.value)}
                  placeholder="e.g. EMP-00101"
                  className="mt-1 uppercase font-mono"
                />
              </div>
              <SelectField
                label="Department Assignment"
                required
                value={formData.departmentId}
                onChange={(e) => handleChange('departmentId', e.target.value)}
                placeholder="Select Department..."
                options={departments.map((d) => ({
                  value: d._id,
                  label: `${d.name} (${d.code})`,
                }))}
                error={fieldErrors.departmentId}
              />
              <SelectField
                label="Job Designation & Seniority Grade"
                required
                value={formData.designationId}
                onChange={(e) => handleChange('designationId', e.target.value)}
                placeholder="Select Designation..."
                options={designations.map((d) => ({
                  value: d._id,
                  label: `${d.title} (Grade ${d.grade})`,
                }))}
                error={fieldErrors.designationId}
              />
              <SelectField
                label="Office Location"
                required
                value={formData.locationId}
                onChange={(e) => handleChange('locationId', e.target.value)}
                placeholder="Select Location..."
                options={locations.map((l) => ({
                  value: l._id,
                  label: `${l.name} — ${l.city}`,
                }))}
                error={fieldErrors.locationId}
              />
              <SelectField
                label="Direct Reporting Manager"
                value={formData.managerId}
                onChange={(e) => handleChange('managerId', e.target.value)}
                placeholder="None (Reports to CEO / Board)"
                options={potentialManagers.map((m) => ({
                  value: m._id,
                  label: `${m.displayName || `${m.firstName} ${m.lastName}`} (${m.employeeCode})`,
                }))}
              />
              <SelectField
                label="Employment Type"
                value={formData.employmentType}
                onChange={(e) => handleChange('employmentType', e.target.value)}
                options={[
                  { value: 'FULL_TIME', label: 'Full Time Permanent' },
                  { value: 'PART_TIME', label: 'Part Time' },
                  { value: 'CONTRACT', label: 'Independent Contractor' },
                  { value: 'INTERN', label: 'Internship' },
                ]}
              />
              <Input
                label="Joining Date"
                required
                type="date"
                value={formData.joiningDate}
                onChange={(e) => handleChange('joiningDate', e.target.value)}
                error={fieldErrors.joiningDate}
              />
            </div>
          </div>
        )}

        {/* STEP 3: CONTACT */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] text-[#524b6e] dark:text-indigo-400">
              Corporate & Emergency Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <Input
                label="Personal Email (Onboarding Delivery)"
                required
                type="email"
                value={formData.personalEmail}
                onChange={(e) => handleChange('personalEmail', e.target.value)}
                placeholder="e.g. marcus.chen@gmail.com"
                helperText="Onboarding credentials & portal login URL will be dispatched here."
                error={fieldErrors.personalEmail}
              />
              <div>
                <label className="text-[11px] font-medium tracking-wide uppercase text-slate-500">
                  Corporate Work Email (Auto-Generated if Blank)
                </label>
                <Input
                  type="email"
                  value={formData.workEmail}
                  onChange={(e) => handleChange('workEmail', e.target.value)}
                  placeholder={
                    formData.firstName && formData.lastName
                      ? `e.g. ${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}@peopleos.internal`
                      : 'e.g. firstname.lastname@company.com'
                  }
                  className="mt-1"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Leave blank to auto-generate from employee name.
                </span>
              </div>
              <div>
                <label className="text-[11px] font-medium tracking-wide uppercase text-slate-500">
                  Direct Phone Number
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="e.g. +1 (555) 234-5678"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium tracking-wide uppercase text-slate-500">
                  Residential City
                </label>
                <Input
                  value={formData.currentAddress.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  placeholder="e.g. San Francisco"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium tracking-wide uppercase text-slate-500">
                  Emergency Contact Name
                </label>
                <Input
                  value={formData.emergencyContact.name}
                  onChange={(e) => handleEmergencyChange('name', e.target.value)}
                  placeholder="e.g. Chloe Chen"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium tracking-wide uppercase text-slate-500">
                  Emergency Phone
                </label>
                <Input
                  value={formData.emergencyContact.phone}
                  onChange={(e) => handleEmergencyChange('phone', e.target.value)}
                  placeholder="e.g. +1 (555) 999-0000"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: SKILLS & HISTORY */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] text-[#524b6e] dark:text-indigo-400">
              Qualifications & Competencies
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="text-[11px] font-medium tracking-wide uppercase text-slate-500">
                  Primary Core Competency / Skill
                </label>
                <Input
                  value={formData.primarySkill}
                  onChange={(e) => handleChange('primarySkill', e.target.value)}
                  placeholder="e.g. React & TypeScript"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium tracking-wide uppercase text-slate-500">
                  Highest Degree
                </label>
                <Input
                  value={formData.degree}
                  onChange={(e) => handleChange('degree', e.target.value)}
                  placeholder="e.g. B.S. in Computer Science"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium tracking-wide uppercase text-slate-500">
                  Academic Institution
                </label>
                <Input
                  value={formData.institution}
                  onChange={(e) => handleChange('institution', e.target.value)}
                  placeholder="e.g. University of Waterloo"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium tracking-wide uppercase text-slate-500">
                  Previous Employer / Company
                </label>
                <Input
                  value={formData.previousCompany}
                  onChange={(e) => handleChange('previousCompany', e.target.value)}
                  placeholder="e.g. Shopify Inc."
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW & CONFIRM */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] text-[#524b6e] dark:text-indigo-400">
              Review New Hire Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5 rounded-md bg-slate-50 dark:bg-slate-900 text-xs border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase">Full Name</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formData.firstName} {formData.lastName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase">Corporate Email</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formData.workEmail}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase">Department</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {departments.find((d) => d._id === formData.departmentId)?.name || 'Assigned'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase">Designation</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {designations.find((d) => d._id === formData.designationId)?.title || 'Assigned'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase">Employment Type</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formData.employmentType}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase">Joining Date</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formData.joiningDate}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upon clicking &quot;Complete Onboarding&quot;, the employee profile will be activated in the master directory.
            </p>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={currentStep === 1 ? () => navigate('/employees') : handleBack}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{currentStep === 1 ? 'Cancel' : 'Previous Step'}</span>
          </Button>

          {currentStep < 5 ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleNext}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <span>Next Step</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Onboarding...' : 'Complete Onboarding'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Reusable HR Credentials Sharing Modal */}
      {createdCredentials && (
        <CredentialsModal
          isOpen={!!createdCredentials}
          onClose={() => navigate(`/employees/${createdCredentials.employeeId}`)}
          title="Employee Onboarded & Credentials Generated"
          employeeName={createdCredentials.displayName}
          employeeCode={createdCredentials.employeeCode}
          workEmail={createdCredentials.workEmail}
          initialPassword={createdCredentials.initialPassword}
          personalEmail={createdCredentials.personalEmail}
          onNavigateProfile={() => navigate(`/employees/${createdCredentials.employeeId}`)}
        />
      )}
    </div>
  );
}

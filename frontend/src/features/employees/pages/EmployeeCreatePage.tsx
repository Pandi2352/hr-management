import { useState, useEffect, useRef } from 'react';
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
  Camera,
  X,
  Loader2,
  Info,
} from 'lucide-react';
import { Button, Input, SelectField, Avatar } from '../../../components/ui';
import { CredentialsModal } from '../components/CredentialsModal';
import { useToast } from '../../../components/ui/toast';
import { employeesApi } from '../api/employees.api';
import { organizationApi } from '../../organization/api/organization.api';
import type { Department, Designation, LocationItem } from '../../organization/types/organization.types';
import type { Employee } from '../types/employees.types';

const WIZARD_STEPS = [
  { id: 1, title: 'Identity & Photo', icon: User, desc: 'Personal Info & Photo' },
  { id: 2, title: 'Employment', icon: Building2, desc: 'Department & Role' },
  { id: 3, title: 'Contact Details', icon: Mail, desc: 'Email & Address' },
  { id: 4, title: 'Skills & History', icon: GraduationCap, desc: 'Education & Career' },
  { id: 5, title: 'Review & Confirm', icon: FileCheck2, desc: 'Final Verification' },
];

export function EmployeeCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
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
    // Step 1: Identity & Avatar
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

  // Avatar Upload Handlers
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WebP).', 'Invalid File');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar file size cannot exceed 5MB.', 'File Too Large');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const res = await employeesApi.uploadPreHireAvatar(file);
      setFormData((prev) => ({ ...prev, avatarUrl: res.avatarUrl }));
      toast.success('Profile picture attached to employee record.', 'Photo Ready');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upload photo.', 'Upload Failed');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    setFormData((prev) => ({ ...prev, avatarUrl: '' }));
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
      {/* 1. TOP TITLE HEADER CARD - PROFESSIONAL ENTERPRISE LOOK */}
      <div className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => navigate('/employees')}
              className="p-2 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              title="Return to employee roster"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Add New Employee
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Register organizational profile, upload profile photo, assign role, and dispatch credentials.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="text-right">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Completion Progress
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Step {currentStep} of 5 ({Math.round((currentStep / 5) * 100)}%)
              </span>
            </div>
            <div className="w-24 sm:w-28 h-2 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden border border-slate-200 dark:border-slate-800">
              <div
                className="h-full bg-[#524b6e] dark:bg-indigo-600 transition-all duration-300 rounded-md"
                style={{ width: `${(currentStep / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. STEPPER TIMELINE NAVIGATION - UNIFIED PROFESSIONAL THEME */}
      <div className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="grid grid-cols-5 gap-2">
          {WIZARD_STEPS.map((step) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (step.id < currentStep) setCurrentStep(step.id);
                }}
                disabled={step.id > currentStep}
                className={`flex flex-col items-center text-center p-2.5 rounded-md transition-colors border text-left ${
                  isCurrent
                    ? 'border-[#524b6e] bg-[#524b6e]/5 dark:border-indigo-400 dark:bg-indigo-950/20'
                    : isCompleted
                    ? 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/40 cursor-pointer'
                    : 'border-transparent bg-transparent opacity-50 cursor-not-allowed'
                }`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-[#524b6e] text-white dark:bg-indigo-600'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span
                  className={`mt-1.5 text-xs font-semibold ${
                    isCurrent
                      ? 'text-[#524b6e] dark:text-indigo-400 font-bold'
                      : isCompleted
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {step.title}
                </span>
                <span className="text-[10px] text-slate-400 hidden md:inline truncate max-w-full">
                  {step.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. STEP FORM CONTAINER - CONSISTENT ENTERPRISE STYLING */}
      <div className="rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
        {/* STEP 1: IDENTITY & PHOTO */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-[#524b6e] text-white dark:bg-indigo-600">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Personal Identity &amp; Profile Picture
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Enter basic employee credentials and upload square profile photo
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                Step 1 of 5
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* Profile Picture Upload Card */}
              <div className="p-4 rounded-md border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
                <label className="text-[11px] font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300 block mb-2">
                  Profile Photo (Square Format)
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="relative group shrink-0">
                    <Avatar
                      src={formData.avatarUrl || null}
                      name={formData.displayName || `${formData.firstName} ${formData.lastName}`.trim() || 'New Employee'}
                      size="xl"
                      className="rounded-md border border-slate-300 dark:border-slate-700"
                    />
                    {formData.avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="absolute -top-1.5 -right-1.5 p-1 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors border border-white dark:border-slate-900 cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={avatarInputRef}
                        onChange={handleAvatarSelect}
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="flex items-center gap-1.5 cursor-pointer text-xs"
                      >
                        {isUploadingAvatar ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Uploading Photo...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="h-3.5 w-3.5" />
                            <span>{formData.avatarUrl ? 'Change Photo' : 'Upload Profile Photo'}</span>
                          </>
                        )}
                      </Button>
                      {formData.avatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="text-xs text-rose-600 hover:text-rose-700 underline font-medium cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Supports JPG, PNG, WebP up to 5MB. Photo is formatted in square with rounded corners. Employee or HR can also change photo at any time from their profile.
                    </p>
                  </div>
                </div>
              </div>

              {/* Personal Details Form Grid */}
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
          </div>
        )}

        {/* STEP 2: EMPLOYMENT & POSITION */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-[#524b6e] text-white dark:bg-indigo-600">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Department &amp; Position Assignment
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Organizational structure, job title grading, location and direct report manager
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                Step 2 of 5
              </span>
            </div>

            <div className="p-6 space-y-6">
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
                  placeholder="None (Reports to Executive / Board)"
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
          </div>
        )}

        {/* STEP 3: CONTACT & DISPATCH */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-[#524b6e] text-white dark:bg-indigo-600">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Communication &amp; Credential Dispatch
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Personal onboarding destination, corporate email domain, and emergency contact
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                Step 3 of 5
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* Neutral Callout Box */}
              <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  <strong>Notice:</strong> Initial system temporary password and portal invitation will be emailed to the personal address. Corporate work email will be auto-generated if left blank.
                </p>
              </div>

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
          </div>
        )}

        {/* STEP 4: SKILLS & HISTORY */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-[#524b6e] text-white dark:bg-indigo-600">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Qualifications &amp; Competencies
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Academic pedigree, previous employer history, and primary skill set
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                Step 4 of 5
              </span>
            </div>

            <div className="p-6 space-y-6">
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
          </div>
        )}

        {/* STEP 5: REVIEW & CONFIRM */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-[#524b6e] text-white dark:bg-indigo-600">
                  <FileCheck2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Review New Hire Information
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Please review candidate profile details before dispatching credentials
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                Step 5 of 5
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* Candidate Overview Card with Photo */}
              <div className="p-4 rounded-md border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar
                    src={formData.avatarUrl || null}
                    name={formData.displayName || `${formData.firstName} ${formData.lastName}`}
                    size="xl"
                    className="rounded-md border border-slate-300 dark:border-slate-700 shrink-0"
                  />
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {formData.firstName} {formData.lastName}
                      {formData.displayName && (
                        <span className="text-xs font-normal text-slate-500 ml-1.5">
                          (&quot;{formData.displayName}&quot;)
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {designations.find((d) => d._id === formData.designationId)?.title || 'Designation'} •{' '}
                      {departments.find((d) => d._id === formData.departmentId)?.name || 'Department'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                        {formData.employmentType}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                        Joining: {formData.joiningDate}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs cursor-pointer"
                >
                  Edit Identity
                </Button>
              </div>

              {/* Data Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-md border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    Onboarding Email
                  </span>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {formData.personalEmail}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Credentials will be emailed here
                  </span>
                </div>

                <div className="p-4 rounded-md border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    Work Email Address
                  </span>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-mono">
                    {formData.workEmail || 'Auto-generated upon creation'}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Internal organization account
                  </span>
                </div>

                <div className="p-4 rounded-md border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    Office Location
                  </span>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {locations.find((l) => l._id === formData.locationId)?.name || 'Assigned Office'}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {locations.find((l) => l._id === formData.locationId)?.city || 'Primary campus'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upon clicking <strong>&quot;Complete Onboarding&quot;</strong>, the employee record will be provisioned, temporary login credentials created, and the profile activated in the directory.
              </p>
            </div>
          </div>
        )}

        {/* 4. FOOTER NAVIGATION CONTROLS */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={currentStep === 1 ? () => navigate('/employees') : handleBack}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 cursor-pointer text-xs"
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
              className="flex items-center gap-1.5 cursor-pointer text-xs"
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
              className="flex items-center gap-1.5 cursor-pointer text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Onboarding...' : 'Complete Onboarding'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* 5. CREDENTIALS MODAL */}
      {createdCredentials && (
        <CredentialsModal
          isOpen={!!createdCredentials}
          onClose={() => navigate(`/employees/${createdCredentials.employeeId}`)}
          title="Employee Onboarded &amp; Credentials Generated"
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

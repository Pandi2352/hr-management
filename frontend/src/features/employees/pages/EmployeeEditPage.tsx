import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Camera, Loader2, Sparkles, Lock } from 'lucide-react';
import { Button, Input, SelectField, Avatar } from '../../../components/ui';
import { useToast } from '../../../components/ui/toast';
import { useAuth } from '../../auth/context/AuthContext';
import { employeesApi } from '../api/employees.api';
import { organizationApi } from '../../organization/api/organization.api';
import type { Department, Designation, LocationItem } from '../../organization/types/organization.types';
import type { Employee } from '../types/employees.types';

export function EmployeeEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const { user } = useAuth();
  const isHrOrAdmin = Boolean(
    user?.roles?.some((r) =>
      ['ADMIN', 'HR', 'HR_ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN', 'Admin', 'HR Manager', 'HR Admin'].includes(r)
    ) ||
    user?.permissions?.includes('EMPLOYEE_UPDATE') ||
    user?.permissions?.includes('EMPLOYEE_CREATE')
  );

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState<boolean>(false);

  // Editable Form State
  const [formData, setFormData] = useState<{
    firstName: string;
    middleName: string;
    lastName: string;
    displayName: string;
    gender: string;
    dateOfBirth: string;
    maritalStatus: string;
    bloodGroup: string;
    nationalId: string;
    nationality: string;
    countryOfBirth: string;
    stateOfBirth: string;
    avatarUrl: string;
    employeeCode: string;
    workEmail: string;
    personalEmail: string;
    phone: string;
    currentAddress: {
      addressLine1?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
    departmentId: string;
    designationId: string;
    locationId: string;
    employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN' | 'TEMPORARY';
    status: 'ACTIVE' | 'PROBATION' | 'ON_LEAVE' | 'SUSPENDED' | 'RESIGNED' | 'TERMINATED' | 'INACTIVE';
    joiningDate: string;
  }>({
    firstName: '',
    middleName: '',
    lastName: '',
    displayName: '',
    gender: 'Male',
    dateOfBirth: '',
    maritalStatus: 'Single',
    bloodGroup: '',
    nationalId: '',
    nationality: '',
    countryOfBirth: '',
    stateOfBirth: '',
    avatarUrl: '',
    employeeCode: '',
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
    departmentId: '',
    designationId: '',
    locationId: '',
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
    joiningDate: '',
  });

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const [emp, depts, desigs, locs] = await Promise.all([
          employeesApi.getEmployeeById(id),
          organizationApi.getDepartments(),
          organizationApi.getDesignations(),
          organizationApi.getLocations(),
        ]);
        setEmployee(emp);
        setDepartments(depts || []);
        setDesignations(desigs || []);
        setLocations(locs || []);

        setFormData({
          firstName: emp.firstName || '',
          middleName: emp.middleName || '',
          lastName: emp.lastName || '',
          displayName: emp.displayName || '',
          gender: emp.gender || 'Male',
          dateOfBirth: emp.dateOfBirth || '',
          maritalStatus: emp.maritalStatus || 'Single',
          bloodGroup: emp.bloodGroup || '',
          nationalId: emp.nationalId || '',
          nationality: emp.nationality || '',
          countryOfBirth: emp.countryOfBirth || '',
          stateOfBirth: emp.stateOfBirth || '',
          avatarUrl: emp.avatarUrl || '',
          employeeCode: emp.employeeCode || '',
          workEmail: emp.workEmail || '',
          personalEmail: emp.personalEmail || '',
          phone: emp.phone || '',
          currentAddress: {
            addressLine1: emp.currentAddress?.addressLine1 || '',
            city: emp.currentAddress?.city || '',
            state: emp.currentAddress?.state || '',
            country: emp.currentAddress?.country || '',
            postalCode: emp.currentAddress?.postalCode || '',
          },
          departmentId: emp.departmentId || '',
          designationId: emp.designationId || '',
          locationId: emp.locationId || '',
          employmentType: emp.employmentType || 'FULL_TIME',
          status: emp.status || 'ACTIVE',
          joiningDate: emp.joiningDate || '',
        });
      } catch {
        toast.error('Could not load employee for editing.', 'Load Failed');
        navigate('/employees');
      }
    }
    loadData();
  }, [id, navigate, toast]);

  const handleAutoGenerateCode = async () => {
    setIsGeneratingCode(true);
    try {
      const res = await employeesApi.generateEmployeeCode();
      handleChange('employeeCode', res.employeeCode);
      toast.success(`Generated ID: ${res.employeeCode}`, 'ID Assigned');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to auto-generate employee ID');
    } finally {
      setIsGeneratingCode(false);
    }
  };

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

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

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
      const res = await employeesApi.uploadAvatar(id, file);
      setFormData((prev) => ({ ...prev, avatarUrl: res.avatarUrl }));
      setEmployee((prev) => (prev ? { ...prev, avatarUrl: res.avatarUrl } : null));
      toast.success('Profile photo updated successfully.', 'Photo Updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upload photo.', 'Upload Error');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.workEmail.trim()) {
      errors.workEmail = 'Work email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.workEmail.trim())) {
      errors.workEmail = 'Please enter a valid email address';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    try {
      await employeesApi.updateEmployee(id, formData);
      toast.success('Employee record saved successfully.', 'Profile Updated');
      navigate(`/employees/${id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save changes.', 'Update Failed');
    } finally {
      setIsSaving(false);
    }
  };

  if (!employee) return null;

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/employees/${id}`)}
            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Edit Employee Profile
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              {employee.employeeCode} • {employee.displayName || `${employee.firstName} ${employee.lastName}`}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="rounded-md border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 space-y-6">
        {/* Profile Picture Change Card */}
        <div className="p-4 rounded-md border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
          <label className="text-[11px] font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300 block mb-2">
            Profile Photo (Square Format)
          </label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative group">
              <Avatar
                src={formData.avatarUrl || null}
                name={formData.displayName || `${formData.firstName} ${formData.lastName}`.trim()}
                size="xl"
                className="rounded-md border border-slate-300 dark:border-slate-700"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarFileSelect}
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
                      <span>{formData.avatarUrl ? 'Change Profile Photo' : 'Upload Profile Photo'}</span>
                    </>
                  )}
                </Button>
                {formData.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, avatarUrl: '' }))}
                    className="text-xs text-rose-600 hover:text-rose-700 underline font-medium cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                You can change the profile photo at any time. Photo is formatted in square with rounded corners.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Personal Information */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
            Personal Information
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
              label="Middle Name"
              value={formData.middleName}
              onChange={(e) => handleChange('middleName', e.target.value)}
              placeholder="e.g. Alexander"
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
              label="Preferred Name"
              value={formData.displayName}
              onChange={(e) => handleChange('displayName', e.target.value)}
              placeholder="e.g. Mark Chen"
            />
            <Input
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleChange('dateOfBirth', e.target.value)}
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
            <SelectField
              label="Marital Status"
              value={formData.maritalStatus}
              onChange={(e) => handleChange('maritalStatus', e.target.value)}
              options={[
                { value: 'Single', label: 'Single' },
                { value: 'Married', label: 'Married' },
                { value: 'Divorced', label: 'Divorced' },
                { value: 'Widowed', label: 'Widowed' },
                { value: 'Other', label: 'Other' },
              ]}
            />
            <SelectField
              label="Blood Group"
              value={formData.bloodGroup}
              onChange={(e) => handleChange('bloodGroup', e.target.value)}
              placeholder="Select Blood Group..."
              options={[
                { value: 'A+', label: 'A+' },
                { value: 'A-', label: 'A-' },
                { value: 'B+', label: 'B+' },
                { value: 'B-', label: 'B-' },
                { value: 'AB+', label: 'AB+' },
                { value: 'AB-', label: 'AB-' },
                { value: 'O+', label: 'O+' },
                { value: 'O-', label: 'O-' },
                { value: 'Unknown', label: 'Unknown / Not Provided' },
              ]}
            />
            <Input
              label="National ID / SSN / Tax ID"
              value={formData.nationalId}
              onChange={(e) => handleChange('nationalId', e.target.value)}
              placeholder="e.g. SSN-XXX-XX-1234 or National ID"
            />
            <Input
              label="Nationality"
              value={formData.nationality}
              onChange={(e) => handleChange('nationality', e.target.value)}
              placeholder="e.g. Canadian"
            />
            <Input
              label="Country of Birth"
              value={formData.countryOfBirth}
              onChange={(e) => handleChange('countryOfBirth', e.target.value)}
              placeholder="e.g. Canada"
            />
            <Input
              label="State / Province of Birth"
              value={formData.stateOfBirth}
              onChange={(e) => handleChange('stateOfBirth', e.target.value)}
              placeholder="e.g. Ontario / California"
            />
          </div>
        </div>

        {/* Section 2: Residential Address */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
            Residential Address
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Input
              label="Street Address"
              value={formData.currentAddress.addressLine1}
              onChange={(e) => handleAddressChange('addressLine1', e.target.value)}
              placeholder="e.g. 100 Market Street, Suite 400"
            />
            <Input
              label="City"
              value={formData.currentAddress.city}
              onChange={(e) => handleAddressChange('city', e.target.value)}
              placeholder="e.g. San Francisco"
            />
            <Input
              label="State / Province"
              value={formData.currentAddress.state}
              onChange={(e) => handleAddressChange('state', e.target.value)}
              placeholder="e.g. California"
            />
            <Input
              label="Country"
              value={formData.currentAddress.country}
              onChange={(e) => handleAddressChange('country', e.target.value)}
              placeholder="e.g. United States"
            />
            <Input
              label="Postal / Zip Code"
              value={formData.currentAddress.postalCode}
              onChange={(e) => handleAddressChange('postalCode', e.target.value)}
              placeholder="e.g. 94105"
            />
          </div>
        </div>

        {/* Section 3: Employment & Organizational Assignment */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Employment &amp; Organizational Assignment
              </h3>
              <p className="text-[11px] text-slate-400">
                Official employee status, structural alignment, and corporate credentials
              </p>
            </div>
            {!isHrOrAdmin && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <Lock className="h-3 w-3" />
                Managed by HR Administrator
              </span>
            )}
          </div>

          {!isHrOrAdmin && (
            <div className="mb-4 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 flex items-start gap-2.5">
              <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                <span className="font-semibold">Protected Organizational Attributes:</span> Organizational identity, job titles, departments, work email, and employee IDs are managed strictly by HR Administration. You may update your personal contact details, residential address, and profile photo.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Employee ID with Auto-Generate Button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium tracking-wide uppercase text-slate-500">
                  Employee ID / Code
                </label>
                {isHrOrAdmin && (
                  <button
                    type="button"
                    onClick={handleAutoGenerateCode}
                    disabled={isGeneratingCode}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingCode ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    <span>Auto-Generate</span>
                  </button>
                )}
              </div>
              {isHrOrAdmin ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={formData.employeeCode}
                    onChange={(e) => handleChange('employeeCode', e.target.value)}
                    placeholder="e.g. EMP-00001"
                    className="uppercase font-mono flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoGenerateCode}
                    disabled={isGeneratingCode}
                    className="shrink-0 h-9 px-3 flex items-center gap-1.5 text-xs cursor-pointer border-slate-300 dark:border-slate-700"
                    title="Generate next sequential Employee ID based on organization prefix"
                  >
                    {isGeneratingCode ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
                    )}
                    <span>Generate</span>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
                  <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formData.employeeCode || employee.employeeCode}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                    <Lock className="h-2.5 w-2.5" />
                    Locked
                  </span>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1">
                {isHrOrAdmin
                  ? 'Sequential code adhering to active Organization Prefix.'
                  : 'Assigned by HR Admin; cannot be edited by employee.'}
              </p>
            </div>

            {/* Account Status */}
            <SelectField
              label="Account Status"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              disabled={!isHrOrAdmin}
              helperText={!isHrOrAdmin ? 'Managed by HR Administrator' : undefined}
              options={[
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'PROBATION', label: 'PROBATION' },
                { value: 'ON_LEAVE', label: 'ON_LEAVE' },
                { value: 'SUSPENDED', label: 'SUSPENDED' },
                { value: 'RESIGNED', label: 'RESIGNED' },
                { value: 'TERMINATED', label: 'TERMINATED' },
                { value: 'INACTIVE', label: 'INACTIVE' },
              ]}
            />

            {/* Work Email */}
            {isHrOrAdmin ? (
              <Input
                label="Work Email"
                required
                type="email"
                value={formData.workEmail}
                onChange={(e) => handleChange('workEmail', e.target.value)}
                placeholder="e.g. marcus.chen@company.com"
                error={fieldErrors.workEmail}
              />
            ) : (
              <div>
                <label className="text-[11px] font-medium tracking-wide uppercase text-slate-500 mb-1 block">
                  Work Email
                </label>
                <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
                  <span className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                    {formData.workEmail}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                    <Lock className="h-2.5 w-2.5" />
                    Locked
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Official corporate email managed by IT/HR.</p>
              </div>
            )}

            {/* Joining Date */}
            <Input
              label="Joining Date"
              type="date"
              value={formData.joiningDate}
              onChange={(e) => handleChange('joiningDate', e.target.value)}
              disabled={!isHrOrAdmin}
              helperText={!isHrOrAdmin ? 'Managed by HR Administrator' : undefined}
            />

            {/* Department */}
            <SelectField
              label="Department"
              value={formData.departmentId}
              onChange={(e) => handleChange('departmentId', e.target.value)}
              placeholder="Select Department..."
              disabled={!isHrOrAdmin}
              helperText={!isHrOrAdmin ? 'Managed by HR Administrator' : undefined}
              options={departments.map((d) => ({ value: d._id, label: d.name }))}
            />

            {/* Designation */}
            <SelectField
              label="Designation"
              value={formData.designationId}
              onChange={(e) => handleChange('designationId', e.target.value)}
              placeholder="Select Designation..."
              disabled={!isHrOrAdmin}
              helperText={!isHrOrAdmin ? 'Managed by HR Administrator' : undefined}
              options={designations.map((d) => ({ value: d._id, label: `${d.title} (Grade ${d.grade})` }))}
            />

            {/* Location */}
            <SelectField
              label="Location"
              value={formData.locationId}
              onChange={(e) => handleChange('locationId', e.target.value)}
              placeholder="Select Location..."
              disabled={!isHrOrAdmin}
              helperText={!isHrOrAdmin ? 'Managed by HR Administrator' : undefined}
              options={locations.map((l) => ({ value: l._id, label: `${l.name} (${l.city})` }))}
            />

            {/* Employment Type */}
            <SelectField
              label="Employment Type"
              value={formData.employmentType}
              onChange={(e) => handleChange('employmentType', e.target.value)}
              disabled={!isHrOrAdmin}
              helperText={!isHrOrAdmin ? 'Managed by HR Administrator' : undefined}
              options={[
                { value: 'FULL_TIME', label: 'Full Time' },
                { value: 'PART_TIME', label: 'Part Time' },
                { value: 'CONTRACT', label: 'Contract' },
                { value: 'INTERN', label: 'Intern' },
              ]}
            />
          </div>
        </div>

        {/* Section 4: Personal Contact Information (Always Editable) */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Personal Contact Details
            </h3>
            <p className="text-[11px] text-slate-400">
              Direct personal communication channels maintained by the employee
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Personal Email"
              type="email"
              value={formData.personalEmail}
              onChange={(e) => handleChange('personalEmail', e.target.value)}
              placeholder="e.g. marcus.chen@gmail.com"
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="e.g. +1 (555) 019-2834"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(`/employees/${id}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSaving}
            className="flex items-center gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

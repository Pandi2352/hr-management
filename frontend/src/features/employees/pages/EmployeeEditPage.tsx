import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Camera, Loader2 } from 'lucide-react';
import { Button, Input, SelectField, Avatar } from '../../../components/ui';
import { useToast } from '../../../components/ui/toast';
import { employeesApi } from '../api/employees.api';
import { organizationApi } from '../../organization/api/organization.api';
import type { Department, Designation, LocationItem } from '../../organization/types/organization.types';
import type { Employee } from '../types/employees.types';

export function EmployeeEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);

  // Editable Form State
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    displayName: string;
    avatarUrl: string;
    workEmail: string;
    personalEmail: string;
    phone: string;
    departmentId: string;
    designationId: string;
    locationId: string;
    employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN' | 'TEMPORARY';
    status: 'ACTIVE' | 'PROBATION' | 'ON_LEAVE' | 'SUSPENDED' | 'RESIGNED' | 'TERMINATED' | 'INACTIVE';
    joiningDate: string;
  }>({
    firstName: '',
    lastName: '',
    displayName: '',
    avatarUrl: '',
    workEmail: '',
    personalEmail: '',
    phone: '',
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
          lastName: emp.lastName || '',
          displayName: emp.displayName || '',
          avatarUrl: emp.avatarUrl || '',
          workEmail: emp.workEmail || '',
          personalEmail: emp.personalEmail || '',
          phone: emp.phone || '',
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
        <div className="p-4 rounded-md border border-indigo-200 bg-indigo-50/40 dark:border-indigo-900 dark:bg-indigo-950/20">
          <label className="text-[11px] font-bold tracking-wider uppercase text-indigo-900 dark:text-indigo-300 block mb-2">
            Profile Photo (Square Format)
          </label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative group">
              <Avatar
                src={formData.avatarUrl || null}
                name={formData.displayName || `${formData.firstName} ${formData.lastName}`.trim()}
                size="xl"
                className="rounded-md border-2 border-indigo-300 dark:border-indigo-700"
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
                  className="flex items-center gap-1.5 cursor-pointer text-xs border-indigo-300 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
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
            label="Display Name"
            value={formData.displayName}
            onChange={(e) => handleChange('displayName', e.target.value)}
            placeholder="e.g. Mark Chen"
          />
          <SelectField
            label="Account Status"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
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
          <Input
            label="Work Email"
            required
            type="email"
            value={formData.workEmail}
            onChange={(e) => handleChange('workEmail', e.target.value)}
            placeholder="e.g. marcus.chen@company.com"
            error={fieldErrors.workEmail}
          />
          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="e.g. +1 (555) 019-2834"
          />
          <SelectField
            label="Department"
            value={formData.departmentId}
            onChange={(e) => handleChange('departmentId', e.target.value)}
            placeholder="Select Department..."
            options={departments.map((d) => ({ value: d._id, label: d.name }))}
          />
          <SelectField
            label="Designation"
            value={formData.designationId}
            onChange={(e) => handleChange('designationId', e.target.value)}
            placeholder="Select Designation..."
            options={designations.map((d) => ({ value: d._id, label: `${d.title} (Grade ${d.grade})` }))}
          />
          <SelectField
            label="Location"
            value={formData.locationId}
            onChange={(e) => handleChange('locationId', e.target.value)}
            placeholder="Select Location..."
            options={locations.map((l) => ({ value: l._id, label: `${l.name} (${l.city})` }))}
          />
          <SelectField
            label="Employment Type"
            value={formData.employmentType}
            onChange={(e) => handleChange('employmentType', e.target.value)}
            options={[
              { value: 'FULL_TIME', label: 'Full Time' },
              { value: 'PART_TIME', label: 'Part Time' },
              { value: 'CONTRACT', label: 'Contract' },
              { value: 'INTERN', label: 'Intern' },
            ]}
          />
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

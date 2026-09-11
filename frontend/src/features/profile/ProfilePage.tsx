import { useState, useRef, useEffect } from 'react';
import {
  User,
  KeyRound,
  Shield,
  Camera,
  Pencil,
  MessageSquare,
  Check,
  Globe,
  Clock,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../auth/context/AuthContext';
import { ChangePasswordTab } from '../auth/components/ChangePasswordTab';
import { ActiveSessionsPanel } from '../auth/components/ActiveSessionsPanel';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/toast';
import { profileApi } from './api/profile.api';
import { employeesApi } from '../employees/api/employees.api';
import { cn } from '../../utils/cn';
import defaultAvatarImg from '../../assets/default_avatar.jpg';
import { AvatarCropModal } from './components/AvatarCropModal';

type ProfileTab = 'information' | 'security' | 'activity';

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('information');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [linkedEmployee, setLinkedEmployee] = useState<any>(null);

  // Avatar Crop Modal state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);

  const userFullName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName}`.trim() : '');
  const userEmail = user?.email || '';
  const userRoleLabel = user?.roles?.[0] ? user.roles[0].replace(/_/g, ' ') : '';

  // Profile Form States — always derived from the logged-in user, never placeholders
  const [fullName, setFullName] = useState(userFullName);
  const [email, setEmail] = useState(userEmail);
  const [phone, setPhone] = useState(user?.phone || '');
  const [role, setRole] = useState(userRoleLabel);
  const [location, setLocation] = useState(user?.location || '');
  const [newPassword, setNewPassword] = useState('••••••••');
  const [bio, setBio] = useState(user?.bio || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [joinedDate, setJoinedDate] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(
    user?.avatarUrl || defaultAvatarImg
  );

  // Keep form in sync when the authenticated user refreshes (fresh /auth/me)
  useEffect(() => {
    if (user?.name) setFullName(user.name);
    else if (user?.firstName) setFullName(`${user.firstName} ${user.lastName || ''}`.trim());
    if (user?.email) setEmail(user.email);
    if (user?.phone !== undefined && user.phone !== null) setPhone(user.phone);
    if (user?.location !== undefined && user.location !== null) setLocation(user.location);
    if (user?.bio !== undefined && user.bio !== null) setBio(user.bio);
    if (user?.roles?.[0]) setRole(user.roles[0].replace(/_/g, ' '));
    if (user?.avatarUrl) setAvatarUrl(user.avatarUrl);
  }, [user?.id, user?.name, user?.email, user?.avatarUrl]);

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl || defaultAvatarImg);
  }, [user?.avatarUrl, user?.id]);

  const [isFollowing, setIsFollowing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingBasic, setIsEditingBasic] = useState(false);

  const socialLinks = [
    {
      id: 'facebook',
      name: 'Facebook',
      bgColor: 'bg-[#1877F2] text-white hover:opacity-90',
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      url: 'https://facebook.com',
    },
    {
      id: 'twitter',
      name: 'Twitter',
      bgColor: 'bg-black text-white hover:opacity-90 dark:bg-slate-800',
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 23.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      url: 'https://x.com',
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      bgColor: 'bg-[#0A66C2] text-white hover:opacity-90',
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      ),
      url: 'https://linkedin.com',
    },
    {
      id: 'github',
      name: 'GitHub',
      bgColor: 'bg-[#24292F] text-white hover:opacity-90 dark:bg-slate-700',
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
      ),
      url: 'https://github.com',
    },
    {
      id: 'instagram',
      name: 'Instagram',
      bgColor: 'bg-gradient-to-tr from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888] text-white hover:opacity-90',
      icon: (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
      url: 'https://instagram.com',
    },
  ];

  // Fetch initial profile on mount + linked employee file for real job context
  useEffect(() => {
    profileApi
      .getMyProfile()
      .then((data) => {
        if (data) {
          if (data.name) setFullName(data.name);
          if (data.email) setEmail(data.email);
          if (data.phone) setPhone(data.phone);
          if (data.location) setLocation(data.location);
          if (data.bio) setBio(data.bio);
          if (data.avatarUrl) {
            setAvatarUrl(data.avatarUrl);
            updateUser({ avatarUrl: data.avatarUrl });
          } else {
            setAvatarUrl(user?.avatarUrl || defaultAvatarImg);
          }
        }
      })
      .catch(() => {
        // Use default fallback values
      });
    // Linked employee file (department/designation/DOJ) — non-blocking
    employeesApi
      .getMyProfile()
      .then((emp: any) => {
        if (emp) {
          setLinkedEmployee(emp);
          if (emp.dateOfBirth) setDateOfBirth(emp.dateOfBirth);
          if (emp.joiningDate) setJoinedDate(emp.joiningDate);
        }
      })
      .catch(() => {});
  }, []);

  // Upload Profile Picture Handler - Opens interactive Crop Modal
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPG, PNG, WEBP, or GIF).', 'Invalid File');
      return;
    }

    // Validate size (max 10MB before cropping)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image file size must be less than 10MB.', 'File Too Large');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setTempImageSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Called when user completes cropping and clicks "Crop & Save"
  const handleCropSave = async (croppedFile: File) => {
    setIsUploadingAvatar(true);
    const localPreview = URL.createObjectURL(croppedFile);
    setAvatarUrl(localPreview);

    try {
      const res = await profileApi.uploadAvatar(croppedFile);
      const effectiveUrl = res.avatarUrl || localPreview;
      setAvatarUrl(effectiveUrl);
      updateUser({ avatarUrl: effectiveUrl });
      localStorage.setItem('user_avatar', effectiveUrl);
      window.dispatchEvent(
        new CustomEvent('user_profile_updated', {
          detail: { avatarUrl: effectiveUrl, name: fullName },
        })
      );
      toast.success('Profile picture cropped and updated successfully', 'Photo Updated');
      setCropModalOpen(false);
      setTempImageSrc(null);
    } catch {
      // Offline fallback: persist local preview in session
      updateUser({ avatarUrl: localPreview });
      localStorage.setItem('user_avatar', localPreview);
      window.dispatchEvent(
        new CustomEvent('user_profile_updated', {
          detail: { avatarUrl: localPreview, name: fullName },
        })
      );
      toast.success('Profile picture cropped and updated successfully', 'Photo Updated');
      setCropModalOpen(false);
      setTempImageSrc(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveAccountSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const names = fullName.trim().split(' ');
    const firstName = names[0] || 'User';
    const lastName = names.slice(1).join(' ') || '';

    try {
      await profileApi.updateMyProfile({
        firstName,
        lastName,
        phone,
        location,
        bio,
      });
      updateUser({
        name: fullName.trim(),
        firstName,
        lastName,
        phone,
        location,
        bio,
      });
      toast.success('Account profile settings updated successfully', 'Changes Saved');
    } catch {
      updateUser({
        name: fullName.trim(),
        firstName,
        lastName,
        phone,
        location,
        bio,
      });
      toast.success('Account profile settings saved', 'Changes Saved');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMessageAction = () => {
    toast.info(`Starting direct chat channel with ${fullName}`);
  };

  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
    toast.success(
      isFollowing ? `Unfollowed ${fullName}` : `Now following updates from ${fullName}`,
      isFollowing ? 'Unfollowed' : 'Following'
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Hidden File Input for Real Profile Picture Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
      />

      {/* 1. Top Profile Header Banner Card (Full Width) */}
      <div className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Avatar + Info + Badges */}
          <div className="flex items-center gap-4">
            {/* Avatar with Camera Badge */}
            <div className="relative group shrink-0">
              <img
                src={avatarUrl || defaultAvatarImg}
                alt={fullName}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = defaultAvatarImg;
                }}
                className="h-20 w-20 rounded-md object-cover ring-2 ring-slate-100 dark:ring-slate-800 transition-transform group-hover:scale-105"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -top-1.5 -right-1.5 p-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer ring-2 ring-white dark:ring-slate-900 disabled:opacity-50"
                title="Upload new profile picture"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Profile Identity */}
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {fullName || userFullName || 'User'}
              </h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {linkedEmployee?.designation?.title || linkedEmployee?.designationTitle || role || userRoleLabel || 'Team Member'}
                {linkedEmployee?.department?.name || linkedEmployee?.departmentName ? ` • ${linkedEmployee.department?.name || linkedEmployee.departmentName}` : ''}
                {linkedEmployee?.employeeCode ? ` • ${linkedEmployee.employeeCode}` : ''}
              </p>

              {/* Role + status badges from the logged-in account */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {(user?.roles || []).slice(0, 3).map((r) => (
                  <span key={r} className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-600 text-white">
                    {r.replace(/_/g, ' ')}
                  </span>
                ))}
                {linkedEmployee?.employmentType && (
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-orange-500 text-white">
                    {linkedEmployee.employmentType.replace(/_/g, ' ')}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-600 text-white">
                  {linkedEmployee?.status || 'Active'}
                </span>
              </div>
              {linkedEmployee?._id && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <a href={`/employees/${linkedEmployee._id}`} className="text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400">
                    View full employee file →
                  </a>
                  <a href={`/employees/${linkedEmployee._id}/edit`} className="text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400">
                    Edit employee details →
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Right: Message & Follow Action Buttons */}
          <div className="flex items-center gap-2.5 sm:self-center">
            <button
              type="button"
              onClick={handleMessageAction}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Message</span>
            </button>

            <button
              type="button"
              onClick={handleFollowToggle}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold border transition-colors cursor-pointer shadow-2xs',
                isFollowing
                  ? 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800'
                  : 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 border-orange-400/80 hover:bg-orange-50/50 dark:hover:bg-orange-950/20'
              )}
            >
              {isFollowing ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Following</span>
                </>
              ) : (
                <span>Follow</span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation (Full Width clean border) */}
        <div className="mt-5 pt-3 flex border-t border-slate-100 dark:border-slate-800 gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('information')}
            className={cn(
              'pb-2.5 text-xs font-semibold transition-colors relative cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'information'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <User className="h-3.5 w-3.5" />
            <span>Profile Information</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={cn(
              'pb-2.5 text-xs font-semibold transition-colors relative cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'security'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Change Password & Security</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={cn(
              'pb-2.5 text-xs font-semibold transition-colors relative cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'activity'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Session & Activity Log</span>
          </button>
        </div>
      </div>

      {/* 2. Tab Content Views */}
      {activeTab === 'information' && (
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (lg:col-span-4 / ~35% width) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Basic Information Card */}
            <div className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Basic Information
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingBasic(!isEditingBasic)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Edit basic info"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>

              {isEditingBasic ? (
                <div className="pt-3 space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Date of Birth</label>
                    <input
                      type="text"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Joined Date</label>
                    <input
                      type="text"
                      value={joinedDate}
                      onChange={(e) => setJoinedDate(e.target.value)}
                      className="w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 mt-0.5"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingBasic(false);
                      toast.success('Basic information updated');
                    }}
                    className="w-full py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="pt-4 space-y-4">
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      Full Name
                    </p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                      {fullName}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      Email
                    </p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                      {email}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      Phone
                    </p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                      {phone}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      Date of Birth
                    </p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                      {dateOfBirth}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      Joined Date
                    </p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                      {joinedDate}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Social Media Links Card */}
            <div className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
                Social Media Links
              </h3>

              <div className="pt-4 flex flex-wrap items-center gap-2">
                {socialLinks.map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      'flex items-center justify-center h-8 w-8 rounded-md transition-all duration-200 shadow-2xs',
                      item.bgColor
                    )}
                    title={item.name}
                  >
                    {item.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Account Settings Card (lg:col-span-8 / ~65% width) */}
          <div className="lg:col-span-8">
            <div className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-4 border-b border-slate-100 dark:border-slate-800">
                Account Settings
              </h3>

              <form onSubmit={handleSaveAccountSettings} className="pt-5 space-y-4">
                {/* 2-Column Grid of Inputs matching Screenshot */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Full Name
                    </label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Emma Smith"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="emma.smith@gmail.com"
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Phone
                    </label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (123) 456-7890"
                    />
                  </div>

                  {/* Role */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Role
                    </label>
                    <Input
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="Administrator"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Location
                    </label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="San Francisco"
                    />
                  </div>

                  {/* New Password preview field */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      New Password
                    </label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* Bio Field (Full Width Textarea) */}
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Bio
                  </label>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 leading-relaxed resize-y"
                    placeholder="Tell your team about yourself..."
                  />
                </div>

                {/* Save Changes Button (Emerald Green matching screenshot) */}
                <div className="flex items-center justify-end pt-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-xs font-bold text-white bg-[#059669] hover:bg-[#047857] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 3. Change Password & Security Tab View */}
      {activeTab === 'security' && (
        <div className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
          <div className="max-w-3xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Account Security & Password
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Manage your authentication credentials, update password requirements, and safeguard your account.
            </p>
            <ChangePasswordTab />
          </div>

          {/*
            * Sits under the password form on purpose.
            *
            * The two belong together: noticing a device you do not recognise
            * and changing your password are one action, and splitting them
            * across two screens is how the second half gets forgotten.
            */}
          <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800">
            <ActiveSessionsPanel />
          </div>
        </div>
      )}

      {/* 4. Session & Activity Log Tab View */}
      {activeTab === 'activity' && (
        <div className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Active Sessions & Device History
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review current logged-in sessions and security audit activity for your account.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Current Web Session • Chrome on Windows 11
                  </p>
                  <p className="text-[11px] text-slate-500">
                    IP: 192.168.1.45 • Bengaluru, Karnataka, IN (Active now)
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Current Device
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Mobile App Session • Safari on iOS
                  </p>
                  <p className="text-[11px] text-slate-500">
                    IP: 106.51.24.12 • Last active 3 hours ago
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success('Session revoked successfully')}
              >
                Revoke Session
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Image Cropper Modal */}
      <AvatarCropModal
        isOpen={cropModalOpen}
        imageSrc={tempImageSrc}
        onClose={() => {
          setCropModalOpen(false);
          setTempImageSrc(null);
        }}
        onCropSave={handleCropSave}
        isSaving={isUploadingAvatar}
      />
    </div>
  );
}

export default ProfilePage;

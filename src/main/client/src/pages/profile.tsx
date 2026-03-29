import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/header';
import type { User } from '../types/user';
import api from '../api/axiosClient';
import { Card } from 'primereact/card';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputMask } from 'primereact/inputmask';
import { Dropdown } from 'primereact/dropdown';
import { Password } from 'primereact/password';

type ProfileUser = Partial<User> & {
  id?: number;
  profilePictureUrl?: string | null;
};

type VisibilityOption = 'EVERYONE' | 'FRIENDS_ONLY';

type ProfileFormState = {
  firstName: string;
  lastName: string;
  preferredName: string;
  major: string;
  profileHeadline: string;
  bio: string;
  accentColor: string;
  profileVisibility: VisibilityOption;
  showMajorToFriends: boolean;
  showEmailToFriends: boolean;
  showPhoneToFriends: boolean;
};

const visibilityOptions: Array<{ label: string; value: VisibilityOption }> = [
  { label: 'Everyone on CourseFlow', value: 'EVERYONE' },
  { label: 'Friends only', value: 'FRIENDS_ONLY' },
];

function normalizeVisibility(value?: string | null): VisibilityOption {
  return value === 'FRIENDS_ONLY' ? 'FRIENDS_ONLY' : 'EVERYONE';
}

function normalizeAccentColor(value?: string | null): string {
  return /^#[a-fA-F0-9]{6}$/.test(value ?? '') ? String(value).toLowerCase() : '#dc2626';
}

function toDisplayName(user?: ProfileUser | null): string {
  if (!user) return 'Unnamed User';
  const preferredName = user.preferredName?.trim();
  if (preferredName) return preferredName;
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return fullName || user.email || 'Unnamed User';
}

export default function Profile() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [majorOptions, setMajorOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editContactVisible, setEditContactVisible] = useState(false);
  const [editPasswordVisible, setEditPasswordVisible] = useState(false);

  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    firstName: '',
    lastName: '',
    preferredName: '',
    major: '',
    profileHeadline: '',
    bio: '',
    accentColor: '#dc2626',
    profileVisibility: 'EVERYONE',
    showMajorToFriends: true,
    showEmailToFriends: false,
    showPhoneToFriends: false,
  });
  const [contactForm, setContactForm] = useState({ phone: '' });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initials = useMemo(() => {
    if (!user) return 'U';
    const first = user.firstName?.[0] ?? user.preferredName?.[0] ?? '';
    const last = user.lastName?.[0] ?? '';
    return `${first}${last}`.toUpperCase() || 'U';
  }, [user]);

  const fullName = useMemo(() => {
    if (!user) return '';
    return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Unnamed User';
  }, [user]);

  const displayName = useMemo(() => toDisplayName(user), [user]);
  const accentColor = useMemo(() => normalizeAccentColor(user?.accentColor), [user?.accentColor]);
  const visibilityLabel = useMemo(
    () =>
      normalizeVisibility(user?.profileVisibility) === 'FRIENDS_ONLY'
        ? 'Only friends can see your custom profile details.'
        : 'Your custom profile details are visible across CourseFlow.',
    [user?.profileVisibility],
  );

  const friendPreviewFields = useMemo(() => {
    if (!user) return [];
    const fields: Array<{ label: string; value: string }> = [];
    if (user.showMajorToFriends && user.major) {
      fields.push({ label: 'Major', value: user.major });
    }
    if (user.showEmailToFriends && user.email) {
      fields.push({ label: 'Email', value: user.email });
    }
    if (user.showPhoneToFriends && user.phone) {
      fields.push({ label: 'Phone', value: formatPhone(user.phone) });
    }
    return fields;
  }, [user]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const profileRes = await api.get('/users/me');
        setUser(profileRes.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  function formatPhone(phone?: string) {
    if (!phone) return 'Not set';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  }

  const openEditProfile = () => {
    if (!user) return;
    const openDialog = () => {
      setProfileForm({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        preferredName: user.preferredName ?? '',
        major: user.major ?? '',
        profileHeadline: user.profileHeadline ?? '',
        bio: user.bio ?? '',
        accentColor: normalizeAccentColor(user.accentColor),
        profileVisibility: normalizeVisibility(user.profileVisibility),
        showMajorToFriends: user.showMajorToFriends ?? true,
        showEmailToFriends: user.showEmailToFriends ?? false,
        showPhoneToFriends: user.showPhoneToFriends ?? false,
      });
      setError('');
      setSuccess('');
      setEditProfileVisible(true);
    };

    if (majorOptions.length > 0) {
      openDialog();
      return;
    }

    setSaving(true);
    setError('');
    void api
      .get<string[]>('/majors/names')
      .then((res) => {
        setMajorOptions((res.data ?? []).filter((name) => typeof name === 'string' && name.length > 0));
        openDialog();
      })
      .catch((err: any) => {
        setError(err?.response?.data?.message || 'Failed to load majors for profile edit.');
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const openEditContact = () => {
    if (!user) return;
    setContactForm({ phone: user.phone ?? '' });
    setError('');
    setSuccess('');
    setEditContactVisible(true);
  };

  const openEditPassword = () => {
    setPasswordForm({ password: '', confirmPassword: '' });
    setError('');
    setSuccess('');
    setEditPasswordVisible(true);
  };

  const saveProfile = async () => {
    if (!user) return;
    if (profileForm.major && !majorOptions.includes(profileForm.major)) {
      setError('Please select a valid major from the list.');
      return;
    }
    if (!/^#[a-fA-F0-9]{6}$/.test(profileForm.accentColor)) {
      setError('Accent color must be a valid hex code like #dc2626.');
      return;
    }
    if (profileForm.preferredName.trim().length > 60) {
      setError('Preferred name must be 60 characters or fewer.');
      return;
    }
    if (profileForm.profileHeadline.trim().length > 160) {
      setError('Headline must be 160 characters or fewer.');
      return;
    }
    if (profileForm.bio.trim().length > 1200) {
      setError('Bio must be 1200 characters or fewer.');
      return;
    }

    const updates: Record<string, string | boolean> = {};
    if (profileForm.firstName !== (user.firstName ?? '')) updates.firstName = profileForm.firstName;
    if (profileForm.lastName !== (user.lastName ?? '')) updates.lastName = profileForm.lastName;
    if (profileForm.major !== (user.major ?? '')) updates.major = profileForm.major;

    const currentPreferredName = user.preferredName ?? '';
    const currentHeadline = user.profileHeadline ?? '';
    const currentBio = user.bio ?? '';
    const currentAccent = normalizeAccentColor(user.accentColor);
    const currentVisibility = normalizeVisibility(user.profileVisibility);
    const currentShowMajor = user.showMajorToFriends ?? true;
    const currentShowEmail = user.showEmailToFriends ?? false;
    const currentShowPhone = user.showPhoneToFriends ?? false;

    if (profileForm.preferredName !== currentPreferredName) updates.preferredName = profileForm.preferredName;
    if (profileForm.profileHeadline !== currentHeadline) updates.profileHeadline = profileForm.profileHeadline;
    if (profileForm.bio !== currentBio) updates.bio = profileForm.bio;
    if (normalizeAccentColor(profileForm.accentColor) !== currentAccent) updates.accentColor = normalizeAccentColor(profileForm.accentColor);
    if (profileForm.profileVisibility !== currentVisibility) updates.profileVisibility = profileForm.profileVisibility;
    if (profileForm.showMajorToFriends !== currentShowMajor) updates.showMajorToFriends = profileForm.showMajorToFriends;
    if (profileForm.showEmailToFriends !== currentShowEmail) updates.showEmailToFriends = profileForm.showEmailToFriends;
    if (profileForm.showPhoneToFriends !== currentShowPhone) updates.showPhoneToFriends = profileForm.showPhoneToFriends;

    if (Object.keys(updates).length === 0) {
      setError('No changes to save.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/users/me', updates);
      setUser((prev) => ({
        ...(prev ?? {}),
        ...updates,
        accentColor: typeof updates.accentColor === 'string' ? updates.accentColor : prev?.accentColor,
      }));
      setSuccess('Profile updated.');
      setEditProfileVisible(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update profile info.');
    } finally {
      setSaving(false);
    }
  };

  const saveContact = async () => {
    if (!user) return;
    const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
    if (!phoneRegex.test(contactForm.phone)) {
      setError('Phone must be in format (123) 456-7890.');
      return;
    }

    if (contactForm.phone === (user.phone ?? '')) {
      setError('No changes to save.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/users/me', { phone: contactForm.phone });
      setUser((prev) => ({ ...(prev ?? {}), phone: contactForm.phone }));
      setSuccess('Contact info updated.');
      setEditContactVisible(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update contact info.');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    const { password, confirmPassword } = passwordForm;
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/users/me', { password });
      setSuccess('Password updated.');
      setEditPasswordVisible(false);
      setPasswordForm({ password: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleProfilePictureUpload = async (file: File) => {
    if (!user?.id) return;

    const formData = new FormData();
    formData.append('file', file);
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post(`/users/${user.id}/profile-picture`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res?.data?.profilePictureUrl;
      if (url) {
        setUser((prev) => ({ ...(prev ?? {}), profilePictureUrl: url }));
      }
      setSuccess('Profile photo updated.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to upload profile picture.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-red-600">No profile data available.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        {(error || success) && (
          <div className="mb-4">
            {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
            {success && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{success}</div>}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <Card className="overflow-hidden shadow-sm">
            <div className="rounded-2xl p-6" style={{ background: `linear-gradient(135deg, ${accentColor}18 0%, rgba(255,255,255,1) 60%)` }}>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {user.profilePictureUrl ? (
                    <Avatar image={user.profilePictureUrl} size="xlarge" shape="circle" />
                  ) : (
                    <Avatar
                      label={initials}
                      size="xlarge"
                      shape="circle"
                      style={{ backgroundColor: accentColor, color: 'white' }}
                    />
                  )}
                  <div>
                    <div className="text-2xl font-bold text-slate-900">{displayName}</div>
                    {displayName !== fullName && <div className="text-sm text-slate-500">{fullName}</div>}
                    <div className="text-sm text-slate-600">{user.email}</div>
                    {user.profileHeadline ? (
                      <div className="mt-2 text-sm font-medium text-slate-700">{user.profileHeadline}</div>
                    ) : (
                      <div className="mt-2 text-sm text-slate-500">Add a headline so friends know what you are into this semester.</div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <div className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {(user.role || 'USER').toString().toUpperCase()}
                      </div>
                      <div className="inline-flex rounded-full px-2 py-1 text-xs font-semibold" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                        {normalizeVisibility(user.profileVisibility) === 'FRIENDS_ONLY' ? 'Friends-only profile' : 'Campus-visible profile'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button label="Edit Profile" icon="pi pi-user-edit" onClick={openEditProfile} />
                  <Button label="Edit Contact" icon="pi pi-phone" outlined onClick={openEditContact} />
                  <Button label="Change Password" icon="pi pi-lock" outlined onClick={openEditPassword} />
                  <Button label="Update Photo" icon="pi pi-camera" outlined onClick={handleUploadClick} disabled={saving} />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleProfilePictureUpload(file);
                      }
                      e.currentTarget.value = '';
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="space-y-3">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Account</div>
              <div className="text-sm">
                <div className="text-slate-500">User ID</div>
                <div className="font-medium text-slate-800">{user.id ?? 'N/A'}</div>
              </div>
              <div className="text-sm">
                <div className="text-slate-500">Email (Username)</div>
                <div className="font-medium text-slate-800">{user.email || 'N/A'}</div>
              </div>
              <div className="text-sm">
                <div className="text-slate-500">Visibility</div>
                <div className="font-medium text-slate-800">{visibilityLabel}</div>
              </div>
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="space-y-4">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Identity & Social</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-500">Preferred Name</div>
                  <div className="text-sm font-medium text-slate-800">{user.preferredName || 'Using full name'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Profile Accent</div>
                  <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-800">
                    <span className="inline-block h-4 w-4 rounded-full border border-slate-200" style={{ backgroundColor: accentColor }} />
                    {accentColor}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Headline</div>
                <div className="text-sm font-medium text-slate-800">{user.profileHeadline || 'Not set'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Bio</div>
                <div className="whitespace-pre-wrap text-sm font-medium text-slate-800">
                  {user.bio || 'Add a short bio to tell friends what you are studying, building, or looking for.'}
                </div>
              </div>
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="space-y-4">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Privacy & Sharing</div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                {visibilityLabel}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm text-slate-700">Show major to friends</span>
                  <span className="text-xs font-semibold text-slate-500">{user.showMajorToFriends ? 'Visible' : 'Hidden'}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm text-slate-700">Show email to friends</span>
                  <span className="text-xs font-semibold text-slate-500">{user.showEmailToFriends ? 'Visible' : 'Hidden'}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm text-slate-700">Show phone to friends</span>
                  <span className="text-xs font-semibold text-slate-500">{user.showPhoneToFriends ? 'Visible' : 'Hidden'}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="space-y-4">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Academic & Contact</div>
              <div>
                <div className="text-xs text-slate-500">Major</div>
                <div className="text-sm font-medium text-slate-800">{user.major || 'Not set'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Phone</div>
                <div className="text-sm font-medium text-slate-800">{formatPhone(user.phone)}</div>
              </div>
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="space-y-4">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Friend-Facing Preview</div>
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="h-2" style={{ backgroundColor: accentColor }} />
                <div className="bg-white p-4">
                  <div className="flex items-start gap-4">
                    {user.profilePictureUrl ? (
                      <Avatar image={user.profilePictureUrl} size="xlarge" shape="circle" />
                    ) : (
                      <Avatar
                        label={initials}
                        size="xlarge"
                        shape="circle"
                        style={{ backgroundColor: accentColor, color: 'white' }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-semibold text-slate-900">{displayName}</div>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                          @{user.email?.split('@')[0] || 'student'}
                        </span>
                      </div>
                      {user.profileHeadline && <div className="mt-1 text-sm font-medium text-slate-700">{user.profileHeadline}</div>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {friendPreviewFields.length > 0 ? (
                          friendPreviewFields.map((field) => (
                            <span key={field.label} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600">
                              <span className="font-semibold text-slate-700">{field.label}:</span> {field.value}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">No extra profile details are currently visible to friends.</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                    {user.bio || 'Your bio will appear here once you add one.'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>

      <Dialog header="Edit Profile" visible={editProfileVisible} style={{ width: '42rem' }} onHide={() => setEditProfileVisible(false)} modal>
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-600">First Name</label>
              <InputText className="w-full" value={profileForm.firstName} onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Last Name</label>
              <InputText className="w-full" value={profileForm.lastName} onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Preferred Name</label>
              <InputText
                className="w-full"
                value={profileForm.preferredName}
                onChange={(e) => setProfileForm((f) => ({ ...f, preferredName: e.target.value }))}
                placeholder="What friends should call you"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Accent Color</label>
              <input
                type="color"
                className="h-[42px] w-full rounded-md border border-slate-300 p-1"
                value={profileForm.accentColor}
                onChange={(e) => setProfileForm((f) => ({ ...f, accentColor: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">Major</label>
            <Dropdown
              className="w-full"
              value={profileForm.major}
              options={majorOptions}
              onChange={(e) => setProfileForm((f) => ({ ...f, major: e.value ?? '' }))}
              placeholder="Select major"
              filter
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">Headline</label>
            <InputText
              className="w-full"
              value={profileForm.profileHeadline}
              onChange={(e) => setProfileForm((f) => ({ ...f, profileHeadline: e.target.value }))}
              placeholder="Example: Software engineering student building planning tools"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">Bio</label>
            <textarea
              className="w-full rounded-md border border-slate-300 p-2 text-sm"
              rows={5}
              value={profileForm.bio}
              onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Share what you are studying, your current projects, clubs, or what you like working on with friends."
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-800">Privacy & Friend Profile</div>
            <div className="mt-3">
              <label className="mb-1 block text-sm text-slate-600">Profile Visibility</label>
              <Dropdown
                className="w-full"
                value={profileForm.profileVisibility}
                options={visibilityOptions}
                optionLabel="label"
                optionValue="value"
                onChange={(e) =>
                  setProfileForm((f) => ({
                    ...f,
                    profileVisibility: (e.value ?? 'EVERYONE') as VisibilityOption,
                  }))
                }
              />
            </div>
            <div className="mt-4 space-y-2">
              {[
                { key: 'showMajorToFriends', label: 'Show major to friends' },
                { key: 'showEmailToFriends', label: 'Show email to friends' },
                { key: 'showPhoneToFriends', label: 'Show phone to friends' },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-red-600"
                    checked={profileForm[item.key as keyof Pick<ProfileFormState, 'showMajorToFriends' | 'showEmailToFriends' | 'showPhoneToFriends'>]}
                    onChange={(e) =>
                      setProfileForm((f) => ({
                        ...f,
                        [item.key]: e.target.checked,
                      }))
                    }
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button label="Cancel" outlined onClick={() => setEditProfileVisible(false)} />
            <Button label={saving ? 'Saving...' : 'Save'} onClick={saveProfile} disabled={saving} />
          </div>
        </div>
      </Dialog>

      <Dialog header="Edit Contact Info" visible={editContactVisible} style={{ width: '28rem' }} onHide={() => setEditContactVisible(false)} modal>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-slate-600">Email (read-only)</label>
            <InputText className="w-full" value={user.email ?? ''} disabled />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Phone</label>
            <InputMask
              className="w-full"
              mask="(999) 999-9999"
              value={contactForm.phone}
              onChange={(e: any) => setContactForm({ phone: e.value ?? '' })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button label="Cancel" outlined onClick={() => setEditContactVisible(false)} />
            <Button label={saving ? 'Saving...' : 'Save'} onClick={saveContact} disabled={saving} />
          </div>
        </div>
      </Dialog>

      <Dialog header="Change Password" visible={editPasswordVisible} style={{ width: '28rem' }} onHide={() => setEditPasswordVisible(false)} modal>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-slate-600">New Password</label>
            <Password
              value={passwordForm.password}
              onChange={(e: any) => setPasswordForm((f) => ({ ...f, password: e?.target?.value ?? e?.value ?? '' }))}
              feedback={false}
              toggleMask={false}
              inputClassName="w-full"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Confirm Password</label>
            <Password
              value={passwordForm.confirmPassword}
              onChange={(e: any) => setPasswordForm((f) => ({ ...f, confirmPassword: e?.target?.value ?? e?.value ?? '' }))}
              feedback={false}
              toggleMask={false}
              inputClassName="w-full"
              placeholder="Repeat new password"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button label="Cancel" outlined onClick={() => setEditPasswordVisible(false)} />
            <Button label={saving ? 'Saving...' : 'Update'} onClick={savePassword} disabled={saving} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

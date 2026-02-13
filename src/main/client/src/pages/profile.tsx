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
  profilePictureUrl?: string;
};

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

  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', major: '' });
  const [contactForm, setContactForm] = useState({ phone: '' });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initials = useMemo(() => {
    if (!user) return 'U';
    const first = user.firstName?.[0] ?? '';
    const last = user.lastName?.[0] ?? '';
    return `${first}${last}`.toUpperCase() || 'U';
  }, [user]);

  const fullName = useMemo(() => {
    if (!user) return '';
    return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Unnamed User';
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
    load();
  }, []);

  const formatPhone = (phone?: string) => {
    if (!phone) return 'Not set';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  const openEditProfile = () => {
    if (!user) return;
    const openDialog = () => {
      setProfileForm({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        major: user.major ?? '',
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

    const updates: Record<string, string> = {};
    if (profileForm.firstName !== (user.firstName ?? '')) updates.firstName = profileForm.firstName;
    if (profileForm.lastName !== (user.lastName ?? '')) updates.lastName = profileForm.lastName;
    if (profileForm.major !== (user.major ?? '')) updates.major = profileForm.major;

    if (Object.keys(updates).length === 0) {
      setError('No changes to save.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/users/me', updates);
      setUser((prev) => ({ ...(prev ?? {}), ...updates }));
      setSuccess('Profile info updated.');
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
          <Card className="shadow-sm">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {user.profilePictureUrl ? (
                  <Avatar image={user.profilePictureUrl} size="xlarge" shape="circle" />
                ) : (
                  <Avatar
                    label={initials}
                    size="xlarge"
                    shape="circle"
                    style={{ backgroundColor: '#334155', color: 'white' }}
                  />
                )}
                <div>
                  <div className="text-2xl font-bold text-slate-900">{fullName}</div>
                  <div className="text-sm text-slate-600">{user.email}</div>
                  <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {(user.role || 'USER').toString().toUpperCase()}
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
                      handleProfilePictureUpload(file);
                    }
                    e.currentTarget.value = '';
                  }}
                />
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
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="space-y-4">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Personal Info</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-500">First Name</div>
                  <div className="text-sm font-medium text-slate-800">{user.firstName || 'Not set'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Last Name</div>
                  <div className="text-sm font-medium text-slate-800">{user.lastName || 'Not set'}</div>
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
        </div>
      </main>

      <Dialog header="Edit Profile Info" visible={editProfileVisible} style={{ width: '28rem' }} onHide={() => setEditProfileVisible(false)} modal>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-slate-600">First Name</label>
            <InputText className="w-full" value={profileForm.firstName} onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Last Name</label>
            <InputText className="w-full" value={profileForm.lastName} onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))} />
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

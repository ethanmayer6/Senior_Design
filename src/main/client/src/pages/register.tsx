import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SelectButton } from 'primereact/selectbutton';
import axios from 'axios';
import type { User } from '../types/user';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Card } from 'primereact/card';
import { InputMask } from 'primereact/inputmask';

export default function Register() {
  const [user, setUser] = useState<User>({
    role: 'student',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    major: '',
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(true);
  const [unavailableEmail, setUnavailableEmail] = useState('');
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [incorrectPassword, setIncorrectPassword] = useState('');

  const navigate = useNavigate();

  const roleOptions = [
    { label: 'Student', value: 'student' },
    { label: 'Advisor/Faculty', value: 'advisor' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  // -----------------------------------------------------------
  // REGISTER + AUTO LOGIN + REDIRECT
  // -----------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Password match check
    if (user.password !== confirmPassword) {
      setPasswordsMatch(false);
      setIncorrectPassword(confirmPassword);
      return;
    }

    // -------------------------------------------------------
    // 1. Check if email is available
    // -------------------------------------------------------
    try {
      const checkEmail = await axios.get('http://localhost:8080/api/users/check-email', {
        params: { email: user.email },
      });

      if (!checkEmail.data.available) {
        setEmailAvailable(false);
        setUnavailableEmail(user.email);
        return;
      }
    } catch (err) {
      setError('Failed to check email availability. Please try again.');
      return;
    }

    // -------------------------------------------------------
    // 2. Register user
    // -------------------------------------------------------
    try {
      const response = await axios.post('http://localhost:8080/api/users/register', user);

      if (response.status === 200 || response.status === 201) {
        setSuccess('Account created successfully!');

        // ---------------------------------------------------
        // 3. Auto-login immediately
        // ---------------------------------------------------
        try {
          const loginRes = await axios.post('http://localhost:8080/api/users/login', {
            email: user.email,
            password: user.password,
          });

          const loginData = loginRes.data;

          // Save to local storage
          localStorage.setItem('user', JSON.stringify(loginData));
          localStorage.setItem('token', loginData.token.trim());

          // ---------------------------------------------------
          // 4. Redirect to dashboard
          // ---------------------------------------------------
          navigate('/dashboard');
        } catch (err) {
          setError('Registration succeeded, but automatic login failed.');
        }
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      {/* Logo Section */}
      <img
        src="/logo.png"
        alt="CourseFlow Logo"
        className="w-[200px] absolute top-2 left-2 object-contain"
      />

      {/* Registration Card */}
      <Card className="bg-white shadow-md rounded-xl flex flex-col items-center max-w-lg">
        <div className="text-center mb-3">
          <p className="text-gray-500 text-sm">Please enter your details</p>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-3">Create Account</h2>
        </div>

        {error && <div className="text-red-500 font-bold text-center mb-3">{error}</div>}
        {success && <div className="text-green-600 font-bold text-center mb-3">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* User Role */}
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-600 mb-1">User Type</label>
            <SelectButton
              value={user.role}
              onChange={(e) => setUser({ ...user, role: e.value })}
              options={roleOptions}
              allowEmpty={false}
              className="w-full flex"
              pt={{
                button: {
                  className: `flex-1 border rounded-md py-3 transition-all`,
                },
              }}
            />
          </div>

          {/* First & Last Name */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-600 mb-1">First Name</label>
              <InputText
                name="firstName"
                value={user.firstName}
                onChange={handleChange}
                className="w-full"
                placeholder="John"
                required
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-600 mb-1">Last Name</label>
              <InputText
                name="lastName"
                value={user.lastName}
                onChange={handleChange}
                className="w-full"
                placeholder="Doe"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col">
            <label htmlFor="email" className="text-sm font-medium text-gray-600 mb-1">
              Email address
            </label>
            <InputText
              name="email"
              value={user.email}
              onChange={handleChange}
              className="w-full"
              placeholder="you@example.com"
            />
            {!emailAvailable && unavailableEmail === user.email && (
              <span className="text-primary-600 text-sm mt-1 ml-1 font-semibold">
                Looks like you already have an account. Try signing in instead.
              </span>
            )}
          </div>

          {/* Phone Number / Major */}
          <div className="flex gap-4">
            <div className="w-[40%]">
              <label className="text-sm font-medium text-gray-600 mb-1">Phone Number</label>
              <InputMask
                name="phone"
                mask="(999) 999-9999"
                value={user.phone}
                onChange={(e) => setUser({ ...user, phone: e.value || '' })}
                placeholder="(555) 123-4567"
                className="w-full"
              />
            </div>
            <div className="w-[60%]">
              <label className="text-sm font-medium text-gray-600 mb-1">Major</label>
              <InputText
                name="major"
                value={user.major}
                onChange={handleChange}
                className="w-full"
                placeholder="e.g. Computer Science"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-600 mb-1">Password</label>
            <Password
              name="password"
              value={user.password}
              onChange={handleChange}
              feedback={false}
              toggleMask={false}
              inputClassName="w-full"
              placeholder="••••••••"
              required
            />
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-600 mb-1">Confirm Password</label>
            <Password
              name="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              feedback={false}
              toggleMask={false}
              inputClassName="w-full"
              placeholder="••••••••"
              required
            />
            {!passwordsMatch && incorrectPassword === confirmPassword && (
              <span className="text-primary-600 text-sm mt-1 ml-1 font-semibold">
                Passwords do not match.
              </span>
            )}
          </div>

          {/* Sign Up Button */}
          <Button type="submit" label="Sign Up" className="w-full justify-center py-2" />

          <p className="text-center text-sm mt-3">
            Already have an account?{' '}
            <a href="/login" className="text-primary-600 hover:underline">
              Sign In
            </a>
          </p>
        </form>
      </Card>
    </div>
  );
}

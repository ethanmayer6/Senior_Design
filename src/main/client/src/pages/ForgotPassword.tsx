import { useState } from 'react';
import { Link } from 'react-router-dom';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import Header from '../components/header.tsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);

  const handleSubmit = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setShowValidationError(true);
      return;
    }

    setSubmittedEmail(trimmedEmail);
    setShowValidationError(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <Header></Header>

      <Card className="flex w-full max-w-[420px] flex-col items-center rounded-xl bg-white shadow-md">
        <div className="mb-3 text-center">
          <p className="text-sm text-gray-500">Account recovery</p>
          <h2 className="mt-1 text-2xl font-bold text-gray-800">Forgot your password?</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter the email tied to your CourseFlow account so we know which login needs help.
          </p>
        </div>

        <div className="m-0 flex w-full max-w-[360px] flex-col gap-5">
          <div className="flex flex-col">
            <label htmlFor="forgot-password-email" className="mb-1 text-sm font-medium text-gray-600">
              Email address
            </label>
            <InputText
              id="forgot-password-email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (showValidationError) {
                  setShowValidationError(false);
                }
              }}
              className="w-full"
              placeholder="you@example.com"
            />
          </div>

          {showValidationError && (
            <div className="pl-2 text-sm font-bold text-red-500">Please enter your email address.</div>
          )}

          {submittedEmail && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-slate-700">
              Password reset emails are not automated in this environment yet. We saved{' '}
              <span className="font-semibold">{submittedEmail}</span> here so you can share it with the CourseFlow team
              or an admin to reset access.
            </div>
          )}

          <Button
            label={submittedEmail ? 'Update Email' : 'Continue'}
            onClick={handleSubmit}
            className="w-full justify-center py-2"
          />

          <p className="text-center text-sm text-gray-500">
            Remembered it?{' '}
            <Link to="/login" className="font-medium text-red-600 hover:text-red-700">
              Back to sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import Header from '../components/header.tsx';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [noEmailOrPassword, setNoEmailOrPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      setNoEmailOrPassword(true);
      return;
    }

    setNoEmailOrPassword(false);
    setLoginError('');

    try {
      const response = await api.post('/users/login', { email, password });

      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('token', response.data.token.trim());
      navigate('/courseflow');
    } catch (err: any) {
      console.error('Login failed:', err);
      setLoginError(err?.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Header></Header>

      <Card className="w-[400px] bg-white shadow-md rounded-xl flex flex-col items-center">
        <div className="text-center mb-3">
          <p className="text-gray-500 text-sm">Please enter your details</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-1">Welcome back</h2>
        </div>

        <div className="flex flex-col w-[360px] gap-5 m-0">
          <div className="flex flex-col">
            <label htmlFor="email" className="text-sm font-medium text-gray-600 mb-1">
              Email address
            </label>
            <InputText
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (noEmailOrPassword) setNoEmailOrPassword(false);
              }}
              className="w-full"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="password" className="text-sm font-medium text-gray-600 mb-1">
              Password
            </label>
            <Password
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (noEmailOrPassword) setNoEmailOrPassword(false);
              }}
              feedback={false}
              toggleMask={false}
              inputClassName="w-full"
              placeholder="********"
            />
          </div>

          {noEmailOrPassword && (
            <div className="text-red-500 font-bold text-sm pl-2">
              Please enter both email and password.
            </div>
          )}
          {loginError && <div className="text-red-500 font-bold text-sm pl-2">{loginError}</div>}

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="accent-red-600 cursor-pointer" />
              <label htmlFor="remember" className="text-gray-600 cursor-pointer">
                Remember me
              </label>
            </div>
            <a
              href="#"
              className="text-red-600 hover:text-red-700 transition-colors duration-150 cursor-pointer"
            >
              Forgot password?
            </a>
          </div>

          <Button label="Sign In" onClick={handleLogin} className="w-full justify-center py-2" />

          <p className="text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <a href="/register" className="text-red-600 hover:text-red-700 font-medium">
              Sign up
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}

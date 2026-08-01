import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import authApi from '../../api/auth.api';
import Button from '../../components/ui/button';
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing from the link.');
        return;
      }

      try {
        const response = await authApi.verifyEmail(token);
        setStatus('success');
        setMessage(response.message || 'Email verified successfully!');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification link is invalid or has expired.');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="shadow-xl dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
          <CardHeader>
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full mb-3">
              {status === 'verifying' && (
                <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              )}
              {status === 'success' && (
                <div className="w-12 h-12 bg-success-500/10 text-success-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {status === 'error' && (
                <div className="w-12 h-12 bg-danger-500/10 text-danger-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
            </div>
            <CardTitle>
              {status === 'verifying' && 'Verifying Email...'}
              {status === 'success' && 'Email Verified!'}
              {status === 'error' && 'Verification Failed'}
            </CardTitle>
            <CardDescription>
              {status === 'verifying' && 'Please wait while we confirm your email address.'}
              {status === 'success' && 'Your email has been verified. You can now access your clinical portal.'}
              {status === 'error' && 'We could not complete your email verification.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="py-2">
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              {message}
            </p>
          </CardContent>
          <CardFooter className="pt-6">
            <Link to="/login" className="w-full">
              <Button variant="default" className="w-full" disabled={status === 'verifying'}>
                {status === 'success' ? 'Go to Sign In' : 'Back to Sign In'}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;

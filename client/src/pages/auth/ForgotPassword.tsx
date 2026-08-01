import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import authApi from '../../api/auth.api';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import Label from '../../components/ui/label';
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

type ForgotFields = z.infer<typeof schema>;

export const ForgotPassword: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFields>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ForgotFields) => {
    setIsLoading(true);
    try {
      const response = await authApi.forgotPassword(data.email);
      setIsSent(true);
      toast.success(response.message || 'If that email matches an account, we sent a password reset link.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="shadow-xl dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              {isSent
                ? 'Check your inbox for a reset link'
                : 'Enter your email address and we will send you a link to reset your password'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSent ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 bg-success-500/10 text-success-500 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 19v-8.93a2 2 0 0 1 .89-1.664l8-5.333a2 2 0 0 1 2.22 0l8 5.333A2 2 0 0 1 21 10.07V19M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5" />
                  </svg>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  We've sent a link to reset your password. If you don't receive it in a few minutes, check your spam folder.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    error={errors.email?.message}
                    {...register('email')}
                  />
                </div>
                <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
                  Send Reset Link
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex border-t border-slate-100 dark:border-slate-900 pt-6 justify-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Remember your password?{' '}
              <Link to="/login" className="text-brand-600 hover:text-brand-500 dark:text-brand-400 font-semibold">
                Sign In
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;

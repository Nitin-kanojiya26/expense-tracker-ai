import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as registerApi } from '../api/api';
import { toast, Toaster } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Eye, EyeOff, Loader2, Wallet, Check, X } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  // Password Strength Formula with string validation checks
  const getPasswordStrength = (pwd) => {
    const passwordStr = String(pwd || ''); 
    if (!passwordStr) return 0;
    let strength = 0;
    if (passwordStr.length >= 6) strength += 25;
    if (passwordStr.length >= 8) strength += 25;
    if (/[A-Z]/.test(passwordStr)) strength += 25;
    if (/[0-9]/.test(passwordStr) || /[^A-Za-z0-9]/.test(passwordStr)) strength += 25;
    return strength;
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const getStrengthColor = () => {
    if (passwordStrength <= 25) return 'bg-destructive';
    if (passwordStrength <= 50) return 'bg-warning';
    if (passwordStrength <= 75) return 'bg-primary';
    return 'bg-success';
  };

  const getStrengthText = () => {
    if (passwordStrength <= 25) return 'Weak';
    if (passwordStrength <= 50) return 'Fair';
    if (passwordStrength <= 75) return 'Good';
    return 'Strong';
  };

  const passwordChecks = [
    { label: 'At least 6 characters', valid: String(formData.password || '').length >= 6 },
    { label: 'At least 8 characters', valid: String(formData.password || '').length >= 8 },
    { label: 'Contains uppercase letter', valid: /[A-Z]/.test(String(formData.password || '')) },
    { label: 'Contains number or symbol', valid: /[0-9]/.test(String(formData.password || '')) || /[^A-Za-z0-9]/.test(String(formData.password || '')) },
  ];

  // FIX: Direct input updater function that does not depend on target name properties
  const updateField = (fieldName, value) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    const fName = String(formData.fullName || '').trim();
    const uName = String(formData.username || '').trim();
    const mail = String(formData.email || '').trim();
    const pwd = String(formData.password || '');
    const cpwd = String(formData.confirmPassword || '');

    if (!fName) {
      newErrors.fullName = 'Full name is required';
    }
    if (!uName) {
      newErrors.username = 'Username is required';
    } else if (uName.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    if (!mail) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(mail)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!pwd) {
      newErrors.password = 'Password is required';
    } else if (pwd.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (pwd !== cpwd) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await registerApi({
        fullName: String(formData.fullName).trim(),
        username: String(formData.username).trim(),
        email: String(formData.email).trim(),
        password: String(formData.password)
      });

      toast.success('Account created successfully! Redirecting...');
      
      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-8">
      <Toaster position="top-right" richColors />
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
            <Wallet className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">Create an account</CardTitle>
            <CardDescription className="mt-2">
              Start tracking your expenses with AI
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                className={errors.fullName ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName}</p>
              )}
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Nitin"
                value={formData.username}
                onChange={(e) => updateField('username', e.target.value)}
                className={errors.username ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={errors.email ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              
              {formData.password && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Progress value={passwordStrength} className={`h-2 ${getStrengthColor()}`} />
                    <span className="text-xs text-muted-foreground w-12">{getStrengthText()}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {passwordChecks.map((check, index) => (
                      <div key={index} className="flex items-center gap-1 text-xs">
                        {check.valid ? (
                          <Check className="h-3 w-3 text-success" />
                        ) : (
                          <X className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className={check.valid ? 'text-success' : 'text-muted-foreground'}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
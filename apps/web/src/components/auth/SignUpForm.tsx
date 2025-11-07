'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { trackEvent } from '@/lib/analytics/posthog'

interface SignUpFormProps {
  action: (formData: FormData) => void
}

export function SignUpForm({ action }: SignUpFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptMarketing, setAcceptMarketing] = useState(false)

  const searchParams = useSearchParams()
  const error = searchParams?.get('error')

  useEffect(() => {
    trackEvent('signup_view')
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      return
    }

    if (!acceptTerms) {
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('email', email)
      formData.append('password', password)
      formData.append('confirm_password', confirmPassword)
      if (acceptMarketing) {
        formData.append('marketing_consent', 'on')
      }

      trackEvent('signup_submit', {
        has_email: !!email,
        marketing_consent: acceptMarketing
      })

      await action(formData)
    } catch (err) {
      trackEvent('signup_failure', {
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSSO = async (provider: 'google' | 'microsoft' | 'github') => {
    trackEvent('sso_signup_click', { provider })

    // In a real implementation, this would redirect to the SSO provider
    // For now, we'll just do nothing
  }

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'User already registered':
        return 'An account with this email already exists'
      case 'Password should be at least 6 characters':
        return 'Password must be at least 6 characters long'
      case 'Invalid email':
        return 'Please enter a valid email address'
      case 'Signup is disabled':
        return 'Account creation is currently disabled'
      default:
        return error
    }
  }

  const passwordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }

  const getPasswordStrengthText = (strength: number) => {
    if (strength < 2) return 'Weak'
    if (strength < 4) return 'Medium'
    return 'Strong'
  }

  const getPasswordStrengthColor = (strength: number) => {
    if (strength < 2) return 'text-red-600'
    if (strength < 4) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <Alert className="bg-red-500/20 border-red-400/50 text-white">
            <AlertDescription>
              {getErrorMessage(error)}
            </AlertDescription>
          </Alert>
        )}

        <div>
          <Label htmlFor="email" className="block text-sm font-medium text-white mb-2">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <Label htmlFor="password" className="block text-sm font-medium text-white mb-2">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm"
              placeholder="Create a password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/60 hover:text-white"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          {password && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-white/80">
                <span>Password strength:</span>
                <span className={getPasswordStrengthColor(passwordStrength(password))}>
                  {getPasswordStrengthText(passwordStrength(password))}
                </span>
              </div>
              <div className="mt-1 bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    passwordStrength(password) < 2 ? 'bg-red-400 w-1/4' :
                    passwordStrength(password) < 4 ? 'bg-yellow-400 w-2/3' :
                    'bg-green-400 w-full'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="confirm_password" className="block text-sm font-medium text-white mb-2">
            Confirm Password
          </Label>
          <div className="relative">
            <Input
              id="confirm_password"
              name="confirm_password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-4 py-3 pr-12 bg-white/10 border rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm ${
                confirmPassword && password !== confirmPassword
                  ? 'border-red-400/50'
                  : 'border-white/30'
              }`}
              placeholder="Confirm your password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/60 hover:text-white"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="mt-1 text-xs text-red-300">Passwords do not match</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-start">
            <Checkbox
              id="accept_terms"
              checked={acceptTerms}
              onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
              className="mt-1 border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-blue-600"
            />
            <Label htmlFor="accept_terms" className="ml-3 block text-sm text-white">
              I agree to the{' '}
              <Link href="/terms" className="text-blue-200 hover:text-blue-100 underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-blue-200 hover:text-blue-100 underline">
                Privacy Policy
              </Link>
            </Label>
          </div>

          <div className="flex items-start">
            <Checkbox
              id="accept_marketing"
              checked={acceptMarketing}
              onCheckedChange={(checked) => setAcceptMarketing(checked as boolean)}
              className="mt-1 border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-blue-600"
            />
            <Label htmlFor="accept_marketing" className="ml-3 block text-sm text-white">
              Send me product updates and promotions
            </Label>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || !acceptTerms || password !== confirmPassword}
          className="w-full py-3 px-4 bg-white text-blue-600 hover:bg-blue-50 font-semibold rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating account...
            </span>
          ) : (
            'Create Account'
          )}
        </Button>

        <div className="text-center">
          <Link
            href="/signin"
            className="text-sm font-medium text-white hover:text-blue-100 transition-colors"
          >
            Already have an account? <span className="underline">Sign in</span>
          </Link>
        </div>
      </form>

      {/* SSO Options - Compact version */}
      <div className="pt-4 border-t border-white/20">
        <p className="text-xs text-center text-white/80 mb-3">Or continue with</p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => handleSSO('google')}
            className="flex-1 py-2 px-4 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg transition-colors backdrop-blur-sm"
            title="Continue with Google"
          >
            <svg className="w-5 h-5 mx-auto text-white" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </button>
          
          <button
            type="button"
            onClick={() => handleSSO('microsoft')}
            className="flex-1 py-2 px-4 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg transition-colors backdrop-blur-sm"
            title="Continue with Microsoft"
          >
            <svg className="w-5 h-5 mx-auto text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/>
            </svg>
          </button>

          <button
            type="button"
            onClick={() => handleSSO('github')}
            className="flex-1 py-2 px-4 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg transition-colors backdrop-blur-sm"
            title="Continue with GitHub"
          >
            <svg className="w-5 h-5 mx-auto text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

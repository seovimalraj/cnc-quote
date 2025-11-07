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

interface SignInFormProps {
  action?: (formData: FormData) => void
}

export function SignInForm({ action }: SignInFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const searchParams = useSearchParams()
  const error = searchParams?.get('error')

  useEffect(() => {
    trackEvent('signin_view')
  }, [])

  // Handle form submission to API route
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.set('email', email)
      formData.set('password', password)
      if (rememberMe) {
        formData.set('remember_me', 'on')
      }

      trackEvent('signin_submit', { has_email: !!email, remember_me: rememberMe })

      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password
        }),
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include cookies
      })

      const data = await response.json()

      if (response.ok) {
        trackEvent('signin_success')
        // Redirect based on role
        const role = data.user?.role || 'user'
        if (role === 'admin' || role === 'org_admin' || role === 'reviewer' || role === 'finance' || role === 'auditor') {
          window.location.href = '/admin'
        } else if (role === 'supplier') {
          window.location.href = '/supplier/dashboard'
        } else {
          window.location.href = '/portal/dashboard'
        }
      } else {
        trackEvent('signin_failure', { error: data.error })
        // Redirect with error
        window.location.href = '/signin?error=' + encodeURIComponent(data.error || 'Authentication failed')
      }
    } catch (err) {
      trackEvent('signin_failure', { error: err instanceof Error ? err.message : 'Unknown error' })
      window.location.href = '/signin?error=' + encodeURIComponent('Network error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSSO = async (provider: 'google' | 'microsoft' | 'github') => {
    trackEvent('sso_click', { provider })
    // SSO integration placeholder
  }

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'Invalid login credentials':
        return 'Invalid email or password'
      case 'Email not confirmed':
        return 'Please check your email and confirm your account'
      case 'Too many requests':
        return 'Too many attempts. Please try again in a few minutes'
      default:
        return error
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert className="bg-red-500/10 border-red-500/50 text-white">
          <AlertDescription className="text-white">
            {getErrorMessage(error)}
          </AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="email" className="block text-sm font-medium text-white mb-2">
          Email Address
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm transition-all"
          placeholder="you@company.com"
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm transition-all"
            placeholder="Enter your password"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-4 flex items-center hover:opacity-80 transition-opacity"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5 text-white/70" />
            ) : (
              <EyeIcon className="h-5 w-5 text-white/70" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Checkbox
            id="remember_me"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            className="border-white/30 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
          />
          <Label htmlFor="remember_me" className="ml-2 block text-sm text-white/90">
            Remember me
          </Label>
        </div>

        <div className="text-sm">
          <Link
            href="/auth/reset-password"
            className="font-medium text-blue-200 hover:text-white transition-colors"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Signing in...
          </div>
        ) : (
          'Sign In'
        )}
      </Button>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/20"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-transparent text-white/70">Or continue with</span>
        </div>
      </div>

      {/* SSO Buttons */}
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSSO('google')}
          className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-all duration-200 backdrop-blur-sm"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleSSO('microsoft')}
          className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-all duration-200 backdrop-blur-sm"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/>
          </svg>
          Continue with Microsoft
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleSSO('github')}
          className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-all duration-200 backdrop-blur-sm"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          Continue with GitHub
        </Button>
      </div>

      {/* Sign up link */}
      <div className="text-center pt-4">
        <p className="text-white/80 text-sm">
          Don't have an account?{' '}
          <Link
            href="/sign-up"
            className="font-semibold text-blue-200 hover:text-white transition-colors"
          >
            Create account
          </Link>
        </p>
      </div>
    </form>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    // Not authenticated - redirect to login
    redirect('/signin')
  }

  // Authenticated user - redirect based on role
  const userRole = session.user.user_metadata?.role || 'user'

  if (userRole === 'admin') {
    redirect('/admin')
  } else {
    redirect('/dashboard')
  }
}

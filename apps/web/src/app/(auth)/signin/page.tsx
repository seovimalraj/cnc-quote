import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'

export default function SignInPage() {
  const handleSubmit = async (formData: FormData) => {
    'use server'
    
    const supabase = createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return redirect('/signin?error=' + error.message)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .single()

    if (!profile?.organization_id) {
      return redirect('/signin?error=No organization assigned')
    }

    return redirect('/portal')
  }

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
        <h3 className="font-medium text-black dark:text-white">
          Sign In
        </h3>
      </div>
      <form action={handleSubmit}>
        <div className="p-6.5">
          <div className="mb-4.5">
            <label className="mb-2.5 block text-black dark:text-white">
              Email
            </label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
            />
          </div>

          <div className="mb-4.5">
            <label className="mb-2.5 block text-black dark:text-white">
              Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
            />
          </div>

          <button className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray-50">
            Sign In
          </button>
        </div>
      </form>
    </div>
  )
}

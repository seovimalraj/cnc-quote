"use client";

import { useEffect, useState } from 'react';
import { EnhancedInstantQuote } from '@/components/instant-quote/EnhancedInstantQuote';
import { createClient } from '@/lib/supabase/client';

export default function InstantQuotePage() {
	const [orgId, setOrgId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const getOrgId = async () => {
			try {
				const supabase = createClient();
				const { data: { session } } = await supabase.auth.getSession();
        
				if (session?.user) {
					// Try to get org_id from user metadata
					const metadata = session.user.app_metadata || session.user.user_metadata || {};
					const userOrgId = metadata.org_id as string | undefined;
          
					if (userOrgId) {
						setOrgId(userOrgId);
					} else {
						// Fallback: use user ID as org ID for development
						setOrgId(session.user.id);
					}
				} else {
					// Guest mode - generate temporary org ID
					setOrgId('guest-' + Date.now());
				}
			} catch (error) {
				console.error('Failed to get org ID:', error);
				// Fallback for development
				setOrgId('dev-org');
			} finally {
				setLoading(false);
			}
		};

		getOrgId();
	}, []);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
				<div className="text-center">
					<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
						<div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
					</div>
					<p className="text-sm text-gray-600 dark:text-gray-400">Loading instant quote...</p>
				</div>
			</div>
		);
	}

	if (!orgId) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
				<div className="text-center max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
					<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
						Organization Required
					</h2>
					<p className="text-gray-600 dark:text-gray-400 mb-6">
						Please sign in to access the instant quote feature.
					</p>
					<a
						href="/login"
						className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all"
					>
						Sign In
					</a>
				</div>
			</div>
		);
	}

	return <EnhancedInstantQuote orgId={orgId} />;
}

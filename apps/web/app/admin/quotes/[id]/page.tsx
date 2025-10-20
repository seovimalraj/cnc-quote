'use client';
/**
 * @module AdminQuoteDetailPage
 * @ownership web/admin
 * @purpose Provide a consolidated view of quote metadata, pricing, DFM issues, and activity for admin analysts.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';

import { RequireAnyRole } from '@/components/auth/RequireAnyRole';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useAdminQuoteDetail } from '@/hooks/useAdminQuoteDetail';
import {
	assignAbandonedQuote,
	sendAbandonedQuoteReminder,
	updateQuoteLifecycleStatus,
} from '@/lib/admin/api';
import { ContractsVNext } from '@cnc-quote/shared';

export default function AdminQuoteDetailPage() {
	const params = useParams<{ id: string }>();
	const quoteId = params?.id ?? '';
	const { detail, summary, isLoading, isFetching, isError, error, refetch } = useAdminQuoteDetail(quoteId);
		const item = detail?.item;
		const workspace = detail?.workspace;
		const lineSummaries = useMemo(() => (summary ? deriveLineSummaries(summary.lines) : []), [summary]);
		const quoteCurrency = summary?.totals.currency ?? workspace?.pricingSummary.currency ?? 'USD';
		const { toast } = useToast();

		const [assigneeInput, setAssigneeInput] = useState('');
		const [assigning, setAssigning] = useState(false);
		'use client';
		/**
		 * @module AdminQuoteDetailPage
		 * @ownership web/admin
		 * @purpose Provide a consolidated view of quote metadata, pricing, DFM issues, and activity for admin analysts.
		 */

		import { useCallback, useEffect, useMemo, useState } from 'react';
		import Link from 'next/link';
		import { useParams } from 'next/navigation';
		import { AlertTriangle, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';

		import { RequireAnyRole } from '@/components/auth/RequireAnyRole';
		import { Badge } from '@/components/ui/badge';
		import { Button } from '@/components/ui/button';
		import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
		import { Input } from '@/components/ui/input';
		import { Label } from '@/components/ui/label';
		import {
			Table,
			TableBody,
			TableCell,
			TableHead,
			TableHeader,
			TableRow,
		} from '@/components/ui/table';
		import { useToast } from '@/components/ui/use-toast';
		import { useAdminQuoteDetail } from '@/hooks/useAdminQuoteDetail';
		import {
			assignAbandonedQuote,
			sendAbandonedQuoteReminder,
			updateQuoteLifecycleStatus,
		} from '@/lib/admin/api';
		import { ContractsVNext } from '@cnc-quote/shared';

		export default function AdminQuoteDetailPage() {
			const params = useParams<{ id: string }>();
			const quoteId = params?.id ?? '';
			const { detail, summary, isLoading, isFetching, isError, error, refetch } = useAdminQuoteDetail(quoteId);
			const item = detail?.item;
			const workspace = detail?.workspace;
			const lineSummaries = useMemo(
				() => (summary ? deriveLineSummaries(summary.lines) : []),
				[summary],
			);
			const quoteCurrency = summary?.totals.currency ?? workspace?.pricingSummary.currency ?? 'USD';
			const { toast } = useToast();

			const [assigneeInput, setAssigneeInput] = useState('');
			const [assigning, setAssigning] = useState(false);
			const [reminding, setReminding] = useState(false);
			const [converting, setConverting] = useState(false);

			useEffect(() => {
				setAssigneeInput(item?.assignee ?? '');
			}, [item?.assignee]);

			const handleAssign = useCallback(async () => {
				const assignee = assigneeInput.trim();
				if (!assignee) {
					toast({
						title: 'Assignment requires a user id',
						description: 'Provide a valid user identifier before assigning.',
						variant: 'destructive',
					});
					return;
				}

					if (!quoteId) {
						toast({ title: 'Missing quote identifier', description: 'Reload the quote detail and try again.', variant: 'destructive' });
						return;
					}

				setAssigning(true);
				try {
					await assignAbandonedQuote(quoteId, assignee);
					toast({ title: 'Quote assigned', description: `Assigned to ${assignee}.` });
					refetch();
				} catch (assignError) {
					const message = assignError instanceof Error ? assignError.message : 'Unable to assign quote';
					toast({ title: 'Assignment failed', description: message, variant: 'destructive' });
				} finally {
					setAssigning(false);
				}
			}, [assigneeInput, quoteId, refetch, toast]);

			const handleReminder = useCallback(async () => {
				setReminding(true);
				try {
						if (!quoteId) {
							throw new Error('Quote identifier is required');
						}

					await sendAbandonedQuoteReminder(quoteId);
					toast({ title: 'Reminder sent', description: 'A follow-up reminder was triggered for the buyer.' });
				} catch (reminderError) {
					const message = reminderError instanceof Error ? reminderError.message : 'Unable to send reminder';
					toast({ title: 'Reminder failed', description: message, variant: 'destructive' });
				} finally {
					setReminding(false);
				}
			}, [quoteId, toast]);

			const handleConvertToManual = useCallback(async () => {
				setConverting(true);
				try {
						if (!quoteId) {
							throw new Error('Quote identifier is required');
						}

					await updateQuoteLifecycleStatus(quoteId, 'Needs_Review');
					toast({
						title: 'Quote moved to manual review',
						description: 'The quote is now flagged for manual intervention.',
					});
					refetch();
				} catch (convertError) {
					const message = convertError instanceof Error ? convertError.message : 'Unable to convert quote';
					toast({ title: 'Conversion failed', description: message, variant: 'destructive' });
				} finally {
					setConverting(false);
				}
			}, [quoteId, refetch, toast]);

			return (
				<RequireAnyRole
					roles={['admin', 'org_admin', 'reviewer', 'finance']}
					fallback={<div className="p-6 text-sm text-red-600">Access denied</div>}
				>
					{!quoteId ? (
						<div className="p-6 text-sm text-red-600">Quote identifier is required.</div>
					) : isLoading ? (
						<div className="flex h-64 items-center justify-center text-muted-foreground">
							<Loader2 className="mr-2 h-5 w-5 animate-spin" />
							Loading quote...
						</div>
					) : isError || !detail || !summary || !item || !workspace ? (
						<div className="p-6">
							<Card className="border-destructive/40 bg-destructive/10">
								<CardHeader className="flex flex-row items-start gap-3">
									<AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
									<div>
										<CardTitle className="text-base">Unable to load quote</CardTitle>
										<p className="text-xs text-destructive/80">{error?.message ?? 'Please try again.'}</p>
									</div>
								</CardHeader>
								<CardContent>
									<Button variant="outline" onClick={() => refetch()}>
										Retry
									</Button>
								</CardContent>
							</Card>
						</div>
					) : (
						<div className="space-y-6 p-6">
							<header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
								<div className="flex items-center gap-3 text-sm text-muted-foreground">
									<Button asChild variant="ghost" size="sm" className="px-2">
										<Link href="/admin/quotes" className="inline-flex items-center gap-1">
											<ArrowLeft className="h-4 w-4" aria-hidden="true" />
											Back to quotes
										</Link>
									</Button>
									<span className="text-xs uppercase tracking-wide text-muted-foreground">Quote</span>
									<span className="font-medium text-foreground">{item.quoteNumber ?? summary.id}</span>
								</div>
								<div className="flex items-center gap-2">
									<Badge variant="outline" className="uppercase">{item.lane.replace('_', ' ')}</Badge>
									<Badge className={priorityBadge(item.priority)}>{item.priority}</Badge>
									<Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
										<RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
										Refresh
									</Button>
								</div>
							</header>

							<Card>
								<CardHeader>
									<CardTitle className="text-base font-semibold">Actions</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
										<div className="w-full md:w-64">
											<Label htmlFor="assignee-input" className="text-xs uppercase tracking-wide text-muted-foreground">
												Assign to
											</Label>
											<Input
												id="assignee-input"
												value={assigneeInput}
												onChange={(event) => setAssigneeInput(event.target.value)}
												placeholder="Enter user id or email"
												className="mt-1"
											/>
										</div>
										<Button type="button" onClick={handleAssign} disabled={assigning}>
											{assigning ? 'Assigning...' : 'Assign Quote'}
										</Button>
									</div>
									<div className="flex flex-wrap gap-2">
										<Button type="button" variant="secondary" onClick={handleReminder} disabled={reminding}>
											{reminding ? 'Sending...' : 'Send Reminder'}
										</Button>
										<Button type="button" variant="outline" onClick={handleConvertToManual} disabled={converting}>
											{converting ? 'Converting...' : 'Convert to Manual Review'}
										</Button>
									</div>
								</CardContent>
							</Card>

							<section className="grid gap-4 lg:grid-cols-3">
								<Card>
									<CardHeader>
										<CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
											Customer
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-2 text-sm">
										<div>
											<p className="text-base font-semibold text-foreground">{item.customerName ?? '—'}</p>
											<p className="text-xs text-muted-foreground">{item.company ?? '—'}</p>
										</div>
										<SeparatorLine />
										<div className="flex justify-between">
											<span className="text-muted-foreground">Submitted</span>
											<span>{formatAbsolute(item.createdAt)}</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">Last action</span>
											<span>{formatAbsolute(item.lastActionAt)}</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">Assignee</span>
											<span>{item.assignee ?? 'Unassigned'}</span>
										</div>
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
											Financials
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span className="text-muted-foreground">Line items</span>
											<span>{item.totalItems}</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">Total value</span>
											<span className="font-medium text-foreground">
												{formatCurrency(item.totalValue ?? 0, item.currency ?? 'USD')}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">DFM findings</span>
											<span>{item.dfmFindingCount ?? 0}</span>
										</div>
										<SeparatorLine />
										<div className="space-y-1 text-xs text-muted-foreground">
											<p>Pricing snapshot</p>
											<ul className="space-y-0.5 text-foreground">
												<li className="flex justify-between">
													<span>Material</span>
													<span>{formatCurrency(workspace.pricingSummary.materialCost ?? 0, workspace.pricingSummary.currency ?? quoteCurrency)}</span>
												</li>
												<li className="flex justify-between">
													<span>Machining</span>
													<span>{formatCurrency(workspace.pricingSummary.machiningCost ?? 0, workspace.pricingSummary.currency ?? quoteCurrency)}</span>
												</li>
												<li className="flex justify-between">
													<span>Finishing</span>
													<span>{formatCurrency(workspace.pricingSummary.finishingCost ?? 0, workspace.pricingSummary.currency ?? quoteCurrency)}</span>
												</li>
												<li className="flex justify-between font-medium">
													<span>Total</span>
													<span>{formatCurrency(workspace.pricingSummary.total ?? 0, workspace.pricingSummary.currency ?? quoteCurrency)}</span>
												</li>
											</ul>
										</div>
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
											Notes
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3 text-sm">
										{workspace.notes.length === 0 ? (
											<p className="text-muted-foreground">No analyst notes yet.</p>
										) : (
											workspace.notes.slice(0, 3).map((note) => (
												<div key={note.id} className="rounded border bg-muted/30 p-2">
													<p className="text-xs text-muted-foreground">{formatAbsolute(note.at)}</p>
													<p className="mt-1 text-sm text-foreground">{note.text ?? '—'}</p>
												</div>
											))
										)}
										{workspace.notes.length > 3 ? (
											<p className="text-xs text-muted-foreground">{workspace.notes.length - 3} more note(s) not shown.</p>
										) : null}
									</CardContent>
								</Card>
							</section>

							<Card>
								<CardHeader className="flex flex-row items-center justify-between">
									<CardTitle className="text-base font-semibold">Quote Lines</CardTitle>
									<Badge variant="outline">{lineSummaries.length} parts</Badge>
								</CardHeader>
								<CardContent className="overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Line</TableHead>
												<TableHead>Process</TableHead>
												<TableHead>Material</TableHead>
												<TableHead className="text-right">Quantity</TableHead>
												<TableHead className="text-right">Unit Price</TableHead>
												<TableHead className="text-right">Lead (days)</TableHead>
												<TableHead className="text-right">DFM Issues</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{lineSummaries.map((line) => (
												<TableRow key={line.id}>
													<TableCell className="font-medium">{line.fileName ?? line.id}</TableCell>
													<TableCell>{line.processType ?? '—'}</TableCell>
													<TableCell>{line.material ?? '—'}</TableCell>
													<TableCell className="text-right">{line.quantity ?? '—'}</TableCell>
													<TableCell className="text-right">{formatCurrency(line.unitPrice ?? 0, quoteCurrency)}</TableCell>
													<TableCell className="text-right">{line.leadTimeDays ?? '—'}</TableCell>
													<TableCell className="text-right">{line.dfmIssues}</TableCell>
												</TableRow>
											))}
											{lineSummaries.length === 0 ? (
												<TableRow>
													<TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
														No line items available for this quote.
													</TableCell>
												</TableRow>
											) : null}
										</TableBody>
									</Table>
								</CardContent>
							</Card>

							<section className="grid gap-4 lg:grid-cols-2">
								<Card>
									<CardHeader>
										<CardTitle className="text-base font-semibold">DFM Findings</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3 text-sm">
										{workspace.dfm.length === 0 ? (
											<p className="text-muted-foreground">No DFM blockers recorded.</p>
										) : (
											workspace.dfm.map((issue) => (
												<div key={issue.id} className="rounded border bg-muted/30 p-3">
													<div className="flex items-center justify-between text-xs uppercase tracking-wide">
														<span>{issue.rule ?? 'DFM Finding'}</span>
														<Badge variant="outline">{issue.severity ?? 'MED'}</Badge>
													</div>
													<p className="mt-2 text-sm text-foreground">{issue.message}</p>
													<p className="mt-1 text-xs text-muted-foreground">Recorded {formatAbsolute(issue.createdAt)}</p>
												</div>
											))
										)}
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle className="text-base font-semibold">Activity Timeline</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3 text-sm">
										{workspace.activity.length === 0 ? (
											<p className="text-muted-foreground">No activity captured for this quote yet.</p>
										) : (
											workspace.activity.map((event) => (
												<div key={event.id} className="rounded border bg-muted/30 p-3">
													<div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
														<span>{event.action}</span>
														<span>{formatAbsolute(event.at)}</span>
													</div>
													<p className="mt-2 text-sm text-foreground">Actor: {event.actor ?? 'System'}</p>
													{event.meta ? (
														<pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-background p-2 text-xs text-muted-foreground">
															{JSON.stringify(event.meta, null, 2)}
														</pre>
													) : null}
												</div>
											))
										)}
									</CardContent>
								</Card>
							</section>
						</div>
					)}
				</RequireAnyRole>
			);
		}

		function deriveLineSummaries(lines: ContractsVNext.QuoteLineVNext[]) {
			return lines.map((line) => {
				const selectedQuantity = line.selection.selectedQuantity ?? line.selection.quantities[0] ?? null;
				const pricingEntry = selectedQuantity
					? line.pricing.matrix.find((entry) => entry.quantity === selectedQuantity) ?? line.pricing.matrix[0]
					: line.pricing.matrix[0];
				const dfmIssueCount = Array.isArray(line.dfm?.issues) ? line.dfm.issues.length : 0;

				return {
					id: line.id,
					fileName: line.selection?.processType ? `${line.selection.processType} part` : line.id,
					processType: line.selection.processType,
					material: line.selection.materialSpec ?? line.selection.materialId,
					quantity: selectedQuantity,
					unitPrice: pricingEntry?.unitPrice ?? null,
					leadTimeDays: pricingEntry?.leadTimeDays ?? null,
					dfmIssues: dfmIssueCount,
				};
			});
		}

		function formatCurrency(value: number, currency: string): string {
			try {
				return new Intl.NumberFormat(undefined, {
					style: 'currency',
					currency,
					maximumFractionDigits: 2,
				}).format(value ?? 0);
			} catch {
				return value.toFixed(2);
			}
		}

		function formatAbsolute(value?: string | null): string {
			if (!value) {
				return '—';
			}

			const date = new Date(value);
			if (Number.isNaN(date.getTime())) {
				return value;
			}

			return new Intl.DateTimeFormat(undefined, {
				dateStyle: 'medium',
				timeStyle: 'short',
			}).format(date);
		}

		function priorityBadge(priority: ContractsVNext.AdminReviewPriorityVNext): string {
			switch (priority) {
				case 'LOW':
					return 'bg-slate-100 text-slate-700 border border-slate-200';
				case 'MED':
					return 'bg-blue-100 text-blue-800 border border-blue-200';
				case 'HIGH':
					return 'bg-amber-100 text-amber-900 border border-amber-200';
				case 'EXPEDITE':
					return 'bg-red-100 text-red-800 border border-red-200';
				default:
					return 'bg-slate-100 text-slate-700 border border-slate-200';
			}
		}

		function SeparatorLine() {
			return <div className="h-px w-full bg-border" role="presentation" />;
		}


import { redirect } from 'next/navigation';

interface PageProps {
  params: { id: string };
}

export default function QuoteAliasPage({ params }: PageProps) {
  redirect(`/portal/quotes/${params.id}`);
}

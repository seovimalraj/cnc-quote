import { api } from '@/lib/api';
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const response = await api.get('/manual-review/rules');
    return Response.json(response.data);
  } catch (error) {
    console.error('Error fetching manual review rules:', error);
    return Response.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = await api.post('/manual-review/rules', await request.json());
    return Response.json(response.data);
  } catch (error) {
    console.error('Error creating manual review rule:', error);
    return Response.json({ error: 'Failed to create rule' }, { status: 500 });
  }
}

import { api } from '@/lib/api';
import { type NextRequest } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await api.put(
      `/manual-review/rules/${params.id}`,
      await request.json()
    );
    return Response.json(response.data);
  } catch (error) {
    console.error('Error updating manual review rule:', error);
    return Response.json({ error: 'Failed to update rule' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await api.delete(`/manual-review/rules/${params.id}`);
    return Response.json(response.data);
  } catch (error) {
    console.error('Error deleting manual review rule:', error);
    return Response.json({ error: 'Failed to delete rule' }, { status: 500 });
  }
}

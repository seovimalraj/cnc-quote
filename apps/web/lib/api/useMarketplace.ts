/**
 * Step 17: Marketplace React Query Hooks
 * Custom hooks for supplier and routing data with optimistic updates
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { suppliersApi } from './suppliers';
import { routingApi } from './routing';
import type {
  SupplierProfile,
  CreateSupplierDto,
  UpdateSupplierDto,
  Capability,
  GetCandidatesDto,
  AssignSupplierDto,
  CreateRoutingRuleDto,
  AttachFileDto,
} from '@cnc-quote/shared';

// Query Keys
export const supplierKeys = {
  all: ['suppliers'] as const,
  lists: () => [...supplierKeys.all, 'list'] as const,
  list: (filters?: { active?: boolean; region?: string; process?: string }) =>
    [...supplierKeys.lists(), filters] as const,
  details: () => [...supplierKeys.all, 'detail'] as const,
  detail: (id: string) => [...supplierKeys.details(), id] as const,
};

export const routingKeys = {
  all: ['routing'] as const,
  candidates: (dto: GetCandidatesDto) =>
    [...routingKeys.all, 'candidates', dto] as const,
};

// Suppliers Hooks

export function useSuppliers(filters?: {
  active?: boolean;
  region?: string;
  process?: string;
}) {
  return useQuery({
    queryKey: supplierKeys.list(filters),
    queryFn: () => suppliersApi.list(filters),
    staleTime: 30_000,
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: supplierKeys.detail(id),
    queryFn: () => suppliersApi.get(id),
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateSupplierDto) => suppliersApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
    },
  });
}

export function useUpdateSupplier(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateSupplierDto) => suppliersApi.update(id, dto),
    onMutate: async (dto) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: supplierKeys.detail(id) });

      // Snapshot previous value
      const previous = queryClient.getQueryData<SupplierProfile>(
        supplierKeys.detail(id),
      );

      // Optimistically update
      if (previous) {
        queryClient.setQueryData<SupplierProfile>(supplierKeys.detail(id), {
          ...previous,
          ...dto,
        });
      }

      return { previous };
    },
    onError: (_err, _dto, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(supplierKeys.detail(id), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => suppliersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
    },
  });
}

export function useAddCapability(supplierId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (capability: Omit<Capability, 'id'>) =>
      suppliersApi.addCapability(supplierId, capability),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: supplierKeys.detail(supplierId),
      });
    },
  });
}

export function useAttachFile(supplierId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: AttachFileDto) => suppliersApi.attachFile(supplierId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: supplierKeys.detail(supplierId),
      });
    },
  });
}

// Routing Hooks

export function useCandidates(dto: GetCandidatesDto) {
  return useQuery({
    queryKey: routingKeys.candidates(dto),
    queryFn: () => routingApi.getCandidates(dto),
    enabled: !!dto.orderId,
    staleTime: 0, // Always refetch for fresh candidates
  });
}

export function useAssignSupplier(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: AssignSupplierDto) => routingApi.assignSupplier(orderId, dto),
    onSuccess: () => {
      // Invalidate order queries (assumes order query keys exist)
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useCreateRoutingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateRoutingRuleDto) => routingApi.createRule(dto),
    onSuccess: () => {
      // Invalidate candidates since new rule may affect scoring
      queryClient.invalidateQueries({ queryKey: routingKeys.all });
    },
  });
}

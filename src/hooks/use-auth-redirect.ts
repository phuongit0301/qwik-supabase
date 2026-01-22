import { useVisibleTask$, useSignal, $, type QRL } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";

interface UseAuthRedirectOptions {
  action: any;
  onSuccess?: QRL<(value: any) => Promise<void> | void>;
  redirectTo?: string;
}

/**
 * Hook to handle redirect after successful auth action
 */
export function useAuthRedirect({ action, onSuccess, redirectTo }: UseAuthRedirectOptions) {
  const navigate = useNavigate();
  const hasRedirected = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => action.value);

    if (hasRedirected.value) return;

    if (action.value && !action.value.failed) {
      hasRedirected.value = true;
      
      // Execute custom success handler if provided
      if (onSuccess) {
        await onSuccess(action.value);
      }

      // Redirect if specified
      if (redirectTo) {
        await navigate(redirectTo);
      }
    }
  });

  return { hasRedirected };
}

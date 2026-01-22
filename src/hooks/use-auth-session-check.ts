import { useVisibleTask$ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { getSession } from "~/lib/auth";

/**
 * Hook to check if user is already logged in and redirect if so
 */
export function useAuthSessionCheck(redirectTo: string = "/") {
  const navigate = useNavigate();

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    if (typeof window !== "undefined") {
      const { data } = await getSession();
      if (data.session) {
        navigate(redirectTo);
      }
    }
  });
}

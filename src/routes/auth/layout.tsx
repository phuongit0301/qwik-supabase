import { component$, Slot, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { isAuthenticated } from "~/lib/auth";

export default component$(() => {
  const navigate = useNavigate();
  const isChecking = useSignal(true);

  // Check authentication on client side and redirect if logged in
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    const authenticated = await isAuthenticated();
    if (authenticated) {
      await navigate("/");
    } else {
      isChecking.value = false;
    }
  });

  return (
    <div class="min-h-screen bg-gray-100 flex items-center justify-center">
      <div class="w-full max-w-md">
        {isChecking.value ? (
          <div class="flex flex-col items-center justify-center p-8">
            <div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="mt-4 text-gray-600">Checking authentication...</p>
          </div>
        ) : (
          <Slot />
        )}
      </div>
    </div>
  );
});

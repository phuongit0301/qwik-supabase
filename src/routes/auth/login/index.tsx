import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { Link, routeAction$, Form, useLocation, useNavigate, type DocumentHead } from "@builder.io/qwik-city";
import { login, setSessionOnClient } from "~/lib/auth";
import { validateLoginForm, type LoginFormData } from "~/lib/validation";
import { InputField } from "~/components/auth/input-field";
import { Button } from "~/components/auth/button";
import { FormError } from "~/components/auth/form-error";
import { FormSuccess } from "~/components/auth/form-success";

export const useLoginAction = routeAction$(async (formData, { fail }) => {
  const formValues: LoginFormData = {
    email: (formData.email as string) || "",
    password: (formData.password as string) || "",
  };

  // Validate form
  const validation = validateLoginForm(formValues);
  if (!validation.isValid) {
    return fail(400, {
      fieldErrors: validation.errors,
      message: "Please fix the errors below",
    });
  }

  // Login user on server - get tokens back
  const result = await login(formValues.email, formValues.password);

  if (!result.success) {
    return fail(401, {
      message: result.error || "Login failed. Please try again.",
    });
  }

  // Return tokens to be stored on client side
  return {
    success: true,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  };
});

export default component$(() => {
  const loginAction = useLoginAction();
  const location = useLocation();
  const navigate = useNavigate();
  const showSuccessMessage = useSignal(false);

  // Handle successful login - store tokens on client and redirect
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => loginAction.value);

    if (loginAction.value && !loginAction.value.failed) {
      const { accessToken, refreshToken } = loginAction.value as any;
      if (accessToken && refreshToken) {
        // Store session in browser localStorage via Supabase client
        const success = await setSessionOnClient(accessToken, refreshToken);
        if (success) {
          await navigate("/");
        }
      }
    }
  });

  // Check if redirected from register page or handle Supabase hash fragment
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    // Check query param from register redirect
    const registered = location.url.searchParams.get("registered");
    if (registered === "true") {
      showSuccessMessage.value = true;
      // Clear the query param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("registered");
      window.history.replaceState({}, "", url.toString());
    }

    // Handle Supabase hash fragment (from email confirmation)
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const type = params.get("type");

      if (accessToken && type === "signup") {
        // User clicked email confirmation link
        showSuccessMessage.value = true;
        // Clear hash from URL
        window.history.replaceState({}, "", window.location.pathname + window.location.search);
      }
    }
  });

  return (
    <div class="bg-white rounded-lg shadow-md p-8">
      <h1 class="text-2xl font-bold text-center text-gray-800 mb-6">Login</h1>

      {showSuccessMessage.value && (
        <FormSuccess message="Registration successful! Please check your email to verify your account, then login here." />
      )}

      {loginAction.value?.failed && loginAction.value.message && (
        <FormError message={loginAction.value.message} />
      )}

      <Form action={loginAction} class="space-y-4">
        <InputField
          label="Email"
          type="email"
          id="email"
          name="email"
          placeholder="Enter your email"
          required
          error={
            loginAction.value?.failed
              ? (loginAction.value as any).fieldErrors?.email
              : undefined
          }
        />

        <InputField
          label="Password"
          type="password"
          id="password"
          name="password"
          placeholder="Enter your password"
          required
          error={
            loginAction.value?.failed
              ? (loginAction.value as any).fieldErrors?.password
              : undefined
          }
        />

        <div class="flex items-center justify-between">
          <label class="flex items-center">
            <input
              type="checkbox"
              name="remember"
              class="w-4 h-4 text-blue-600 rounded"
            />
            <span class="ml-2 text-sm text-gray-600">Remember me</span>
          </label>
          <a href="#" class="text-sm text-blue-600 hover:underline">
            Forgot password?
          </a>
        </div>

        <Button type="submit" variant="primary">
          {loginAction.isRunning ? "Signing In..." : "Sign In"}
        </Button>
      </Form>

      <p class="mt-6 text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <Link href="/auth/register" class="text-blue-600 hover:underline font-medium">
          Register
        </Link>
      </p>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Login",
  meta: [
    {
      name: "description",
      content: "Login to your account",
    },
  ],
};

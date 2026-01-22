import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { routeAction$, useLocation, type DocumentHead } from "@builder.io/qwik-city";
import { login, setSessionOnClient } from "~/lib/auth";
import { validateLoginForm, type LoginFormData } from "~/lib/validation";
import { InputField } from "~/components/auth/input-field";
import { Button } from "~/components/auth/button";
import { AuthForm } from "~/components/auth/auth-form";
import { AuthFooter } from "~/components/auth/auth-footer";
import { useAuthRedirect } from "~/hooks/use-auth-redirect";
import { useAuthSessionCheck } from "~/hooks/use-auth-session-check";

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
  const showSuccessMessage = useSignal(false);

  // Check if user is already logged in
  useAuthSessionCheck();

  // Handle successful login - store tokens on client and redirect
  useAuthRedirect({
    action: loginAction,
    onSuccess: $(async (value: any) => {
      const { accessToken, refreshToken } = value;
      if (accessToken && refreshToken) {
        await setSessionOnClient(accessToken, refreshToken);
      }
    }),
    redirectTo: "/",
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
    <AuthForm
      title="Login"
      action={loginAction}
      successMessage={
        showSuccessMessage.value
          ? "Registration successful! Please check your email to verify your account, then login here."
          : undefined
      }
    >
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

      <AuthFooter
        question="Don't have an account?"
        linkText="Register"
        linkHref="/auth/register"
      />
    </AuthForm>
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

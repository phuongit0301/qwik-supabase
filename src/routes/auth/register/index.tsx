import { component$ } from "@builder.io/qwik";
import { Link, routeAction$, Form, type DocumentHead } from "@builder.io/qwik-city";
import { register } from "~/lib/auth";
import { validateRegisterForm, type RegisterFormData } from "~/lib/validation";
import { InputField } from "~/components/auth/input-field";
import { Button } from "~/components/auth/button";
import { FormError } from "~/components/auth/form-error";

export const useRegisterAction = routeAction$(async (formData, { fail, redirect: redirectFn, url }) => {
  const formValues: RegisterFormData = {
    name: (formData.name as string) || "",
    email: (formData.email as string) || "",
    password: (formData.password as string) || "",
    confirmPassword: (formData.confirmPassword as string) || "",
  };

  // Validate form
  const validation = validateRegisterForm(formValues);
  if (!validation.isValid) {
    return fail(400, {
      fieldErrors: validation.errors,
      message: "Please fix the errors below",
    });
  }

  // Register user - pass redirect URL for email confirmation
  const redirectUrl = `${url.origin}/auth/login?registered=true`;
  const result = await register(formValues.email, formValues.password, redirectUrl);

  if (!result.success) {
    return fail(400, {
      message: result.error || "Registration failed. Please try again.",
    });
  }

  // Redirect to login page after successful registration
  throw redirectFn(302, "/auth/login?registered=true");
});

export default component$(() => {
  const registerAction = useRegisterAction();

  // Auth check is handled by auth layout

  return (
    <div class="bg-white rounded-lg shadow-md p-8">
      <h1 class="text-2xl font-bold text-center text-gray-800 mb-6">Register</h1>

      {registerAction.value?.failed && registerAction.value.message && (
        <FormError message={registerAction.value.message} />
      )}

      <Form action={registerAction} class="space-y-4">
        <InputField
          label="Full Name"
          type="text"
          id="name"
          name="name"
          placeholder="Enter your full name"
          required
          error={
            registerAction.value?.failed
              ? (registerAction.value as any).fieldErrors?.name
              : undefined
          }
        />

        <InputField
          label="Email"
          type="email"
          id="email"
          name="email"
          placeholder="Enter your email"
          required
          error={
            registerAction.value?.failed
              ? (registerAction.value as any).fieldErrors?.email
              : undefined
          }
        />

        <InputField
          label="Password"
          type="password"
          id="password"
          name="password"
          placeholder="Create a password"
          required
          error={
            registerAction.value?.failed
              ? (registerAction.value as any).fieldErrors?.password
              : undefined
          }
        />

        <InputField
          label="Confirm Password"
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          placeholder="Confirm your password"
          required
          error={
            registerAction.value?.failed
              ? (registerAction.value as any).fieldErrors?.confirmPassword
              : undefined
          }
        />

        <div class="flex items-center">
          <input
            type="checkbox"
            id="terms"
            name="terms"
            class="w-4 h-4 text-blue-600 rounded"
            required
          />
          <label for="terms" class="ml-2 text-sm text-gray-600">
            I agree to the{" "}
            <a href="#" class="text-blue-600 hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" class="text-blue-600 hover:underline">
              Privacy Policy
            </a>
          </label>
        </div>

        <Button type="submit" variant="primary">
          {registerAction.isRunning ? "Creating Account..." : "Create Account"}
        </Button>
      </Form>

      <p class="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/auth/login" class="text-blue-600 hover:underline font-medium">
          Sign In
        </Link>
      </p>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Register",
  meta: [
    {
      name: "description",
      content: "Create a new account",
    },
  ],
};

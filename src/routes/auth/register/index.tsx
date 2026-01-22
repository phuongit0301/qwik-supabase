import { component$, useVisibleTask$ } from "@builder.io/qwik";
import { Link, routeAction$, Form, useNavigate, type DocumentHead } from "@builder.io/qwik-city";
import { registerWithOTP } from "~/lib/auth";
import { validateRegisterForm, type RegisterFormData } from "~/lib/validation";
import { InputField } from "~/components/auth/input-field";
import { Button } from "~/components/auth/button";
import { FormError } from "~/components/auth/form-error";

export const useRegisterAction = routeAction$(async (formData, { fail }) => {
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

  // Register user with OTP flow
  const result = await registerWithOTP(formValues.email, formValues.password, formValues.name);

  if (!result.success) {
    return fail(400, {
      message: result.error || "Registration failed. Please try again.",
    });
  }

  // Return success with email and expiry for redirect
  return {
    success: true,
    email: result.email,
    otpExpiry: result.otpExpiry,
  };
});

export default component$(() => {
  const registerAction = useRegisterAction();
  const navigate = useNavigate();

  // Redirect to OTP verification page on successful registration
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => registerAction.value);

    if (registerAction.value && !registerAction.value.failed) {
      const { email, otpExpiry } = registerAction.value as any;
      if (email) {
        const params = new URLSearchParams({ email });
        if (otpExpiry) {
          params.set("expiry", otpExpiry);
        }
        await navigate(`/auth/verify-otp?${params.toString()}`);
      }
    }
  });

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

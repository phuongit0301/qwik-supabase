import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { routeAction$, Form, useLocation, useNavigate, type DocumentHead } from "@builder.io/qwik-city";
import { verifyOTPAndRegister, resendOTP, setSessionOnClient } from "~/lib/auth";
import { validateOTPForm, type OTPFormData } from "~/lib/validation";
import { formatRemainingTime, OTP_EXPIRY_MINUTES } from "~/lib/otp";
import { Button } from "~/components/auth/button";
import { FormError } from "~/components/auth/form-error";
import { FormSuccess } from "~/components/auth/form-success";

export const useVerifyOTPAction = routeAction$(async (formData, { fail }) => {
  const otpFormData: OTPFormData = {
    otp: (formData.otp as string) || "",
    email: (formData.email as string) || "",
  };

  // Validate OTP format
  const validation = validateOTPForm(otpFormData);
  if (!validation.isValid) {
    return fail(400, {
      fieldErrors: validation.errors,
      message: "Please enter a valid OTP",
    });
  }

  // Verify OTP and complete registration
  const result = await verifyOTPAndRegister(otpFormData.email, otpFormData.otp);

  if (!result.success) {
    return fail(400, {
      message: result.error || "Verification failed. Please try again.",
    });
  }

  // Return tokens for client-side session storage
  return {
    success: true,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  };
});

export const useResendOTPAction = routeAction$(async (formData, { fail }) => {
  const email = formData.email as string;

  if (!email) {
    return fail(400, {
      message: "Email is required to resend OTP.",
    });
  }

  const result = await resendOTP(email);

  if (!result.success) {
    return fail(400, {
      message: result.error || "Failed to resend OTP.",
    });
  }

  return {
    success: true,
    message: "New OTP sent successfully!",
    otpExpiry: result.otpExpiry,
  };
});

export default component$(() => {
  const verifyAction = useVerifyOTPAction();
  const resendAction = useResendOTPAction();
  const location = useLocation();
  const navigate = useNavigate();

  const email = useSignal("");
  const otpExpiry = useSignal("");
  const remainingTime = useSignal("");
  const isExpired = useSignal(false);
  const otpInputs = useSignal<string[]>(["", "", "", "", "", ""]);

  // Get email and expiry from URL params
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const emailParam = location.url.searchParams.get("email");
    const expiryParam = location.url.searchParams.get("expiry");

    if (!emailParam) {
      // No email, redirect to register
      navigate("/auth/register");
      return;
    }

    email.value = emailParam;
    if (expiryParam) {
      otpExpiry.value = expiryParam;
    }
  });

  // Update countdown timer
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track, cleanup }) => {
    track(() => otpExpiry.value);
    track(() => resendAction.value);

    // Update expiry from resend action
    if (resendAction.value && !resendAction.value.failed && (resendAction.value as any).otpExpiry) {
      otpExpiry.value = (resendAction.value as any).otpExpiry;
    }

    if (!otpExpiry.value) return;

    const updateTimer = () => {
      const expiry = new Date(otpExpiry.value);
      const now = new Date();

      if (now >= expiry) {
        isExpired.value = true;
        remainingTime.value = "0:00";
        return;
      }

      isExpired.value = false;
      remainingTime.value = formatRemainingTime(expiry);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    cleanup(() => clearInterval(interval));
  });

  // Handle successful verification - store tokens and redirect
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => verifyAction.value);

    if (verifyAction.value && !verifyAction.value.failed) {
      const { accessToken, refreshToken } = verifyAction.value as any;
      if (accessToken && refreshToken) {
        const success = await setSessionOnClient(accessToken, refreshToken);
        if (success) {
          await navigate("/");
        }
      } else {
        // No tokens (might need email confirmation in Supabase)
        await navigate("/auth/login?registered=true");
      }
    }
  });

  // Combine OTP inputs into single value
  const getOTPValue = () => otpInputs.value.join("");

  return (
    <div class="bg-white rounded-lg shadow-md p-8">
      <h1 class="text-2xl font-bold text-center text-gray-800 mb-2">Verify OTP</h1>
      <p class="text-center text-gray-600 mb-6">
        Enter the 6-digit code sent to<br />
        <span class="font-medium text-gray-800">{email.value}</span>
      </p>

      {verifyAction.value?.failed && verifyAction.value.message && (
        <FormError message={verifyAction.value.message} />
      )}

      {resendAction.value && !resendAction.value.failed && (resendAction.value as any).message && (
        <FormSuccess message={(resendAction.value as any).message} />
      )}

      <Form action={verifyAction} class="space-y-6">
        <input type="hidden" name="email" value={email.value} />

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-3 text-center">
            Enter OTP Code
          </label>
          <div class="flex justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                class={`w-12 h-14 text-center text-xl font-bold border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                  verifyAction.value?.failed
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                value={otpInputs.value[index]}
                onInput$={(e) => {
                  const target = e.target as HTMLInputElement;
                  const value = target.value.replace(/\D/g, "");
                  const newInputs = [...otpInputs.value];
                  newInputs[index] = value;
                  otpInputs.value = newInputs;

                  // Auto-focus next input
                  if (value && index < 5) {
                    const nextInput = target.parentElement?.children[index + 1] as HTMLInputElement;
                    nextInput?.focus();
                  }
                }}
                onKeyDown$={(e) => {
                  const target = e.target as HTMLInputElement;
                  // Handle backspace - move to previous input
                  if (e.key === "Backspace" && !target.value && index > 0) {
                    const prevInput = target.parentElement?.children[index - 1] as HTMLInputElement;
                    prevInput?.focus();
                  }
                }}
                onPaste$={(e) => {
                  e.preventDefault();
                  const pastedData = (e as ClipboardEvent).clipboardData?.getData("text") || "";
                  const digits = pastedData.replace(/\D/g, "").slice(0, 6);
                  const newInputs = [...otpInputs.value];
                  for (let i = 0; i < digits.length; i++) {
                    newInputs[i] = digits[i];
                  }
                  otpInputs.value = newInputs;
                }}
              />
            ))}
          </div>
          {/* Hidden input to submit the combined OTP */}
          <input type="hidden" name="otp" value={getOTPValue()} />

          {verifyAction.value?.failed && (verifyAction.value as any).fieldErrors?.otp && (
            <p class="mt-2 text-sm text-red-600 text-center" role="alert">
              {(verifyAction.value as any).fieldErrors.otp}
            </p>
          )}
        </div>

        {/* Timer */}
        <div class="text-center">
          {isExpired.value ? (
            <p class="text-red-600 font-medium">OTP has expired</p>
          ) : (
            <p class="text-gray-600">
              Code expires in{" "}
              <span class="font-bold text-blue-600">{remainingTime.value}</span>
            </p>
          )}
        </div>

        <Button type="submit" variant="primary">
          {verifyAction.isRunning ? "Verifying..." : "Verify OTP"}
        </Button>
      </Form>

      {/* Resend OTP */}
      <div class="mt-6 text-center">
        <p class="text-sm text-gray-600 mb-2">Didn't receive the code?</p>
        <Form action={resendAction}>
          <input type="hidden" name="email" value={email.value} />
          <button
            type="submit"
            disabled={resendAction.isRunning || (!isExpired.value && remainingTime.value !== "")}
            class={`text-sm font-medium ${
              isExpired.value
                ? "text-blue-600 hover:underline cursor-pointer"
                : "text-gray-400 cursor-not-allowed"
            }`}
          >
            {resendAction.isRunning ? "Sending..." : "Resend OTP"}
          </button>
        </Form>
        <p class="text-xs text-gray-500 mt-1">
          OTP valid for {OTP_EXPIRY_MINUTES} minutes
        </p>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Verify OTP",
  meta: [
    {
      name: "description",
      content: "Verify your email with OTP",
    },
  ],
};

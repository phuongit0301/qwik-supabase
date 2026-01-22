import { component$ } from "@builder.io/qwik";

interface FormSuccessProps {
  message: string;
}

export const FormSuccess = component$<FormSuccessProps>(({ message }) => {
  if (!message) return null;

  return (
    <div
      class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4"
      role="alert"
    >
      <p class="text-sm font-medium">{message}</p>
    </div>
  );
});

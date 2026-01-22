import { component$ } from "@builder.io/qwik";

interface FormErrorProps {
  message: string;
}

export const FormError = component$<FormErrorProps>(({ message }) => {
  if (!message) return null;

  return (
    <div
      class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4"
      role="alert"
    >
      <p class="text-sm font-medium">{message}</p>
    </div>
  );
});

import { component$, Slot } from "@builder.io/qwik";
import { Form } from "@builder.io/qwik-city";
import { FormError } from "./form-error";
import { FormSuccess } from "./form-success";

interface AuthFormProps {
  title: string;
  action: any;
  errorMessage?: string;
  successMessage?: string;
}

export const AuthForm = component$<AuthFormProps>(
  ({ title, action, errorMessage, successMessage }) => {
    return (
      <div class="bg-white rounded-lg shadow-md p-8">
        <h1 class="text-2xl font-bold text-center text-gray-800 mb-6">{title}</h1>

        {successMessage && <FormSuccess message={successMessage} />}

        {errorMessage && <FormError message={errorMessage} />}

        {action.value?.failed && action.value.message && (
          <FormError message={action.value.message} />
        )}

        <Form action={action} class="space-y-4">
          <Slot />
        </Form>
      </div>
    );
  }
);

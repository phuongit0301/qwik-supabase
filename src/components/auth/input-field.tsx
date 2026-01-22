import { component$ } from "@builder.io/qwik";

interface InputFieldProps {
  label: string;
  type: string;
  id: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  value?: string;
}

export const InputField = component$<InputFieldProps>(
  ({ label, type, id, name, placeholder, required = false, error, value }) => {
    return (
      <div>
        <label for={id} class="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <input
          type={type}
          id={id}
          name={name}
          value={value}
          class={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
          placeholder={placeholder}
          required={required}
        />
        {error && (
          <p class="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

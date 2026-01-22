import { component$, Slot } from "@builder.io/qwik";

interface ButtonProps {
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary";
}

export const Button = component$<ButtonProps>(
  ({ type = "button", variant = "primary" }) => {
    const baseClasses = "w-full py-2 px-4 rounded-lg transition font-medium";
    const variantClasses = {
      primary: "bg-blue-600 text-white hover:bg-blue-700",
      secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    };

    return (
      <button type={type} class={`${baseClasses} ${variantClasses[variant]}`}>
        <Slot />
      </button>
    );
  }
);

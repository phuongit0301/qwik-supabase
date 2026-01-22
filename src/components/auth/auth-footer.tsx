import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";

interface AuthFooterProps {
  question: string;
  linkText: string;
  linkHref: string;
}

export const AuthFooter = component$<AuthFooterProps>(
  ({ question, linkText, linkHref }) => {
    return (
      <p class="mt-6 text-center text-sm text-gray-600">
        {question}{" "}
        <Link href={linkHref} class="text-blue-600 hover:underline font-medium">
          {linkText}
        </Link>
      </p>
    );
  }
);

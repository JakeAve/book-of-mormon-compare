import type { PageProps } from "fresh";

export default function ErrorPage({ error }: PageProps) {
  const is404 = (error as { status?: number })?.status === 404;
  return (
    <main class="p-8 text-center">
      <h1 class="text-2xl font-bold mb-2">
        {is404 ? "404 — Not Found" : "Something went wrong"}
      </h1>
      <p>
        {is404
          ? "That book or chapter doesn't exist."
          : "An unexpected error occurred."}
      </p>
    </main>
  );
}

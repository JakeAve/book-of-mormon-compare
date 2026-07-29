export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // deno-lint-ignore react-no-danger
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replaceAll("<", "\\u003c"),
      }}
    />
  );
}

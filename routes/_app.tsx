import type { PageProps } from "fresh";

export default function App({ Component }: PageProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Book of Mormon Compare</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body style={{ backgroundColor: "var(--color-page-bg)" }}>
        <Component />
      </body>
    </html>
  );
}

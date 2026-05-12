import type { PageProps } from "fresh";
import Footer from "@/components/Footer.tsx";

export default function App({ Component }: PageProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Book of Mormon Compare</title>
      </head>
      <body class="flex flex-col min-h-screen" style={{ backgroundColor: "var(--color-page-bg)" }}>
        <Component />
        <Footer />
      </body>
    </html>
  );
}

import { signal } from "@preact/signals";

export const toast = signal<{ url: string } | null>(null);

import type { ComponentChildren } from "preact";

interface Props {
  id: string;
  children: ComponentChildren;
}

export default function WordMatch({ id, children }: Props) {
  return <span data-word-match id={id}>{children}</span>;
}

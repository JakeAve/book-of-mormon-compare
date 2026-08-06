import type { ComponentChildren, CSSProperties } from "preact";

const circleStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "1rem",
  height: "1rem",
  borderRadius: "50%",
  border: "1.5px solid currentColor",
  fontSize: "0.625rem",
  fontWeight: "700",
  lineHeight: "1",
};

const baseStyle: CSSProperties = {
  position: "absolute",
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  fontFamily: "sans-serif",
  fontSize: "0.75rem",
  color: "var(--color-muted)",
  textDecoration: "none",
  lineHeight: "1",
};

type Props =
  & {
    children: ComponentChildren;
    label: string;
    style?: CSSProperties;
    "data-tutorial"?: string;
  }
  & (
    | { href: string; onClick?: never }
    | { href?: never; onClick: () => void }
  );

export default function HeaderIconButton(
  { children, label, style, href, onClick, ...rest }: Props,
) {
  const merged = { ...baseStyle, ...style };

  if (href) {
    return (
      <a
        href={href}
        aria-label={label}
        title={label}
        style={merged}
        {...rest}
      >
        <span style={circleStyle}>{children}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={merged}
      {...rest}
    >
      <span style={circleStyle}>{children}</span>
    </button>
  );
}

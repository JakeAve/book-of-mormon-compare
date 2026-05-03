export function splitText(text: string): string[] {
  return text.split(/\s|\n|\b|\׃\:/).filter((v) =>
    v !== "" && v !== "\n" && v !== " "
  );
}

export function isPunctuation(text: string): boolean {
  return !/[a-zA-Z\&\(\)\<]/.test(text);
}

export function insertSpaceBetween(
  text1: string | undefined,
  text2: string | undefined,
): " " | "" {
  if (!text2 || !text1) return "";
  if (/[\<\(\[]/.test(text1)) return "";
  return /[א-תa-zA-Z\&\(\)\<]/.test(text2) ? " " : "";
}

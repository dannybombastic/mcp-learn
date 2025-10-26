declare module "html-to-text" {
  export function htmlToText(
    html: string,
    options?: {
      wordwrap?: number | false;
      preserveNewlines?: boolean;
      selectors?: { selector: string; format: "skip" | "inline" | "block" }[];
    }
  ): string;
}

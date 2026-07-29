import { createDefine } from "fresh";

export interface HeadMeta {
  title: string;
  description: string;
  imageUrl: string;
  pageUrl: string;
  canonicalUrl?: string;
}

export interface State {
  versions: string[];
  head?: HeadMeta;
  showTutorial?: boolean;
}

export const define = createDefine<State>();

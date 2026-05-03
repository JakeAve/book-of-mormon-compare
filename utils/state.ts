import { createDefine } from "fresh";

export interface State {
  versions: string[];
}

export const define = createDefine<State>();

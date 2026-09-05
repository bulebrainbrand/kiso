import { YukiCoderService } from "./service.ts";
export const yukicoder = (name: string = "yukicoder") =>
  new YukiCoderService(name);

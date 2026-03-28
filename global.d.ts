/// <reference types="next" />
/// <reference types="next/image-types/global" />
/// <reference types="@cloudflare/workers-types" />

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

// @ts-expect-error dist/index.cjs is generated at build time
import built from "../dist/index.cjs";

export default (built as any).default;

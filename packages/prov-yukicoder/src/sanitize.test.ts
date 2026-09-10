import { describe, expect, it } from "vite-plus/test";

import { sanitizeSegment, sanitizeTestCaseName } from "./sanitize.ts";

describe("sanitizeSegment", () => {
  it("通常名は不変", () => {
    expect(sanitizeSegment("sample1", "unknown")).toBe("sample1");
    expect(sanitizeSegment("123", "unknown")).toBe("123");
    expect(sanitizeSegment("a-b_c.d", "unknown")).toBe("a-b_c.d");
  });

  it("前後の空白はtrimする", () => {
    expect(sanitizeSegment("  sample1  ", "unknown")).toBe("sample1");
  });

  it("/と\\と制御文字を_に置換する", () => {
    expect(sanitizeSegment("../evil", "unknown")).toBe(".._evil");
    expect(sanitizeSegment("a/b", "unknown")).toBe("a_b");
    expect(sanitizeSegment("a\\b", "unknown")).toBe("a_b");
    expect(sanitizeSegment("/etc/passwd", "unknown")).toBe("_etc_passwd");
    expect(sanitizeSegment("a\x00b", "unknown")).toBe("a_b");
    expect(sanitizeSegment("a\nb", "unknown")).toBe("a_b");
    expect(sanitizeSegment("a\x7Fb", "unknown")).toBe("a_b");
  });

  it("空・ドットのみはfallbackを返す", () => {
    expect(sanitizeSegment("", "unknown")).toBe("unknown");
    expect(sanitizeSegment("   ", "unknown")).toBe("unknown");
    expect(sanitizeSegment(".", "unknown")).toBe("unknown");
    expect(sanitizeSegment("..", "unknown")).toBe("unknown");
    expect(sanitizeSegment("  ..  ", "unknown")).toBe("unknown");
  });
});

describe("sanitizeTestCaseName", () => {
  it("通常名は不変", () => {
    expect(sanitizeTestCaseName("sample1", 0)).toBe("sample1");
  });

  it("不正値はプレースホルダにフォールバックする", () => {
    expect(sanitizeTestCaseName("", 3)).toBe("kiso_placeholder_3");
    expect(sanitizeTestCaseName("..", 1)).toBe("kiso_placeholder_1");
  });

  it("../などは置換して同一ディレクトリに留める", () => {
    expect(sanitizeTestCaseName("../../evil", 0)).toBe(".._.._evil");
    expect(sanitizeTestCaseName("a/b", 0)).toBe("a_b");
  });
});

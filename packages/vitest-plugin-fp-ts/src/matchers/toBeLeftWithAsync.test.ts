import * as E from "fp-ts/Either";
import { describe, expect, expectTypeOf, it, vi } from "vite-plus/test";

import "../vite-plus.ts";

describe("toBeLeftWithAsync", () => {
  it("コールバックの引数はLeftの中身の型に推論される", async () => {
    await expect(E.left("oops")).toBeLeftWithAsync((s) => {
      expectTypeOf(s).toEqualTypeOf<string>();
      expect(s).toBe("oops");
    });
  });

  it("syncコールバックの内側expectが通るLeftを通過する", async () => {
    await expect(E.left("oops")).toBeLeftWithAsync((s) => {
      expect(s).toBe("oops");
    });
  });

  it("asyncコールバックの内側expectが通るLeftを通過する", async () => {
    await expect(E.left("oops")).toBeLeftWithAsync(async (s) => {
      await Promise.resolve();
      expect(s).toBe("oops");
    });
  });

  it("内側のexpect失敗はそのまま伝播する", async () => {
    await expect(() =>
      expect(E.left("a")).toBeLeftWithAsync((s) => {
        expect(s).toBe("b");
      }),
    ).rejects.toThrow();
    await expect(() =>
      expect(E.left("a")).toBeLeftWithAsync(async (s) => {
        await Promise.resolve();
        expect(s).toBe("b");
      }),
    ).rejects.toThrow();
  });

  it("Rightではコールバックを呼ばず失敗する", async () => {
    const callback = vi.fn(() => {});
    await expect(() =>
      expect(E.right(1)).toBeLeftWithAsync(callback),
    ).rejects.toThrow("Expected Left, but received Right");
    expect(callback).not.toHaveBeenCalled();
  });

  it("Eitherでない値ではコールバックを呼ばず失敗する", async () => {
    const callback = vi.fn(() => {});
    await expect(() =>
      expect(null).toBeLeftWithAsync(callback),
    ).rejects.toThrow("Received value must be an fp-ts Either");
    expect(callback).not.toHaveBeenCalled();
  });

  it("コールバックが関数でない場合は失敗する", async () => {
    await expect(() =>
      expect(E.left("err")).toBeLeftWithAsync(
        "not a function" as unknown as () => void,
      ),
    ).rejects.toThrow("Callback must be a function");
  });

  it(".notはエラーになる", async () => {
    await expect(() =>
      expect(E.left("oops")).not.toBeLeftWithAsync((s) => {
        expect(s).toBe("oops");
      }),
    ).rejects.toThrow("does not support .not");
  });

  it("解決値がある場合はwarnだけ出し、成功扱いになる", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await expect(E.left("oops")).toBeLeftWithAsync(
        ((s: string) => s.length) as unknown as () => void,
      );
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });
});

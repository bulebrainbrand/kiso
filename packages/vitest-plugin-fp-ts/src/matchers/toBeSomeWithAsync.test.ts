import * as O from "fp-ts/Option";
import { describe, expect, expectTypeOf, it, vi } from "vite-plus/test";

import "../vite-plus.ts";

describe("toBeSomeWithAsync", () => {
  it("コールバックの引数はSomeの中身の型に推論される", async () => {
    await expect(O.some(2)).toBeSomeWithAsync((n) => {
      expectTypeOf(n).toEqualTypeOf<number>();
      expect(n).toBe(2);
    });
  });

  it("syncコールバックの内側expectが通るSomeを通過する", async () => {
    await expect(O.some(2)).toBeSomeWithAsync((n) => {
      expect(n).toBe(2);
    });
  });

  it("asyncコールバックの内側expectが通るSomeを通過する", async () => {
    await expect(O.some(2)).toBeSomeWithAsync(async (n) => {
      await Promise.resolve();
      expect(n).toBe(2);
    });
  });

  it("内側のexpect失敗はそのまま伝播する", async () => {
    await expect(() =>
      expect(O.some(1)).toBeSomeWithAsync((n) => {
        expect(n).toBe(2);
      }),
    ).rejects.toThrow();
    await expect(() =>
      expect(O.some(1)).toBeSomeWithAsync(async (n) => {
        await Promise.resolve();
        expect(n).toBe(2);
      }),
    ).rejects.toThrow();
  });

  it("Noneではコールバックを呼ばず失敗する", async () => {
    const callback = vi.fn(() => {});
    await expect(() =>
      expect(O.none).toBeSomeWithAsync(callback),
    ).rejects.toThrow("Expected Some, but received None");
    expect(callback).not.toHaveBeenCalled();
  });

  it("Optionでない値ではコールバックを呼ばず失敗する", async () => {
    const callback = vi.fn(() => {});
    await expect(() => expect(1).toBeSomeWithAsync(callback)).rejects.toThrow(
      "Received value must be an fp-ts Option",
    );
    expect(callback).not.toHaveBeenCalled();
  });

  it("コールバックが関数でない場合は失敗する", async () => {
    await expect(() =>
      expect(O.some(1)).toBeSomeWithAsync(
        "not a function" as unknown as () => void,
      ),
    ).rejects.toThrow("Callback must be a function");
  });

  it(".notはエラーになる", async () => {
    await expect(() =>
      expect(O.some(2)).not.toBeSomeWithAsync((n) => {
        expect(n).toBe(2);
      }),
    ).rejects.toThrow("does not support .not");
  });

  it("解決値がある場合はwarnだけ出し、成功扱いになる", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await expect(O.some(2)).toBeSomeWithAsync(
        ((n: number) => n > 1) as unknown as () => void | Promise<void>,
      );
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });
});

import * as E from "fp-ts/Either";
import { describe, expect, expectTypeOf, it, vi } from "vite-plus/test";

import "../vite-plus.ts";

describe("toBeRightWithAsync", () => {
  it("コールバックの引数はRightの中身の型に推論される", async () => {
    await expect(E.right(2)).toBeRightWithAsync((n) => {
      expectTypeOf(n).toEqualTypeOf<number>();
      expect(n).toBe(2);
    });
  });

  it("syncコールバックの内側expectが通るRightを通過する", async () => {
    await expect(E.right(2)).toBeRightWithAsync((n) => {
      expect(n).toBe(2);
    });
  });

  it("asyncコールバックの内側expectが通るRightを通過する", async () => {
    await expect(E.right(2)).toBeRightWithAsync(async (n) => {
      await Promise.resolve();
      expect(n).toBe(2);
    });
  });

  it("内側のexpect失敗はそのまま伝播する", async () => {
    await expect(() =>
      expect(E.right(1)).toBeRightWithAsync((n) => {
        expect(n).toBe(2);
      }),
    ).rejects.toThrow();
    await expect(() =>
      expect(E.right(1)).toBeRightWithAsync(async (n) => {
        await Promise.resolve();
        expect(n).toBe(2);
      }),
    ).rejects.toThrow();
  });

  it("Leftではコールバックを呼ばず失敗する", async () => {
    const callback = vi.fn(() => {});
    await expect(() =>
      expect(E.left("err")).toBeRightWithAsync(callback),
    ).rejects.toThrow("Expected Right, but received Left");
    expect(callback).not.toHaveBeenCalled();
  });

  it("Eitherでない値ではコールバックを呼ばず失敗する", async () => {
    const callback = vi.fn(() => {});
    await expect(() => expect(1).toBeRightWithAsync(callback)).rejects.toThrow(
      "Received value must be an fp-ts Either",
    );
    expect(callback).not.toHaveBeenCalled();
  });

  it("コールバックが関数でない場合は失敗する", async () => {
    await expect(() =>
      expect(E.right(1)).toBeRightWithAsync(
        "not a function" as unknown as () => void,
      ),
    ).rejects.toThrow("Callback must be a function");
  });

  it(".notはエラーになる", async () => {
    await expect(() =>
      expect(E.right(2)).not.toBeRightWithAsync((n) => {
        expect(n).toBe(2);
      }),
    ).rejects.toThrow("does not support .not");
  });

  it("解決値がある場合はwarnだけ出し、成功扱いになる", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await expect(E.right(2)).toBeRightWithAsync(
        ((n: number) => n > 1) as unknown as () => void | Promise<void>,
      );
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });
});

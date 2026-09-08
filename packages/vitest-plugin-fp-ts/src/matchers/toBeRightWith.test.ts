import * as E from "fp-ts/Either";
import { describe, expect, expectTypeOf, it, vi } from "vite-plus/test";

import "../vite-plus.ts";

describe("toBeRightWith", () => {
  it("コールバックの引数はRightの中身の型に推論される", () => {
    expect(E.right(2)).toBeRightWith((n) => {
      expectTypeOf(n).toEqualTypeOf<number>();
      expect(n).toBe(2);
    });
  });

  it("内側のexpectが通るRightを通過する", () => {
    expect(E.right(2)).toBeRightWith((n) => {
      expect(n).toBe(2);
    });
  });

  it("内側のexpect失敗はそのまま伝播する", () => {
    expect(() =>
      expect(E.right(1)).toBeRightWith((n) => {
        expect(n).toBe(2);
      }),
    ).toThrow();
  });

  it("Leftではコールバックを呼ばず失敗する", () => {
    const callback = vi.fn(() => {});
    expect(() => expect(E.left("err")).toBeRightWith(callback)).toThrow(
      "Expected Right, but received Left",
    );
    expect(callback).not.toHaveBeenCalled();
  });

  it("Eitherでない値ではコールバックを呼ばず失敗する", () => {
    const callback = vi.fn(() => {});
    expect(() => expect(1).toBeRightWith(callback)).toThrow(
      "Received value must be an fp-ts Either",
    );
    expect(() => expect({}).toBeRightWith(callback)).toThrow(
      "Received value must be an fp-ts Either",
    );
    expect(callback).not.toHaveBeenCalled();
  });

  it("コールバックが関数でない場合は失敗する", () => {
    expect(() =>
      expect(E.right(1)).toBeRightWith(
        "not a function" as unknown as () => void,
      ),
    ).toThrow("Callback must be a function");
  });

  it("コールバックが関数でなくreceivedも不正な場合はコールバックエラーが優先される", () => {
    expect(() =>
      expect(1).toBeRightWith("not a function" as unknown as () => void),
    ).toThrow("Callback must be a function");
  });

  it(".notはエラーになる", () => {
    expect(() =>
      expect(E.right(2)).not.toBeRightWith((n) => {
        expect(n).toBe(2);
      }),
    ).toThrow("does not support .not");
  });

  it("戻り値は無視してwarnだけ出し、成功扱いになる", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(E.right(2)).toBeRightWith(
        ((n: number) => n > 1) as unknown as () => void,
      );
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it("Promiseを返したらAsync版への誘導warnを出し、成功扱いになる", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(E.right(2)).toBeRightWith((() =>
        Promise.resolve()) as unknown as () => void);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toMatch("toBeRightWithAsync");
    } finally {
      warn.mockRestore();
    }
  });
});

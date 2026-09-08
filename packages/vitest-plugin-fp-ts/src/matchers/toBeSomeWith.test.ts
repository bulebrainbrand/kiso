import * as O from "fp-ts/Option";
import { describe, expect, expectTypeOf, it, vi } from "vite-plus/test";

import "../vite-plus.ts";

describe("toBeSomeWith", () => {
  it("コールバックの引数はSomeの中身の型に推論される", () => {
    expect(O.some(2)).toBeSomeWith((n) => {
      expectTypeOf(n).toEqualTypeOf<number>();
      expect(n).toBe(2);
    });
  });

  it("内側のexpectが通るSomeを通過する", () => {
    expect(O.some(2)).toBeSomeWith((n) => {
      expect(n).toBe(2);
    });
  });

  it("内側のexpect失敗はそのまま伝播する", () => {
    expect(() =>
      expect(O.some(1)).toBeSomeWith((n) => {
        expect(n).toBe(2);
      }),
    ).toThrow();
  });

  it("Noneではコールバックを呼ばず失敗する", () => {
    const callback = vi.fn(() => {});
    expect(() => expect(O.none).toBeSomeWith(callback)).toThrow(
      "Expected Some, but received None",
    );
    expect(callback).not.toHaveBeenCalled();
  });

  it("Optionでない値ではコールバックを呼ばず失敗する", () => {
    const callback = vi.fn(() => {});
    expect(() => expect(1).toBeSomeWith(callback)).toThrow(
      "Received value must be an fp-ts Option",
    );
    expect(() => expect({}).toBeSomeWith(callback)).toThrow(
      "Received value must be an fp-ts Option",
    );
    expect(callback).not.toHaveBeenCalled();
  });

  it("コールバックが関数でない場合は失敗する", () => {
    expect(() =>
      expect(O.some(1)).toBeSomeWith("not a function" as unknown as () => void),
    ).toThrow("Callback must be a function");
  });

  it("コールバックが関数でなくreceivedも不正な場合はコールバックエラーが優先される", () => {
    expect(() =>
      expect(1).toBeSomeWith("not a function" as unknown as () => void),
    ).toThrow("Callback must be a function");
  });

  it(".notはエラーになる", () => {
    expect(() =>
      expect(O.some(2)).not.toBeSomeWith((n) => {
        expect(n).toBe(2);
      }),
    ).toThrow("does not support .not");
  });

  it("戻り値は無視してwarnだけ出し、成功扱いになる", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(O.some(2)).toBeSomeWith(
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
      expect(O.some(2)).toBeSomeWith((() =>
        Promise.resolve()) as unknown as () => void);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toMatch("toBeSomeWithAsync");
    } finally {
      warn.mockRestore();
    }
  });
});

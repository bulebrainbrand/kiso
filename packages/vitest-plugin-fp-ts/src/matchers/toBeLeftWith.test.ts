import * as E from "fp-ts/Either";
import { describe, expect, expectTypeOf, it, vi } from "vite-plus/test";

import "../vite-plus.ts";

describe("toBeLeftWith", () => {
  it("コールバックの引数はLeftの中身の型に推論される", () => {
    expect(E.left("oops")).toBeLeftWith((s) => {
      expectTypeOf(s).toEqualTypeOf<string>();
      expect(s).toBe("oops");
    });
  });

  it("内側のexpectが通るLeftを通過する", () => {
    expect(E.left("oops")).toBeLeftWith((s) => {
      expect(s).toBe("oops");
    });
  });

  it("内側のexpect失敗はそのまま伝播する", () => {
    expect(() =>
      expect(E.left("a")).toBeLeftWith((s) => {
        expect(s).toBe("b");
      }),
    ).toThrow();
  });

  it("Rightではコールバックを呼ばず失敗する", () => {
    const callback = vi.fn(() => {});
    expect(() => expect(E.right(1)).toBeLeftWith(callback)).toThrow(
      "Expected Left, but received Right",
    );
    expect(callback).not.toHaveBeenCalled();
  });

  it("Eitherでない値ではコールバックを呼ばず失敗する", () => {
    const callback = vi.fn(() => {});
    expect(() => expect(null).toBeLeftWith(callback)).toThrow(
      "Received value must be an fp-ts Either",
    );
    expect(() => expect({}).toBeLeftWith(callback)).toThrow(
      "Received value must be an fp-ts Either",
    );
    expect(callback).not.toHaveBeenCalled();
  });

  it("コールバックが関数でない場合は失敗する", () => {
    expect(() =>
      expect(E.left("err")).toBeLeftWith(
        "not a function" as unknown as () => void,
      ),
    ).toThrow("Callback must be a function");
  });

  it("コールバックが関数でなくreceivedも不正な場合はコールバックエラーが優先される", () => {
    expect(() =>
      expect(null).toBeLeftWith("not a function" as unknown as () => void),
    ).toThrow("Callback must be a function");
  });

  it(".notはエラーになる", () => {
    expect(() =>
      expect(E.left("oops")).not.toBeLeftWith((s) => {
        expect(s).toBe("oops");
      }),
    ).toThrow("does not support .not");
  });

  it("戻り値は無視してwarnだけ出し、成功扱いになる", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(E.left("oops")).toBeLeftWith(
        ((s: string) => s.length > 0) as unknown as () => void,
      );
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it("Promiseを返したらAsync版への誘導warnを出し、成功扱いになる", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(E.left("oops")).toBeLeftWith((() =>
        Promise.resolve()) as unknown as () => void);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toMatch("toBeLeftWithAsync");
    } finally {
      warn.mockRestore();
    }
  });
});

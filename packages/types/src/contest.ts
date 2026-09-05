export type TestCase = { name: string; input: string; output: string };
export type Probrem = { name: string; id: string; testcases: TestCase[] };

export type Contest = { id: string; probrems: Probrem[] };

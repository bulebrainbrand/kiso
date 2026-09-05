import * as v from "valibot";

export const yukicoderContestProblemSchema = v.object({
  ProblemId: v.pipe(v.number(), v.integer()),
  No: v.pipe(v.number(), v.integer()),
  Title: v.string(),
});

export const yukicoderContestSchema = v.object({
  Id: v.pipe(v.number(), v.integer()),
  Name: v.string(),
  Date: v.pipe(v.string(), v.isoTimestamp()),
  EndDate: v.pipe(v.string(), v.isoTimestamp()),
  ProblemIdList: v.array(v.pipe(v.number(), v.integer())),
  Problems: v.array(yukicoderContestProblemSchema),
});

export type YukicoderContestProblem = v.InferOutput<
  typeof yukicoderContestProblemSchema
>;
export type YukicoderContest = v.InferOutput<typeof yukicoderContestSchema>;

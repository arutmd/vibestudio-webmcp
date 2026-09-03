import {
  initialReviewState,
  refreshReviewState,
  reviewStateIsReady,
  setReviewDecision,
} from "./reviewState";

const state = initialReviewState("demo", "p1", "2026-06-04T10:00:00+07:00");
if (reviewStateIsReady(state)) throw new Error("fresh review cannot be ready");

const approvedText = setReviewDecision(
  state,
  "text",
  "approved",
  undefined,
  "2026-06-04T10:01:00+07:00",
);
if (approvedText.text.decision !== "approved") throw new Error("text was not approved");
if (reviewStateIsReady(approvedText)) throw new Error("image approval should still be required");

const ready = setReviewDecision(
  approvedText,
  "image",
  "approved",
  undefined,
  "2026-06-04T10:02:00+07:00",
);
if (!reviewStateIsReady(ready)) throw new Error("both approvals should be ready");

const stale = refreshReviewState(ready, "demo", "p2", "2026-06-04T10:03:00+07:00");
if (stale.proposalId !== "p2") throw new Error("proposal did not refresh");
if (stale.text.decision !== "pending" || stale.image.decision !== "pending") {
  throw new Error("new proposal should reset approvals");
}

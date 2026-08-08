import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  computeStreaksFromDates,
  dateOnly,
  formatDateVN,
  getWeekStart,
  isSameDate,
  isTaskLiveOnDate,
  pickWeightedReward,
} from "./groups";

function d(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}
function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

test("getWeekStart — Monday of the ISO week containing the date", async (t) => {
  // 2026-08-08 is a Saturday.
  await t.test("Saturday rolls back to that week's Monday", () => {
    assert.equal(iso(getWeekStart(d("2026-08-08"))), "2026-08-03");
  });
  await t.test("Monday returns itself", () => {
    assert.equal(iso(getWeekStart(d("2026-08-03"))), "2026-08-03");
  });
  // Classic off-by-one risk: Sunday must still belong to the *previous* Monday's week.
  await t.test("Sunday belongs to the week that started the Monday before it", () => {
    assert.equal(iso(getWeekStart(d("2026-08-09"))), "2026-08-03");
  });
  await t.test("the following Monday rolls over to a new week", () => {
    assert.equal(iso(getWeekStart(d("2026-08-10"))), "2026-08-10");
  });
  await t.test("year boundary (2026-01-01 is a Thursday)", () => {
    assert.equal(iso(getWeekStart(d("2026-01-01"))), "2025-12-29");
  });
});

test("addDays / dateOnly / isSameDate", async (t) => {
  await t.test("crosses a month boundary", () => {
    assert.equal(iso(addDays(d("2026-01-31"), 1)), "2026-02-01");
  });
  await t.test("crosses a year boundary", () => {
    assert.equal(iso(addDays(d("2026-12-31"), 1)), "2027-01-01");
  });
  await t.test("negative offset", () => {
    assert.equal(iso(addDays(d("2026-03-01"), -1)), "2026-02-28");
  });
  await t.test("isSameDate ignores time-of-day", () => {
    assert.equal(isSameDate(d("2026-08-08"), new Date("2026-08-08T15:30:00.000Z")), true);
  });
  await t.test("isSameDate is false for different days", () => {
    assert.equal(isSameDate(d("2026-08-08"), d("2026-08-09")), false);
  });
});

test("isTaskLiveOnDate", async (t) => {
  await t.test("ONCE task is live only on its exact startDate", () => {
    const task = { frequency: "ONCE" as const, startDate: d("2026-08-08"), weekdays: [] };
    assert.equal(isTaskLiveOnDate(task, d("2026-08-08")), true);
    assert.equal(isTaskLiveOnDate(task, d("2026-08-09")), false);
    assert.equal(isTaskLiveOnDate(task, d("2026-08-07")), false);
  });

  await t.test("DAILY task is live on every day from startDate onward, never before", () => {
    const task = { frequency: "DAILY" as const, startDate: d("2026-01-01"), weekdays: [] };
    assert.equal(isTaskLiveOnDate(task, d("2026-08-08")), true);
    const notStartedYet = { frequency: "DAILY" as const, startDate: d("2026-08-08"), weekdays: [] };
    assert.equal(isTaskLiveOnDate(notStartedYet, d("2026-08-01")), false);
  });

  await t.test("WEEKLY_DAYS matches ISO weekday numbers (1=Mon..7=Sun), not JS's 0=Sun..6=Sat", () => {
    const base = { frequency: "WEEKLY_DAYS" as const, startDate: d("2026-01-01") };
    // 2026-08-08 is a Saturday -> ISO weekday 6.
    assert.equal(isTaskLiveOnDate({ ...base, weekdays: [6] }, d("2026-08-08")), true);
    assert.equal(isTaskLiveOnDate({ ...base, weekdays: [7] }, d("2026-08-08")), false);
    // 2026-08-09 is a Sunday -> ISO weekday 7 (not 0).
    assert.equal(isTaskLiveOnDate({ ...base, weekdays: [7] }, d("2026-08-09")), true);
    // 2026-08-10 is a Monday -> ISO weekday 1.
    assert.equal(isTaskLiveOnDate({ ...base, weekdays: [1] }, d("2026-08-10")), true);
  });
});

test("pickWeightedReward", async (t) => {
  await t.test("always picks the only entry with nonzero weight", () => {
    const rewards = [
      { weightPercent: 0, label: "never" },
      { weightPercent: 100, label: "always" },
      { weightPercent: 0, label: "never2" },
    ];
    for (let i = 0; i < 200; i++) {
      assert.equal(pickWeightedReward(rewards).label, "always");
    }
  });

  await t.test("degrades to the first entry when every weight is zero", () => {
    const rewards = [
      { weightPercent: 0, label: "a" },
      { weightPercent: 0, label: "b" },
    ];
    assert.equal(pickWeightedReward(rewards).label, "a");
  });

  await t.test("distribution roughly matches configured weights over many trials", () => {
    const rewards = [
      { weightPercent: 90, label: "common" },
      { weightPercent: 10, label: "rare" },
    ];
    const trials = 20000;
    let commonCount = 0;
    for (let i = 0; i < trials; i++) {
      if (pickWeightedReward(rewards).label === "common") commonCount++;
    }
    const ratio = commonCount / trials;
    assert.ok(ratio > 0.85 && ratio < 0.95, `expected ~90% common picks, got ${(ratio * 100).toFixed(1)}%`);
  });
});

test("formatDateVN", () => {
  assert.equal(formatDateVN(d("2026-08-08")), "08/08/2026");
});

test("computeStreaksFromDates", async (t) => {
  const oneDay = 24 * 60 * 60 * 1000;
  const TODAY = dateOnly(new Date()).getTime();
  const daysAgo = (n: number) => TODAY - n * oneDay;

  await t.test("no check-ins at all", () => {
    assert.deepEqual(computeStreaksFromDates([], TODAY), { current: 0, best: 0 });
  });

  await t.test("checked in only today", () => {
    assert.deepEqual(computeStreaksFromDates([daysAgo(0)], TODAY), { current: 1, best: 1 });
  });

  await t.test("checked in only yesterday — still a live streak (grace period)", () => {
    assert.deepEqual(computeStreaksFromDates([daysAgo(1)], TODAY), { current: 1, best: 1 });
  });

  await t.test("last check-in was 2 days ago — streak is dead", () => {
    assert.deepEqual(computeStreaksFromDates([daysAgo(2)], TODAY), { current: 0, best: 1 });
  });

  await t.test("5-day consecutive streak ending today", () => {
    assert.deepEqual(
      computeStreaksFromDates([daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(3), daysAgo(4)], TODAY),
      { current: 5, best: 5 }
    );
  });

  await t.test("current streak of 2, but a longer historical run of 4", () => {
    assert.deepEqual(
      computeStreaksFromDates([daysAgo(0), daysAgo(1), daysAgo(5), daysAgo(6), daysAgo(7), daysAgo(8)], TODAY),
      { current: 2, best: 4 }
    );
  });

  await t.test("no live streak, but best reflects a historical run", () => {
    assert.deepEqual(computeStreaksFromDates([daysAgo(3), daysAgo(4), daysAgo(5)], TODAY), { current: 0, best: 3 });
  });

  await t.test("no consecutive days at all — best stays 1", () => {
    assert.deepEqual(
      computeStreaksFromDates([daysAgo(0), daysAgo(2), daysAgo(4), daysAgo(6)], TODAY),
      { current: 1, best: 1 }
    );
  });
});

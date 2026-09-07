import { test } from "node:test";
import assert from "node:assert/strict";
import { formatTimestamp, parseTimestamp, parseTracklistText, resolveSegmentsInput } from "./course-lesson-segments";

test("parseTimestamp — accepts the shapes a YouTube description actually uses", async (t) => {
  await t.test("m:ss and mm:ss, padded or not", () => {
    assert.equal(parseTimestamp("0:00"), 0);
    assert.equal(parseTimestamp("00:00"), 0);
    assert.equal(parseTimestamp("4:27"), 267);
    assert.equal(parseTimestamp("04:27"), 267);
  });
  await t.test("h:mm:ss", () => {
    assert.equal(parseTimestamp("2:05:47"), 7547);
  });
  await t.test("a video past 99 minutes written as plain minutes still parses", () => {
    // The pattern used to cap every component at two digits, which rejected
    // this and failed the whole lesson save rather than one row.
    assert.equal(parseTimestamp("125:47"), 7547);
  });
  await t.test("surrounding whitespace is tolerated", () => {
    assert.equal(parseTimestamp(" 4:27 "), 267);
  });
});

test("parseTimestamp — rejects what can't be a timestamp", async (t) => {
  await t.test("minutes/seconds past 59", () => {
    assert.equal(parseTimestamp("10:99"), null);
  });
  await t.test("malformed", () => {
    for (const bad of ["", "abc", "5", "1:", ":30", "-1:00"]) {
      assert.equal(parseTimestamp(bad), null, `expected ${JSON.stringify(bad)} to be rejected`);
    }
  });
  await t.test("past the 24h cap, so CourseLessonSegment.seconds can never overflow its int4", () => {
    assert.equal(parseTimestamp("24:00:00"), 86400);
    assert.equal(parseTimestamp("24:00:01"), null);
    assert.equal(parseTimestamp("99999999:00"), null);
  });
});

test("formatTimestamp round-trips through parseTimestamp", async (t) => {
  // The editor renders stored seconds back as text and re-submits them, so a
  // lossy conversion here would silently shift a segment on every save.
  await t.test("every boundary value survives the round trip", () => {
    for (const seconds of [0, 1, 59, 60, 267, 3599, 3600, 3661, 86399, 86400]) {
      assert.equal(parseTimestamp(formatTimestamp(seconds)), seconds, `round trip failed for ${seconds}s`);
    }
  });
  await t.test("only shows an hours component when there is one", () => {
    assert.equal(formatTimestamp(267), "4:27");
    assert.equal(formatTimestamp(3661), "1:01:01");
  });
});

test("parseTracklistText — pulls the tracklist out of a pasted description", async (t) => {
  await t.test("keeps timestamped lines, skips headings and blanks", () => {
    const parsed = parseTracklistText(
      ["Tracklist:", "", "00:00 Tình Yêu Muôn Thủa – Sáng tác: Đức Hữu", "dòng không có mốc", "04:27 Tình Chúa Thương"].join("\n")
    );
    assert.deepEqual(parsed, [
      { time: "00:00", label: "Tình Yêu Muôn Thủa – Sáng tác: Đức Hữu" },
      { time: "04:27", label: "Tình Chúa Thương" },
    ]);
  });
  await t.test("a timestamp with no label is not a segment", () => {
    assert.deepEqual(parseTracklistText("00:00"), []);
  });
});

test("resolveSegmentsInput — server-side re-validation of the editor's JSON", async (t) => {
  await t.test("missing or empty input means no segments, not an error", () => {
    assert.deepEqual(resolveSegmentsInput(undefined), []);
    assert.deepEqual(resolveSegmentsInput("[]"), []);
  });
  await t.test("sorts chronologically and renumbers order, whatever order rows were submitted in", () => {
    // Readers (the tracklist's "which segment is playing" scan) rely on
    // `order` being chronological — an admin editing one row's time by hand
    // must not be able to break that.
    assert.deepEqual(
      resolveSegmentsInput(
        JSON.stringify([
          { time: "3:00", label: "Ba" },
          { time: "0:00", label: "Một" },
          { time: "1:30", label: "Hai" },
        ])
      ),
      [
        { seconds: 0, label: "Một", order: 0 },
        { seconds: 90, label: "Hai", order: 1 },
        { seconds: 180, label: "Ba", order: 2 },
      ]
    );
  });
  await t.test("names the offending row, since one bad row rejects the whole lesson save", () => {
    // A generic "list is invalid" is useless against 40 rows — the message
    // goes straight to the author, so it has to say which row and why.
    assert.deepEqual(
      resolveSegmentsInput(JSON.stringify([{ time: "0:00", label: "A" }, { time: "9999:99", label: "B" }])),
      { error: 'Mốc thời gian "9999:99" ở dòng 2 không hợp lệ.' }
    );
    assert.deepEqual(resolveSegmentsInput(JSON.stringify([{ time: "1:00", label: "   " }])), {
      error: "Phân cảnh dòng 1 chưa có tên bài.",
    });
  });
  await t.test("rejects malformed payloads outright", () => {
    for (const bad of ["{oops", '{"a":1}', "[null]", '[{"time":"1:00"}]']) {
      assert.ok(!Array.isArray(resolveSegmentsInput(bad)), `expected ${bad} to be rejected`);
    }
  });
  await t.test("bounds a crafted payload — the editor never produces anything near these", () => {
    const row = { time: "1:00", label: "x" };
    assert.ok(Array.isArray(resolveSegmentsInput(JSON.stringify(Array.from({ length: 500 }, () => row)))));
    assert.ok(!Array.isArray(resolveSegmentsInput(JSON.stringify(Array.from({ length: 501 }, () => row)))));
    assert.ok(Array.isArray(resolveSegmentsInput(JSON.stringify([{ time: "1:00", label: "x".repeat(300) }]))));
    assert.ok(!Array.isArray(resolveSegmentsInput(JSON.stringify([{ time: "1:00", label: "x".repeat(301) }]))));
  });
});

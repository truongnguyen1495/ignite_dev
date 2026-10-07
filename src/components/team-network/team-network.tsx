"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Position, type Edge } from "@xyflow/react";
import { FileSpreadsheet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCelebrate } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  assignLeaderAction,
  changeStatusAction,
  createMemberAction,
  deleteMemberAction,
  getMemberHistoryAction,
  getNetworkMembersAction,
  patchMemberAction,
  deleteMembersAction,
  type ActionResult,
} from "@/app/admin/team-network/actions";
import type { StatusHistoryEntry } from "@/lib/network";
import { BRANCH_CARD, BRANCH_NODE, BUCKET_NODE, MEMBER_NODE, layoutTree, type LayoutDirection } from "@/lib/network-layout";
import { applyPatch, inversePatch, type MemberPatch } from "@/lib/network-patch";
import { NETWORK_STATUS_CONFIG, type NetworkStatus } from "@/lib/network-status";
import { changedFields, type EditableFields } from "@/lib/network-table";
import {
  UNASSIGNED_ID,
  branchLabel,
  buildTree,
  chainTo,
  compareNames,
  computeBranchHeads,
  countByStatus,
  descendantIds,
  distinctTeams,
  foldName,
  matchesSearch,
  type NetworkMemberLite,
  type TreeRelation,
} from "@/lib/network-tree";
import { ancestorsOfMatches, computeVisibleTree, defaultCollapsed } from "@/lib/network-visible";
import { BucketPanel } from "./bucket-panel";
import { ImportWizard } from "./import-wizard";
import { MemberDetailPanel, type DetailTab, type HistoryState } from "./member-detail-panel";
import { MemberFormModal, type MemberFormValues } from "./member-form-modal";
import { MemberTable, type TableMode } from "./member-table";
import { MobileList } from "./mobile-list";
import { NetworkCanvas, type CanvasCommand } from "./network-canvas";
import { KpiStrip, NetworkToolbar, type Display, type RoleFilter, type ViewMode } from "./network-toolbar";
import { NodeMenu, type NodeMenuAction, type NodeMenuVariant } from "./node-menu";
import { ACTION_FAILED_MESSAGE } from "./network-ui";
import { StatusModal, type StatusChange } from "./status-modal";
import type { TreeActions, TreeEdgeData, TreeNode } from "./tree-node";

const toMap = (list: readonly NetworkMemberLite[]) => new Map(list.map((m) => [m.id, m]));

type Modal =
  | { type: "add"; leaderId: string | null }
  | { type: "edit"; id: string }
  | { type: "status"; id: string }
  | { type: "import" };

// Widths of the module itself, not the window: the admin sidebar takes 256px, so
// a 1024px tablet in landscape leaves only about 700px.
//   below LIST_BELOW   the map becomes a list you walk down (a phone)
//   below SHEET_BELOW  the detail panel opens as a bottom sheet instead of a
//                      column that would squeeze the map to a sliver (a tablet)
const LIST_BELOW = 600;
const SHEET_BELOW = 900;
// The table and the map side by side need room for both: below BOTH_MIN the page falls back
// to the map alone (the table is still one click away). BOTH_AUTO is the width from which
// "side by side" is what opens by default: between the two it can be chosen, but the table
// would be cramped (its Leader and referrer columns scroll), so the map stays the default.
const BOTH_MIN = 960;
const BOTH_AUTO = 1100;

const FIELD_LABELS: Record<Exclude<keyof EditableFields, "leaderId">, string> = {
  name: "họ tên",
  igniteId: "RapidX ID",
  team: "team",
  referrerId: "người giới thiệu",
};

// The whole Team Network screen. It owns the member list in memory and edits it
// optimistically: a change shows at once, the server is told in the background,
// and a rejection undoes just that change and says why. Everything drawn — both
// trees, the branch of each person, downline counts — is computed from that one
// flat list, so there is no second copy to keep in step.
export function TeamNetwork({
  initialMembers,
  initialSelectedId,
  todayISO,
  adminName,
}: {
  initialMembers: NetworkMemberLite[];
  initialSelectedId: string | null;
  todayISO: string;
  adminName: string;
}) {
  const celebrate = useCelebrate();
  const confirm = useConfirm();

  const [members, setMembers] = useState(initialMembers);
  const [view, setView] = useState<TreeRelation>("leader");
  const [mode, setMode] = useState<ViewMode>("tree");
  const [direction, setDirection] = useState<LayoutDirection>("horizontal");
  const [statusFilter, setStatusFilter] = useState<NetworkStatus | "ALL">("ALL");
  const [branchFilter, setBranchFilter] = useState("all");
  const [leaderFilter, setLeaderFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [prune, setPrune] = useState(false);
  // null = "never touched": the folds are then the defaults, recomputed as the
  // tree changes. The first time the admin folds or unfolds something the
  // current set is frozen into state.
  const [folded, setFolded] = useState<Record<TreeRelation, Set<string> | null>>(() => {
    // Opened on a shared link: unfold the branches above that person so their
    // card exists on the canvas.
    if (!initialSelectedId) return { leader: null, referrer: null };
    const open = defaultCollapsed(buildTree(initialMembers, "leader"));
    for (const ancestor of chainTo(toMap(initialMembers), "leader", initialSelectedId).slice(0, -1)) open.delete(ancestor);
    return { leader: open, referrer: null };
  });
  const [focusRoot, setFocusRoot] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [bucketOpen, setBucketOpen] = useState(false);
  const [tab, setTab] = useState<DetailTab>("overview");
  const [modal, setModal] = useState<Modal | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number; variant: NodeMenuVariant } | null>(null);
  const [command, setCommand] = useState<CanvasCommand | null>(() =>
    initialSelectedId ? { kind: "focus", id: initialSelectedId, nonce: 1 } : { kind: "fit", nonce: 1 }
  );
  const [histories, setHistories] = useState<Record<string, HistoryState>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [mobileCursor, setMobileCursor] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  // What the admin asked to see; null until they choose, then the width decides.
  const [display, setDisplay] = useState<Display | null>(initialSelectedId ? "map" : null);
  // Whether the member's detail panel is open. On the map, choosing a card opens it; with
  // a table showing, choosing a row only highlights it and the panel is asked for.
  const [profileOpen, setProfileOpen] = useState(!!initialSelectedId);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [searchText, setSearchText] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const nonce = useRef(1);
  const tempSeq = useRef(0);
  const historyInFlight = useRef(new Set<string>());

  const mobile = width > 0 && width < LIST_BELOW;
  const canSplit = width >= BOTH_MIN;
  const preferred: Display = display ?? (width >= BOTH_AUTO ? "both" : "map");
  const shown: Display = preferred === "both" && !canSplit ? "map" : preferred;
  const tableVisible = shown !== "map";
  // With a table showing the panel is always a sheet: a third column would leave neither
  // the table nor the map enough room.
  const sheet = (width > 0 && width < SHEET_BELOW) || tableVisible;

  // ---- derived data ---------------------------------------------------------
  const byId = useMemo(() => toMap(members), [members]);
  const leaderTree = useMemo(() => buildTree(members, "leader"), [members]);
  const referrerTree = useMemo(() => buildTree(members, "referrer"), [members]);
  const tree = view === "leader" ? leaderTree : referrerTree;
  const heads = useMemo(() => computeBranchHeads(members), [members]);
  const counts = useMemo(() => countByStatus(members), [members]);
  const root = useMemo(() => members.find((m) => m.isRoot) ?? null, [members]);
  const teams = useMemo(() => distinctTeams(members), [members]);

  const branches = useMemo(
    () =>
      members
        .filter((m) => root && m.leaderId === root.id)
        .sort((a, b) => compareNames(a.name, b.name))
        .map((m) => ({ id: m.id, name: m.name })),
    [members, root]
  );
  const leaders = useMemo(
    () =>
      members
        .filter((m) => (leaderTree.kids.get(m.id)?.length ?? 0) > 0)
        .sort((a, b) => compareNames(a.name, b.name))
        .map((m) => ({ id: m.id, name: m.name })),
    [members, leaderTree]
  );

  const query = tableVisible ? foldName(searchText) : "";
  const filtersActive =
    statusFilter !== "ALL" || branchFilter !== "all" || leaderFilter !== "all" || roleFilter !== "all" || teamFilter !== "all" || query !== "";

  const matchIds = useMemo(() => {
    if (!filtersActive) return null;
    const below = leaderFilter === "all" ? null : new Set(descendantIds(leaderTree.kids, leaderFilter));
    const ids = new Set<string>();
    for (const m of members) {
      if (statusFilter !== "ALL" && m.status !== statusFilter) continue;
      if (branchFilter !== "all" && heads.get(m.id) !== branchFilter) continue;
      if (below && !below.has(m.id)) continue;
      if (roleFilter !== "all") {
        const leadsATeam = (leaderTree.kids.get(m.id)?.length ?? 0) > 0;
        if ((roleFilter === "leader") !== leadsATeam) continue;
      }
      if (teamFilter !== "all" && (m.team ?? "") !== teamFilter) continue;
      if (query && !matchesSearch(m, query)) continue;
      ids.add(m.id);
    }
    return ids;
  }, [filtersActive, members, statusFilter, branchFilter, leaderFilter, roleFilter, teamFilter, query, heads, leaderTree]);
  const tableRows = useMemo(() => (matchIds ? members.filter((m) => matchIds.has(m.id)) : members), [members, matchIds]);

  const keep = useMemo(() => (prune && matchIds ? ancestorsOfMatches(tree, (id) => matchIds.has(id)) : null), [prune, matchIds, tree]);
  const defaultFolds = useMemo(() => defaultCollapsed(tree), [tree]);
  const foldedSet = folded[view] ?? defaultFolds;
  const effectiveFocus = focusRoot && tree.kids.has(focusRoot) ? focusRoot : null;
  const compactActive = mode === "compact" && !effectiveFocus;

  const visible = useMemo(
    () => computeVisibleTree({ tree, collapsed: foldedSet, compact: mode === "compact", focusRoot: effectiveFocus, keep }),
    [tree, foldedSet, mode, effectiveFocus, keep]
  );

  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;
  // The profile belongs to the selected person. When they are gone (deleted here, or by another
  // admin before a refresh) it closes with them; otherwise the next row chosen in the table
  // would open a profile nobody asked for. Adjusting state while rendering is allowed for a
  // component's own state.
  if (profileOpen && !selected) setProfileOpen(false);
  const pathSet = useMemo(() => new Set(selected ? chainTo(byId, view, selected.id) : []), [selected, byId, view]);

  const rects = useMemo(
    () =>
      layoutTree({
        roots: visible.roots,
        kids: (id) => visible.kids.get(id) ?? [],
        direction,
        size: (id, depth) => {
          if (id === UNASSIGNED_ID) return BUCKET_NODE;
          if (compactActive && depth === 1) return BRANCH_CARD;
          if (!compactActive && view === "leader" && root && byId.get(id)?.leaderId === root.id) return BRANCH_NODE;
          return MEMBER_NODE;
        },
      }),
    [visible, direction, compactActive, view, root, byId]
  );

  const { nodes, edges } = useMemo(() => {
    const out: TreeNode[] = [];
    const lines: Edge[] = [];
    const horizontal = direction === "horizontal";
    for (const v of visible.nodes) {
      const rect = rects.get(v.id);
      if (!rect) continue;
      const isBucket = v.id === UNASSIGNED_ID;
      const member = isBucket ? null : byId.get(v.id);
      if (!isBucket && !member) continue;
      const isCard = compactActive && v.depth === 1;
      const isBranch = !compactActive && view === "leader" && !!root && member?.leaderId === root.id;
      out.push({
        id: v.id,
        type: "tree",
        position: { x: rect.x, y: rect.y },
        width: rect.width,
        height: rect.height,
        sourcePosition: horizontal ? Position.Right : Position.Bottom,
        targetPosition: horizontal ? Position.Left : Position.Top,
        draggable: false,
        data: {
          id: v.id,
          kind: isBucket ? "bucket" : "member",
          variant: isCard ? "card" : isBranch ? "branch" : "member",
          name: isBucket ? "UNASSIGNED" : member!.name,
          igniteId: member?.igniteId ?? null,
          status: member?.status ?? null,
          team: member?.team ?? null,
          branch: member ? branchLabel(member, heads, byId) : "",
          downline: tree.descendants.get(v.id) ?? 0,
          // Folds are ignored while only result-bearing branches are shown, so a fold button would do nothing.
          hasKids: (tree.kids.get(v.id)?.length ?? 0) > 0 && !compactActive && !keep,
          folded: !keep && foldedSet.has(v.id),
          stats: tree.stats.get(v.id) ?? null,
          dim: !isBucket && matchIds !== null && !matchIds.has(v.id),
          selected: isBucket ? bucketOpen : v.id === selectedId,
          onPath: pathSet.has(v.id),
          hl: !isBucket && v.id === hoverId,
          direction,
          actions: !isBucket && !isCard,
        },
      });
      if (v.parent && rects.has(v.parent)) {
        const data: TreeEdgeData = {
          dashed: view === "referrer",
          hot: pathSet.has(v.parent) && pathSet.has(v.id),
          dim: !isBucket && matchIds !== null && !matchIds.has(v.id),
        };
        lines.push({ id: `${v.parent}>${v.id}`, source: v.parent, target: v.id, type: "tree", data });
      }
    }
    return { nodes: out, edges: lines };
  }, [visible, rects, byId, heads, tree, foldedSet, keep, matchIds, selectedId, bucketOpen, pathSet, hoverId, direction, view, root, compactActive]);

  // The unassigned bucket always comes from the Leader tree, even while the
  // Referral tree is showing (which has no such bucket).
  const bucketMembers = useMemo(
    () => (leaderTree.kids.get(UNASSIGNED_ID) ?? []).map((id) => byId.get(id)).filter((m): m is NetworkMemberLite => !!m),
    [leaderTree, byId]
  );

  // ---- camera ---------------------------------------------------------------
  const send = useCallback((c: { kind: "fit" } | { kind: "focus" | "reveal"; id: string }) => {
    nonce.current += 1;
    setCommand({ ...c, nonce: nonce.current } as CanvasCommand);
  }, []);

  // ---- full screen ----------------------------------------------------------
  // "Full screen" is two things at once. The whole module is laid over the page
  // (so the admin sidebar and header are out of the way, and the dialogs, which are
  // part of the page, still show), and the browser is asked to go full screen too.
  // The second is best effort: a browser that refuses (iPad Safari, an embedded
  // frame) still gets the first. The map is framed again once the window has
  // finished resizing, since the browser changes size a moment after it agrees.
  const setFullscreen = useCallback(
    (next: boolean) => {
      setExpanded(next);
      try {
        if (next) void document.documentElement.requestFullscreen?.().catch(() => undefined);
        else if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      } catch {
        // No Fullscreen API: the in-page layout is all there is.
      }
      window.setTimeout(() => send({ kind: "fit" }), 350);
    },
    [send]
  );

  // Esc in browser full screen is handled by the browser, which leaves full
  // screen without telling the page's key handlers; this keeps the layout in step.
  useEffect(() => {
    const onChange = () => {
      if (document.fullscreenElement) return;
      setExpanded(false);
      window.setTimeout(() => send({ kind: "fit" }), 350);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, [send]);

  // ---- width / first paint --------------------------------------------------
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Escape closes the open panel or sheet (and, with nothing open, leaves full
  // screen), unless a dialog or the "…" menu is open (they take Escape themselves)
  // or the key was pressed inside a field. The
  // delete confirmation lives outside this component and ignores Escape, so it is
  // found in the page instead: otherwise Escape would close the panel behind it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || modal || menu) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select")) return;
      if (selectedId || bucketOpen) {
        setSelectedId(null);
        setProfileOpen(false);
        setBucketOpen(false);
      } else if (expanded) {
        setFullscreen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal, menu, selectedId, bucketOpen, expanded, setFullscreen]);

  // Keep the address bar pointing at the selected member so the link can be shared.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set("member", selectedId);
    else url.searchParams.delete("member");
    window.history.replaceState(null, "", url);
  }, [selectedId]);

  // ---- history (loaded on demand) -------------------------------------------
  // A member with no entry in `histories` reads as "loading"; the entry is only
  // written when the fetch ends, and `historyInFlight` stops two tabs or two
  // clicks from asking twice.
  const loadHistory = useCallback(async (id: string) => {
    if (historyInFlight.current.has(id)) return;
    historyInFlight.current.add(id);
    let state: HistoryState;
    try {
      const res = await getMemberHistoryAction(id);
      state = res.error !== undefined ? { status: "error" } : { status: "ready", entries: res.entries };
    } catch {
      state = { status: "error" };
    }
    historyInFlight.current.delete(id);
    setHistories((h) => ({ ...h, [id]: state }));
  }, []);

  useEffect(() => {
    if (selectedId && tab === "history" && !histories[selectedId]) void loadHistory(selectedId);
  }, [selectedId, tab, histories, loadHistory]);

  // ---- navigation helpers ---------------------------------------------------
  function resetFolds(next: Set<string>) {
    setFolded((f) => ({ ...f, [view]: next }));
  }

  // Unfolds everything above `id`, selects it and flies the camera there. Takes
  // the member list to read so a handler can reveal someone it has just created
  // or moved, before React has rendered the new list.
  function revealIn(map: ReadonlyMap<string, NetworkMemberLite>, id: string, opts?: { tab?: DetailTab; profile?: boolean; camera?: "focus" | "reveal" }) {
    if (!map.has(id)) return;
    const chain = chainTo(map, view, id);
    const next = new Set(folded[view] ?? defaultFolds);
    for (const ancestor of chain.slice(0, -1)) next.delete(ancestor);
    setFolded((f) => ({ ...f, [view]: next }));
    setMode("tree");
    if (focusRoot && !chain.includes(focusRoot)) setFocusRoot(null);
    if (keep && !keep.has(id)) setPrune(false);
    setBucketOpen(false);
    setSelectedId(id);
    // On the map the profile follows the selection; with a table it stays as it was unless asked for.
    setProfileOpen(opts?.profile ?? (shown === "map" || profileOpen));
    if (opts?.tab) setTab(opts.tab);
    setMobileCursor(chain.length > 1 ? chain[chain.length - 2] : null);
    setFlashId(id);
    send({ kind: opts?.camera ?? "focus", id });
  }

  function reveal(id: string, opts?: { tab?: DetailTab; profile?: boolean; camera?: "focus" | "reveal" }) {
    revealIn(byId, id, opts);
  }

  function focusBranch(id: string) {
    setFocusRoot(id);
    setMode("tree");
    if (id !== UNASSIGNED_ID) resetFolds(new Set([...(folded[view] ?? defaultFolds)].filter((x) => x !== id)));
    send({ kind: "fit" });
  }

  function toggleFold(id: string) {
    const next = new Set(foldedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    resetFolds(next);
  }

  function selectNode(id: string) {
    setMenu(null);
    if (id === UNASSIGNED_ID) {
      setSelectedId(null);
      setBucketOpen(true);
      return;
    }
    const depth = visible.nodes.find((n) => n.id === id)?.depth ?? 0;
    // In compact mode a branch card means "open this branch", not "show a profile".
    if (compactActive && depth >= 1) {
      focusBranch(id);
      return;
    }
    setBucketOpen(false);
    setSelectedId(id);
    if (shown === "map") setProfileOpen(true);
    send({ kind: "reveal", id });
  }

  function closePanel() {
    setProfileOpen(false);
    setBucketOpen(false);
    // On the map closing the panel also lets go of the card; with a table the row stays selected.
    if (shown === "map") setSelectedId(null);
  }

  function clearFilters() {
    // Leaving "only branches with results" changes the whole map, so frame it again.
    if (prune) send({ kind: "fit" });
    setStatusFilter("ALL");
    setBranchFilter("all");
    setLeaderFilter("all");
    setRoleFilter("all");
    setTeamFilter("all");
    setSearchText("");
    setPrune(false);
  }

  function changeView(next: TreeRelation) {
    setView(next);
    setFocusRoot(null);
    setMobileCursor(null);
    send({ kind: "fit" });
  }

  // The camera is driven through a stable object whose handlers always read the
  // latest state, so React Flow's cards are not re-rendered by it changing.
  const latest = useRef({ selectNode, toggleFold, focusBranch });
  useEffect(() => {
    latest.current = { selectNode, toggleFold, focusBranch };
  });
  const actions = useMemo<TreeActions>(
    () => ({
      onSelect: (id) => latest.current.selectNode(id),
      onToggle: (id) => latest.current.toggleFold(id),
      onFocusBranch: (id) => latest.current.focusBranch(id),
      onMenu: (id, anchor) => setMenu({ id, x: anchor.left, y: anchor.bottom, variant: "node" }),
    }),
    []
  );

  // ---- optimistic mutations -------------------------------------------------
  // Applies `patch` now, runs the server call, and undoes just that patch if the
  // server refuses. Returns whether it stuck.
  async function mutate<T>(
    patch: MemberPatch,
    run: () => Promise<ActionResult<T>>,
    onOk: (result: T) => void,
    failTitle: string,
    // Undo for edits that touch single fields: putting back only those fields leaves a
    // second edit to the same row, made while this one was in flight, where it is.
    rollback?: (list: NetworkMemberLite[]) => NetworkMemberLite[]
  ): Promise<boolean> {
    const undo = inversePatch(members, patch);
    setMembers((m) => applyPatch(m, patch));
    let res: ActionResult<T>;
    try {
      res = await run();
    } catch {
      res = { error: ACTION_FAILED_MESSAGE };
    }
    if (res.error !== undefined) {
      setMembers((m) => (rollback ? rollback(m) : applyPatch(m, undo)));
      celebrate({ tone: "error", title: failTitle, description: res.error });
      return false;
    }
    onOk(res as T);
    return true;
  }

  async function submitMember(values: MemberFormValues, existing: NetworkMemberLite | null): Promise<string | undefined> {
    if (!existing) {
      let res: Awaited<ReturnType<typeof createMemberAction>>;
      try {
        res = await createMemberAction(values);
      } catch {
        return ACTION_FAILED_MESSAGE;
      }
      if (res.error !== undefined) return res.error;
      setMembers((m) => applyPatch(m, { upsert: [res.member] }));
      setHistories((h) => ({ ...h, [res.member.id]: { status: "ready", entries: [res.entry] } }));
      setModal(null);
      revealIn(toMap(applyPatch(members, { upsert: [res.member] })), res.member.id);
      celebrate({
        title: "Đã thêm thành viên",
        description: res.member.isRoot
          ? `${res.member.name} là gốc mạng lưới`
          : values.leaderId
            ? `${res.member.name} vào đội ${byId.get(values.leaderId)?.name ?? ""}`
            : `${res.member.name} (chưa có Leader, nằm trong UNASSIGNED)`,
      });
      return undefined;
    }

    // Only the fields that changed are sent, so saving this form cannot put back a value
    // that another admin changed in the meantime.
    const patch = changedFields(existing, {
      name: values.name,
      igniteId: values.igniteId,
      team: values.team,
      leaderId: values.leaderId,
      referrerId: values.referrerId,
    });
    setModal(null);
    if (Object.keys(patch).length > 0) patchMember(existing, patch, "focus");
    return undefined;
  }

  // One or more fields of one member: the table's cells and the edit form both end up here.
  // Shown at once, saved in the background, undone with a reason if the server says no.
  function patchMember(member: NetworkMemberLite, asked: Partial<EditableFields>, camera: "focus" | "reveal" = "reveal") {
    // Whatever the caller asked for, only what really differs is saved: typing an ID in lower
    // case that is already there in capitals is not an edit.
    const patch = changedFields(member, {
      name: member.name,
      igniteId: member.igniteId,
      team: member.team,
      leaderId: member.leaderId,
      referrerId: member.referrerId,
      ...asked,
    });
    if (Object.keys(patch).length === 0) return;
    const next: NetworkMemberLite = { ...member, ...patch };
    const leaderChanged = "leaderId" in patch;
    const changed = (Object.keys(patch) as (keyof EditableFields)[]).filter((k) => k !== "leaderId").map((k) => FIELD_LABELS[k as keyof typeof FIELD_LABELS]);
    // With a table showing, the row that was just edited is the selected one: it lights up and the table follows it.
    if (tableVisible) setSelectedId(member.id);
    const before = Object.fromEntries((Object.keys(patch) as (keyof EditableFields)[]).map((k) => [k, member[k]])) as Partial<EditableFields>;
    void mutate(
      { upsert: [next] },
      () => patchMemberAction({ id: member.id, ...patch }),
      (r) => {
        // Take back from the server only the fields this save was about. The whole row would
        // also bring back the old value of a field edited a moment later, which is still in flight.
        const saved = Object.fromEntries((Object.keys(patch) as (keyof EditableFields)[]).map((k) => [k, r.member[k]])) as Partial<EditableFields>;
        setMembers((list) => list.map((x) => (x.id === member.id ? { ...x, ...saved } : x)));
        celebrate({
          title: "Đã lưu thay đổi",
          description: leaderChanged
            ? `${next.name} đã chuyển sang ${next.leaderId ? `đội ${byId.get(next.leaderId)?.name ?? ""}` : "UNASSIGNED"}`
            : `${next.name}: đã cập nhật ${changed.join(", ")}`,
        });
      },
      "Không lưu được thay đổi",
      (list) => list.map((x) => (x.id === member.id ? { ...x, ...before } : x))
    );
    if (leaderChanged && view === "leader") revealIn(toMap(applyPatch(members, { upsert: [next] })), member.id, { camera });
  }

  function submitStatus(member: NetworkMemberLite, change: StatusChange) {
    const historyWasLoaded = histories[member.id]?.status === "ready";
    const temp: StatusHistoryEntry = {
      id: `pending-${member.id}-${(tempSeq.current += 1)}`,
      fromStatus: member.status,
      toStatus: change.toStatus,
      reason: change.reason,
      effectiveDate: change.effectiveDate,
      changedByName: adminName,
      createdAt: new Date().toISOString(),
    };
    setHistories((h) => {
      const current = h[member.id];
      return current?.status === "ready" ? { ...h, [member.id]: { status: "ready", entries: [temp, ...current.entries] } } : h;
    });
    setModal(null);
    setTab("history");
    void mutate(
      { upsert: [{ ...member, status: change.toStatus }] },
      () => changeStatusAction({ id: member.id, toStatus: change.toStatus, effectiveDate: change.effectiveDate, reason: change.reason }),
      (r) => {
        setMembers((m) => applyPatch(m, { upsert: [r.member] }));
        setHistories((h) => {
          const current = h[member.id];
          if (current?.status !== "ready") return h;
          return { ...h, [member.id]: { status: "ready", entries: current.entries.map((e) => (e.id === temp.id ? r.entry : e)) } };
        });
        // The history tab had not been opened yet, so there was nothing to patch:
        // fetch it fresh so the new entry is in it.
        if (!historyWasLoaded) void loadHistory(member.id);
        celebrate({ title: "Đã đổi trạng thái", description: `${member.name} chuyển sang ${NETWORK_STATUS_CONFIG[change.toStatus].label}` });
      },
      "Đổi trạng thái thất bại"
    ).then((ok) => {
      if (ok) return;
      setHistories((h) => {
        const current = h[member.id];
        return current?.status === "ready" ? { ...h, [member.id]: { status: "ready", entries: current.entries.filter((e) => e.id !== temp.id) } } : h;
      });
    });
  }

  function assign(ids: string[], leaderId: string) {
    const leaderName = byId.get(leaderId)?.name ?? "";
    const upsert = ids.flatMap((id) => {
      const m = byId.get(id);
      return m ? [{ ...m, leaderId }] : [];
    });
    void mutate(
      { upsert },
      () => assignLeaderAction({ ids, leaderId }),
      (r) => {
        setMembers((m) => applyPatch(m, { upsert: r.members }));
        celebrate({ title: "Đã gán Leader", description: `${ids.length} thành viên vào đội ${leaderName}` });
      },
      "Không gán được Leader"
    );
  }

  async function removeMember(member: NetworkMemberLite) {
    const below = members.filter((m) => m.leaderId === member.id);
    const referred = members.filter((m) => m.referrerId === member.id);
    const ok = await confirm({
      title: `Xóa ${member.name} khỏi mạng lưới?`,
      description: (
        <ul className="list-disc space-y-1 pl-5">
          <li>{below.length > 0 ? `${below.length} người trực tiếp dưới họ chuyển sang UNASSIGNED, không bị xóa.` : "Họ chưa có ai trực tiếp bên dưới."}</li>
          <li>{referred.length > 0 ? `${referred.length} người họ đã giới thiệu sẽ mất thông tin người giới thiệu.` : "Họ chưa giới thiệu ai."}</li>
          <li>Lịch sử trạng thái của họ bị xóa cùng. Không hoàn tác được.</li>
        </ul>
      ),
      confirmLabel: "Xóa thành viên",
      tone: "danger",
    });
    if (!ok) return;
    const affected = new Map<string, NetworkMemberLite>();
    for (const m of [...below, ...referred]) {
      const base = affected.get(m.id) ?? m;
      affected.set(m.id, { ...base, leaderId: base.leaderId === member.id ? null : base.leaderId, referrerId: base.referrerId === member.id ? null : base.referrerId });
    }
    if (selectedId === member.id) setSelectedId(null);
    void mutate(
      { remove: [member.id], upsert: [...affected.values()] },
      () => deleteMemberAction(member.id),
      () => celebrate({ title: "Đã xóa khỏi mạng lưới", description: below.length > 0 ? `${member.name} · ${below.length} người trực tiếp chuyển sang UNASSIGNED` : member.name }),
      "Xóa thành viên thất bại"
    );
  }

  // Several people at once, from the table. One confirmation that says what will happen to
  // the people below them, one all-or-nothing request. Resolves to whether it went ahead.
  async function removeMembers(ids: string[]): Promise<boolean> {
    const gone = new Set(ids);
    const below = members.filter((m) => !gone.has(m.id) && m.leaderId && gone.has(m.leaderId));
    const referred = members.filter((m) => !gone.has(m.id) && m.referrerId && gone.has(m.referrerId));
    const ok = await confirm({
      title: `Xóa ${ids.length} thành viên khỏi mạng lưới?`,
      description: (
        <ul className="list-disc space-y-1 pl-5">
          <li>{below.length > 0 ? `${below.length} người trực tiếp bên dưới họ chuyển sang UNASSIGNED, không bị xóa.` : "Không có ai trực tiếp bên dưới họ."}</li>
          <li>{referred.length > 0 ? `${referred.length} người họ đã giới thiệu sẽ mất thông tin người giới thiệu.` : "Họ chưa giới thiệu ai ngoài nhóm này."}</li>
          <li>Lịch sử trạng thái của họ bị xóa cùng. Không hoàn tác được.</li>
        </ul>
      ),
      confirmLabel: `Xóa ${ids.length} thành viên`,
      tone: "danger",
    });
    if (!ok) return false;
    const affected = new Map<string, NetworkMemberLite>();
    for (const m of [...below, ...referred]) {
      const base = affected.get(m.id) ?? m;
      affected.set(m.id, {
        ...base,
        leaderId: base.leaderId && gone.has(base.leaderId) ? null : base.leaderId,
        referrerId: base.referrerId && gone.has(base.referrerId) ? null : base.referrerId,
      });
    }
    if (selectedId && gone.has(selectedId)) setSelectedId(null);
    await mutate(
      { remove: ids, upsert: [...affected.values()] },
      () => deleteMembersAction({ ids }),
      () => celebrate({ title: "Đã xóa khỏi mạng lưới", description: below.length > 0 ? `${ids.length} thành viên · ${below.length} người trực tiếp chuyển sang UNASSIGNED` : `${ids.length} thành viên` }),
      "Xóa thành viên thất bại"
    );
    return true;
  }

  async function reload(notify = false) {
    setRefreshing(true);
    let res: Awaited<ReturnType<typeof getNetworkMembersAction>>;
    try {
      res = await getNetworkMembersAction();
    } catch {
      res = { error: ACTION_FAILED_MESSAGE };
    }
    setRefreshing(false);
    if (res.error !== undefined) {
      celebrate({ tone: "error", title: "Không tải lại được danh sách", description: res.error });
      return;
    }
    setMembers(res.members);
    setHistories({});
    // Someone else may have deleted the person who is open on screen.
    setSelectedId((current) => (current && res.members.some((m) => m.id === current) ? current : null));
    if (notify) celebrate({ title: "Đã cập nhật danh sách", description: `${res.members.length} thành viên` });
  }

  function openStatus(id: string) {
    if (!histories[id]) void loadHistory(id);
    setModal({ type: "status", id });
  }

  // From a table row the menu does not fly the camera around: the row is where the admin is.
  function onMenuAction(action: NodeMenuAction, id: string, variant: NodeMenuVariant) {
    setMenu(null);
    const onMap = variant === "node";
    if (action === "view") reveal(id, { tab: "overview", profile: true });
    else if (action === "edit" || action === "leader") {
      if (onMap) reveal(id);
      setModal({ type: "edit", id });
    } else if (action === "status") {
      if (onMap) reveal(id);
      openStatus(id);
    } else if (action === "focus") focusBranch(id);
    else if (action === "downline") reveal(id, { tab: "team" });
    else if (action === "locate") locate(id);
    else if (action === "delete") {
      const member = byId.get(id);
      if (member) void removeMember(member);
    }
  }

  // Switching what is shown keeps the selected person in view on the map.
  function changeDisplay(next: Display) {
    setDisplay(next);
    // The text in the search box belongs to the view it was typed in: it filters a table, and on
    // the map it is a name being looked up. Carrying it across would filter the table by a name
    // that was only picked on the map.
    setSearchText("");
    setHoverId(null);
    // The map has no row to type a new person into.
    if (next === "map") setAdding(false);
    if (next === "table") return;
    if (selectedId && byId.has(selectedId)) revealIn(byId, selectedId, { camera: "reveal", profile: profileOpen });
    else send({ kind: "fit" });
  }

  // "Xem trên sơ đồ" from a table row: bring up the map beside the table when there is room.
  function locate(id: string) {
    const target: Display = canSplit ? "both" : "map";
    setDisplay(target);
    revealIn(byId, id, { profile: target === "map" });
  }

  // A click on a table row. It selects the person; with the map beside it, the map unfolds
  // to their card and moves only if the card is off screen.
  function selectRow(id: string) {
    setMenu(null);
    setBucketOpen(false);
    if (shown === "both" && !visible.nodes.some((n) => n.id === id)) {
      revealIn(byId, id, { camera: "reveal" });
      return;
    }
    setSelectedId(id);
    if (shown === "both") send({ kind: "reveal", id });
  }

  function startAdd() {
    // With a table showing the new person is typed into its first row; on a phone, or
    // with only the map, the form opens as before. An empty network has no table to type
    // into (the screen shows its own "add the first person" card), so it uses the form too.
    if (tableVisible && !mobile && members.length > 0) setAdding(true);
    else setModal({ type: "add", leaderId: null });
  }

  // ---- panel content --------------------------------------------------------
  const panelOpen = bucketOpen || (!!selected && profileOpen);
  const detailMembers = useMemo(
    () =>
      selected
        ? (tree.kids.get(selected.id) ?? []).map((id) => byId.get(id)).filter((m): m is NetworkMemberLite => !!m)
        : [],
    [selected, tree, byId]
  );

  const panel = bucketOpen ? (
    <BucketPanel members={bucketMembers} allMembers={members} byId={byId} onAssign={assign} onClose={closePanel} />
  ) : selected && profileOpen ? (
    <MemberDetailPanel
      member={selected}
      leader={selected.leaderId ? byId.get(selected.leaderId) : undefined}
      referrer={selected.referrerId ? byId.get(selected.referrerId) : undefined}
      branch={branchLabel(selected, heads, byId)}
      directMembers={detailMembers}
      totalDownline={tree.descendants.get(selected.id) ?? 0}
      view={view}
      isTeamLead={(leaderTree.kids.get(selected.id)?.length ?? 0) > 0}
      directLeaderCount={leaderTree.kids.get(selected.id)?.length ?? 0}
      history={histories[selected.id] ?? { status: "loading" }}
      tab={tab}
      onTab={setTab}
      onSelectMember={(id) => reveal(id)}
      onEdit={() => setModal({ type: "edit", id: selected.id })}
      onChangeStatus={() => openStatus(selected.id)}
      onAddBelow={() => setModal({ type: "add", leaderId: selected.id })}
      onDelete={() => void removeMember(selected)}
      onRetryHistory={() =>
        // Forgetting the failed entry makes the history tab ask again.
        setHistories((h) => {
          const rest = { ...h };
          delete rest[selected.id];
          return rest;
        })
      }
      onClose={closePanel}
    />
  ) : null;

  // ---- breadcrumb -----------------------------------------------------------
  const crumbTarget = selected?.id ?? effectiveFocus;
  const crumbChain = crumbTarget ? chainTo(byId, view, crumbTarget) : [];
  const crumbItems = crumbChain.length > 5 ? [crumbChain[0], null, ...crumbChain.slice(-3)] : crumbChain;
  const nameOf = (id: string) => (id === UNASSIGNED_ID ? "UNASSIGNED" : (byId.get(id)?.name ?? "—"));

  const overlay =
    crumbChain.length > 0 || effectiveFocus ? (
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-1 text-xs">
        {effectiveFocus && (
          <>
            <button
              type="button"
              onClick={() => {
                setFocusRoot(null);
                send({ kind: "fit" });
              }}
              className="rounded-full border border-border bg-surface/95 px-2.5 py-1 text-muted hover:border-primary-border hover:text-foreground"
            >
              ← Tất cả
            </button>
            <span className="text-faint">|</span>
          </>
        )}
        {crumbItems.map((id, i) => (
          <span key={`${id ?? "gap"}-${i}`} className="flex items-center gap-1">
            {i > 0 && <span className="text-faint">›</span>}
            {id === null ? (
              <span className="rounded-full border border-border bg-surface/95 px-2.5 py-1 text-muted">…</span>
            ) : (
              <button
                type="button"
                onClick={() => (id === UNASSIGNED_ID ? send({ kind: "focus", id }) : reveal(id))}
                title={nameOf(id)}
                className={`max-w-[11rem] truncate rounded-full border bg-surface/95 px-2.5 py-1 hover:border-primary-border ${
                  i === crumbItems.length - 1 ? "border-primary-border font-semibold text-primary" : "border-border text-muted hover:text-foreground"
                }`}
              >
                {nameOf(id)}
              </button>
            )}
          </span>
        ))}
      </nav>
    ) : null;

  const legend = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-surface/95 px-3 py-1.5 text-[11.5px] text-muted">
      <span className="flex items-center gap-2">
        <svg width="26" height="8" aria-hidden="true">
          <path d="M0 4H26" stroke="rgba(247,242,231,0.5)" strokeWidth="2" strokeDasharray={view === "referrer" ? "6 4" : undefined} fill="none" />
        </svg>
        {view === "referrer" ? "Quan hệ Giới thiệu" : "Quan hệ Leader"}
      </span>
      <span className="flex items-center gap-2">
        <svg width="26" height="8" aria-hidden="true">
          <path d="M0 4H26" stroke="#e3b52d" strokeWidth="3" fill="none" />
        </svg>
        Đường từ gốc tới người đang chọn
      </span>
    </div>
  );

  const noMatches = !!matchIds && matchIds.size === 0;
  const empty = members.length === 0;

  // ---- render ---------------------------------------------------------------
  const editing = modal?.type === "edit" ? byId.get(modal.id) : undefined;
  const statusTarget = modal?.type === "status" ? byId.get(modal.id) : undefined;
  const statusHistory = statusTarget ? histories[statusTarget.id] : undefined;
  const earliest = statusHistory?.status === "ready" ? (statusHistory.entries[0]?.effectiveDate ?? null) : null;
  const menuMember = menu ? byId.get(menu.id) : undefined;

  const canvasPane = (
    <div className="relative min-w-0 flex-1">
      <NetworkCanvas nodes={nodes} edges={edges} rects={rects} command={command} actions={actions} overlay={overlay} legend={legend} onFit={() => send({ kind: "fit" })} expanded={expanded} onToggleExpand={() => setFullscreen(!expanded)} />
      {noMatches && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 p-6 text-center">
          <div className="max-w-xs">
            <p className="text-base font-semibold text-foreground">Không có thành viên nào khớp bộ lọc hiện tại</p>
            <p className="mt-1 text-sm text-muted">Thử bỏ bớt điều kiện lọc.</p>
            <Button type="button" className="mt-3" onClick={clearFilters}>
              Xóa bộ lọc
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const table = (
    <MemberTable
      members={members}
      rows={tableRows}
      byId={byId}
      tree={tree}
      leaderTree={leaderTree}
      referrerTree={referrerTree}
      heads={heads}
      teams={teams}
      mode={(mobile ? "phone" : shown === "both" ? "compact" : "full") satisfies TableMode}
      selectedId={selectedId}
      adding={adding}
      filtersActive={filtersActive}
      onAddingChange={setAdding}
      onSelect={selectRow}
      onHover={(id) => {
        // Only the map beside the table has a card to light up; elsewhere it would just redraw the map for nothing.
        if (shown === "both") setHoverId(id);
      }}
      onLocate={locate}
      onMenu={(id, anchor) => setMenu({ id, x: anchor.left, y: anchor.bottom, variant: "row" })}
      onStatus={openStatus}
      onPatch={(member, patch) => patchMember(member, patch)}
      onCreate={(values) => submitMember(values, null)}
      onAssign={assign}
      onDeleteMany={removeMembers}
      onClearFilters={clearFilters}
    />
  );

  return (
    <div
      ref={rootRef}
      className={
        expanded
          ? // Same layer as the admin sidebar (z-50) but later in the page, so it covers it
            // while the confirm dialog and the toasts, which come later still, stay on top.
            "fixed inset-0 z-50 flex flex-col gap-3 overflow-y-auto overscroll-contain bg-background p-3"
          : "min-w-0 max-w-full space-y-3"
      }
    >
      <KpiStrip counts={counts} active={statusFilter} onChange={setStatusFilter} />
      <NetworkToolbar
        members={members}
        heads={heads}
        byId={byId}
        view={view}
        onView={changeView}
        mode={mode}
        onMode={(m) => {
          setMode(m);
          setFocusRoot(null);
          send({ kind: "fit" });
        }}
        direction={direction}
        onDirection={(d) => {
          setDirection(d);
          send({ kind: "fit" });
        }}
        branches={branches}
        branchFilter={branchFilter}
        onBranchFilter={setBranchFilter}
        leaders={leaders}
        leaderFilter={leaderFilter}
        onLeaderFilter={setLeaderFilter}
        roleFilter={roleFilter}
        onRoleFilter={setRoleFilter}
        teams={teams}
        teamFilter={teamFilter}
        onTeamFilter={setTeamFilter}
        prune={prune}
        onPrune={(v) => {
          setPrune(v);
          send({ kind: "fit" });
        }}
        filtersActive={filtersActive}
        onClearFilters={clearFilters}
        onPickMember={(id) => (tableVisible ? selectRow(id) : reveal(id))}
        display={shown}
        onDisplay={changeDisplay}
        canSplit={canSplit}
        searchText={searchText}
        onSearchText={setSearchText}
        mapControls={shown !== "table"}
        fullscreen={shown === "table" ? { expanded, onToggle: () => setFullscreen(!expanded) } : null}
        onAdd={startAdd}
        onImport={() => setModal({ type: "import" })}
        onRefresh={() => void reload(true)}
        refreshing={refreshing}
        compact={mobile}
      />

      {tree.unreachable.length > 0 && (
        <p role="alert" className="rounded-lg border border-warning-border bg-warning-bg px-3 py-2 text-sm text-warning">
          {tree.unreachable.length} thành viên đang nằm trong một vòng lặp dữ liệu nên không hiện trên sơ đồ. Hãy sửa Leader hoặc người giới thiệu của họ.
        </p>
      )}

      <div
        className={`relative flex overflow-hidden rounded-2xl border border-border bg-background ${
          expanded ? "min-h-[320px] flex-1" : "h-[min(78dvh,860px)] min-h-[520px]"
        }`}
      >
        {empty ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <div className="max-w-sm">
              <p className="text-base font-semibold text-foreground">Chưa có thành viên nào</p>
              <p className="mt-1 text-sm text-muted">Người đầu tiên bạn thêm sẽ là gốc của mạng lưới RapidX. Hoặc nhập cả danh sách từ file Excel.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button type="button" variant="secondary" onClick={() => setModal({ type: "import" })}>
                  <FileSpreadsheet className="h-4 w-4" /> Nhập từ Excel
                </Button>
                <Button type="button" onClick={() => setModal({ type: "add", leaderId: null })}>
                  <Plus className="h-4 w-4" /> Thêm thành viên
                </Button>
              </div>
            </div>
          </div>
        ) : width === 0 ? (
          // Not measured yet (the server render, and the first client frame): say so
          // instead of flashing a map that a phone is about to replace with a list.
          <div className="flex flex-1 items-center justify-center text-sm text-muted" role="status">
            Đang tải Team Network…
          </div>
        ) : shown === "table" ? (
          <div className="min-w-0 flex-1">{table}</div>
        ) : shown === "both" ? (
          <>
            <div className="min-w-0 flex-[0_0_62%] border-r border-border">{table}</div>
            {canvasPane}
          </>
        ) : mobile ? (
          <div className="min-w-0 flex-1 overflow-y-auto p-3">
            <MobileList
              tree={tree}
              byId={byId}
              view={view}
              cursor={mobileCursor}
              onCursor={setMobileCursor}
              onProfile={(id) => {
                setBucketOpen(false);
                setSelectedId(id);
                setProfileOpen(true);
                setTab("overview");
              }}
              dimmed={matchIds ? new Set(members.filter((m) => !matchIds.has(m.id)).map((m) => m.id)) : null}
              flashId={flashId}
            />
          </div>
        ) : (
          canvasPane
        )}

        {!sheet && width > 0 && panelOpen && <aside aria-label="Chi tiết thành viên" className="w-[24rem] shrink-0 border-l border-border bg-surface">{panel}</aside>}
      </div>

      {sheet && panelOpen && (
        <div className="fixed inset-0 z-40">
          {/* The dim area behind the sheet closes it for pointer users; it is not a
              control of its own (the X and Escape are), so it stays out of the
              accessibility tree and the tab order. */}
          <button type="button" aria-hidden="true" tabIndex={-1} className="absolute inset-0 bg-overlay" onClick={closePanel} />
          <div role="region" aria-label="Chi tiết thành viên" className="absolute inset-x-0 bottom-0 h-[78dvh] overflow-hidden rounded-t-2xl border-t border-border-strong bg-surface shadow-2xl">{panel}</div>
        </div>
      )}

      {menu && menuMember && (
        <NodeMenu x={menu.x} y={menu.y} isRoot={menuMember.isRoot} variant={menu.variant} onAction={(a) => onMenuAction(a, menu.id, menu.variant)} onClose={() => setMenu(null)} />
      )}

      {modal?.type === "add" && (
        <MemberFormModal mode="add" members={members} teams={teams} initialLeaderId={modal.leaderId} becomesRoot={!root} onSubmit={(v) => submitMember(v, null)} onClose={() => setModal(null)} />
      )}
      {modal?.type === "edit" && editing && (
        <MemberFormModal
          mode="edit"
          member={editing}
          members={members}
          teams={teams}
          onSubmit={(v) => submitMember(v, editing)}
          onChangeStatus={() => openStatus(editing.id)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "status" && statusTarget && (
        <StatusModal member={statusTarget} todayISO={todayISO} earliest={earliest} historyReady={statusHistory?.status === "ready" || statusHistory?.status === "error"} onSubmit={(c) => submitStatus(statusTarget, c)} onClose={() => setModal(null)} />
      )}
      {modal?.type === "import" && (
        <ImportWizard
          members={members}
          onDone={() => {
            setModal(null);
            void reload();
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

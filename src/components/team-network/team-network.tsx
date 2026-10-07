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
  updateMemberAction,
  type ActionResult,
} from "@/app/admin/team-network/actions";
import type { StatusHistoryEntry } from "@/lib/network";
import { BRANCH_CARD, BRANCH_NODE, BUCKET_NODE, MEMBER_NODE, layoutTree, type LayoutDirection } from "@/lib/network-layout";
import { applyPatch, inversePatch, type MemberPatch } from "@/lib/network-patch";
import { NETWORK_STATUS_CONFIG, type NetworkStatus } from "@/lib/network-status";
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
  type NetworkMemberLite,
  type TreeRelation,
} from "@/lib/network-tree";
import { ancestorsOfMatches, computeVisibleTree, defaultCollapsed } from "@/lib/network-visible";
import { BucketPanel } from "./bucket-panel";
import { ImportWizard } from "./import-wizard";
import { MemberDetailPanel, type DetailTab, type HistoryState } from "./member-detail-panel";
import { MemberFormModal, type MemberFormValues } from "./member-form-modal";
import { MobileList } from "./mobile-list";
import { NetworkCanvas, type CanvasCommand } from "./network-canvas";
import { KpiStrip, NetworkToolbar, type RoleFilter, type ViewMode } from "./network-toolbar";
import { NodeMenu, type NodeMenuAction } from "./node-menu";
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
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [command, setCommand] = useState<CanvasCommand | null>(() =>
    initialSelectedId ? { kind: "focus", id: initialSelectedId, nonce: 1 } : { kind: "fit", nonce: 1 }
  );
  const [histories, setHistories] = useState<Record<string, HistoryState>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [mobileCursor, setMobileCursor] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const nonce = useRef(1);
  const tempSeq = useRef(0);
  const historyInFlight = useRef(new Set<string>());

  const mobile = width > 0 && width < LIST_BELOW;
  const sheet = width > 0 && width < SHEET_BELOW;

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

  const filtersActive = statusFilter !== "ALL" || branchFilter !== "all" || leaderFilter !== "all" || roleFilter !== "all" || teamFilter !== "all";

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
      ids.add(m.id);
    }
    return ids;
  }, [filtersActive, members, statusFilter, branchFilter, leaderFilter, roleFilter, teamFilter, heads, leaderTree]);

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
  }, [visible, rects, byId, heads, tree, foldedSet, keep, matchIds, selectedId, bucketOpen, pathSet, direction, view, root, compactActive]);

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

  // ---- width / first paint --------------------------------------------------
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Escape closes the open panel or sheet, unless a dialog or the "…" menu is open
  // (they take Escape themselves) or the key was pressed inside a field. The
  // delete confirmation lives outside this component and ignores Escape, so it is
  // found in the page instead: otherwise Escape would close the panel behind it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || modal || menu) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select")) return;
      setSelectedId(null);
      setBucketOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal, menu]);

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
  function revealIn(map: ReadonlyMap<string, NetworkMemberLite>, id: string, opts?: { tab?: DetailTab }) {
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
    if (opts?.tab) setTab(opts.tab);
    setMobileCursor(chain.length > 1 ? chain[chain.length - 2] : null);
    setFlashId(id);
    send({ kind: "focus", id });
  }

  function reveal(id: string, opts?: { tab?: DetailTab }) {
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
    send({ kind: "reveal", id });
  }

  function closePanel() {
    setSelectedId(null);
    setBucketOpen(false);
  }

  function clearFilters() {
    // Leaving "only branches with results" changes the whole map, so frame it again.
    if (prune) send({ kind: "fit" });
    setStatusFilter("ALL");
    setBranchFilter("all");
    setLeaderFilter("all");
    setRoleFilter("all");
    setTeamFilter("all");
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
      onMenu: (id, anchor) => setMenu({ id, x: anchor.left, y: anchor.bottom }),
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
    failTitle: string
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
      setMembers((m) => applyPatch(m, undo));
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

    const next: NetworkMemberLite = {
      ...existing,
      name: values.name,
      igniteId: values.igniteId,
      team: values.team,
      leaderId: existing.isRoot ? null : values.leaderId,
      referrerId: values.referrerId,
    };
    const leaderChanged = next.leaderId !== existing.leaderId;
    setModal(null);
    void mutate(
      { upsert: [next] },
      () => updateMemberAction({ id: existing.id, name: next.name, igniteId: next.igniteId, team: next.team, leaderId: next.leaderId, referrerId: next.referrerId }),
      (r) => {
        setMembers((m) => applyPatch(m, { upsert: [r.member] }));
        celebrate({
          title: "Đã lưu thay đổi",
          description: leaderChanged ? `${next.name} đã chuyển sang ${next.leaderId ? `đội ${byId.get(next.leaderId)?.name ?? ""}` : "UNASSIGNED"}` : `${next.name}: đã cập nhật thông tin`,
        });
      },
      "Không lưu được thay đổi"
    );
    if (leaderChanged && view === "leader") revealIn(toMap(applyPatch(members, { upsert: [next] })), existing.id);
    return undefined;
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

  function onMenuAction(action: NodeMenuAction, id: string) {
    setMenu(null);
    if (action === "view") reveal(id, { tab: "overview" });
    else if (action === "edit" || action === "leader") {
      reveal(id);
      setModal({ type: "edit", id });
    } else if (action === "status") {
      reveal(id);
      openStatus(id);
    } else if (action === "focus") focusBranch(id);
    else if (action === "downline") reveal(id, { tab: "team" });
  }

  // ---- panel content --------------------------------------------------------
  const panelOpen = bucketOpen || !!selected;
  const detailMembers = useMemo(
    () =>
      selected
        ? (tree.kids.get(selected.id) ?? []).map((id) => byId.get(id)).filter((m): m is NetworkMemberLite => !!m)
        : [],
    [selected, tree, byId]
  );

  const panel = bucketOpen ? (
    <BucketPanel members={bucketMembers} allMembers={members} byId={byId} onAssign={assign} onClose={closePanel} />
  ) : selected ? (
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

  return (
    <div ref={rootRef} className="min-w-0 max-w-full space-y-3">
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
        onPickMember={(id) => reveal(id)}
        onAdd={() => setModal({ type: "add", leaderId: null })}
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

      <div className="relative flex h-[min(78dvh,860px)] min-h-[520px] overflow-hidden rounded-2xl border border-border bg-background">
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
                setTab("overview");
              }}
              dimmed={matchIds ? new Set(members.filter((m) => !matchIds.has(m.id)).map((m) => m.id)) : null}
              flashId={flashId}
            />
          </div>
        ) : (
          <div className="relative min-w-0 flex-1">
            <NetworkCanvas nodes={nodes} edges={edges} rects={rects} command={command} actions={actions} overlay={overlay} legend={legend} onFit={() => send({ kind: "fit" })} />
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
        <NodeMenu x={menu.x} y={menu.y} isRoot={menuMember.isRoot} onAction={(a) => onMenuAction(a, menu.id)} onClose={() => setMenu(null)} />
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

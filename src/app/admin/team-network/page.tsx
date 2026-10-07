import { requireAdminPermission } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { TeamNetwork } from "@/components/team-network/team-network";
import { toDateOnlyISOString } from "@/lib/date";
import { todayVN } from "@/lib/groups";
import { loadNetworkMembers } from "@/lib/network";

// The members come down as one flat list, in a single query: the browser builds
// both trees from it, so the page never runs a query per level and moving
// someone is a one-row write. `?member=<id>` opens straight onto that person.
export default async function AdminTeamNetworkPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const admin = await requireAdminPermission("MANAGE_NETWORK");
  const { member } = await searchParams;
  const members = await loadNetworkMembers();

  return (
    <div className="space-y-5">
      <PageHeader title="Mạng lưới đội nhóm" description="Bản đồ vận hành đội nhóm RapidX: ai thuộc đội ai, ai giới thiệu ai, đang ở trạng thái nào." />
      <TeamNetwork
        initialMembers={members}
        initialSelectedId={member && members.some((m) => m.id === member) ? member : null}
        todayISO={toDateOnlyISOString(todayVN())}
        adminName={admin.name}
      />
    </div>
  );
}

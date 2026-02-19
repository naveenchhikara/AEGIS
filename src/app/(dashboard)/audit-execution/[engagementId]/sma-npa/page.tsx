import { getRequiredSession } from "@/data-access/session";
import {
  getSmaNpaEntriesForEngagement,
  getEngagementForLoanReview,
  getLoanReviewSummary,
} from "@/data-access/loan-review";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SmaNpaSummary } from "@/components/audit-execution/sma-npa-summary";
import { Badge } from "@/components/ui/badge";

interface SmaNpaPageProps {
  params: Promise<{ engagementId: string }>;
}

export default async function SmaNpaPage({ params }: SmaNpaPageProps) {
  const { engagementId } = await params;
  const session = await getRequiredSession();

  const [engagement, smaNpaEntries, loanSummary] = await Promise.all([
    getEngagementForLoanReview(session, engagementId),
    getSmaNpaEntriesForEngagement(session, engagementId),
    getLoanReviewSummary(session, engagementId),
  ]);

  if (!engagement) {
    return <div className="p-6">Engagement not found</div>;
  }

  // Convert Decimal to number for client components
  const entriesForClient = smaNpaEntries.map((entry) => ({
    ...entry,
    totalAmount: Number(entry.totalAmount),
  }));

  // Compute auto-summary from loan reviews for comparison
  const assetClassMapping: Record<string, string> = {
    SMA0: "SMA0",
    SMA1: "SMA1",
    SMA2: "SMA2",
    NPA_SUB: "NPA_SUB_STANDARD",
    NPA_DOUBTFUL: "NPA_DOUBTFUL",
    NPA_LOSS: "NPA_LOSS",
  };

  const autoSummary = loanSummary
    .filter((s) => assetClassMapping[s.assetClass])
    .map((s) => ({
      category: assetClassMapping[s.assetClass],
      count: s._count,
      amount: Number(s._sum.outstandingAmount || 0),
    }));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">SMA/NPA Summary</h1>
        <p className="text-muted-foreground">
          {engagement.branch?.name || "Branch"} — Category-wise asset quality
          summary
        </p>
      </div>

      <SmaNpaSummary
        engagementId={engagementId}
        existingEntries={entriesForClient}
      />

      {autoSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Auto-Computed from Loan Reviews</CardTitle>
            <CardDescription>
              This summary is automatically calculated from the loan review data
              for comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Account Count</TableHead>
                    <TableHead className="text-right">
                      Total Amount (₹)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {autoSummary.map((item) => (
                    <TableRow key={item.category}>
                      <TableCell>
                        <Badge variant="secondary">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.count}</TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          maximumFractionDigits: 0,
                        }).format(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

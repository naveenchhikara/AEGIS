import { getRequiredSession } from "@/data-access/session";
import {
  getLoanReviewsForEngagement,
  getLoanReviewSummary,
  getEngagementForLoanReview,
} from "@/data-access/loan-review";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoanReviewTableWrapper } from "@/components/audit-execution/loan-review-table-wrapper";
import { LoanCsvImport } from "@/components/audit-execution/loan-csv-import";

interface LoanReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function LoanReviewPage({ params }: LoanReviewPageProps) {
  const { id: engagementId } = await params;
  const session = await getRequiredSession();

  const [engagement, loanReviews, summary] = await Promise.all([
    getEngagementForLoanReview(session, engagementId),
    getLoanReviewsForEngagement(session, engagementId),
    getLoanReviewSummary(session, engagementId),
  ]);

  if (!engagement) {
    return <div className="p-6">Engagement not found</div>;
  }

  // Convert Decimal to number for client components
  const loanReviewsForClient = loanReviews.map((lr) => ({
    ...lr,
    sanctionAmount: Number(lr.sanctionAmount),
    outstandingAmount: Number(lr.outstandingAmount),
  }));

  const totalLoans = loanReviews.length;
  const totalSanction = summary.reduce((sum, s) => sum + Number(s._sum.sanctionAmount || 0), 0);
  const totalOutstanding = summary.reduce(
    (sum, s) => sum + Number(s._sum.outstandingAmount || 0),
    0
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Loan Portfolio Review</h1>
        <p className="text-muted-foreground">
          {engagement.branch?.name || "Branch"} — Review individual loan accounts and import loan data
          from CBS extracts
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLoans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Sanction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(totalSanction / 100000).toFixed(2)}L
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(totalOutstanding / 100000).toFixed(2)}L
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="manual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="csv">CSV Import</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Loan Reviews</CardTitle>
                  <CardDescription>
                    Add and manage loan account reviews individually
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <LoanReviewTableWrapper
                loanReviews={loanReviewsForClient}
                engagementId={engagementId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="csv">
          <LoanCsvImport engagementId={engagementId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

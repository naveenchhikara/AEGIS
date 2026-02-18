"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertTriangle } from "@/lib/icons";

interface Investment {
  id: string;
  instrumentType: string;
  issuer: string;
  faceValue: number;
  bookValue: number;
  marketValue: number;
  maturityDate: string;
  rating: string;
  broker: string;
  brokerStatus: string;
}

interface InvestmentTableProps {
  investments: Investment[];
}

const RATING_COLORS: Record<string, string> = {
  AAA: "bg-green-100 text-green-800 border-green-300",
  AA: "bg-green-100 text-green-800 border-green-300",
  A: "bg-blue-100 text-blue-800 border-blue-300",
  BBB: "bg-amber-100 text-amber-800 border-amber-300",
  BB: "bg-orange-100 text-orange-800 border-orange-300",
  B: "bg-red-100 text-red-800 border-red-300",
};

const BROKER_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 border-green-300",
  SUSPENDED: "bg-red-100 text-red-800 border-red-300",
  UNDER_REVIEW: "bg-amber-100 text-amber-800 border-amber-300",
};

export function InvestmentTable({ investments }: InvestmentTableProps) {
  const router = useRouter();

  // Calculate portfolio metrics
  const totalBookValue = investments.reduce((sum, inv) => sum + inv.bookValue, 0);
  const totalMarketValue = investments.reduce((sum, inv) => sum + inv.marketValue, 0);
  const unrealizedGainLoss = totalMarketValue - totalBookValue;
  const unrealizedGainLossPercent = totalBookValue > 0
    ? ((unrealizedGainLoss / totalBookValue) * 100).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Book Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(totalBookValue / 10000000).toFixed(2)}Cr
            </div>
            <p className="text-xs text-muted-foreground">
              Amortized cost basis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(totalMarketValue / 10000000).toFixed(2)}Cr
            </div>
            <p className="text-xs text-muted-foreground">
              Current market valuation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unrealized Gain/Loss</CardTitle>
            {unrealizedGainLoss >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${unrealizedGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
              {unrealizedGainLoss >= 0 ? "+" : ""}₹{(Math.abs(unrealizedGainLoss) / 10000000).toFixed(2)}Cr
            </div>
            <p className="text-xs text-muted-foreground">
              {unrealizedGainLoss >= 0 ? "+" : ""}{unrealizedGainLossPercent}% from book value
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Instrument</TableHead>
              <TableHead>Issuer</TableHead>
              <TableHead>Face Value</TableHead>
              <TableHead>Book Value</TableHead>
              <TableHead>Market Value</TableHead>
              <TableHead>Maturity</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Broker</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {investments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No investment records found.
                </TableCell>
              </TableRow>
            ) : (
              investments.map((inv) => {
                const gainLoss = inv.marketValue - inv.bookValue;
                return (
                  <TableRow
                    key={inv.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/investments/${inv.id}`)}
                  >
                    <TableCell className="font-medium">{inv.instrumentType}</TableCell>
                    <TableCell>{inv.issuer}</TableCell>
                    <TableCell>₹{(inv.faceValue / 100000).toFixed(2)}L</TableCell>
                    <TableCell>₹{(inv.bookValue / 100000).toFixed(2)}L</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>₹{(inv.marketValue / 100000).toFixed(2)}L</div>
                        <div className={`text-xs ${gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {gainLoss >= 0 ? "+" : ""}₹{(Math.abs(gainLoss) / 100000).toFixed(2)}L
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{inv.maturityDate}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={RATING_COLORS[inv.rating] ?? ""}>
                        {inv.rating}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{inv.broker}</div>
                        <Badge variant="outline" className={BROKER_STATUS_COLORS[inv.brokerStatus] ?? ""}>
                          {inv.brokerStatus.replace("_", " ")}
                        </Badge>
                        {inv.brokerStatus === "SUSPENDED" && (
                          <div className="flex items-center gap-1 text-xs text-red-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Action required</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

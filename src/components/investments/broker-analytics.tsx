"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, AlertCircle } from "@/lib/icons";

interface BrokerData {
  broker: string;
  totalValue: number;
  count: number;
  maxShare: number;
}

interface BrokerAnalyticsProps {
  brokerData: BrokerData[];
}

export function BrokerAnalytics({ brokerData }: BrokerAnalyticsProps) {
  // Calculate total value across all brokers
  const totalValue = brokerData.reduce(
    (sum, broker) => sum + broker.totalValue,
    0,
  );

  // Calculate each broker's share percentage
  const enrichedBrokerData = brokerData.map((broker) => ({
    ...broker,
    sharePercent: totalValue > 0 ? (broker.totalValue / totalValue) * 100 : 0,
  }));

  // Sort by share descending
  const sortedBrokers = enrichedBrokerData.sort(
    (a, b) => b.sharePercent - a.sharePercent,
  );

  // Identify brokers with cap issues
  const brokersAtWarning = sortedBrokers.filter(
    (b) => b.sharePercent >= 4 && b.sharePercent < 5,
  );
  const brokersInBreach = sortedBrokers.filter((b) => b.sharePercent >= 5);

  const getCapStatus = (sharePercent: number) => {
    if (sharePercent >= 5) {
      return {
        label: "BREACH",
        color: "bg-red-100 text-red-800 border-red-300",
        severity: "critical",
      };
    } else if (sharePercent >= 4) {
      return {
        label: "WARNING",
        color: "bg-amber-100 text-amber-800 border-amber-300",
        severity: "warning",
      };
    } else {
      return {
        label: "COMPLIANT",
        color: "bg-green-100 text-green-800 border-green-300",
        severity: "ok",
      };
    }
  };

  return (
    <div className="space-y-6">
      {/* Regulatory Reference */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Regulatory Requirement</AlertTitle>
        <AlertDescription>
          Per RBI circular, no single broker should handle more than 5% of total
          investment transactions. Banks must monitor broker concentration to
          prevent undue dependency and ensure market risk diversification.
        </AlertDescription>
      </Alert>

      {/* Cap Breach Alerts */}
      {brokersInBreach.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Broker Cap Breach Detected</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              {brokersInBreach.length} broker
              {brokersInBreach.length > 1 ? "s" : ""} exceed the 5%
              concentration limit:
            </p>
            <ul className="list-inside list-disc space-y-1">
              {brokersInBreach.map((broker) => (
                <li key={broker.broker}>
                  <strong>{broker.broker}</strong>:{" "}
                  {broker.sharePercent.toFixed(2)}% ( ₹
                  {(broker.totalValue / 10000000).toFixed(2)}Cr)
                </li>
              ))}
            </ul>
            <p className="mt-2 font-semibold">
              Action Required: Redistribute transactions to ensure compliance.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {brokersAtWarning.length > 0 && brokersInBreach.length === 0 && (
        <Alert className="border-amber-500 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">
            Approaching Broker Cap Limit
          </AlertTitle>
          <AlertDescription className="text-amber-800">
            <p className="mb-2">
              {brokersAtWarning.length} broker
              {brokersAtWarning.length > 1 ? "s" : ""} approaching the 5%
              threshold:
            </p>
            <ul className="list-inside list-disc space-y-1">
              {brokersAtWarning.map((broker) => (
                <li key={broker.broker}>
                  <strong>{broker.broker}</strong>:{" "}
                  {broker.sharePercent.toFixed(2)}%
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {brokersInBreach.length === 0 && brokersAtWarning.length === 0 && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900">
            Broker Compliance: All Clear
          </AlertTitle>
          <AlertDescription className="text-green-800">
            All brokers are within the 5% concentration limit. No immediate
            action required.
          </AlertDescription>
        </Alert>
      )}

      {/* Broker Concentration Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Broker Concentration Analysis</CardTitle>
          <p className="text-muted-foreground text-sm">
            Breakdown of investment value by broker with 5% cap monitoring
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Broker Name</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Max Share</TableHead>
                  <TableHead>Concentration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBrokers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No broker data available.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedBrokers.map((broker) => {
                    const status = getCapStatus(broker.sharePercent);
                    return (
                      <TableRow key={broker.broker}>
                        <TableCell className="font-medium">
                          {broker.broker}
                        </TableCell>
                        <TableCell>
                          ₹{(broker.totalValue / 10000000).toFixed(2)}Cr
                        </TableCell>
                        <TableCell>{broker.count}</TableCell>
                        <TableCell>
                          {(broker.maxShare * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">
                                {broker.sharePercent.toFixed(2)}%
                              </span>
                              <span className="text-muted-foreground">
                                of total
                              </span>
                            </div>
                            <Progress
                              value={Math.min(broker.sharePercent, 10)}
                              max={10}
                              className={
                                status.severity === "critical"
                                  ? "[&>div]:bg-red-500"
                                  : status.severity === "warning"
                                    ? "[&>div]:bg-amber-500"
                                    : "[&>div]:bg-green-500"
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={status.color}>
                            {status.severity === "critical" && (
                              <AlertTriangle className="mr-1 h-3 w-3" />
                            )}
                            {status.severity === "warning" && (
                              <AlertCircle className="mr-1 h-3 w-3" />
                            )}
                            {status.severity === "ok" && (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            )}
                            {status.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Concentration Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Broker Share Distribution</CardTitle>
          <p className="text-muted-foreground text-sm">
            Visual representation of broker concentration (5% threshold marked)
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedBrokers.map((broker) => {
              const status = getCapStatus(broker.sharePercent);
              return (
                <div key={broker.broker} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{broker.broker}</span>
                    <span
                      className={
                        status.severity === "ok" ? "text-muted-foreground" : ""
                      }
                    >
                      {broker.sharePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="relative">
                    <Progress
                      value={broker.sharePercent}
                      max={Math.max(10, broker.sharePercent)}
                      className={
                        status.severity === "critical"
                          ? "[&>div]:bg-red-500"
                          : status.severity === "warning"
                            ? "[&>div]:bg-amber-500"
                            : "[&>div]:bg-green-500"
                      }
                    />
                    {/* 5% threshold marker */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500"
                      style={{
                        left: `${(5 / Math.max(10, broker.sharePercent)) * 100}%`,
                      }}
                    >
                      <div className="absolute -top-5 -left-6 text-xs font-semibold text-red-600">
                        5%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {sortedBrokers.length === 0 && (
            <p className="text-muted-foreground py-8 text-center">
              No broker data to display.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Brokers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sortedBrokers.length}</div>
            <p className="text-muted-foreground text-xs">
              Active broker relationships
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Highest Concentration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sortedBrokers.length > 0
                ? `${sortedBrokers[0].sharePercent.toFixed(2)}%`
                : "—"}
            </div>
            <p className="text-muted-foreground text-xs">
              {sortedBrokers.length > 0 ? sortedBrokers[0].broker : "N/A"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Compliance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {brokersInBreach.length > 0
                ? "BREACH"
                : brokersAtWarning.length > 0
                  ? "WARNING"
                  : "COMPLIANT"}
            </div>
            <p className="text-muted-foreground text-xs">
              {brokersInBreach.length > 0
                ? `${brokersInBreach.length} broker(s) over limit`
                : brokersAtWarning.length > 0
                  ? `${brokersAtWarning.length} broker(s) near limit`
                  : "All brokers within 5% cap"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

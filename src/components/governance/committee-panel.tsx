"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Users, Calendar } from "@/lib/icons";

interface Committee {
  id: string;
  name: string;
  type: string;
  chairperson: string;
  memberCount: number;
  nextMeeting: string;
  lastMeeting: string;
}

interface CommitteePanelProps {
  committees: Committee[];
  canManage: boolean;
}

export function CommitteePanel({ committees, canManage }: CommitteePanelProps) {
  // Mock data if none provided
  const committeeList = committees.length > 0 ? committees : [
    {
      id: "1",
      name: "Audit Committee of the Board (ACB)",
      type: "Board Committee",
      chairperson: "Independent Director",
      memberCount: 5,
      nextMeeting: "2025-03-15",
      lastMeeting: "2024-12-10",
    },
    {
      id: "2",
      name: "Risk Management Committee",
      type: "Management Committee",
      chairperson: "CFO",
      memberCount: 7,
      nextMeeting: "2025-02-28",
      lastMeeting: "2025-01-15",
    },
  ];

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Committee
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {committeeList.map((committee) => (
          <Card key={committee.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{committee.name}</CardTitle>
                  <CardDescription>{committee.type}</CardDescription>
                </div>
                <Badge variant="outline">{committee.memberCount} members</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Chairperson:</span>
                  <span>{committee.chairperson}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Last Meeting:</span>
                  <span>{committee.lastMeeting}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Next Meeting:</span>
                  <span className="font-medium text-primary">{committee.nextMeeting}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1">
                  View Members
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  Meeting Minutes
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

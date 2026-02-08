"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Shield,
  Save,
  Loader2,
  CalendarRange,
  Info,
} from "@/lib/icons";
import { updateTenantSettings } from "@/actions/settings";
import { useToast } from "@/components/ui/use-toast";
import type { TenantSettings } from "@/types";

interface BankProfileFormProps {
  settings: TenantSettings;
}

/**
 * Bank profile form with read-only and editable sections.
 *
 * Sections:
 * 1. Bank Identity — read-only after onboarding (DE11)
 * 2. Contact Information — editable
 * 3. Regulatory Information — read-only display (DE8, D21)
 * 4. Financial Year — hardcoded April-March (DE7)
 */
export function BankProfileForm({ settings }: BankProfileFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Editable fields state
  const [shortName, setShortName] = useState(settings.shortName);
  const [city, setCity] = useState(settings.city);
  const [nabardRegistrationNo, setNabardRegistrationNo] = useState(
    settings.nabardRegistrationNo ?? "",
  );

  // Determine current quarter
  const currentMonth = new Date().getMonth(); // 0-indexed
  const currentQuarter =
    currentMonth >= 3 && currentMonth <= 5
      ? "Q1 (Apr-Jun)"
      : currentMonth >= 6 && currentMonth <= 8
        ? "Q2 (Jul-Sep)"
        : currentMonth >= 9 && currentMonth <= 11
          ? "Q3 (Oct-Dec)"
          : "Q4 (Jan-Mar)";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateTenantSettings({
        shortName,
        city,
        nabardRegistrationNo: nabardRegistrationNo || null,
      });
      if (result.success) {
        toast({
          title: "Settings saved",
          description: "Bank profile has been updated successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error ?? "Failed to save settings.",
          variant: "destructive",
        });
      }
    });
  }

  // Format DAKSH score for display
  const dakshDisplay = settings.dakshScore
    ? `${settings.dakshScore}`
    : "Not yet assessed";

  // Format PCA status
  const pcaDisplay =
    settings.pcaStatus === "NONE" ? "Not under PCA" : settings.pcaStatus;

  // Format date helper
  function formatDateDisplay(date: Date | null): string {
    if (!date) return "Not recorded";
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Bank Identity (read-only after onboarding, DE11) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Bank Identity
            <Badge variant="secondary" className="ml-2 text-xs">
              Read-only
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                Legal Bank Name
              </Label>
              <Input value={settings.name} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                RBI License Number
              </Label>
              <Input
                value={settings.rbiLicenseNo}
                disabled
                className="bg-muted font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                State of Registration
              </Label>
              <Input value={settings.state} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">UCB Tier</Label>
              <Input
                value={settings.tier.replace("_", " ")}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
          <p className="text-muted-foreground mt-3 flex items-center gap-1 text-xs">
            <Info className="h-3 w-3" />
            These fields are set during onboarding and cannot be modified.
          </p>
        </CardContent>
      </Card>

      {/* Section 2: Contact Information (editable) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shortName">Short Name / Display Name</Label>
              <Input
                id="shortName"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nabardRegistrationNo">
                NABARD Registration No.
              </Label>
              <Input
                id="nabardRegistrationNo"
                value={nabardRegistrationNo}
                onChange={(e) => setNabardRegistrationNo(e.target.value)}
                placeholder="Enter NABARD registration number"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Section 3: Regulatory Information (read-only display, DE8, D21) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Regulatory Information
            <Badge variant="secondary" className="ml-2 text-xs">
              Read-only
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">DAKSH Score</p>
              <p className="text-base font-medium">{dakshDisplay}</p>
              {settings.dakshScoreDate && (
                <p className="text-muted-foreground text-xs">
                  as of {formatDateDisplay(settings.dakshScoreDate)}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">PCA Status</p>
              <Badge
                variant={
                  settings.pcaStatus === "NONE" ? "secondary" : "destructive"
                }
              >
                {pcaDisplay}
              </Badge>
              {settings.pcaEffectiveDate && (
                <p className="text-muted-foreground text-xs">
                  effective {formatDateDisplay(settings.pcaEffectiveDate)}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Scheduled Bank</p>
              <Badge
                variant={settings.scheduledBankStatus ? "default" : "secondary"}
              >
                {settings.scheduledBankStatus ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">
                Last RBI Inspection
              </p>
              <p className="text-base">
                {formatDateDisplay(settings.lastRbiInspectionDate)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">RBI Risk Rating</p>
              <p className="text-base">
                {settings.rbiRiskRating ?? "Not available"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">
                Multi-State License
              </p>
              <Badge
                variant={settings.multiStateLicense ? "default" : "secondary"}
              >
                {settings.multiStateLicense ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground mt-3 flex items-center gap-1 text-xs">
            <Info className="h-3 w-3" />
            Regulatory fields are updated by RBI inspection results and DAKSH
            assessments.
          </p>
        </CardContent>
      </Card>

      {/* Section 4: Financial Year (hardcoded April-March, DE7) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4" />
            Financial Year
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Fiscal Year</p>
              <p className="text-base font-medium">April - March</p>
              <p className="text-muted-foreground text-xs">
                Standard Indian financial year (not configurable)
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Current Quarter</p>
              <Badge variant="outline">{currentQuarter}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

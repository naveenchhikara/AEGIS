import { bankProfile, staff } from "@/data";
import type { BankProfile, StaffData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Settings,
  Building2,
  Users,
  Shield,
  Globe,
} from "@/lib/icons";
import { formatDate } from "@/lib/utils";

const bank = bankProfile as unknown as BankProfile;
const staffData = staff as unknown as StaffData;

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Bank profile and platform configuration
        </p>
      </div>

      {/* Bank Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Bank Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Bank Name</p>
                <p className="text-sm font-medium">{bank.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm">{bank.location}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Established</p>
                <p className="text-sm">{formatDate(bank.established, "long")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tier</p>
                <p className="text-sm">{bank.tier}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  RBI License No.
                </p>
                <p className="font-mono text-sm">{bank.rbiLicenseNo}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">UCB Type</p>
                <p className="text-sm">
                  {bank.registrationDetails.ucbType}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Paid-up Capital
                </p>
                <p className="text-sm">
                  ₹{bank.paidUpCapital} {bank.paidUpCapitalUnit}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Business Mix</p>
                <p className="text-sm">
                  ₹{bank.businessMix} {bank.businessMixUnit}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Staff Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-2xl font-bold">
                {staffData.metadata.totalStaff}
              </p>
              <p className="text-xs text-muted-foreground">Total Staff</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {staffData.metadata.departments}
              </p>
              <p className="text-xs text-muted-foreground">Departments</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{bank.departments.length}</p>
              <p className="text-xs text-muted-foreground">
                Department Heads
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder sections */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Security",
            icon: Shield,
            desc: "Password policies, MFA settings, session management",
          },
          {
            title: "Localization",
            icon: Globe,
            desc: "Language preferences, date formats, currency display",
          },
          {
            title: "Integrations",
            icon: Settings,
            desc: "Core banking system, email gateway, SMS provider",
          },
        ].map((section) => (
          <Card key={section.title}>
            <CardContent className="p-5">
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <section.icon className="h-8 w-8 text-muted-foreground/30" />
                <p className="font-medium">{section.title}</p>
                <p className="text-xs text-muted-foreground">{section.desc}</p>
                <p className="mt-2 text-xs text-muted-foreground/60">
                  Coming in Phase 2
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

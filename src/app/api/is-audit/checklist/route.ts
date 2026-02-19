import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/data-access/session";
import { getIsAuditChecklists } from "@/data-access/investment";

/**
 * GET /api/is-audit/checklist?category=CBS&engagementId=xxx
 * Returns the most recent IS audit checklist for the given category and engagement.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredSession();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const engagementId = searchParams.get("engagementId");

    if (!category) {
      return NextResponse.json(
        { error: "category is required" },
        { status: 400 },
      );
    }

    const checklists = await getIsAuditChecklists(session, {
      category,
      ...(engagementId ? { engagementId } : {}),
    });

    if (!checklists.length) {
      return NextResponse.json(null, { status: 404 });
    }

    // Return the most recent one
    return NextResponse.json(checklists[0]);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch checklist" },
      { status: 500 },
    );
  }
}

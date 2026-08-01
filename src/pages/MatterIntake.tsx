import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Lock } from "lucide-react";
import { INTAKE_STEPS, logMatterEvent } from "@/lib/matter";
import MatterTimeline from "@/components/MatterTimeline";
import StepClient from "@/components/intake/StepClient";
import StepProperty from "@/components/intake/StepProperty";
import StepUnit from "@/components/intake/StepUnit";
import StepTenant from "@/components/intake/StepTenant";
import StepTenancy from "@/components/intake/StepTenancy";
import StepMatterInfo from "@/components/intake/StepMatterInfo";
import StepLedger from "@/components/intake/StepLedger";
import StepDocuments from "@/components/intake/StepDocuments";
import StepLegal from "@/components/intake/StepLegal";
import StepReview from "@/components/intake/StepReview";
import type { MatterRow, StepProps } from "@/components/intake/types";

const STEP_COMPONENTS = [
  StepClient, StepProperty, StepUnit, StepTenant, StepTenancy,
  StepMatterInfo, StepLedger, StepDocuments, StepLegal, StepReview,
];

export default function MatterIntake() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, isAdmin } = useAuth();

  const [matter, setMatter] = useState<MatterRow | null>(null);
  const [clientId, setClientId] = useState<string>("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(!!id);

  const basePath = isAdmin ? "/admin" : "/client";

  const refresh = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase.from("cases").select("*").eq("id", id).maybeSingle();
    if (error || !data) {
      toast({ title: "Matter not found", variant: "destructive" });
      navigate(`${basePath}/cases`);
      return;
    }
    setMatter(data as MatterRow);
    setClientId(data.client_id);
    setStep((s) => (s === 1 && data.intake_step ? Math.min(data.intake_step, 10) : s));
    setLoading(false);
  }, [id, basePath, navigate, toast]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!id && !isAdmin && profile?.client_id) setClientId(profile.client_id);
  }, [id, isAdmin, profile?.client_id]);

  const locked = !!matter?.submitted_at && !isAdmin;

  /** Creates the draft on first save, then patches it. */
  const save = useCallback(
    async (patch: Record<string, any>): Promise<MatterRow | null> => {
      if (locked) {
        toast({ title: "This matter has been submitted and can no longer be edited", variant: "destructive" });
        return null;
      }
      if (!matter) {
        if (!clientId) return null;
        const { data, error } = await supabase.from("cases").insert({
          client_id: clientId,
          case_type: "eviction",
          status: "draft" as never,
          jurisdiction_state: "NY",
          jurisdiction_county: "Erie",
          eviction_reason: "non_payment",
          intake_step: 1,
          assigned_admin_id: isAdmin ? user?.id ?? null : null,
          ...patch,
        }).select().single();
        if (error || !data) {
          toast({ title: "Could not start matter", description: error?.message, variant: "destructive" });
          return null;
        }
        setMatter(data as MatterRow);
        await logMatterEvent({ caseId: data.id, eventKey: "matter_created", label: "Draft matter started" });
        navigate(`${basePath}/matters/${data.id}`, { replace: true });
        return data as MatterRow;
      }
      const { data, error } = await supabase.from("cases").update(patch).eq("id", matter.id).select().single();
      if (error || !data) {
        toast({ title: "Save failed", description: error?.message, variant: "destructive" });
        return null;
      }
      setMatter(data as MatterRow);
      return data as MatterRow;
    },
    [matter, clientId, locked, isAdmin, user?.id, navigate, basePath, toast],
  );

  const goTo = useCallback(
    (target: number) => {
      const clamped = Math.min(Math.max(target, 1), 10);
      setStep(clamped);
      if (matter && !locked) {
        supabase.from("cases").update({ intake_step: clamped }).eq("id", matter.id).then(() => {});
      }
    },
    [matter, locked],
  );

  const stepProps: StepProps = useMemo(
    () => ({
      matter,
      clientId,
      setClientId,
      save,
      refresh,
      next: () => goTo(step + 1),
      back: () => goTo(step - 1),
      goTo,
      isAdmin,
    }),
    [matter, clientId, save, refresh, goTo, step, isAdmin],
  );

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading…</div>;
  }

  const StepComponent = STEP_COMPONENTS[step - 1];

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/cases`)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to matters
        </Button>
        {matter?.case_number && <Badge variant="secondary">{matter.case_number}</Badge>}
        {matter?.status === "draft" && <Badge variant="outline">Draft</Badge>}
        {matter?.submitted_at && <Badge><Lock className="h-3 w-3 mr-1" /> Submitted</Badge>}
      </div>

      <div>
        <h1 className="text-xl font-semibold">Matter Intake</h1>
        <p className="text-sm text-muted-foreground">
          Step {step} of 10 — {INTAKE_STEPS[step - 1]}
        </p>
        <Progress value={(step / 10) * 100} className="mt-2" />
      </div>

      <div className="flex flex-wrap gap-1">
        {INTAKE_STEPS.map((label, i) => (
          <Button
            key={label}
            size="sm"
            variant={step === i + 1 ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => goTo(i + 1)}
            disabled={!matter && i > 0}
          >
            {i + 1}. {label}
          </Button>
        ))}
      </div>

      {locked && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          This matter has been submitted for attorney review and is now read-only.
        </p>
      )}

      <StepComponent {...stepProps} />

      {matter?.id && <MatterTimeline caseId={matter.id} includeInternal={isAdmin} />}
    </div>
  );
}

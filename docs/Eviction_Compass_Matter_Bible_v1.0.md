# Eviction Compass Matter Bible

**Version:** 1.0 Draft  
**Prepared:** August 1, 2026  
**Status:** Product and workflow specification for attorney validation and pilot use

## Purpose

This directory is the working constitution for Eviction Compass. It defines what a **Matter** is, how it moves, who may act, which information and documents are required, what the software may automate, and where attorney or collection-agency approval is mandatory.

The code should implement this specification. When the application and the Matter Bible conflict, the conflict must be logged and resolved deliberately. The Matter Bible is not a substitute for legal advice and does not independently determine whether a notice, deadline, charge, filing, or collection action is legally valid.

## Current product boundary

Eviction Compass is being completed as a focused workflow product for delinquent residential tenancy matters. It is not currently being expanded into a general property-management operating system.

The initial operational promise is:

> Move a delinquent tenant or former tenant from intake through notices, attorney handling, court, judgment, possession, collections, payment, and closure without losing the record or forcing the landlord to manage the process through disconnected emails and spreadsheets.

## Pilot reality

- **Pilot customer 1:** Chris Bellacose / internal landlord portfolio.
- **Pilot customer 2:** A trusted landlord design partner; legal name to be entered before production use.
- **Legal design partners:** Existing landlord attorneys working with the pilot users.
- **Collection fulfillment:** One Buffalo-area collection agency using its normal contingency structure, with Dixon Commercial retained as an optional alternative.
- **Initial geography:** Western New York, beginning with Erie County and Buffalo-area matters.

## Directory map

| File | Purpose |
|---|---|
| `01_CORE_MODEL.md` | Definitions, principles, and product boundaries |
| `02_ACTORS_AND_PERMISSIONS.md` | Roles, authority, and access rules |
| `03_MATTER_TYPES_AND_ROUTING.md` | Matter classification and first workflow branch |
| `04_STATE_MACHINE.md` | Authoritative stages, statuses, transitions, and holds |
| `05_NONPAYMENT_WORKFLOW_NY.md` | New York nonpayment workflow specification |
| `06_HOLDOVER_AND_LEASE_VIOLATION.md` | Holdover and violation routing framework |
| `07_ATTORNEY_WORKFLOW.md` | Attorney intake, review, filing, and update process |
| `08_COURT_JUDGMENT_POSSESSION.md` | Court events, outcomes, judgment, warrant, and possession |
| `09_COLLECTIONS_WORKFLOW.md` | Agency placement, updates, recovery, and closure |
| `10_DATA_AND_DOCUMENT_RULES.md` | Source-of-truth records, documents, ledger, and provenance |
| `11_TIMELINE_EVENT_CATALOG.md` | Immutable event vocabulary |
| `12_NOTIFICATIONS_TASKS_DEADLINES.md` | Task, alert, escalation, and due-date behavior |
| `13_SECURITY_PII_AUDIT.md` | Rental-application data, masking, access, and audit requirements |
| `14_CURRENT_CODE_MAPPING.md` | Mapping of this Bible to the current Lovable/Supabase codebase |
| `15_PILOT_OPERATIONS.md` | How the first users should operate the product |
| `16_ACCEPTANCE_TESTS.md` | End-to-end test scenarios and release gates |
| `17_OPEN_DECISIONS.md` | Questions requiring owner, attorney, or agency decisions |
| `18_CHANGE_CONTROL.md` | How the specification and software are changed |
| `REFERENCES.md` | Official legal and technical reference sources |
| `pilot/` | Pilot setup and matter worksheets |
| `testing/` | Test scripts, bug log, and release checklist |

## Governance rule

A change affecting legal sequence, legal deadline, notice content, settlement authority, debtor communication, credit reporting, judgment enforcement, or collection placement must be approved by the appropriate attorney or collection-agency partner before it becomes an automated production rule.


\newpage

# 1. Core Model

## 1.1 Matter

A **Matter** is the central operational record for one landlord problem involving one tenancy or one debt relationship. A Matter may include several people, notices, court events, payments, documents, attorneys, and collection placements, but it must retain one coherent history and one current workflow state.

A Matter is not merely a court case. A Matter can exist before a court filing, can resolve without a filing, can continue after possession is restored, and can remain open while a judgment is being collected.

## 1.2 Matter identity

Each Matter must have:

- A permanent internal ID.
- A human-readable matter number.
- One owning landlord organization.
- One property and, when applicable, one unit.
- One primary tenancy or debt relationship.
- At least one primary tenant/debtor party.
- One Matter Type.
- One Current Status.
- One Current Stage.
- One Next Required Action.
- One immutable chronological timeline.

## 1.3 Current application terminology

The existing application stores Matters in the `cases` table and calls much of the interface “Cases.” That implementation remains acceptable for the MVP. The product language should gradually prefer **Matter** because the lifecycle begins before filing and extends beyond court.

No disruptive table rename is required during the pilot.

## 1.4 Source-of-truth hierarchy

The system should distinguish related but separate truths:

1. **Tenancy truth:** lease terms, occupants, rent obligation, deposit, move-in and move-out.
2. **Ledger truth:** charges, payments, credits, reversals, balance as of a date.
3. **Legal workflow truth:** notices, service, attorney approval, filing, court events, judgment, warrant.
4. **Collection truth:** accepted placement, agency status, recoveries, commissions, remittances.
5. **Timeline truth:** immutable evidence that something was recorded, submitted, approved, changed, or received.

No single free-text status field should replace these records.

## 1.5 Core design principles

### One Matter, one history

The landlord, attorney, court, and agency should not create disconnected copies of the same problem. New records should link to the Matter and preserve prior facts.

### Workflow drives the interface

The interface should answer:

- Where is this Matter now?
- What must happen next?
- Who owns that action?
- What blocks progress?
- What proof is required?
- What happens if nothing is done?

### Human approval at regulated boundaries

The system may prepare, organize, calculate, remind, and route. It must not independently make legal judgments, send collection communications, approve settlements, furnish credit information, file litigation, or decide statutory eligibility.

### No silent state changes

Every status transition must record:

- Prior status.
- New status.
- Actor.
- Timestamp.
- Reason or triggering event.
- Related document, task, payment, or external reference when applicable.

### Preserve raw external data

When an attorney or collection agency sends a status, preserve the original value and separately store the normalized Eviction Compass status.

## 1.6 Product boundaries for MVP

Included:

- Landlord intake.
- Property, unit, tenant, tenancy, and rental-application information.
- Ledger and balance support.
- Notice and service tracking.
- Attorney referral and review.
- Court event and outcome tracking.
- Judgment, warrant, possession, and final balance.
- Collection-agency placement, status, payment, and closure.
- Documents, tasks, notifications, and audit history.

Explicitly deferred:

- General property management.
- Rent collection for performing tenants.
- Maintenance management.
- Applicant screening decisions.
- Automatic legal filing.
- Automatic debtor communications.
- Trust-account or debtor-payment processing by Eviction Compass.
- Nationwide legal rule automation.
- Public agency marketplace.


\newpage

# 2. Actors and Permissions

## 2.1 Roles

### Platform Super Administrator

Owns system configuration, role assignment, partner configuration, security response, and data governance.

### Platform Administrator / Case Operator

Reviews landlord submissions, requests corrections, coordinates counsel and agencies, records external updates, and resolves operational exceptions.

### Landlord Organization Owner

Controls the landlord account, users, properties, matters, certifications, billing, and partner authorizations.

### Landlord Staff

May create or update draft matters according to organization permissions. Sensitive rental-application information may require an additional permission.

### Attorney / Counsel

Reviews legal readiness, approves or rejects legal progression, creates or uploads legal documents, records filing and court events, controls legal strategy, and authorizes collection placement when litigation is active.

### Collection Agency Administrator

Accepts or rejects collection placements, manages agency users, reports status and payment information, and requests additional documents.

### Collection Agency Case User

Works only assigned collection matters and cannot modify tenancy, notices, court history, or landlord ledger records.

### Auditor / Read-Only Reviewer

May inspect permitted records and audit history but cannot change operational data.

## 2.2 Authority matrix

| Action | Landlord | Platform Admin | Attorney | Collection Agency |
|---|---:|---:|---:|---:|
| Create draft Matter | Yes | Yes | No | No |
| Edit landlord facts while draft | Yes | Yes | Request only | No |
| Upload source documents | Yes | Yes | Yes | Collection-only |
| Submit Matter | Yes | Yes | No | No |
| Reopen submitted intake | Request | Yes | Request | No |
| Approve legal readiness | No | No | Yes | No |
| Generate attorney-approved notice | Initiate | Assist | Approve | No |
| Record service | Upload/report | Yes | Yes | No |
| File petition | No | No | Attorney only | No |
| Record court event | View/comment | Yes | Yes | No |
| Approve settlement affecting possession | No | No | Attorney/client authority | No |
| Approve collection placement | Request | Route | Yes when required | No |
| Contact debtor for collections | No through platform | No | Legal role only | Agency only |
| Record agency payment | Report direct payment | Yes | View | Yes |
| Close Matter | Request | Yes | Recommend | Recommend |

## 2.3 Locking rules

- A landlord may edit a draft.
- Submission creates a locked snapshot.
- Submitted facts are not overwritten; corrections create an amendment record or an administrator-approved unlock.
- Attorney acceptance locks legal-intake fields that could invalidate prepared or served documents.
- A new payment may always be reported, even while the Matter is locked.
- A reported bankruptcy, attorney representation, cease request, identity problem, or payment discrepancy may place the Matter on hold immediately.

## 2.4 Sensitive-information permissions

Sensitive rental-application information includes date of birth, SSN fragments, driver-license data, banking references, employment, income, vehicles, and prior addresses.

Access should be limited to roles with a documented need:

- Organization owner or specifically authorized landlord staff.
- Assigned platform administrators.
- Assigned attorney.
- Assigned collection agency after placement authorization.

Every reveal, export, and download of sensitive information should be logged.

## 2.5 Attorney and agency isolation

An attorney sees only Matters assigned to that attorney or firm. A collection agency sees only accepted placements assigned to that agency. Neither partner receives blanket access to the landlord's portfolio.


\newpage

# 3. Matter Types and Routing

## 3.1 Authoritative Matter Types

The current application implements these values:

| Code | User label | Primary purpose |
|---|---|---|
| `non_payment` | Non-payment | Current occupant owes rent and possession may be sought |
| `holdover` | Holdover | Right to occupy has ended or termination is sought for a non-rent reason |
| `lease_violation` | Lease Violation | Alleged breach, nuisance, prohibited conduct, or cure/termination issue |
| `former_tenant_collection` | Former Tenant Collection | Possession has returned; money remains due |
| `judgment_collection` | Judgment Collection | Existing money judgment requires collection or enforcement |
| `other` | Other | Attorney or administrator must classify before progression |

## 3.2 First routing questions

Every intake must answer:

1. Is the person currently occupying the premises?
2. Is unpaid rent the primary issue?
3. Has possession already been returned?
4. Is there an existing court case?
5. Is there an existing judgment?
6. Is an attorney already involved?
7. Is a collection agency already involved?
8. Is there a known bankruptcy, military status concern, legal representation, dispute, or cease request?

## 3.3 Routing rules

### Current occupant + unpaid rent

Route to `non_payment` unless attorney review identifies a different case type.

### Former tenant + no possession issue

Route to `former_tenant_collection`. The system should not treat this as an eviction case. The attorney or operator decides between direct collection placement, a civil claim, Small Claims, or other remedy.

### Existing money judgment

Route to `judgment_collection`, preserve the underlying Matter if it exists, and capture judgment-specific fields.

### Current occupant + non-rent reason

Route to `holdover` or `lease_violation`. The correct notice and termination sequence must be selected by counsel or an approved jurisdiction rule set.

### Unclear facts

Route to `other` and place in `on_hold` or attorney triage until classified.

## 3.4 Multi-issue matters

A Matter may involve unpaid rent and lease violations simultaneously. The software should store secondary issues but maintain one attorney-approved primary legal route. It must not automatically combine incompatible notice sequences.

## 3.5 Conversion rules

- A `non_payment` Matter may create a collection placement after final balance approval or attorney authorization.
- A `former_tenant_collection` Matter may become a civil claim and later a `judgment_collection` stage without creating an unrelated person record.
- A `holdover` or `lease_violation` Matter may also produce a money balance, but collection should use the approved final balance rather than a stale pre-filing amount.
- Matter Type changes after attorney acceptance require an explicit transition event and reason.


\newpage

# 4. Matter State Machine

## 4.1 Current implementation statuses

The codebase currently supports:

`draft`, `attorney_review`, `intake`, `notice_preparation`, `notice_served`, `waiting_period`, `ready_to_file`, `filed`, `court_scheduled`, `in_court_process`, `outcome_pending`, `resolved`, `closed`, and `on_hold`.

These remain the canonical MVP database statuses.

## 4.2 Stage grouping

| Product stage | Database statuses |
|---|---|
| Intake | `draft`, `attorney_review`, `intake` |
| Pre-court notices | `notice_preparation`, `notice_served`, `waiting_period`, `ready_to_file` |
| Court | `filed`, `court_scheduled`, `in_court_process`, `outcome_pending` |
| Resolution | `resolved`, `closed` |
| Exception | `on_hold` |

Collections should continue in linked `collection_matters` records. A later version may add a top-level `collections` stage projection, but the MVP should avoid rewriting the case-status enum solely for naming symmetry.

## 4.3 Status definitions

### `draft`

Landlord or administrator is entering facts. No submission has occurred. Editing is permitted.

**Exit condition:** intake validation passes and authorized user submits.

### `attorney_review`

Submission snapshot exists and is locked. Counsel or platform triage reviews completeness and legal route.

**Allowed exits:** `intake`, `notice_preparation`, `ready_to_file`, `on_hold`, or return to draft through a controlled correction process.

### `intake`

Operational review or attorney-requested information is incomplete. This status should not become a general dumping ground; the Next Action must name the missing item and owner.

### `notice_preparation`

The approved pre-filing notice package is being prepared or approved.

### `notice_served`

A notice is recorded as delivered or mailed, but the required period has not necessarily elapsed.

### `waiting_period`

The system is waiting for an attorney-approved eligibility date or another required event. The software may calculate a proposed date, but the attorney controls legal readiness.

### `ready_to_file`

Counsel has confirmed that the required information and pre-filing steps are complete enough to proceed with filing.

### `filed`

A petition or other court action has been filed. Court identity, filing date, and external case/index number should be present.

### `court_scheduled`

At least one future appearance is scheduled.

### `in_court_process`

The case is active after appearance, adjournment, motion, stipulation, trial, or another court event.

### `outcome_pending`

The court phase has reached a decision point, but final judgment, warrant, dismissal, payment, settlement, or other disposition has not been completely recorded.

### `resolved`

The immediate legal objective has been resolved, but financial reconciliation, collection, possession, final accounting, or closure tasks remain.

### `closed`

No current operational action remains. Closure reason, closure date, and final financial disposition are required.

### `on_hold`

Progress is blocked. A hold must have a type, owner, reason, created date, review date, and release event.

## 4.4 Transition table

| From | To | Minimum trigger | Authorized actor |
|---|---|---|---|
| `draft` | `attorney_review` | Intake validation and submission certification | Landlord/Admin |
| `attorney_review` | `intake` | Missing or inconsistent information | Attorney/Admin |
| `attorney_review` | `notice_preparation` | Legal route approved; notice required | Attorney |
| `attorney_review` | `ready_to_file` | Existing valid notice sequence accepted or judgment route | Attorney |
| Any active status | `on_hold` | Bankruptcy, identity dispute, payment issue, legal conflict, missing authority, security incident | Admin/Attorney/Agency where applicable |
| `notice_preparation` | `notice_served` | Notice document and service/mailing evidence recorded | Attorney/Admin |
| `notice_served` | `waiting_period` | Service accepted for tracking | Attorney/Admin |
| `waiting_period` | `ready_to_file` | Attorney confirms eligibility | Attorney |
| `ready_to_file` | `filed` | Filing receipt or court record | Attorney/Admin |
| `filed` | `court_scheduled` | Appearance scheduled | Attorney/Admin |
| `court_scheduled` | `in_court_process` | Appearance begins or is adjourned | Attorney/Admin |
| `in_court_process` | `outcome_pending` | Decision/stipulation/judgment expected or partly entered | Attorney/Admin |
| `outcome_pending` | `resolved` | Outcome recorded | Attorney/Admin |
| `resolved` | `closed` | Final accounting and all required downstream work complete | Admin with attorney/agency input |

## 4.5 Transition safeguards

A transition function should validate:

- Actor permission.
- Current status.
- Requested next status.
- Required documents.
- Required fields.
- Blocking holds.
- Open tasks.
- Required approval.
- Reason.

No UI component should directly update the status field without using the transition service.

## 4.6 Holds

Recommended hold types:

- Bankruptcy review.
- Military/SCRA review.
- Debtor represented by counsel.
- Identity mismatch.
- Payment discrepancy.
- Debt disputed.
- Missing landlord authority.
- Missing lease or ledger.
- Improper or uncertain service.
- Jurisdiction unsupported.
- Attorney conflict.
- Collection-agency conflict.
- Security/privacy incident.
- Settlement review.

A hold does not erase the prior stage. Store `held_from_status` so the Matter can resume deliberately.


\newpage

# 5. New York Nonpayment Workflow

## 5.1 Scope

This chapter specifies the product workflow for residential nonpayment matters in the initial Western New York pilot. It is a software and operations specification. Attorneys must approve the applicable notice, service, deadline, court, and filing requirements for each Matter.

## 5.2 Legal reference baseline

New York Courts describes a nonpayment matter outside New York City as a proceeding for a tenant who remains in possession and owes rent. Its public guidance identifies a written five-day late-rent notice sent by certified mail and a separate written rent demand delivered at least fourteen days before filing. The written demand must identify the months and amounts claimed, and service defects can create dismissal risk. A tenant who has permanently surrendered possession generally requires a civil or Small Claims route rather than a nonpayment eviction.

The platform must not treat date calculation as a substitute for counsel's approval.

## 5.3 Product workflow

### Step A - Delinquency established

Required facts:

- Tenant remains in possession.
- Rent due date.
- First unpaid period.
- Last payment date and amount.
- Current rent amount.
- Charges, payments, credits, concessions, and deposit treatment.
- Current ledger balance as of a stated date.
- Lease or tenancy basis.
- Known disputes, repair claims, subsidy issues, bankruptcy, military status, and representation.

### Step B - Five-day late-rent notice record

The Matter should support:

- Attorney-approved notice template/version.
- Date rent became at least five days late.
- Notice generation date.
- Claimed amount and ledger cutoff date.
- Recipient names and address.
- Certified-mail date.
- Tracking number.
- Mailing receipt.
- Returned/unclaimed status.
- Copy of final notice.
- Person responsible.

This event does not itself mean the later written demand has been served.

### Step C - Fourteen-day written rent demand

Required record:

- Attorney-approved document version.
- Months and amounts demanded.
- Ledger snapshot used.
- Generated date.
- Service instructions.
- Process server or authorized person.
- Service attempts.
- Service method.
- Completed date.
- Affidavit or proof of service.
- Proposed earliest filing date.
- Attorney-confirmed filing eligibility date.

The system must store the proposed date and attorney-confirmed date separately.

### Step D - Attorney filing review

Checklist:

- Correct petitioner/owner identity.
- Correct property and court jurisdiction.
- All adult respondents identified or handled as counsel directs.
- Tenancy and occupancy supported.
- Ledger reconciled.
- Five-day notice and proof present.
- Written rent demand and proof present.
- Good Cause notice/analysis completed when required.
- Required registrations, deeds, leases, or property documents present.
- Military and bankruptcy checks addressed.
- Payments after demand incorporated.
- No active hold.

### Step E - Filing

Record:

- Court.
- Filing date.
- Petition and Notice of Petition.
- Index/docket number.
- Filing fee.
- Service deadline/instructions.
- Service proof.
- Appearance date.
- Attorney filing confirmation.

## 5.4 Payment behavior

A payment reported during notices or court must create:

- A ledger entry.
- A timeline event.
- A task for attorney review when the payment may alter the amount, settlement, or continuation.
- A revised balance projection.

The software must not automatically dismiss, continue, or change a filed case solely because a payment was entered.

## 5.5 Configurable rule object

The future rules engine should store, by jurisdiction and effective date:

- Rule identifier.
- Matter type.
- Required notice type.
- Trigger event.
- Proposed day count.
- Counting method.
- Service-method implications.
- Required proof.
- Attorney approval requirement.
- Official source.
- Effective and retirement dates.

Every calculated legal date should display: **“Proposed date - attorney confirmation required.”**


\newpage

# 6. Holdover and Lease-Violation Workflow

## 6.1 Product rule

Holdover and lease-violation Matters must not reuse the nonpayment notice sequence merely because money is also owed. Counsel selects the correct route and notice package.

## 6.2 Holdover intake

Capture:

- Current occupant status.
- Lease type and expiration.
- Date possession was demanded, if applicable.
- Rent accepted after expiration or termination.
- Month-to-month duration.
- Occupant classification: tenant, licensee, squatter, unauthorized occupant, subtenant, other.
- Property type and Good Cause applicability analysis.
- Reason for termination.
- Prior notices and service proof.
- Subsidy or regulated-housing information.

## 6.3 Lease-violation intake

Capture:

- Specific lease provision.
- Alleged conduct.
- Date range and recurrence.
- Witnesses.
- Photos, video, police reports, code records, complaints, correspondence, and prior warnings.
- Whether the issue can be cured.
- Whether a notice to cure was given.
- Whether a termination notice was given.
- Safety or emergency concern.
- Attorney-selected legal route.

## 6.4 State behavior

Recommended flow:

`draft` -> `attorney_review` -> `notice_preparation` -> `notice_served` -> `waiting_period` -> `ready_to_file` -> court statuses.

Counsel may route directly from `attorney_review` to `ready_to_file` only when counsel documents why no additional pre-filing notice is required.

## 6.5 Required notice model

The software must support multiple notices per Matter. Each notice record should include:

- Notice type.
- Legal purpose.
- Template/version.
- Prepared by.
- Approved by.
- Facts incorporated.
- Generated PDF hash.
- Recipients.
- Service requirements.
- Service records.
- Cure/termination date proposed by system.
- Attorney-confirmed date.
- Superseded or withdrawn status.

## 6.6 Money claims

A holdover or violation Matter may include money claims. These should remain distinct from the possession basis and should flow into final accounting only after attorney review.


\newpage

# 7. Attorney Workflow

## 7.1 Attorney purpose

The attorney workspace is the control point for legal validity. It should reduce incomplete referrals and repetitive email, not replace professional judgment.

## 7.2 Referral packet

A referral should contain:

- Landlord legal identity and authority.
- Property, unit, and jurisdiction.
- All relevant tenants, occupants, and guarantors.
- Tenancy details.
- Lease and rental application.
- Reconciled ledger and balance date.
- Matter type and landlord narrative.
- Legal-question responses.
- Notices and service evidence.
- Payment agreements and recent payments.
- Known disputes, repair issues, bankruptcy, military status, and representation.
- Communications and supporting evidence.
- Requested outcome.

## 7.3 Attorney review outcomes

### Accept for notice preparation

Matter moves to `notice_preparation`. Attorney becomes assigned counsel.

### Accept as ready to file

Matter moves to `ready_to_file` when counsel confirms the existing notice package and legal prerequisites.

### Need information

Matter moves to `intake` or remains in `attorney_review` with explicit tasks. Each request has an owner and due date.

### Place on hold

Attorney selects a hold reason and required resolution.

### Decline / conflict

Record a nonprivileged reason and allow reassignment. Internal conflict details remain restricted.

## 7.4 Attorney task model

Tasks should include:

- Review intake.
- Review ledger.
- Approve or revise notice.
- Confirm service.
- Confirm eligibility date.
- Prepare petition.
- File case.
- Record court appearance.
- Upload stipulation/order/judgment.
- Approve collection referral.
- Respond to payment or settlement event.

## 7.5 Privilege and visibility

Attorney notes require visibility levels:

- Client-visible update.
- Platform operations.
- Attorney confidential/privileged.

The platform must not expose privileged notes to landlord staff or agencies merely because they are attached to the same Matter.

## 7.6 Amendments after submission

A landlord correction after attorney review should:

1. Create an amendment request.
2. Preserve the original submitted value.
3. Identify who requested the change.
4. Identify whether documents already generated or served are affected.
5. Require attorney acknowledgment when legal work has begun.

## 7.7 Service-level targets for pilot

These are operational targets, not legal promises:

- New referral acknowledged within one business day.
- Accept, request information, or decline within three business days.
- Critical payment, bankruptcy, representation, or court-stay information surfaced immediately.
- Routine status updated after each material event and at least monthly while active.


\newpage

# 8. Court, Judgment, and Possession

## 8.1 Court case record

A Matter may have one or more related court records. Each record should include:

- Court name and jurisdiction.
- Case type.
- Index/docket number.
- Filing date.
- Petitioner and respondents.
- Assigned judge/part when known.
- Attorney.
- Filing documents.
- Service records.
- Current court status.
- External court URL/reference if available.

## 8.2 Court events

Supported event types should expand beyond the current generic values. Minimum catalog:

- Filing.
- Service completed.
- Answer received.
- Initial appearance.
- Adjournment.
- Conference/ADR.
- Motion filed.
- Order to Show Cause.
- Stay.
- Stipulation.
- Default.
- Hearing/trial.
- Decision.
- Judgment entered.
- Warrant issued.
- Warrant stayed/vacated.
- Case dismissed/discontinued.
- Other.

## 8.3 Stipulations and payment agreements

Store:

- Signed document.
- Effective date.
- Payment schedule.
- Possession terms.
- Default provisions as entered by counsel.
- Attorney interpretation/status.
- Payments applied.
- Alleged default event.
- Court action taken after default.

The system may monitor dates and payments but must not decide that a legal default occurred without attorney confirmation.

## 8.4 Judgment record

A first-class judgment record should include:

- Judgment type: money, possession, both, dismissal, other.
- Date granted.
- Date entered.
- Principal.
- Court costs.
- Attorney fees awarded.
- Interest rate and legal basis.
- Credits/payments.
- Current judgment balance.
- Judgment document.
- Debtors covered.
- Enforcement eligibility and attorney notes.

## 8.5 Warrant and possession

Capture:

- Warrant requested.
- Warrant issued.
- Enforcement officer/marshal/sheriff.
- Required notice served.
- Scheduled date.
- Stay or Order to Show Cause.
- Execution date.
- Keys returned voluntarily.
- Possession restored date and method.
- Lock change.
- Property condition inspection.
- Personal property handling task.

## 8.6 Final accounting

After possession or surrender:

- Freeze the occupancy period.
- Enter all payments and credits.
- Apply security deposit according to attorney/landlord accounting.
- Add only documented and legally supported charges.
- Separate pre-judgment debt, judgment amount, post-judgment interest, damages, and nonjudgment claims.
- Produce an attorney-approved or agency-ready balance statement.

## 8.7 Resolution versus closure

A possession outcome may resolve the eviction objective while money collection continues. Use `resolved` until final accounting and downstream collection decisions are complete. Use `closed` only after the closure checklist passes.


\newpage

# 9. Collections Workflow

## 9.1 Platform role

Eviction Compass organizes and routes collection placements. The collection agency remains responsible for debtor communications, validation, negotiation, payment processing, credit reporting, legal escalation, licensing, and collection compliance.

The platform should not receive debtor funds or charge a percentage of recoveries during the MVP.

## 9.2 Collection entry points

### Former tenant direct placement

Used after possession has been returned and the final balance is approved.

### Litigation-coordinated placement

Used only with attorney authorization while a legal matter remains active. Agency communications and settlement authority must not conflict with legal strategy or court stipulations.

### Post-judgment placement

Used when a money judgment exists. Judgment-specific documents and balance calculations control.

## 9.3 Placement packet

- Actual creditor legal name.
- Landlord contact and authorization.
- Debtor identity and source information.
- Current and forwarding addresses.
- Rental application and provenance-controlled employment/bank references when authorized.
- Lease.
- Final ledger.
- Notices and service documents when relevant.
- Court documents and judgment.
- Payments and credits after judgment.
- Dispute, bankruptcy, representation, military, and cease flags.
- Settlement authority.
- Interest instructions and legal basis.
- Attorney restrictions.

## 9.4 Agency partner selection

The MVP supports:

- A Buffalo-area agency using its negotiated contingency terms.
- Dixon Commercial as an optional partner with its own membership and commission rules.
- Future agencies through the same normalized adapter model.

Selection factors:

- Jurisdiction.
- Debt type.
- Minimum balance.
- Existing judgment.
- Agency capabilities.
- Attorney recommendation.
- Landlord authorization.
- Commercial terms.

## 9.5 Collection statuses

Recommended normalized statuses:

- Draft Placement.
- Submitted to Agency.
- Agency Review.
- Accepted.
- Rejected.
- Needs Information.
- Active Collection.
- Debtor Disputed.
- Bankruptcy Hold.
- Attorney Representation.
- Payment Promised.
- Payment Plan.
- Partial Recovery.
- Settlement Proposed.
- Legal Review.
- Returned Uncollected.
- Paid in Full.
- Settled.
- Closed.

## 9.6 Direct payments

An active Matter must always show **Report Direct Payment**.

Required fields:

- Date received.
- Amount.
- Method.
- Applied Matter/account.
- Partial or full.
- Supporting image/receipt.
- Settlement or credit associated.
- Person reporting.

The platform creates an urgent task to notify the agency and attorney where applicable. Agency commission treatment remains governed by the agency agreement.

## 9.7 Payment reconciliation

Record:

- Gross debtor payment.
- Agency commission.
- Card/processing fee.
- Legal/enforcement fee.
- Other authorized deduction.
- Net remittance.
- Remittance date.
- Remaining balance.

## 9.8 Closure

A collection placement may close as:

- Paid in full.
- Settled.
- Returned uncollectible.
- Withdrawn with agency approval.
- Bankruptcy.
- Time-barred/legal restriction.
- Transferred.
- Creditor write-off.

Closing the placement does not automatically close the Matter if court, possession, accounting, or another placement remains active.


\newpage

# 10. Data and Document Rules

## 10.1 Core entities

| Entity | Purpose |
|---|---|
| Client/Organization | Legal landlord or property manager account |
| Property | Street address and jurisdiction |
| Unit | Reusable rentable unit within a property |
| Tenant | Person identity and rental-application profile |
| Tenancy | Relationship among tenant, unit, lease, rent, deposit, and occupancy |
| Matter (`cases`) | Central workflow record |
| Ledger Entry | Charge, payment, credit, reversal, or adjustment |
| Document | Uploaded or generated evidence |
| Notice | Prepared legal/operational notice and version |
| Service Record | Evidence of mailing or service |
| Counsel Assignment | Attorney relationship and role |
| Court Record/Event | Filing and court history |
| Judgment/Warrant | Outcome and enforcement records |
| Collection Matter | Agency-specific placement |
| Payment | Money event from any channel |
| Matter Event | Immutable timeline event |
| Task/Notification | Work ownership and alerts |
| Audit Log | Security and privileged action record |

## 10.2 Ledger model

Every ledger line should have:

- Effective date.
- Entry type.
- Description.
- Charge amount.
- Payment amount.
- Credit amount.
- Source.
- Related document.
- Entered by.
- Created timestamp.
- Reversal link when corrected.

Do not overwrite financial history. Correct mistakes by reversing or superseding entries.

Recommended entry types:

- Rent.
- Additional rent, only when legally supported.
- Late fee.
- NSF fee.
- Utility.
- Damage.
- Court cost.
- Attorney fee awarded.
- Payment.
- Security-deposit credit.
- Concession/credit.
- Settlement adjustment.
- Judgment principal.
- Judgment interest.
- Reversal.
- Other reviewed charge.

## 10.3 Balance snapshots

Notices, petitions, judgments, and collection packets must reference a balance snapshot with:

- As-of date.
- Included ledger IDs.
- Principal categories.
- Payments/credits.
- Total.
- Generated by.
- Hash or immutable snapshot data.

Later ledger changes must not silently alter the amount shown on a previously generated document.

## 10.4 Document categories

The current code supports:

- Lease.
- Rent ledger.
- Notice.
- Proof of service.
- Petition/filing.
- Court document.
- Photo.
- Correspondence.
- Other.

Recommended subtypes include rental application, judgment, warrant, stipulation, payment receipt, property inspection, attorney packet, agency packet, and identity verification.

## 10.5 Document metadata

- Original filename.
- Internal safe filename.
- Category/subtype.
- Matter.
- Tenant/debtor when applicable.
- Source.
- Uploaded by.
- Upload date.
- Document date.
- Visibility level.
- Version.
- Superseded status.
- SHA-256 hash.
- Malware-scan result.
- Retention class.

## 10.6 Rental-application provenance

Sensitive facts should include:

- Value.
- Source, such as rental application, lease, landlord entry, attorney, agency, or skip trace.
- Date obtained.
- Verification status.
- Verification date.
- Last known date.
- Sharing authorization.

Old application information is “last known,” not automatically “current.”

## 10.7 Party duplication

The current system stores `tenants` and `debtors` separately. During MVP:

- Add or maintain a source link from debtor to tenant and Matter.
- Copy only through an explicit collection-placement action.
- Preserve source IDs and timestamps.
- Do not create a second debtor when a linked debtor already exists.

A future unified `parties` model may replace duplication after pilot stability.


\newpage

# 11. Matter Timeline Event Catalog

## 11.1 Rules

The Matter timeline is append-only. Users may add notes, but system events are not manually edited or deleted through the normal interface. Corrections create a new event.

Each event includes:

- `event_key`.
- Human label.
- Detail.
- Actor.
- Timestamp.
- Visibility.
- Related entity ID.
- Metadata.

## 11.2 Intake events

| Event key | Label |
|---|---|
| `matter_created` | Draft Matter started |
| `intake_step_completed` | Intake step completed |
| `property_linked` | Property selected or created |
| `unit_linked` | Unit selected or created |
| `tenant_linked` | Tenant added to Matter |
| `tenancy_created` | Tenancy recorded |
| `ledger_updated` | Ledger changed |
| `document_uploaded` | Document uploaded |
| `matter_submitted` | Matter submitted for attorney review |
| `matter_amendment_requested` | Correction requested after submission |

## 11.3 Attorney and notice events

- `counsel_assigned`
- `counsel_accepted`
- `counsel_declined`
- `information_requested`
- `information_supplied`
- `notice_draft_created`
- `notice_approved`
- `notice_generated`
- `notice_mailed`
- `notice_service_attempted`
- `notice_served`
- `service_proof_uploaded`
- `eligibility_date_proposed`
- `eligibility_confirmed`
- `matter_ready_to_file`

## 11.4 Court events

- `petition_prepared`
- `case_filed`
- `court_number_assigned`
- `court_service_attempted`
- `court_service_completed`
- `court_date_scheduled`
- `court_date_changed`
- `appearance_completed`
- `adjournment_recorded`
- `stipulation_entered`
- `payment_agreement_entered`
- `motion_or_osc_recorded`
- `stay_entered`
- `stay_lifted`
- `decision_recorded`
- `judgment_entered`
- `warrant_issued`
- `warrant_stayed`
- `possession_restored`
- `case_dismissed`

## 11.5 Collection events

- `collection_draft_created`
- `collection_submitted`
- `collection_accepted`
- `collection_rejected`
- `agency_information_requested`
- `agency_status_received`
- `debtor_dispute_reported`
- `payment_promised`
- `payment_plan_started`
- `agency_payment_received`
- `direct_payment_reported`
- `partial_recovery_recorded`
- `settlement_proposed`
- `settlement_approved`
- `collection_returned`
- `collection_closed`

## 11.6 Control events

- `status_transitioned`
- `matter_placed_on_hold`
- `matter_released_from_hold`
- `sensitive_data_revealed`
- `document_downloaded`
- `record_exported`
- `user_access_changed`
- `matter_closed`
- `matter_reopened`

## 11.7 Idempotency

Events tied to one-time system actions should use a deterministic idempotency key so retries do not create false duplicates. Repeated legitimate events such as payments or service attempts should use unique external or transaction references.


\newpage

# 12. Notifications, Tasks, and Deadlines

## 12.1 Difference among records

- A **task** is work assigned to a person or role.
- A **deadline** is a relevant date associated with a rule, court event, agreement, or partner request.
- A **notification** is a delivery attempt informing someone about a task, event, deadline, or change.

Do not use notifications as the only durable record of required work.

## 12.2 Task fields

- Matter.
- Task type.
- Title and instructions.
- Owner user or role.
- Created by.
- Due date/time.
- Priority.
- Blocking status.
- Related document/event.
- Completed date and actor.
- Escalation level.
- Cancellation reason.

## 12.3 Required task categories

- Complete intake.
- Supply missing document.
- Reconcile ledger.
- Review notice.
- Mail notice.
- Serve demand.
- Upload proof.
- Confirm legal eligibility.
- File petition.
- Prepare for court.
- Record court outcome.
- Review payment.
- Complete final accounting.
- Approve collection placement.
- Report direct payment.
- Respond to agency request.
- Review hold.
- Close Matter.

## 12.4 Deadline certainty

Every deadline should have a certainty classification:

- **Legal-confirmed:** attorney confirmed.
- **Court-issued:** from a court document or court system.
- **Partner-required:** agency or process-server deadline.
- **Contractual:** payment plan or agreement.
- **System-proposed:** calculated but not attorney-confirmed.
- **Operational target:** internal service level.

The UI must display the classification.

## 12.5 Notification channels

MVP:

- In-application.
- Email without sensitive details.

Later:

- SMS for user reminders after consent.
- Webhooks/API partner updates.

## 12.6 Escalation examples

- Attorney information request due in two business days: remind owner at creation, one day before, due date, and overdue.
- Proposed filing date reached without attorney confirmation: alert attorney and admin; do not advance automatically.
- Court date within 24 hours: alert assigned attorney and landlord owner.
- Direct payment reported: urgent agency/attorney task.
- Bankruptcy reported: immediate hold and restricted alert.
- No agency update for thirty days: follow-up task.

## 12.7 Noise control

Group low-priority updates into a digest. Critical legal, payment, security, and hold events should remain immediate. Every notification should link to the exact Matter and task rather than a generic dashboard.


\newpage

# 13. Security, PII, and Audit Requirements

## 13.1 Sensitive data context

Eviction Compass may receive sensitive information originally supplied on a rental application, including identity, employment, wage, bank-reference, vehicle, prior-address, and contact information. The data may be useful for identifying the correct person, attorney intake, collection placement, or post-judgment enforcement, but access must be controlled.

## 13.2 MVP requirements

- Private storage buckets only.
- Row Level Security on every tenant-owned table.
- Organization isolation tests.
- Role-based access for counsel and agencies.
- Sensitive fields masked by default.
- Explicit reveal action.
- Audit event for reveal, export, and document download.
- No sensitive values in email subjects or bodies.
- No service-role key in client code.
- Malware scanning for uploads.
- Short-lived signed document URLs.
- MFA for platform administrators and partner users.
- Public signup disabled or converted to controlled onboarding before external launch.

## 13.3 Data minimization

- Do not require full SSN in MVP.
- Collect only information already lawfully possessed and needed for the Matter.
- Label unverified information.
- Do not encourage landlords to enter guessed bank or employment data.
- Do not expose collection-only fields during ordinary eviction intake unless needed.

## 13.4 Audit log

The existing `activity_log` table must become active. Minimum audited actions:

- Login and failed privileged action.
- Role change.
- Sensitive-data reveal.
- Document view/download/delete.
- Matter submission.
- Status transition.
- Ledger amendment.
- Notice generation.
- Attorney approval.
- Collection export.
- Payment record change.
- Data export.
- Matter closure/reopening.

## 13.5 Retention

Define retention classes before public launch:

- Draft abandoned Matter.
- Active legal Matter.
- Closed Matter with no judgment.
- Judgment/enforcement record.
- Collection placement.
- Security logs.
- Billing and agreement records.

Deletion must respect litigation holds, agency agreements, attorney requirements, and legal obligations.

## 13.6 Environment separation

The current application has historically used one Supabase environment for preview and production. Before outside users or live sensitive data expand, create separate development/staging and production environments, and ensure test data cannot be mistaken for live data.

## 13.7 AI safeguards

AI may classify, extract, summarize, and flag. It must not:

- Decide legal validity.
- Contact tenants/debtors.
- Add fees or interest.
- Approve notices.
- Authorize filing.
- Negotiate or approve settlement.
- Furnish credit data.
- Make final bankruptcy, military, or limitation determinations.

Store source references and require human confirmation of AI-extracted values.


\newpage

# 14. Current Code Mapping

## 14.1 Current stack

- React 18, Vite, TypeScript.
- Tailwind and shadcn/ui.
- Supabase Postgres, Auth, Storage, and Edge Functions.
- React Router.
- Lovable-managed codebase with GitHub export.

## 14.2 Implemented intake

The current `MatterIntake` page implements ten steps:

1. Client.
2. Property.
3. Unit.
4. Tenant.
5. Tenancy.
6. Matter.
7. Ledger.
8. Documents.
9. Legal.
10. Review.

Relevant files:

- `src/pages/MatterIntake.tsx`
- `src/components/intake/StepClient.tsx`
- `StepProperty.tsx`
- `StepUnit.tsx`
- `StepTenant.tsx`
- `StepTenancy.tsx`
- `StepMatterInfo.tsx`
- `StepLedger.tsx`
- `StepDocuments.tsx`
- `StepLegal.tsx`
- `StepReview.tsx`
- `src/lib/intake-validation.ts`
- `src/lib/matter.ts`

## 14.3 Implemented database additions

The August 1 migration added:

- `units`.
- `tenancies`.
- `matter_events`.
- `draft` and `attorney_review` statuses.
- Matter Type.
- Intake progress and legal-question fields.
- Rental-application JSON sections with field provenance.
- Client write policies for draft intake.

## 14.4 Current strengths

- Real data persistence.
- Multi-tenant RLS foundation.
- Separate admin/client portals.
- Structured intake components.
- Draft and submitted states.
- Timeline implementation.
- Existing court, counsel, payment-plan, and collection modules.

## 14.5 Current gaps against the Bible

### Workflow transition service

`nextRequiredAction()` currently uses a simple status switch. Build a central transition service with rules, prerequisites, actor authorization, and timeline logging.

### Attorney role and portal

Counsel records exist, but authenticated attorney users and attorney-specific RLS/workspace are not fully implemented.

### Notice entity

Service records exist, but notices need first-class versioned records linked to service and balance snapshots.

### Task and notification engine

A notifications table exists, but durable tasks, ownership, escalation, and delivery are not operational.

### Judgment and warrant

Court events exist; judgment and warrant need dedicated structured records.

### Final balance handoff

The current automatic collection creation can produce a zero-principal record. Final accounting and explicit approved handoff must control collection principal.

### Sensitive-data logging

Sensitive rental-application fields exist, but masking, reveal logging, and field-level access remain required.

### Tenant/debtor duplication

Collections create a debtor record separate from the tenant. Add source links and deduplication before live collection testing.

## 14.6 Immediate implementation order

1. Central state-transition function and transition log.
2. Tasks and Next Action panel.
3. Attorney authentication/assignment/review queue.
4. Notice and balance-snapshot records.
5. Service and attorney-confirmed eligibility.
6. Court filing record.
7. Structured judgment and warrant.
8. Final accounting and collection handoff.
9. Agency status/import and direct-payment reporting.
10. Audit logging, masking, staging, and regression testing.


\newpage

# 15. Pilot Operations

## 15.1 Pilot participants

| Role | Actual pilot status |
|---|---|
| Product owner / customer 1 | Chris Bellacose |
| Customer organization | Interactiveinfo.com / associated landlord entities to be configured correctly |
| Customer 2 | Trusted landlord design partner - legal entity TBD |
| Attorneys | Existing cooperating landlord counsel - names and firms TBD |
| Collection agency | Buffalo-area agency - name and terms TBD |
| Optional agency | Dixon Commercial |
| Platform operator | Chris initially |

## 15.2 Pilot purpose

Process at least two real Matters through the application while the attorneys validate the legal workflow and required evidence.

## 15.3 Pilot operating rule

Eviction Compass becomes the primary operational index. Email may still carry formal communications, but every material email, document, decision, date, request, and payment must be reflected in the Matter.

## 15.4 Matter onboarding meeting

For each pilot Matter:

1. Identify legal landlord entity.
2. Identify property and unit.
3. Identify every adult occupant and lease party.
4. Upload lease and rental application.
5. Enter tenancy details.
6. Enter or import ledger and reconcile current balance.
7. Select Matter Type.
8. Answer legal and risk questions.
9. Upload prior notices and service evidence.
10. Submit to attorney.

## 15.5 Attorney design session

Using a real Matter, ask counsel:

- What fact is missing?
- What document proves it?
- Who is legally permitted to perform the next act?
- What exact event starts the next deadline?
- What could invalidate the step?
- What must be shown to the landlord?
- What must remain attorney-only?
- What should happen when a payment, bankruptcy, dispute, or stay occurs?

Update this Bible before encoding new automated legal rules.

## 15.6 Pilot metrics

- Intake completion time.
- Number of attorney information requests.
- Time from submission to attorney acceptance.
- Missing-document rate.
- Ledger discrepancy rate.
- Percentage of material events recorded in the system.
- Number of external spreadsheets used.
- Number of duplicate data entries.
- Time to create agency packet.
- Direct-payment reporting time.
- Security/access incidents.

## 15.7 Pilot exit criteria

- Two real Matters reach their appropriate downstream stage.
- Landlord can complete intake with minimal operator help.
- Attorney confirms packet is materially usable.
- One collection agency accepts a system-generated packet.
- Status and payment can be reconciled.
- No cross-organization data leak.
- Audit trail records privileged actions.
- Critical bugs are closed or have documented workarounds.


\newpage

# 16. Acceptance Tests

## Test 1 - Current tenant nonpayment

**Goal:** Intake through attorney-confirmed ready-to-file.

1. Landlord selects an existing property or creates one.
2. Landlord selects/creates unit.
3. Landlord selects/creates tenant and tenancy.
4. Lease and rental application upload successfully.
5. Ledger charge, payment, and credit lines calculate correctly.
6. Matter balance must match ledger before submission.
7. Matter submits and locks.
8. Attorney can request information.
9. Landlord supplies information without overwriting submission history.
10. Five-day notice record and certified mailing proof are stored.
11. Fourteen-day demand and service proof are stored.
12. Proposed and attorney-confirmed filing dates remain distinct.
13. Timeline contains every material event.
14. Unauthorized client cannot access the Matter.

## Test 2 - Former tenant direct collection

1. Occupancy status is former tenant.
2. Nonpayment eviction sequence is not presented as the default route.
3. Final ledger and security-deposit treatment are recorded.
4. Attorney/operator approves direct collection or civil claim route.
5. Collection packet carries linked tenant data without duplicate identity.
6. Agency accepts or requests information.
7. Agency status displays in normalized form while preserving raw status.
8. Direct payment is reported and creates required agency notification task.

## Test 3 - Existing judgment

1. Judgment document and court number are required.
2. Judgment principal, costs, interest basis, and payments are recorded separately.
3. Collection placement uses current approved judgment balance.
4. Agency cannot edit judgment history.
5. Payment reconciliation shows gross, commission, deductions, net, and remaining balance.

## Test 4 - Payment during active eviction

1. Landlord reports payment.
2. Ledger updates.
3. Timeline event is created.
4. Attorney receives urgent review task.
5. System does not automatically dismiss or advance the court case.

## Test 5 - Bankruptcy hold

1. Bankruptcy is reported by any authorized actor.
2. Matter moves to hold.
3. Collection placement and incompatible automated actions are blocked.
4. Attorney/agency and administrator are notified.
5. Release requires an authorized event and reason.

## Test 6 - Security isolation

1. Client A cannot query Client B properties, units, tenants, matters, documents, or collections.
2. Agency A cannot see Agency B placements.
3. Attorney A cannot see unassigned matters.
4. Sensitive fields are masked.
5. Reveal and download actions create audit records.

## Test 7 - Regression

Verify all existing routes, admin lists, client views, payment plans, court events, counsel records, and collection screens still work after workflow-engine changes.

## Release gate

No outside paid customer may be onboarded with an unresolved critical defect involving authorization, document exposure, ledger corruption, status progression, payment reporting, or legal deadline presentation.


\newpage

# 17. Open Decisions

## Owner decisions

- Final public product name: Eviction Compass or Evict OS.
- Legal company contracting with landlords.
- Whether each landlord legal entity is a separate organization.
- Pilot pricing, if any.
- Who performs platform intake review.
- Whether public signup remains available during pilot.

## Attorney decisions

- Exact five-day workflow and approved form/version.
- Exact fourteen-day demand preparation and service workflow.
- Good Cause analysis and required fields.
- Holdover/lease-violation notice matrix.
- Required petitioner/ownership documents.
- SCRA verification process.
- Bankruptcy screening/hold process.
- Filing-readiness checklist by court.
- Treatment of payments after notice and after filing.
- Settlement authority rules.
- When parallel collections are permitted.
- Judgment interest and final-accounting rules.

## Collection-agency decisions

- Agency legal name and agreement.
- Per-landlord authorization structure.
- Supported jurisdictions and debt types.
- Minimum balance.
- Submission fields and documents.
- Status vocabulary and update frequency.
- Direct-payment reporting method.
- Settlement authority.
- Commission and deduction reconciliation.
- Data retention and security terms.

## Engineering decisions

- Task table schema.
- Notice and balance-snapshot schema.
- Attorney user role/RLS design.
- Dedicated judgment and warrant tables.
- Tenant/debtor source-link fields.
- Development/staging environment.
- File malware-scanning service.
- Audit-log implementation.
- Whether status transition logic lives in a Postgres function, Edge Function, or application service.

## Decision record format

Each resolved item should record:

- Decision ID.
- Date.
- Decision.
- Owner.
- Reason.
- Alternatives considered.
- Documents/code affected.
- Effective date.


\newpage

# 18. Change Control

## 18.1 Versioning

- Major version: material workflow or business-model change.
- Minor version: new stage, event, entity, integration, or approved legal rule.
- Patch version: clarification, typo, or nonmaterial correction.

## 18.2 Required sequence

1. Identify the problem through a real Matter, test, attorney review, agency review, or security review.
2. Add or update an Open Decision.
3. Approve the business/legal rule.
4. Update the Matter Bible.
5. Write acceptance criteria.
6. Implement in a branch or Lovable sprint.
7. Review migration, code, and RLS.
8. Run regression tests.
9. Deploy to staging.
10. Approve production release.
11. Record release and Matter Bible version.

## 18.3 Prohibited change pattern

Do not ask Lovable to implement broad legal workflow changes from a conversational sentence without:

- Defined state transitions.
- Required fields/documents.
- Actor permissions.
- Hold behavior.
- Timeline events.
- Acceptance tests.

## 18.4 Emergency changes

Security, privacy, payment, or legal-risk defects may be fixed immediately. Document the change, decision, testing, and Matter Bible update as soon as practical after containment.

## 18.5 Definition of done

A workflow feature is done only when:

- Database migration is safe.
- RLS is correct.
- UI works for authorized roles.
- Timeline and audit events are emitted.
- Error and retry behavior are defined.
- Tests pass.
- Documentation is updated.
- Attorney or agency approval is recorded where required.


\newpage

# References

These official sources inform the initial New York pilot workflow. They do not replace attorney review.

- New York Courts, **Starting a Case Outside NYC**: https://www.nycourts.gov/help/homes-evictions/starting-case-outside-nyc
- New York Courts, **Landlord-Tenant Basics Outside NYC**: https://www.nycourts.gov/help/homes-evictions/landlord-tenant-basics-outside-nyc
- New York Courts, **Landlord and Tenant Forms**: https://www.nycourts.gov/landlord-and-tenant-forms
- New York Courts, **Good Cause Eviction Law Notice**: https://www.nycourts.gov/forms/good-cause-eviction-law-notice
- New York Courts, **Buffalo City Court Housing / Landlord-Tenant Court**: https://www.nycourts.gov/courts/8th-judicial-district/buffalo-city-court/housing-landlord-tenant-court

## Project sources reviewed

- `eviction-compass-main.zip`, including current React/TypeScript source.
- Supabase migrations through `20260801024522_c7d14bd9-3fe5-4efc-b2e3-1903da4b93c9.sql`.
- Current `MatterIntake`, intake components, validation logic, matter helpers, RLS policies, court, counsel, payment, and collection modules.
- Evict OS technical-readiness audit supplied by the product owner.
- Dixon Commercial Client Agreement supplied by the product owner, used only as background for optional partner workflow.
